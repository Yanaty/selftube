// Минимальный service worker: нужен только для того, чтобы приложение можно было
// установить на телефон (Chrome требует SW, который отвечает даже без сети).
// Ничего не кешируем — весь контент всегда идёт из сети, поэтому у ребёнка не может
// оказаться устаревший каталог, а у родителя — залипший старый экран админки.

const OFFLINE_HTML = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Мультики</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#fffbeb; font-family:system-ui,-apple-system,sans-serif; text-align:center; }
  div { padding:24px; }
  p { color:#57534e; }
</style></head>
<body><div>
  <svg width="112" height="112" viewBox="0 0 512 512" role="img" aria-label="Мультики">
    <rect width="512" height="512" rx="104" fill="#2a8ef0"/>
    <ellipse cx="256" cy="404" rx="168" ry="22" fill="#1565c0"/>
    <rect x="150" y="292" width="224" height="18" fill="#37474f"/>
    <rect x="92" y="196" width="208" height="84" rx="12" fill="#e53935"/>
    <rect x="268" y="148" width="120" height="132" rx="18" fill="#e53935"/>
    <rect x="366" y="208" width="62" height="72" rx="12" fill="#e53935"/>
    <rect x="92" y="256" width="336" height="24" fill="#b71c1c"/>
    <path d="M100 264 100 246 120 216 128 244 152 210 162 242 188 214 196 246 222 220 230 248 262 226 268 264Z" fill="#fdd835"/>
    <rect x="286" y="166" width="86" height="52" rx="10" fill="#263238"/>
    <circle cx="168" cy="322" r="80" fill="#212121"/><circle cx="168" cy="322" r="34" fill="#b0bec5"/>
    <circle cx="352" cy="322" r="80" fill="#212121"/><circle cx="352" cy="322" r="34" fill="#b0bec5"/>
  </svg>
  <h1 style="color:#1c1917">Нет интернета</h1>
  <p>Видео появятся, когда связь вернётся.</p>
</div></body></html>`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  // Вмешиваемся только в переходы по страницам: запросы данных, картинок и
  // серверных действий идут мимо нас, как будто SW нет вовсе.
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  )
})
