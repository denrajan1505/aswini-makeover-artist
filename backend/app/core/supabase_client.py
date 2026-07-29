import logging
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Service key bypasses RLS — correct for server-side operations
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def get_user_from_token(token: str) -> dict:
    """Verifies the JWT's signature and expiry against Supabase Auth (via GoTrue's
    /auth/v1/user endpoint) rather than trusting the unverified payload claims."""
    try:
        response = supabase.auth.get_user(token)
    except Exception as e:
        logger.warning("Token verification failed: %s", e)
        raise ValueError("Invalid or expired token")
    if not response or not response.user:
        raise ValueError("Invalid or expired token")
    return {"id": response.user.id, "email": response.user.email or ""}


def get_user_id_from_token(token: str) -> str:
    return get_user_from_token(token)["id"]
