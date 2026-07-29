import logging
import random
import string
from datetime import date
from fastapi import APIRouter, Header, HTTPException, Depends, Request
from app.core.supabase_client import supabase, get_user_id_from_token, get_user_from_token
from app.core.config import settings
from app.core.limiter import limiter
from app.models.schemas import BookingCreate, BookingResponse, BookingRescheduleRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["bookings"])


def get_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_id_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


def is_admin(authorization: str = Header(...)) -> bool:
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user["email"].lower() in [e.lower() for e in settings.admin_emails]


def _generate_booking_code() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"AMA-{suffix}"


def _apply_coupon(price: float, coupon_code: str | None) -> float:
    if not coupon_code:
        return price
    result = (
        supabase.table("coupons")
        .select("*")
        .eq("code", coupon_code.strip().upper())
        .eq("active", True)
        .maybe_single()
        .execute()
    )
    if not result or not result.data:
        raise HTTPException(status_code=400, detail="Invalid or expired coupon code")
    discount = result.data["discount_percent"]
    return round(price * (1 - discount / 100), 2)


@router.get("/slots")
async def get_booked_slots(booking_date: str):
    result = (
        supabase.table("bookings")
        .select("time_slot")
        .eq("booking_date", booking_date)
        .in_("status", ["pending", "confirmed"])
        .execute()
    )
    blocked = supabase.table("blocked_dates").select("date").eq("date", booking_date).maybe_single().execute()
    return {
        "booked_slots": [r["time_slot"] for r in (result.data or [])],
        "is_blocked": bool(blocked and blocked.data),
    }


@router.post("/", response_model=BookingResponse)
@limiter.limit("10/minute")
async def create_booking(request: Request, booking: BookingCreate, authorization: str = Header(...)):
    user_id = get_user_id(authorization)

    if booking.booking_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot book a date in the past")

    service = supabase.table("services").select("*").eq("id", booking.service_id).maybe_single().execute()
    if not service or not service.data:
        raise HTTPException(status_code=404, detail="Service not found")

    blocked = supabase.table("blocked_dates").select("date").eq("date", str(booking.booking_date)).maybe_single().execute()
    if blocked and blocked.data:
        raise HTTPException(status_code=400, detail="Selected date is unavailable")

    existing_slot = (
        supabase.table("bookings")
        .select("id")
        .eq("booking_date", str(booking.booking_date))
        .eq("time_slot", booking.time_slot)
        .in_("status", ["pending", "confirmed"])
        .execute()
    )
    if existing_slot.data:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    total_amount = _apply_coupon(service.data["price"], booking.coupon_code)
    advance_amount = round(total_amount * settings.advance_payment_percent / 100, 2)

    row = {
        "booking_code": _generate_booking_code(),
        "user_id": user_id,
        "service_id": booking.service_id,
        "customer_name": booking.customer_name,
        "customer_phone": booking.customer_phone,
        "customer_email": booking.customer_email,
        "customer_address": booking.customer_address,
        "booking_date": str(booking.booking_date),
        "time_slot": booking.time_slot,
        "special_request": booking.special_request,
        "coupon_code": booking.coupon_code,
        "total_amount": total_amount,
        "advance_amount": advance_amount,
        "payment_status": "pending",
        "status": "pending",
    }

    try:
        result = supabase.table("bookings").insert(row).execute()
    except Exception as e:
        logger.error("Booking insert failed: %s", e)
        if "uq_bookings_active_slot" in str(e):
            raise HTTPException(status_code=409, detail="This time slot is already booked")
        raise HTTPException(status_code=500, detail="Could not create booking. Please try again.")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create booking")
    return result.data[0]


@router.get("/my", response_model=list[BookingResponse])
async def list_my_bookings(authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    result = (
        supabase.table("bookings")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    admin = is_admin(authorization)
    result = supabase.table("bookings").select("*").eq("id", booking_id).maybe_single().execute()
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if result.data["user_id"] != user_id and not admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return result.data


@router.put("/{booking_id}/reschedule", response_model=BookingResponse)
@limiter.limit("10/minute")
async def reschedule_booking(request: Request, booking_id: str, req: BookingRescheduleRequest, authorization: str = Header(...)):
    user_id = get_user_id(authorization)

    if req.booking_date < date.today():
        raise HTTPException(status_code=400, detail="Cannot reschedule to a date in the past")

    existing = supabase.table("bookings").select("*").eq("id", booking_id).maybe_single().execute()
    if not existing or not existing.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if existing.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if existing.data["status"] not in ("pending", "confirmed"):
        raise HTTPException(status_code=400, detail="This booking can no longer be rescheduled")

    blocked = supabase.table("blocked_dates").select("date").eq("date", str(req.booking_date)).maybe_single().execute()
    if blocked and blocked.data:
        raise HTTPException(status_code=400, detail="Selected date is unavailable")

    conflict = (
        supabase.table("bookings")
        .select("id")
        .eq("booking_date", str(req.booking_date))
        .eq("time_slot", req.time_slot)
        .neq("id", booking_id)
        .in_("status", ["pending", "confirmed"])
        .execute()
    )
    if conflict.data:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    try:
        result = (
            supabase.table("bookings")
            .update({"booking_date": str(req.booking_date), "time_slot": req.time_slot})
            .eq("id", booking_id)
            .execute()
        )
    except Exception as e:
        logger.error("Booking reschedule failed: %s", e)
        if "uq_bookings_active_slot" in str(e):
            raise HTTPException(status_code=409, detail="This time slot is already booked")
        raise HTTPException(status_code=500, detail="Could not reschedule booking. Please try again.")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to reschedule booking")
    return result.data[0]


@router.put("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(booking_id: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    admin = is_admin(authorization)
    existing = supabase.table("bookings").select("*").eq("id", booking_id).maybe_single().execute()
    if not existing or not existing.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if existing.data["user_id"] != user_id and not admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = supabase.table("bookings").update({"status": "cancelled"}).eq("id", booking_id).execute()
    return result.data[0]


@router.put("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(booking_id: str, status: str, _admin=Depends(is_admin)):
    if status not in ("pending", "confirmed", "completed", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    result = supabase.table("bookings").update({"status": status}).eq("id", booking_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result.data[0]
