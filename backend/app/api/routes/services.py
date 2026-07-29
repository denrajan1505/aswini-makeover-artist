import logging
from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.supabase_client import supabase, get_user_from_token
from app.core.config import settings
from app.models.schemas import ServiceResponse, ServiceCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/services", tags=["services"])


def require_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user["email"].lower() not in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/", response_model=list[ServiceResponse])
async def list_services(category: str | None = None):
    query = supabase.table("services").select("*").eq("active", True)
    if category:
        query = query.eq("category", category)
    result = query.order("sort_order").execute()
    return result.data or []


@router.get("/{slug}", response_model=ServiceResponse)
async def get_service(slug: str):
    result = supabase.table("services").select("*").eq("slug", slug).maybe_single().execute()
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return result.data


@router.post("/", response_model=ServiceResponse)
async def create_service(service: ServiceCreate, _admin=Depends(require_admin)):
    try:
        result = supabase.table("services").insert(service.model_dump()).execute()
    except Exception as e:
        logger.error("Service insert failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not create service. Please try again.")
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create service")
    return result.data[0]


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, service: ServiceCreate, _admin=Depends(require_admin)):
    result = supabase.table("services").update(service.model_dump()).eq("id", service_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Service not found")
    return result.data[0]


@router.delete("/{service_id}")
async def delete_service(service_id: str, _admin=Depends(require_admin)):
    supabase.table("services").update({"active": False}).eq("id", service_id).execute()
    return {"ok": True}
