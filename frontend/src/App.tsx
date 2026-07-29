import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import WhatsAppButton from '@/components/WhatsAppButton'

const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Home = lazy(() => import('@/pages/Home'))
const Services = lazy(() => import('@/pages/Services'))
const ServiceDetail = lazy(() => import('@/pages/ServiceDetail'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const Booking = lazy(() => import('@/pages/Booking'))
const MyBookings = lazy(() => import('@/pages/MyBookings'))
const Reviews = lazy(() => import('@/pages/Reviews'))
const Profile = lazy(() => import('@/pages/Profile'))
const Admin = lazy(() => import('@/pages/Admin'))

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-brand-50">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="lg:ml-60 pt-16 lg:pt-0 pb-24 lg:pb-8 px-4 lg:px-8 py-6 max-w-2xl mx-auto lg:mx-0 lg:max-w-4xl">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <WhatsAppButton />
    </div>
  )
}

function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

function AdminRoute() {
  const { isAdmin, loading } = useAuth()

  if (loading) return null

  if (!isAdmin) {
    toast.error('Admin access only')
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { borderRadius: '16px', fontFamily: 'Poppins, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#e8698f', secondary: 'white' } },
          }}
        />
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route
            path="/reset-password"
            element={
              <Suspense fallback={<PageLoader />}>
                <ResetPassword />
              </Suspense>
            }
          />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/book" element={<Booking />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/profile" element={<Profile />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
