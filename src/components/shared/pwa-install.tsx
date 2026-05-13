'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone

    if (isIosDevice && !isInStandaloneMode) {
      const dismissed = localStorage.getItem('pwa_ios_dismissed')
      if (!dismissed) {
        setIsIos(true)
        setShowBanner(true)
      }
      return
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      const dismissed = localStorage.getItem('pwa_dismissed')
      if (!dismissed) {
        setInstallEvent(e as BeforeInstallPromptEvent)
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setInstallEvent(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    const key = isIos ? 'pwa_ios_dismissed' : 'pwa_dismissed'
    localStorage.setItem(key, '1')
  }

  if (isInstalled || !showBanner) return null

  // iOS instructions banner
  if (isIos) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-[#151821] border border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50 mx-auto max-w-sm" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">ثبّت التطبيق على iPhone</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                اضغط على{' '}
                <span className="text-amber-400 font-medium">زر المشاركة</span>
                {' '}ثم{' '}
                <span className="text-amber-400 font-medium">"إضافة للشاشة الرئيسية"</span>
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Android/Desktop install banner
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-[#151821] border border-amber-500/30 rounded-2xl shadow-2xl shadow-black/50 mx-auto max-w-sm overflow-hidden" dir="rtl">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
              <span className="text-black text-xl">🏪</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">ثبّت نظام المعرض</p>
              <p className="text-xs text-muted-foreground mt-0.5">استخدمه كتطبيق بدون متجر تطبيقات</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 gold-gradient text-black text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            تثبيت الآن
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 bg-[#1A1E2A] border border-[#1E2233] text-muted-foreground text-sm rounded-xl hover:border-amber-500/20 transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  )
}
