'use client'
import { useEffect } from 'react'

/** Регистрирует минимальный SW — только ради возможности установить приложение. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Установка приложения — приятный бонус, а не условие работы: молча живём дальше.
    })
  }, [])
  return null
}
