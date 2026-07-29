import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.limiter import limiter
from app.api.routes import auth, services, portfolio, bookings, reviews, payments, admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="Aswini Makeover Artist API",
    description="Booking platform for Aswini Makeover Artist — Enhance. Empower. Transform.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(services.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Aswini Makeover Artist API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
