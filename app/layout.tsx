import './globals.css'
import type { ReactNode } from 'react'
import { startScheduler } from '@/lib/scheduler'

if (typeof window === 'undefined') startScheduler()

export const metadata = { title: 'SelfTube', description: 'Видео для детей' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
