import logging
from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.supabase_client import supabase, get_user_id_from_token, get_user_from_token
from app.core.config import settings
from app.models.schemas import ReviewCreate, ReviewResponse, ReviewReplyRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reviews", tags=["reviews"])


def get_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_id_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user["email"].lower() not in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/", response_model=list[ReviewResponse])
async def list_reviews(service_id: str | None = None):
    query = supabase.table("reviews").select("*")
    if service_id:
        query = query.eq("service_id", service_id)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


@router.get("/summary")
async def reviews_summary():
    result = supabase.table("reviews").select("rating").execute()
    ratings = [r["rating"] for r in (result.data or [])]
    if not ratings:
        return {"average_rating": 0, "total_reviews": 0}
    return {
        "average_rating": round(sum(ratings) / len(ratings), 1),
        "total_reviews": len(ratings),
    }


@router.post("/", response_model=ReviewResponse)
async def create_review(review: ReviewCreate, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    row = {"user_id": user_id, **review.model_dump()}
    try:
        result = supabase.table("reviews").insert(row).execute()
    except Exception as e:
        logger.error("Review insert failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not submit review. Please try again.")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create review")
    return result.data[0]


@router.put("/{review_id}/reply", response_model=ReviewResponse)
async def reply_to_review(review_id: str, req: ReviewReplyRequest, _admin=Depends(require_admin)):
    result = supabase.table("reviews").update({"admin_reply": req.admin_reply}).eq("id", review_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Review not found")
    return result.data[0]
