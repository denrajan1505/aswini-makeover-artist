import logging
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, Header, HTTPException, Depends, Request
from app.core.supabase_client import supabase, get_user_id_from_token
from app.core.config import settings
from app.core.limiter import limiter
from app.api.routes.bookings import is_admin
from app.api.routes.admin import require_admin
from app.models.schemas import CreateOrderRequest, VerifyPaymentRequest, PaymentRecordCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


def get_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_id_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _client():
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def _get_booking_or_404(booking_id: str) -> dict:
    booking = supabase.table("bookings").select("*").eq("id", booking_id).maybe_single().execute()
    if not booking or not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking.data


@router.post("/create-order")
@limiter.limit("10/minute")
async def create_order(request: Request, req: CreateOrderRequest, user_id: str = Depends(get_user_id)):
    booking = _get_booking_or_404(req.booking_id)
    if booking["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking["balance_amount"] <= 0:
        raise HTTPException(status_code=400, detail="Booking already fully paid")

    amount_paise = int(round(booking["balance_amount"] * 100))

    try:
        order = _client().order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": booking["booking_code"],
            "notes": {"booking_id": req.booking_id},
        })
    except Exception as e:
        logger.error("Razorpay order creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create payment order")

    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.razorpay_key_id,
    }


@router.post("/verify")
@limiter.limit("10/minute")
async def verify_payment(request: Request, req: VerifyPaymentRequest, user_id: str = Depends(get_user_id)):
    booking = _get_booking_or_404(req.booking_id)
    if booking["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Idempotency: a client retry (e.g. after a network timeout) that resends
    # a payment id already recorded just returns the current booking instead
    # of erroring or double-counting the payment.
    existing = (
        supabase.table("payment_records")
        .select("id")
        .eq("razorpay_payment_id", req.razorpay_payment_id)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        return booking

    payload = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.razorpay_key_secret.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    # Re-fetch the order from Razorpay rather than trusting a locally
    # recomputed balance — the balance may have shifted (e.g. an admin
    # recorded a cash payment) between order creation and this verification.
    try:
        order = _client().order.fetch(req.razorpay_order_id)
    except Exception as e:
        logger.error("Razorpay order fetch failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not confirm payment. Please contact support.")
    charged_amount = order["amount"] / 100

    try:
        payment = (
            supabase.table("payment_records")
            .insert({
                "booking_id": req.booking_id,
                "amount": charged_amount,
                "method": "razorpay",
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "recorded_by": booking.get("customer_email") or user_id,
            })
            .execute()
        )
    except Exception as e:
        logger.error("Payment record insert failed: %s", e)
        if "razorpay_payment_id" in str(e):
            raise HTTPException(status_code=409, detail="This payment has already been recorded")
        raise HTTPException(status_code=500, detail="Could not confirm payment. Please contact support.")
    if not payment.data:
        raise HTTPException(status_code=500, detail="Could not confirm payment. Please contact support.")

    update = {"amount_paid": booking["amount_paid"] + charged_amount}
    if booking["status"] == "pending":
        update["status"] = "confirmed"

    result = supabase.table("bookings").update(update).eq("id", req.booking_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
    return result.data[0]


@router.post("/{booking_id}/record")
async def record_payment(booking_id: str, req: PaymentRecordCreate, admin: dict = Depends(require_admin)):
    booking = _get_booking_or_404(booking_id)

    if booking["amount_paid"] + req.amount > booking["total_amount"] + 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Payment of ₹{req.amount:.2f} exceeds outstanding balance of ₹{booking['balance_amount']:.2f}",
        )

    payment = (
        supabase.table("payment_records")
        .insert({
            "booking_id": booking_id,
            "amount": req.amount,
            "method": req.method,
            "note": req.note,
            "recorded_by": admin["email"],
        })
        .execute()
    )
    if not payment.data:
        raise HTTPException(status_code=500, detail="Failed to record payment")

    update = {"amount_paid": booking["amount_paid"] + req.amount}
    if booking["status"] == "pending":
        update["status"] = "confirmed"

    result = supabase.table("bookings").update(update).eq("id", booking_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update booking")

    return {"booking": result.data[0], "payment": payment.data[0]}


@router.get("/{booking_id}/history")
async def get_payment_history(booking_id: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    admin = is_admin(authorization)
    booking = _get_booking_or_404(booking_id)
    if booking["user_id"] != user_id and not admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = (
        supabase.table("payment_records")
        .select("*")
        .eq("booking_id", booking_id)
        .order("created_at")
        .execute()
    )
    return result.data or []
