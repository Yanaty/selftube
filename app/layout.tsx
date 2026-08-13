import './globals.css'
import type { ReactNode } from 'react'

export const metadata = { title: 'SelfTube', description: 'Видео для детей' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
