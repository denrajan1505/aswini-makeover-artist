/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL?: string
  readonly VITE_WHATSAPP_NUMBER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: { color?: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', handler: () => void) => void
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance
}
