from datetime import date
from collections import defaultdict
from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.supabase_client import supabase, get_user_from_token
from app.core.config import settings
from app.models.schemas import BlockedDateCreate, CouponCreate

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user["email"].lower() not in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/dashboard")
async def dashboard(_admin=Depends(require_admin)):
    today = str(date.today())

    todays_bookings = (
        supabase.table("bookings").select("*").eq("booking_date", today)
        .in_("status", ["pending", "confirmed"]).execute()
    )

    pending = supabase.table("bookings").select("id", count="exact").eq("status", "pending").execute()
    completed = supabase.table("bookings").select("id", count="exact").eq("status", "completed").execute()
    confirmed = supabase.table("bookings").select("id", count="exact").eq("status", "confirmed").execute()
    cancelled = supabase.table("bookings").select("id", count="exact").eq("status", "cancelled").execute()

    month_prefix = today[:7]  # YYYY-MM
    month_payments = (
        supabase.table("payment_records").select("amount, created_at")
        .gte("created_at", f"{month_prefix}-01").execute()
    )
    monthly_revenue = sum(
        p["amount"] for p in (month_payments.data or [])
        if p["created_at"].startswith(month_prefix)
    )

    return {
        "todays_appointments": todays_bookings.data or [],
        "pending_count": pending.count or 0,
        "confirmed_count": confirmed.count or 0,
        "completed_count": completed.count or 0,
        "cancelled_count": cancelled.count or 0,
        "monthly_revenue": monthly_revenue,
    }


@router.get("/bookings")
async def list_all_bookings(status: str | None = None, _admin=Depends(require_admin)):
    query = supabase.table("bookings").select("*")
    if status:
        query = query.eq("status", status)
    result = query.order("booking_date", desc=True).execute()
    return {"bookings": result.data or []}


@router.get("/customers")
async def list_customers(_admin=Depends(require_admin)):
    result = supabase.table("bookings").select("user_id, customer_name, customer_phone, customer_email, total_amount, created_at").execute()
    customers = defaultdict(lambda: {"name": "", "phone": "", "email": "", "total_spent": 0, "booking_count": 0, "last_booking": None})
    for b in (result.data or []):
        c = customers[b["user_id"]]
        c["name"] = b["customer_name"]
        c["phone"] = b["customer_phone"]
        c["email"] = b["customer_email"]
        c["total_spent"] += b["total_amount"]
        c["booking_count"] += 1
        if not c["last_booking"] or b["created_at"] > c["last_booking"]:
            c["last_booking"] = b["created_at"]
    return {"customers": [{"user_id": uid, **v} for uid, v in customers.items()]}


@router.get("/blocked-dates")
async def list_blocked_dates(_admin=Depends(require_admin)):
    result = supabase.table("blocked_dates").select("*").order("date").execute()
    return result.data or []


@router.post("/blocked-dates")
async def block_date(req: BlockedDateCreate, _admin=Depends(require_admin)):
    result = supabase.table("blocked_dates").insert({"date": str(req.date), "reason": req.reason}).execute()
    return result.data[0]


@router.delete("/blocked-dates/{blocked_id}")
async def unblock_date(blocked_id: str, _admin=Depends(require_admin)):
    supabase.table("blocked_dates").delete().eq("id", blocked_id).execute()
    return {"ok": True}


@router.get("/coupons")
async def list_coupons(_admin=Depends(require_admin)):
    result = supabase.table("coupons").select("*").order("created_at", desc=True).execute()
    return result.data or []


@router.post("/coupons")
async def create_coupon(req: CouponCreate, _admin=Depends(require_admin)):
    row = req.model_dump()
    row["code"] = row["code"].strip().upper()
    row["valid_from"] = str(row["valid_from"]) if row["valid_from"] else None
    row["valid_until"] = str(row["valid_until"]) if row["valid_until"] else None
    result = supabase.table("coupons").insert(row).execute()
    return result.data[0]


@router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, _admin=Depends(require_admin)):
    supabase.table("coupons").delete().eq("id", coupon_id).execute()
    return {"ok": True}
