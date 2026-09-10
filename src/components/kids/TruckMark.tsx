/** Монстр-трак с иконки приложения, нарисованный вектором — для крупных мест. */
export function TruckMark({ size = 140, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} role="img" aria-label="Мультики">
      <rect width="512" height="512" rx="104" fill="#2a8ef0" />
      <ellipse cx="256" cy="404" rx="168" ry="22" fill="#1565c0" />
      <rect x="150" y="292" width="224" height="18" fill="#37474f" />
      <rect x="92" y="196" width="208" height="84" rx="12" fill="#e53935" />
      <rect x="268" y="148" width="120" height="132" rx="18" fill="#e53935" />
      <rect x="366" y="208" width="62" height="72" rx="12" fill="#e53935" />
      <rect x="92" y="256" width="336" height="24" fill="#b71c1c" />
      <path d="M100 264 100 246 120 216 128 244 152 210 162 242 188 214 196 246 222 220 230 248 262 226 268 264Z" fill="#fdd835" />
      <rect x="286" y="166" width="86" height="52" rx="10" fill="#263238" />
      <circle cx="168" cy="322" r="80" fill="#212121" />
      <circle cx="168" cy="322" r="34" fill="#b0bec5" />
      <circle cx="352" cy="322" r="80" fill="#212121" />
      <circle cx="352" cy="322" r="34" fill="#b0bec5" />
    </svg>
  )
}
