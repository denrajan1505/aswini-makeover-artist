// Shared API response / request types, mirrored from backend/app/models/schemas.py
// and the plain-dict JSON responses returned by backend/app/api/routes/*.py.

export interface FaqEntry {
  question: string
  answer: string
}

export interface ServiceResponse {
  id: string
  slug: string
  name: string
  category: string
  price: number
  duration_minutes: number
  description?: string | null
  image_url?: string | null
  gallery_urls?: string[] | null
  whats_included?: string[] | null
  preparation_tips?: string[] | null
  faq?: FaqEntry[] | null
  active: boolean
  sort_order: number
}

export interface ServiceCreateInput {
  slug: string
  name: string
  category: string
  price: number
  duration_minutes: number
  description?: string
  image_url?: string
  gallery_urls?: string[]
  whats_included?: string[]
  preparation_tips?: string[]
  faq?: FaqEntry[]
  active?: boolean
  sort_order?: number
}

export interface PortfolioItemResponse {
  id: string
  category: string
  image_url: string
  caption?: string | null
  sort_order: number
}

export interface PortfolioItemCreateInput {
  category: string
  image_url: string
  caption?: string
  sort_order?: number
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface BookingResponse {
  id: string
  booking_code: string
  user_id: string
  service_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_address?: string | null
  booking_date: string
  time_slot: string
  special_request?: string | null
  coupon_code?: string | null
  total_amount: number
  advance_amount: number
  payment_status: PaymentStatus | string
  status: BookingStatus | string
  created_at: string
}

export interface BookingCreateInput {
  service_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address?: string
  booking_date: string
  time_slot: string
  special_request?: string
  coupon_code?: string
}

export interface BookingRescheduleInput {
  booking_date: string
  time_slot: string
}

export interface BookedSlotsResponse {
  booked_slots: string[]
  is_blocked: boolean
}

export interface ReviewResponse {
  id: string
  user_id: string
  booking_id?: string | null
  service_id?: string | null
  rating: number
  comment?: string | null
  photo_urls?: string[] | null
  admin_reply?: string | null
  created_at: string
}

export interface ReviewCreateInput {
  booking_id?: string
  service_id?: string
  rating: number
  comment?: string
  photo_urls?: string[]
}

export interface ReviewsSummaryResponse {
  average_rating: number
  total_reviews: number
}

export interface CreateOrderResponse {
  order_id: string
  amount: number
  currency: string
  key_id: string
}

export interface VerifyPaymentInput {
  booking_id: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface AdminDashboardResponse {
  todays_appointments: BookingResponse[]
  pending_count: number
  confirmed_count: number
  completed_count: number
  cancelled_count: number
  monthly_revenue: number
}

export interface AdminBookingsResponse {
  bookings: BookingResponse[]
}

export interface AdminCustomer {
  user_id: string
  name: string
  phone: string
  email: string | null
  total_spent: number
  booking_count: number
  last_booking: string | null
}

export interface AdminCustomersResponse {
  customers: AdminCustomer[]
}

export interface BlockedDate {
  id: string
  date: string
  reason?: string | null
}

export interface BlockedDateCreateInput {
  date: string
  reason?: string
}

export interface Coupon {
  id: string
  code: string
  discount_percent: number
  valid_from?: string | null
  valid_until?: string | null
  active: boolean
  created_at?: string
}

export interface CouponCreateInput {
  code: string
  discount_percent: number
  valid_from?: string
  valid_until?: string
  active?: boolean
}

export interface CurrentUser {
  id: string
  email: string
  is_admin: boolean
}
