import logging
import uuid
from fastapi import APIRouter, Header, HTTPException, Depends, UploadFile, File
from app.core.supabase_client import supabase, get_user_from_token
from app.core.config import settings
from app.models.schemas import PortfolioItemResponse, PortfolioItemCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def require_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user["email"].lower() not in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/", response_model=list[PortfolioItemResponse])
async def list_portfolio(category: str | None = None):
    query = supabase.table("portfolio_items").select("*")
    if category:
        query = query.eq("category", category)
    result = query.order("sort_order").order("created_at", desc=True).execute()
    return result.data or []


@router.post("/upload")
async def upload_portfolio_image(file: UploadFile = File(...), _admin=Depends(require_admin)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP, or GIF images are allowed")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    path = f"{uuid.uuid4()}.{ext}"

    try:
        supabase.storage.from_("portfolio-images").upload(path, data, {"content-type": file.content_type})
    except Exception as e:
        logger.error("Portfolio image upload failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to upload image")

    return {"url": supabase.storage.from_("portfolio-images").get_public_url(path)}


@router.post("/", response_model=PortfolioItemResponse)
async def create_portfolio_item(item: PortfolioItemCreate, _admin=Depends(require_admin)):
    try:
        result = supabase.table("portfolio_items").insert(item.model_dump()).execute()
    except Exception as e:
        logger.error("Portfolio insert failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not create portfolio item. Please try again.")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create portfolio item")
    return result.data[0]


@router.delete("/{item_id}")
async def delete_portfolio_item(item_id: str, _admin=Depends(require_admin)):
    supabase.table("portfolio_items").delete().eq("id", item_id).execute()
    return {"ok": True}
