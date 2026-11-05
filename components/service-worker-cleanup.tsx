'use client'

import { useEffect } from 'react'

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister())
      })
    }
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.filter((key) => key.startsWith('maatrishishu-shell-')).forEach((key) => caches.delete(key))
      })
    }
  }, [])
  return null
}
