from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Literal
from datetime import date, datetime

VALID_TIME_SLOT_PATTERN = r"^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$"
PHONE_PATTERN = r"^[+]?[0-9\s-]{7,15}$"
COUPON_CODE_PATTERN = r"^[A-Za-z0-9_-]{3,30}$"

PaymentMode = Literal["full", "advance", "pay_after_service"]
PaymentMethod = Literal["cash", "upi", "google_pay", "phonepe", "razorpay", "card", "bank_transfer"]


class ServiceResponse(BaseModel):
    id: str
    slug: str
    name: str
    category: str
    price: float
    duration_minutes: int
    description: Optional[str]
    image_url: Optional[str]
    gallery_urls: Optional[List[str]]
    whats_included: Optional[List[str]]
    preparation_tips: Optional[List[str]]
    faq: Optional[List[Any]]
    active: bool
    sort_order: int


class ServiceCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=50)
    price: float = Field(..., gt=0, le=1_000_000)
    duration_minutes: int = Field(60, gt=0, le=600)
    description: Optional[str] = Field(None, max_length=2000)
    image_url: Optional[str] = Field(None, max_length=1000)
    gallery_urls: Optional[List[str]] = None
    whats_included: Optional[List[str]] = None
    preparation_tips: Optional[List[str]] = None
    faq: Optional[List[Any]] = None
    active: bool = True
    sort_order: int = Field(0, ge=0)


class PortfolioItemResponse(BaseModel):
    id: str
    category: str
    image_url: str
    caption: Optional[str]
    sort_order: int


class PortfolioItemCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    image_url: str = Field(..., min_length=1, max_length=1000)
    caption: Optional[str] = Field(None, max_length=500)
    sort_order: int = Field(0, ge=0)


class BookingCreate(BaseModel):
    service_id: str
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: str = Field(..., pattern=PHONE_PATTERN)
    customer_email: Optional[EmailStr] = None
    customer_address: Optional[str] = Field(None, max_length=500)
    booking_date: date
    time_slot: str = Field(..., pattern=VALID_TIME_SLOT_PATTERN)
    special_request: Optional[str] = Field(None, max_length=1000)
    coupon_code: Optional[str] = Field(None, pattern=COUPON_CODE_PATTERN)
    payment_mode: PaymentMode = "advance"


class BookingResponse(BaseModel):
    id: str
    booking_code: str
    user_id: str
    service_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str]
    customer_address: Optional[str]
    booking_date: date
    time_slot: str
    special_request: Optional[str]
    coupon_code: Optional[str]
    total_amount: float
    advance_amount: float
    payment_mode: str
    amount_paid: float
    balance_amount: float
    payment_status: str
    status: str
    created_at: datetime


class BookingRescheduleRequest(BaseModel):
    booking_date: date
    time_slot: str = Field(..., pattern=VALID_TIME_SLOT_PATTERN)


class CreateOrderRequest(BaseModel):
    booking_id: str


class VerifyPaymentRequest(BaseModel):
    booking_id: str
    razorpay_order_id: str = Field(..., max_length=100)
    razorpay_payment_id: str = Field(..., max_length=100)
    razorpay_signature: str = Field(..., max_length=200)


class PaymentRecordCreate(BaseModel):
    amount: float = Field(..., gt=0)
    method: PaymentMethod
    note: Optional[str] = Field(None, max_length=500)


class PaymentRecordResponse(BaseModel):
    id: str
    booking_id: str
    amount: float
    method: str
    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    note: Optional[str]
    recorded_by: str
    created_at: datetime


class ReviewCreate(BaseModel):
    booking_id: Optional[str] = None
    service_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)
    photo_urls: Optional[List[str]] = Field(None, max_length=10)


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    booking_id: Optional[str]
    service_id: Optional[str]
    rating: int
    comment: Optional[str]
    photo_urls: Optional[List[str]]
    admin_reply: Optional[str]
    created_at: datetime


class ReviewReplyRequest(BaseModel):
    admin_reply: str = Field(..., min_length=1, max_length=2000)


class BlockedDateCreate(BaseModel):
    date: date
    reason: Optional[str] = Field(None, max_length=200)


class CouponCreate(BaseModel):
    code: str = Field(..., pattern=COUPON_CODE_PATTERN)
    discount_percent: float = Field(..., gt=0, le=100)
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    active: bool = True
