// Минимальный service worker: нужен только для того, чтобы приложение можно было
// установить на телефон (Chrome требует SW, который отвечает даже без сети).
// Ничего не кешируем — весь контент всегда идёт из сети, поэтому у ребёнка не может
// оказаться устаревший каталог, а у родителя — залипший старый экран админки.

const OFFLINE_HTML = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SelfTube</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#fffbeb; font-family:system-ui,-apple-system,sans-serif; text-align:center; }
  div { padding:24px; }
  p { color:#57534e; }
</style></head>
<body><div>
  <div style="font-size:56px">🦊</div>
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
