import { useEffect, useState } from 'react'
import { Loader2, CalendarClock, MapPin, Phone, Download, CalendarPlus, XCircle, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMyBookings } from '@/hooks/useCatalog'
import { getServices, rescheduleBooking, cancelBooking, getBookedSlots, getPaymentHistory, getErrorMessage } from '@/lib/api'
import type { ServiceResponse, BookingResponse } from '@/types'

const TABS = ['Upcoming', 'Completed', 'Cancelled'] as const
type Tab = (typeof TABS)[number]

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

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-brand-100 text-brand-700'
}

function paymentStatusBadge(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'bg-red-100 text-red-700',
    partially_paid: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
  }
  return map[status] || 'bg-brand-100 text-brand-700'
}

function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = { unpaid: 'Unpaid', partially_paid: 'Partially Paid', paid: 'Paid' }
  return map[status] || status
}

async function downloadInvoice(booking: BookingResponse, serviceName: string) {
  let paymentLines: string
  try {
    const { data: payments } = await getPaymentHistory(booking.id)
    paymentLines = payments.length
      ? payments
          .map(
            (p) =>
              `${p.created_at.slice(0, 10)}  ${p.method.replace(/_/g, ' ').padEnd(14)}  Rs. ${p.amount}${p.note ? `  (${p.note})` : ''}`,
          )
          .join('\n')
      : 'No payments recorded yet.'
  } catch {
    paymentLines = 'Could not load payment history.'
  }

  const closingLine =
    booking.payment_status === 'paid' ? 'PAID IN FULL' : `Balance Due: Rs. ${booking.balance_amount}`

  const text = `========================================
ASWINI MAKEOVER ARTIST — INVOICE
========================================
Booking Code: ${booking.booking_code}
Service: ${serviceName}
Date: ${booking.booking_date}
Time: ${booking.time_slot}
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Payment Mode: ${booking.payment_mode.toString().replace(/_/g, ' ')}
----------------------------------------
Total Amount: Rs. ${booking.total_amount}
Amount Paid: Rs. ${booking.amount_paid}
----------------------------------------
Payment History:
${paymentLines}
----------------------------------------
${closingLine}
========================================
Thank you for choosing Aswini Makeover Artist!
`
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoice-${booking.booking_code}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function addToCalendar(booking: BookingResponse, serviceName: string) {
  const [startTime] = booking.time_slot.split(' - ')
  const start = `${booking.booking_date.replace(/-/g, '')}T${startTime.replace(':', '')}00`
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${serviceName} - Aswini Makeover Artist
DTSTART:${start}
DESCRIPTION:Booking code ${booking.booking_code}
END:VEVENT
END:VCALENDAR`
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${booking.booking_code}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export default function MyBookings() {
  const { bookings, loading, refresh } = useMyBookings()
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [tab, setTab] = useState<Tab>('Upcoming')
  const [rescheduling, setRescheduling] = useState<BookingResponse | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newSlot, setNewSlot] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  useEffect(() => {
    refresh()
    getServices()
      .then(({ data }) => setServices(data))
      .catch(() => {})
  }, [refresh])

  useEffect(() => {
    if (!newDate) return
    getBookedSlots(newDate).then(({ data }) => setBookedSlots(data.booked_slots))
  }, [newDate])

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name || 'Service'

  const filtered = bookings.filter((b) => {
    if (tab === 'Upcoming') return ['pending', 'confirmed'].includes(b.status)
    if (tab === 'Completed') return b.status === 'completed'
    return b.status === 'cancelled'
  })

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return
    try {
      await cancelBooking(id)
      toast.success('Booking cancelled')
      refresh()
    } catch {
      toast.error('Failed to cancel booking')
    }
  }

  const handleReschedule = async () => {
    if (!newDate || !newSlot || !rescheduling) return
    try {
      await rescheduleBooking(rescheduling.id, { booking_date: newDate, time_slot: newSlot })
      toast.success('Booking rescheduled')
      setRescheduling(null)
      setNewDate('')
      setNewSlot('')
      refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reschedule'))
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-bold text-brand-900">My Bookings</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'true' : undefined}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === t ? 'bg-brand-500 text-white' : 'bg-white border border-brand-200 text-brand-800/70'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-brand-800/50 py-16">No {tab.toLowerCase()} bookings.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-brand-900">{serviceName(b.service_id)}</p>
                  <p className="text-xs text-brand-800/50 mt-0.5">{b.booking_code}</p>
                </div>
                <span className={`text-xs font-semibold rounded-full px-3 py-1 capitalize ${statusBadge(b.status)}`}>
                  {b.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-brand-800/60 mt-3">
                <CalendarClock className="w-4 h-4" /> {b.booking_date} · {b.time_slot}
              </div>
              {b.customer_address && (
                <div className="flex items-center gap-1.5 text-sm text-brand-800/60 mt-1">
                  <MapPin className="w-4 h-4" /> {b.customer_address}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-brand-800/60 mt-1">
                <Phone className="w-4 h-4" /> {b.customer_phone}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-brand-100 text-sm">
                <span className="text-brand-800/60">
                  Paid: <span className="font-semibold text-gold-500">₹{b.amount_paid.toLocaleString('en-IN')}</span>
                  <span className="text-brand-800/40"> / ₹{b.total_amount.toLocaleString('en-IN')}</span>
                </span>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${paymentStatusBadge(b.payment_status)}`}>
                  {paymentStatusLabel(b.payment_status)}
                </span>
              </div>
              {b.balance_amount > 0 && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  Balance Due: ₹{b.balance_amount.toLocaleString('en-IN')}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => downloadInvoice(b, serviceName(b.service_id))}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Invoice
                </button>
                <button
                  onClick={() => addToCalendar(b, serviceName(b.service_id))}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" /> Add to Calendar
                </button>
                {['pending', 'confirmed'].includes(b.status) && (
                  <>
                    <button
                      onClick={() => {
                        setRescheduling(b)
                        setNewDate(b.booking_date)
                        setNewSlot(b.time_slot)
                      }}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Reschedule
                    </button>
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="text-xs py-2 px-3 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-1.5 font-semibold transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rescheduling && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setRescheduling(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-title"
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reschedule-title" className="font-bold text-brand-900 text-lg">
              Reschedule Booking
            </h2>
            <div>
              <label htmlFor="reschedule-date" className="block text-sm font-medium text-brand-800 mb-1.5">
                New Date
              </label>
              <input
                id="reschedule-date"
                type="date"
                className="input-field"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-brand-800 mb-1.5">New Time Slot</span>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    disabled={bookedSlots.includes(slot) && slot !== rescheduling.time_slot}
                    onClick={() => setNewSlot(slot)}
                    aria-pressed={newSlot === slot}
                    className={`text-xs font-semibold py-2 rounded-xl border-2 ${
                      bookedSlots.includes(slot) && slot !== rescheduling.time_slot
                        ? 'border-brand-100 bg-brand-50 text-brand-800/30 cursor-not-allowed line-through'
                        : newSlot === slot
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-brand-200 text-brand-800/70'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRescheduling(null)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button onClick={handleReschedule} className="flex-1 btn-primary">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
