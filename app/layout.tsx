import './globals.css'
import type { ReactNode } from 'react'
import { startScheduler } from '@/lib/scheduler'
import { RegisterServiceWorker } from '@/components/pwa/RegisterServiceWorker'

if (typeof window === 'undefined') startScheduler()

export const metadata = {
  title: 'SelfTube',
  applicationName: 'SelfTube',
  description: 'Видео для детей — только то, что одобрил родитель',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  // iOS не умеет prompt на установку, но с этими тегами «На экран Домой» открывает
  // приложение без адресной строки — как отдельную аппку.
  appleWebApp: { capable: true, title: 'SelfTube', statusBarStyle: 'default' as const },
}

export const viewport = {
  themeColor: '#f97316',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
