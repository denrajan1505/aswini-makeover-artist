import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '917708566191'

interface WhatsAppButtonProps {
  text?: string
}

export default function WhatsAppButton({
  text = "Hi! I'd like to know more about your makeup services.",
}: WhatsAppButtonProps) {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-40 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 active:scale-95 rounded-full shadow-xl hover:shadow-2xl transition-all print:hidden"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" fill="white" />
    </a>
  )
}
