import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, TrendingUp, Clock, CheckCircle2, XCircle, Trash2, Plus, Reply } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAdminDashboard,
  getAdminBookings,
  updateBookingStatus,
  getAdminCustomers,
  getServices,
  createService,
  deleteService,
  getPortfolio,
  createPortfolioItem,
  deletePortfolioItem,
  getCoupons,
  createCoupon,
  deleteCoupon,
  getReviews,
  replyToReview,
  getBlockedDates,
  blockDate,
  unblockDate,
  getErrorMessage,
} from '@/lib/api'
import type {
  AdminDashboardResponse,
  BookingResponse,
  AdminCustomer,
  ServiceResponse,
  PortfolioItemResponse,
  Coupon,
  ReviewResponse,
  BlockedDate,
} from '@/types'

const TABS = [
  'Dashboard',
  'Bookings',
  'Customers',
  'Services',
  'Portfolio',
  'Coupons',
  'Reviews',
  'Availability',
] as const
type Tab = (typeof TABS)[number]

const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const

export default function Admin() {
  const [tab, setTab] = useState<Tab>('Dashboard')

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-2xl font-bold text-brand-900">Admin Panel</h1>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'true' : undefined}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === t ? 'bg-brand-500 text-white' : 'bg-white border border-brand-200 text-brand-800/70'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Dashboard' && <DashboardTab />}
      {tab === 'Bookings' && <BookingsTab />}
      {tab === 'Customers' && <CustomersTab />}
      {tab === 'Services' && <ServicesTab />}
      {tab === 'Portfolio' && <PortfolioTab />}
      {tab === 'Coupons' && <CouponsTab />}
      {tab === 'Reviews' && <ReviewsTab />}
      {tab === 'Availability' && <AvailabilityTab />}
    </div>
  )
}

