'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function StripeCallbackPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const connected = searchParams.get('connected') === 'true'
    router.replace(connected ? '/account/stripe?connected=true' : '/account/stripe')
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  )
}

export default function StripeCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>}>
      <StripeCallbackPageContent />
    </Suspense>
  )
}
