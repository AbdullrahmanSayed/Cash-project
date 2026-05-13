'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to console for diagnostics
    console.error('App error boundary caught:', error)
  }, [error])

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-[#0B0D13] px-4"
    >
      <div className="max-w-md w-full bg-[#151821] border border-[#1E2233] rounded-2xl p-8 text-center shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-sm text-muted-foreground mb-6">
          نأسف على الإزعاج. حدث خطأ أثناء معالجة طلبك. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
        </p>
        {error?.message && (
          <div className="mb-6 px-3 py-2 rounded-lg bg-[#1A1E2A] border border-[#1E2233] text-right">
            <p className="text-xs text-red-400 break-words font-mono">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] text-muted-foreground mt-1">رمز الخطأ: {error.digest}</p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-[#0B0D13] rounded-xl text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            إعادة المحاولة
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/'
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1E2A] hover:bg-[#222738] border border-[#1E2233] text-foreground rounded-xl text-sm font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}