function DashboardTab() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null)
  useEffect(() => {
    getAdminDashboard().then(({ data }) => setData(data))
  }, [])

  if (!data)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )

  const stats = [
    { label: 'Pending', value: data.pending_count, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Confirmed', value: data.confirmed_count, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
    { label: 'Completed', value: data.completed_count, icon: CheckCircle2, color: 'text-blue-600 bg-blue-100' },
    { label: 'Cancelled', value: data.cancelled_count, icon: XCircle, color: 'text-red-600 bg-red-100' },
  ]

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-brand-500 to-gold-400 text-white border-0">
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <TrendingUp className="w-4 h-4" /> Monthly Revenue (advance collected)
        </div>
        <p className="text-3xl font-bold mt-1">₹{data.monthly_revenue.toLocaleString('en-IN')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card !p-4 text-center">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-brand-900">{value}</p>
            <p className="text-xs text-brand-800/50">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold text-brand-900 mb-2">Today's Appointments</h2>
        {data.todays_appointments.length === 0 ? (
          <p className="text-sm text-brand-800/50">No appointments today.</p>
        ) : (
          <div className="space-y-2">
            {data.todays_appointments.map((b) => (
              <div key={b.id} className="card !p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-brand-900">{b.customer_name}</p>
                  <p className="text-xs text-brand-800/50">
                    {b.time_slot} · {b.booking_code}
                  </p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-brand-100 text-brand-700 capitalize">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BookingsTab() {
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getAdminBookings(filter || undefined)
      .then(({ data }) => setBookings(data.bookings))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateBookingStatus(id, status)
      toast.success('Status updated')
      load()
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-current={filter === s ? 'true' : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${filter === s ? 'bg-brand-500 text-white' : 'bg-white border border-brand-200 text-brand-800/70'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="card !p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-brand-900 text-sm">
                    {b.customer_name} · {b.booking_code}
                  </p>
                  <p className="text-xs text-brand-800/50 mt-0.5">
                    {b.booking_date} · {b.time_slot} · {b.customer_phone}
                  </p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-brand-100 text-brand-700 capitalize">
                  {b.payment_status}
                </span>
              </div>
              <div className="flex gap-1.5 mt-3">
                {BOOKING_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(b.id, s)}
                    aria-pressed={b.status === s}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${b.status === s ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomersTab() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  useEffect(() => {
    getAdminCustomers().then(({ data }) => setCustomers(data.customers))
  }, [])

  return (
    <div className="space-y-2">
      {customers.map((c) => (
        <div key={c.user_id} className="card !p-4 flex justify-between items-center">
          <div>
            <p className="font-semibold text-brand-900 text-sm">{c.name}</p>
            <p className="text-xs text-brand-800/50">
              {c.phone} · {c.email}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gold-500">₹{c.total_spent.toLocaleString('en-IN')}</p>
            <p className="text-xs text-brand-800/50">{c.booking_count} bookings</p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface ServiceFormState {
  slug: string
  name: string
  category: string
  price: string
  duration_minutes: string
  description: string
}

const EMPTY_SERVICE_FORM: ServiceFormState = {
  slug: '',
  name: '',
  category: 'Party',
  price: '',
  duration_minutes: '60',
  description: '',
}

function ServicesTab() {
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [form, setForm] = useState<ServiceFormState>(EMPTY_SERVICE_FORM)
  const load = () => getServices().then(({ data }) => setServices(data))
  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await createService({
        ...form,
        price: parseFloat(form.price),
        duration_minutes: parseInt(form.duration_minutes, 10),
      })
      toast.success('Service added')
      setForm(EMPTY_SERVICE_FORM)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add service'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this service?')) return
    await deleteService(id)
    load()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="card space-y-3">
        <h2 className="font-semibold text-brand-900">Add Service</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Slug (e.g. glow-makeup)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            required
          />
          <input
            className="input-field"
            type="number"
            placeholder="Price (₹)"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />
          <input
            className="input-field"
            type="number"
            placeholder="Duration (mins)"
            value={form.duration_minutes}
            onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
          />
        </div>
        <textarea
          className="input-field"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </form>

      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.id} className="card !p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-brand-900 text-sm">{s.name}</p>
              <p className="text-xs text-brand-800/50">
                {s.category} · ₹{s.price} · {s.duration_minutes} mins
              </p>
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              aria-label={`Deactivate ${s.name}`}
              className="text-red-500 hover:bg-red-50 p-2 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PortfolioFormState {
  category: string
  image_url: string
  caption: string
}

const EMPTY_PORTFOLIO_FORM: PortfolioFormState = { category: 'Bride', image_url: '', caption: '' }

function PortfolioTab() {
  const [items, setItems] = useState<PortfolioItemResponse[]>([])
  const [form, setForm] = useState<PortfolioFormState>(EMPTY_PORTFOLIO_FORM)
  const load = () => getPortfolio().then(({ data }) => setItems(data))
  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await createPortfolioItem(form)
      toast.success('Image added')
      setForm(EMPTY_PORTFOLIO_FORM)
      load()
    } catch {
      toast.error('Failed to add image')
    }
  }

  const handleDelete = async (id: string) => {
    await deletePortfolioItem(id)
    load()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="card space-y-3">
        <h2 className="font-semibold text-brand-900">Add Portfolio Image</h2>
        <input
          className="input-field"
          placeholder="Image URL"
          value={form.image_url}
          onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
          required
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="input-field"
            placeholder="Category (e.g. Bride)"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Caption (optional)"
            value={form.caption}
            onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Image
        </button>
      </form>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square group">
            <img
              src={item.image_url}
              alt={item.caption || item.category}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => handleDelete(item.id)}
              aria-label={`Delete ${item.caption || item.category} image`}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

interface CouponFormState {
  code: string
  discount_percent: string
}

const EMPTY_COUPON_FORM: CouponFormState = { code: '', discount_percent: '' }

function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState<CouponFormState>(EMPTY_COUPON_FORM)
  const load = () => getCoupons().then(({ data }) => setCoupons(data))
  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await createCoupon({ ...form, discount_percent: parseFloat(form.discount_percent) })
      toast.success('Coupon created')
      setForm(EMPTY_COUPON_FORM)
      load()
    } catch {
      toast.error('Failed to create coupon')
    }
  }

  const handleDelete = async (id: string) => {
    await deleteCoupon(id)
    load()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="card flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="coupon-code" className="block text-sm font-medium text-brand-800 mb-1.5">
            Code
          </label>
          <input
            id="coupon-code"
            className="input-field"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            required
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="coupon-discount" className="block text-sm font-medium text-brand-800 mb-1.5">
            Discount %
          </label>
          <input
            id="coupon-discount"
            className="input-field"
            type="number"
            value={form.discount_percent}
            onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
            required
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      <div className="space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="card !p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-brand-900 text-sm">{c.code}</p>
              <p className="text-xs text-brand-800/50">{c.discount_percent}% off</p>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              aria-label={`Delete coupon ${c.code}`}
              className="text-red-500 hover:bg-red-50 p-2 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewsTab() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([])
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const load = () => getReviews().then(({ data }) => setReviews(data))
  useEffect(() => {
    load()
  }, [])

  const handleReply = async (id: string) => {
    const reply = replyDrafts[id]
    if (!reply) return
    try {
      await replyToReview(id, reply)
      toast.success('Reply posted')
      load()
    } catch {
      toast.error('Failed to reply')
    }
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="card">
          <p className="text-sm text-brand-800/70">{r.comment}</p>
          {r.admin_reply ? (
            <p className="text-xs text-brand-600 mt-2 bg-brand-50 rounded-lg p-2">Reply: {r.admin_reply}</p>
          ) : (
            <div className="flex gap-2 mt-2">
              <label htmlFor={`reply-${r.id}`} className="sr-only">
                Write a reply
              </label>
              <input
                id={`reply-${r.id}`}
                className="input-field flex-1 !py-2 text-sm"
                placeholder="Write a reply..."
                value={replyDrafts[r.id] || ''}
                onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
              />
              <button onClick={() => handleReply(r.id)} aria-label="Post reply" className="btn-primary !py-2 !px-3">
                <Reply className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

interface BlockedDateFormState {
  date: string
  reason: string
}

const EMPTY_BLOCKED_DATE_FORM: BlockedDateFormState = { date: '', reason: '' }

function AvailabilityTab() {
  const [dates, setDates] = useState<BlockedDate[]>([])
  const [form, setForm] = useState<BlockedDateFormState>(EMPTY_BLOCKED_DATE_FORM)
  const load = () => getBlockedDates().then(({ data }) => setDates(data))
  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await blockDate(form)
      toast.success('Date blocked')
      setForm(EMPTY_BLOCKED_DATE_FORM)
      load()
    } catch {
      toast.error('Failed to block date')
    }
  }

  const handleUnblock = async (id: string) => {
    await unblockDate(id)
    load()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="card flex gap-3 items-end flex-wrap">
        <div>
          <label htmlFor="blocked-date" className="block text-sm font-medium text-brand-800 mb-1.5">
            Date
          </label>
          <input
            id="blocked-date"
            type="date"
            className="input-field"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label htmlFor="blocked-reason" className="block text-sm font-medium text-brand-800 mb-1.5">
            Reason (optional)
          </label>
          <input
            id="blocked-reason"
            className="input-field"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Holiday"
          />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Block Date
        </button>
      </form>

      <div className="space-y-2">
        {dates.map((d) => (
          <div key={d.id} className="card !p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-brand-900 text-sm">{d.date}</p>
              <p className="text-xs text-brand-800/50">{d.reason}</p>
            </div>
            <button
              onClick={() => handleUnblock(d.id)}
              aria-label={`Unblock ${d.date}`}
              className="text-red-500 hover:bg-red-50 p-2 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
