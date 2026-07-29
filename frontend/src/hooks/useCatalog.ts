import { useState, useCallback } from 'react'
import { getServices, getPortfolio, getMyBookings, getReviewsSummary } from '@/lib/api'
import type { ServiceResponse, PortfolioItemResponse, BookingResponse, ReviewsSummaryResponse } from '@/types'

export function useServices() {
  const [services, setServices] = useState<ServiceResponse[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (category?: string) => {
    setLoading(true)
    try {
      const { data } = await getServices(category)
      setServices(data)
    } finally {
      setLoading(false)
    }
  }, [])

  return { services, loading, refresh }
}

export function usePortfolio() {
  const [items, setItems] = useState<PortfolioItemResponse[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (category?: string) => {
    setLoading(true)
    try {
      const { data } = await getPortfolio(category)
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [])

  return { items, loading, refresh }
}

export function useMyBookings() {
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getMyBookings()
      setBookings(data)
    } finally {
      setLoading(false)
    }
  }, [])

  return { bookings, loading, refresh }
}

export function useReviewsSummary() {
  const [summary, setSummary] = useState<ReviewsSummaryResponse | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await getReviewsSummary()
    setSummary(data)
  }, [])

  return { summary, refresh }
}
