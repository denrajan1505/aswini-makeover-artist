import logging
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, Header, HTTPException, Depends, Request
from app.core.supabase_client import supabase, get_user_id_from_token
from app.core.config import settings
from app.core.limiter import limiter
from app.models.schemas import CreateOrderRequest, VerifyPaymentRequest

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


@router.post("/create-order")
@limiter.limit("10/minute")
async def create_order(request: Request, req: CreateOrderRequest, user_id: str = Depends(get_user_id)):
    booking = supabase.table("bookings").select("*").eq("id", req.booking_id).maybe_single().execute()
    if not booking or not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if booking.data["payment_status"] == "paid":
        raise HTTPException(status_code=400, detail="Booking already paid")

    amount_paise = int(round(booking.data["advance_amount"] * 100))

    try:
        order = _client().order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": booking.data["booking_code"],
            "notes": {"booking_id": req.booking_id},
        })
    except Exception as e:
        logger.error("Razorpay order creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create payment order")

    supabase.table("bookings").update({"razorpay_order_id": order["id"]}).eq("id", req.booking_id).execute()

    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.razorpay_key_id,
    }


@router.post("/verify")
@limiter.limit("10/minute")
async def verify_payment(request: Request, req: VerifyPaymentRequest, user_id: str = Depends(get_user_id)):
    booking = supabase.table("bookings").select("*").eq("id", req.booking_id).maybe_single().execute()
    if not booking or not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Idempotency: a booking already marked paid is not re-verified/re-updated.
    # If it's the same payment being retried (e.g. client retry after a timeout),
    # just return the current state instead of erroring.
    if booking.data["payment_status"] == "paid":
        if booking.data.get("razorpay_payment_id") == req.razorpay_payment_id:
            return booking.data
        raise HTTPException(status_code=400, detail="Booking already paid")

    payload = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected_signature = hmac.new(
        settings.razorpay_key_secret.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    try:
        result = (
            supabase.table("bookings")
            .update({
                "payment_status": "paid",
                "status": "confirmed",
                "razorpay_payment_id": req.razorpay_payment_id,
            })
            .eq("id", req.booking_id)
            .execute()
        )
    except Exception as e:
        logger.error("Payment confirmation update failed: %s", e)
        if "razorpay_payment_id" in str(e):
            raise HTTPException(status_code=409, detail="This payment has already been recorded")
        raise HTTPException(status_code=500, detail="Could not confirm payment. Please contact support.")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to confirm payment")
    return result.data[0]
