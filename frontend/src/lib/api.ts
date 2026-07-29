import axios, { type AxiosResponse } from 'axios'
import { supabase } from './supabase'
import type {
  ServiceResponse,
  ServiceCreateInput,
  PortfolioItemResponse,
  PortfolioItemCreateInput,
  BookingResponse,
  BookingCreateInput,
  BookingRescheduleInput,
  BookedSlotsResponse,
  ReviewResponse,
  ReviewCreateInput,
  ReviewsSummaryResponse,
  CreateOrderResponse,
  VerifyPaymentInput,
  AdminDashboardResponse,
  AdminBookingsResponse,
  AdminCustomersResponse,
  BlockedDate,
  BlockedDateCreateInput,
  Coupon,
  CouponCreateInput,
  CurrentUser,
  BookingStatus,
  PaymentRecordResponse,
  PaymentRecordCreateInput,
  RecordPaymentResponse,
} from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: `${API_URL}/api/v1` })

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Auth
export const getMe = (): Promise<AxiosResponse<CurrentUser>> => api.get('/auth/me')

// Services
export const getServices = (category?: string): Promise<AxiosResponse<ServiceResponse[]>> =>
  api.get('/services/', { params: category ? { category } : {} })
export const getService = (slug: string): Promise<AxiosResponse<ServiceResponse>> => api.get(`/services/${slug}`)
export const createService = (data: ServiceCreateInput): Promise<AxiosResponse<ServiceResponse>> =>
  api.post('/services/', data)
export const updateService = (id: string, data: Partial<ServiceCreateInput>): Promise<AxiosResponse<ServiceResponse>> =>
  api.put(`/services/${id}`, data)
export const deleteService = (id: string): Promise<AxiosResponse<void>> => api.delete(`/services/${id}`)

// Portfolio
export const getPortfolio = (category?: string): Promise<AxiosResponse<PortfolioItemResponse[]>> =>
  api.get('/portfolio/', { params: category ? { category } : {} })
export const createPortfolioItem = (data: PortfolioItemCreateInput): Promise<AxiosResponse<PortfolioItemResponse>> =>
  api.post('/portfolio/', data)
export const deletePortfolioItem = (id: string): Promise<AxiosResponse<void>> => api.delete(`/portfolio/${id}`)
export const uploadPortfolioImage = (file: File): Promise<AxiosResponse<{ url: string }>> => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/portfolio/upload', formData)
}

// Bookings
export const getBookedSlots = (bookingDate: string): Promise<AxiosResponse<BookedSlotsResponse>> =>
  api.get('/bookings/slots', { params: { booking_date: bookingDate } })
export const createBooking = (data: BookingCreateInput): Promise<AxiosResponse<BookingResponse>> =>
  api.post('/bookings/', data)
export const getMyBookings = (): Promise<AxiosResponse<BookingResponse[]>> => api.get('/bookings/my')
export const getBooking = (id: string): Promise<AxiosResponse<BookingResponse>> => api.get(`/bookings/${id}`)
export const rescheduleBooking = (id: string, data: BookingRescheduleInput): Promise<AxiosResponse<BookingResponse>> =>
  api.put(`/bookings/${id}/reschedule`, data)
export const cancelBooking = (id: string): Promise<AxiosResponse<BookingResponse>> => api.put(`/bookings/${id}/cancel`)
export const updateBookingStatus = (
  id: string,
  status: BookingStatus | string,
): Promise<AxiosResponse<BookingResponse>> => api.put(`/bookings/${id}/status`, null, { params: { status } })

// Reviews
export const getReviews = (serviceId?: string): Promise<AxiosResponse<ReviewResponse[]>> =>
  api.get('/reviews/', { params: serviceId ? { service_id: serviceId } : {} })
export const getReviewsSummary = (): Promise<AxiosResponse<ReviewsSummaryResponse>> => api.get('/reviews/summary')
export const createReview = (data: ReviewCreateInput): Promise<AxiosResponse<ReviewResponse>> =>
  api.post('/reviews/', data)
export const replyToReview = (id: string, adminReply: string): Promise<AxiosResponse<ReviewResponse>> =>
  api.put(`/reviews/${id}/reply`, { admin_reply: adminReply })

// Payments
export const createPaymentOrder = (bookingId: string): Promise<AxiosResponse<CreateOrderResponse>> =>
  api.post('/payments/create-order', { booking_id: bookingId })
export const verifyPayment = (data: VerifyPaymentInput): Promise<AxiosResponse<BookingResponse>> =>
  api.post('/payments/verify', data)
export const getPaymentHistory = (bookingId: string): Promise<AxiosResponse<PaymentRecordResponse[]>> =>
  api.get(`/payments/${bookingId}/history`)
export const recordPayment = (
  bookingId: string,
  data: PaymentRecordCreateInput,
): Promise<AxiosResponse<RecordPaymentResponse>> => api.post(`/payments/${bookingId}/record`, data)

// Admin
export const getAdminDashboard = (): Promise<AxiosResponse<AdminDashboardResponse>> => api.get('/admin/dashboard')
export const getAdminBookings = (status?: string): Promise<AxiosResponse<AdminBookingsResponse>> =>
  api.get('/admin/bookings', { params: status ? { status } : {} })
export const getAdminCustomers = (): Promise<AxiosResponse<AdminCustomersResponse>> => api.get('/admin/customers')
export const getBlockedDates = (): Promise<AxiosResponse<BlockedDate[]>> => api.get('/admin/blocked-dates')
export const blockDate = (data: BlockedDateCreateInput): Promise<AxiosResponse<BlockedDate>> =>
  api.post('/admin/blocked-dates', data)
export const unblockDate = (id: string): Promise<AxiosResponse<void>> => api.delete(`/admin/blocked-dates/${id}`)
export const getCoupons = (): Promise<AxiosResponse<Coupon[]>> => api.get('/admin/coupons')
export const createCoupon = (data: CouponCreateInput): Promise<AxiosResponse<Coupon>> =>
  api.post('/admin/coupons', data)
export const deleteCoupon = (id: string): Promise<AxiosResponse<void>> => api.delete(`/admin/coupons/${id}`)

export default api

/** Extracts a FastAPI `{ detail: string }` error message from a caught axios error, falling back otherwise. */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: string }>(err)) {
    return err.response?.data?.detail || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}
