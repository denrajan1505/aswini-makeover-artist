import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Star, Quote, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getReviews, getReviewsSummary, createReview, getMyBookings } from '@/lib/api'
import type { ReviewResponse, ReviewsSummaryResponse, BookingResponse } from '@/types'

export default function Reviews() {
  const [reviews, setReviews] = useState<ReviewResponse[]>([])
  const [summary, setSummary] = useState<ReviewsSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getReviews(), getReviewsSummary()])
      .then(([r, s]) => {
        setReviews(r.data)
        setSummary(s.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    getMyBookings()
      .then(({ data }) => setBookings(data.filter((b) => b.status === 'completed')))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createReview({ rating, comment, booking_id: bookingId || undefined })
      toast.success('Thank you for your feedback!')
      setShowForm(false)
      setComment('')
      setRating(5)
      load()
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-brand-900">Reviews</h1>
          {summary && summary.total_reviews > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
              <span className="font-semibold text-brand-900">{summary.average_rating}</span>
              <span className="text-sm text-brand-800/50">({summary.total_reviews} reviews)</span>
            </div>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-4">
          Write a Review
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-brand-800/50 py-16">No reviews yet. Be the first to share your experience!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < r.rating ? 'fill-gold-400 text-gold-400' : 'text-brand-100'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-brand-800/70">{r.comment}</p>
              {!!r.photo_urls?.length && (
                <div className="flex gap-2 mt-3">
                  {r.photo_urls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Customer review photo ${i + 1} — ${r.rating} star rating`}
                      loading="lazy"
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
              {r.admin_reply && (
                <div className="mt-3 bg-brand-50 rounded-xl p-3 flex gap-2">
                  <Quote className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-brand-700">Aswini Makeover Artist</p>
                    <p className="text-sm text-brand-800/70">{r.admin_reply}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-form-title"
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="review-form-title" className="font-bold text-brand-900 text-lg">
                Write a Review
              </h2>
              <button onClick={() => setShowForm(false)} aria-label="Close review form">
                <X className="w-5 h-5 text-brand-800/40" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset>
                <legend className="block text-sm font-medium text-brand-800 mb-1.5">Rating</legend>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setRating(i + 1)}
                      aria-label={`${i + 1} star${i === 0 ? '' : 's'}`}
                      aria-pressed={rating === i + 1}
                    >
                      <Star className={`w-7 h-7 ${i < rating ? 'fill-gold-400 text-gold-400' : 'text-brand-100'}`} />
                    </button>
                  ))}
                </div>
              </fieldset>
              {bookings.length > 0 && (
                <div>
                  <label htmlFor="review-booking" className="block text-sm font-medium text-brand-800 mb-1.5">
                    Which booking? (optional)
                  </label>
                  <select
                    id="review-booking"
                    className="input-field"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                  >
                    <option value="">General feedback</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.booking_code} — {b.booking_date}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-brand-800 mb-1.5">
                  Your Review
                </label>
                <textarea
                  id="review-comment"
                  className="input-field"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
