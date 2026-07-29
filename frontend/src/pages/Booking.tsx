import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, Check, ChevronRight, ChevronLeft, CalendarCheck, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useServices } from '@/hooks/useCatalog'
import { getBookedSlots, createBooking, createPaymentOrder, verifyPayment, getErrorMessage } from '@/lib/api'
import type { BookingResponse, PaymentMode } from '@/types'

const TIME_SLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
]

const STEPS = ['Service', 'Date & Time', 'Your Details', 'Payment', 'Confirmed']
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '917708566191'
const ADVANCE_PERCENT = Number(import.meta.env.VITE_ADVANCE_PAYMENT_PERCENT) || 30

const PAYMENT_OPTIONS: { mode: PaymentMode; label: string; sub: string }[] = [
  { mode: 'full', label: 'Pay Full Amount Online', sub: 'Pay the entire amount now via Razorpay' },
  { mode: 'advance', label: 'Pay Advance Online', sub: `Pay ${ADVANCE_PERCENT}% now, balance after service` },
  { mode: 'pay_after_service', label: 'Pay After Service', sub: 'No payment now, settle the full amount after your service' },
]

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

interface CustomerForm {
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_address: string
  special_request: string
  coupon_code: string
}

export default function Booking() {
  const { user } = useAuth()
  const { services, refresh } = useServices()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [dateBlocked, setDateBlocked] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [form, setForm] = useState<CustomerForm>({
    customer_name: user?.user_metadata?.full_name || '',
    customer_phone: '',
    customer_email: user?.email || '',
    customer_address: '',
    special_request: '',
    coupon_code: '',
  })

  const [booking, setBooking] = useState<BookingResponse | null>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('advance')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const preselect = searchParams.get('service')
    if (preselect && services.length) {
      const found = services.find((s) => s.slug === preselect)
      if (found) setServiceId(found.id)
    }
  }, [searchParams, services])

  useEffect(() => {
    if (!date) return
    setLoadingSlots(true)
    getBookedSlots(date)
      .then(({ data }) => {
        setBookedSlots(data.booked_slots)
        setDateBlocked(data.is_blocked)
      })
      .finally(() => setLoadingSlots(false))
  }, [date])

  const selectedService = services.find((s) => s.id === serviceId)
  const set = <K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const canProceedStep0 = !!serviceId
  const canProceedStep1 = !!date && !!timeSlot && !dateBlocked
  const canProceedStep2 = !!form.customer_name && !!form.customer_phone

  const handleCreateBooking = async () => {
    setSubmitting(true)
    try {
      const { data } = await createBooking({
        service_id: serviceId,
        booking_date: date,
        time_slot: timeSlot,
        ...form,
        coupon_code: form.coupon_code || undefined,
        payment_mode: paymentMode,
      })
      setBooking(data)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create booking'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async () => {
    if (!booking) return
    setSubmitting(true)
    try {
      const { data: order } = await createPaymentOrder(booking.id)
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Aswini Makeover Artist',
        description: selectedService?.name,
        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone,
        },
        theme: { color: '#e8698f' },
        handler: async (response) => {
          try {
            const { data: updated } = await verifyPayment({
              booking_id: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setBooking(updated)
            toast.success('Payment successful! Booking confirmed.')
            goNext()
          } catch {
            toast.error('Payment verification failed. Please contact us.')
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      })
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setSubmitting(false)
      })
      rzp.open()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start payment'))
      setSubmitting(false)
    }
  }

  const whatsappText = booking
    ? `Hi! I've booked ${selectedService?.name} on ${booking.booking_date} at ${booking.time_slot}. My booking code is ${booking.booking_code}.`
    : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand-900">Book Appointment</h1>
        <p className="text-sm text-brand-800/60 mt-0.5">A few quick steps and you're all set.</p>
      </div>

      {/* Step indicator */}
      <div
        className="flex items-center justify-between"
        aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
      >
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex items-center">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`step-pill ${i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-white border border-brand-200 text-brand-800/40'}`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium text-center hidden sm:block ${i <= step ? 'text-brand-800' : 'text-brand-800/40'}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-brand-500' : 'bg-brand-100'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Choose service */}
      {step === 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-brand-900">Choose a Service</h2>
          <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                aria-pressed={serviceId === s.id}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${serviceId === s.id ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white'}`}
              >
                <p className="font-semibold text-brand-900 text-sm">{s.name}</p>
                <p className="text-xs text-brand-800/50 mt-0.5">
                  {s.category} · {s.duration_minutes} mins
                </p>
                <p className="text-gold-500 font-bold mt-1.5">₹{s.price.toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>
          <button
            disabled={!canProceedStep0}
            onClick={goNext}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Date & time */}
      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-900">Choose Date &amp; Time</h2>
          <div>
            <label htmlFor="booking-date" className="block text-sm font-medium text-brand-800 mb-1.5">
              Date
            </label>
            <input
              id="booking-date"
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setTimeSlot('')
              }}
              className="input-field"
            />
          </div>

          {date &&
            (loadingSlots ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            ) : dateBlocked ? (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3" aria-live="polite">
                This date is unavailable. Please pick another date.
              </p>
            ) : (
              <div>
                <span className="block text-sm font-medium text-brand-800 mb-1.5">Time Slot</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isBooked = bookedSlots.includes(slot)
                    return (
                      <button
                        key={slot}
                        disabled={isBooked}
                        onClick={() => setTimeSlot(slot)}
                        aria-pressed={timeSlot === slot}
                        className={`text-xs font-semibold py-2.5 rounded-xl border-2 transition-all ${
                          isBooked
                            ? 'border-brand-100 bg-brand-50 text-brand-800/30 cursor-not-allowed line-through'
                            : timeSlot === slot
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-brand-200 text-brand-800/70'
                        }`}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

          <div className="flex gap-3">
            <button onClick={goBack} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={!canProceedStep1}
              onClick={goNext}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Customer details + special request */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-900">Your Details</h2>
          <div>
            <label htmlFor="booking-name" className="block text-sm font-medium text-brand-800 mb-1.5">
              Full Name
            </label>
            <input
              id="booking-name"
              className="input-field"
              value={form.customer_name}
              onChange={(e) => set('customer_name', e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="booking-phone" className="block text-sm font-medium text-brand-800 mb-1.5">
              Phone Number
            </label>
            <input
              id="booking-phone"
              className="input-field"
              value={form.customer_phone}
              onChange={(e) => set('customer_phone', e.target.value)}
              placeholder="+91 9876543210"
              required
            />
          </div>
          <div>
            <label htmlFor="booking-email" className="block text-sm font-medium text-brand-800 mb-1.5">
              Email
            </label>
            <input
              id="booking-email"
              type="email"
              className="input-field"
              value={form.customer_email}
              onChange={(e) => set('customer_email', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="booking-address" className="block text-sm font-medium text-brand-800 mb-1.5">
              Address
            </label>
            <textarea
              id="booking-address"
              className="input-field"
              rows={2}
              value={form.customer_address}
              onChange={(e) => set('customer_address', e.target.value)}
              placeholder="Venue / home address for the appointment"
            />
          </div>
          <div>
            <label htmlFor="booking-request" className="block text-sm font-medium text-brand-800 mb-1.5">
              Special Request
            </label>
            <textarea
              id="booking-request"
              className="input-field"
              rows={2}
              value={form.special_request}
              onChange={(e) => set('special_request', e.target.value)}
              placeholder="Any specific look, allergies, or requirements?"
            />
          </div>
          <div>
            <label htmlFor="booking-coupon" className="block text-sm font-medium text-brand-800 mb-1.5">
              Coupon Code (optional)
            </label>
            <input
              id="booking-coupon"
              className="input-field"
              value={form.coupon_code}
              onChange={(e) => set('coupon_code', e.target.value.toUpperCase())}
              placeholder="e.g. FESTIVE10"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={goBack} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={!canProceedStep2}
              onClick={goNext}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment mode + payment */}
      {step === 3 && !booking && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-900">Choose How to Pay</h2>
          <div className="space-y-2.5">
            {PAYMENT_OPTIONS.map((opt) => {
              const amount =
                opt.mode === 'full'
                  ? (selectedService?.price ?? 0)
                  : opt.mode === 'advance'
                    ? Math.round(((selectedService?.price ?? 0) * ADVANCE_PERCENT) / 100)
                    : 0
              return (
                <button
                  key={opt.mode}
                  onClick={() => setPaymentMode(opt.mode)}
                  aria-pressed={paymentMode === opt.mode}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${paymentMode === opt.mode ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white'}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <p className="font-semibold text-brand-900 text-sm">{opt.label}</p>
                    <p className="font-bold text-gold-500 whitespace-nowrap">₹{amount.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="text-xs text-brand-800/50 mt-1">{opt.sub}</p>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-center text-brand-800/40">
            Final amount reflects any coupon discount applied to your booking.
          </p>
          <div className="flex gap-3">
            <button onClick={goBack} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={submitting}
              onClick={handleCreateBooking}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Booking
            </button>
          </div>
        </div>
      )}

      {step === 3 && booking && booking.payment_mode === 'pay_after_service' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-900">Booking Confirmed</h2>
          <div className="bg-brand-50 rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-brand-800/60">Service</span>
              <span className="font-semibold text-brand-900">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-800/60">Date &amp; Time</span>
              <span className="font-semibold text-brand-900">
                {booking.booking_date}, {booking.time_slot}
              </span>
            </div>
            <div className="flex justify-between text-base pt-1.5 border-t border-brand-200">
              <span className="font-semibold text-brand-900">Due After Service</span>
              <span className="font-bold text-gold-500">₹{booking.total_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <p className="text-xs text-center text-brand-800/40">
            No payment is required now. The full amount is collected after your appointment.
          </p>
          <button onClick={goNext} className="btn-primary w-full flex items-center justify-center gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 3 && booking && booking.payment_mode !== 'pay_after_service' && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-900">
            {booking.payment_mode === 'full' ? 'Full Payment' : 'Advance Payment'}
          </h2>
          <div className="bg-brand-50 rounded-2xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-brand-800/60">Service</span>
              <span className="font-semibold text-brand-900">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-800/60">Date &amp; Time</span>
              <span className="font-semibold text-brand-900">
                {booking.booking_date}, {booking.time_slot}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-800/60">Total Amount</span>
              <span className="font-semibold text-brand-900">₹{booking.total_amount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-base pt-1.5 border-t border-brand-200">
              <span className="font-semibold text-brand-900">
                {booking.payment_mode === 'full' ? 'Amount to Pay Now' : 'Advance to Pay Now'}
              </span>
              <span className="font-bold text-gold-500">₹{booking.balance_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button
            disabled={submitting}
            onClick={handlePayment}
            className="btn-gold w-full flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Pay ₹
            {booking.balance_amount.toLocaleString('en-IN')} Now
          </button>
          <p className="text-xs text-center text-brand-800/40">
            Secured by Razorpay · UPI, Cards, Net Banking &amp; Wallets accepted
          </p>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && booking && (
        <div className="card text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Booking Confirmed!</h2>
            <p className="text-sm text-brand-800/60 mt-1">Your booking code</p>
            <p className="text-2xl font-bold text-brand-600 tracking-wide mt-1">{booking.booking_code}</p>
          </div>
          <div className="bg-brand-50 rounded-2xl p-4 text-left space-y-1.5 text-sm">
            <p>
              <span className="text-brand-800/60">Service:</span>{' '}
              <span className="font-semibold">{selectedService?.name}</span>
            </p>
            <p>
              <span className="text-brand-800/60">Date:</span>{' '}
              <span className="font-semibold">{booking.booking_date}</span>
            </p>
            <p>
              <span className="text-brand-800/60">Time:</span>{' '}
              <span className="font-semibold">{booking.time_slot}</span>
            </p>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600"
          >
            <MessageCircle className="w-4 h-4" /> Send Confirmation on WhatsApp
          </a>
          <button
            onClick={() => navigate('/my-bookings')}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <CalendarCheck className="w-4 h-4" /> View My Bookings
          </button>
        </div>
      )}
    </div>
  )
}
