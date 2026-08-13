import type { ReactNode } from 'react'
export default function KidsLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-amber-50">{children}</div>
}
