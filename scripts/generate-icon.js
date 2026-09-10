// Генератор иконки: рисуем монстр-трак на синем фоне и кодируем PNG вручную.
// Внешних библиотек нет, поэтому: свой растеризатор примитивов + свой PNG-энкодер.
const zlib = require('zlib')
const fs = require('fs')

const SS = 4 // суперсэмплинг: рисуем в 4 раза крупнее и уменьшаем — так получаются гладкие края
const S = 512
const W = S * SS

const buf = Buffer.alloc(W * W * 3)

const px = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= W || y >= W) return
  const i = (y * W + x) * 3
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b
}

// --- примитивы (координаты в пространстве 512, масштабируются внутри) ---
const sc = (v) => Math.round(v * SS)

function gradientBg(top, bottom) {
  for (let y = 0; y < W; y++) {
    const t = y / (W - 1)
    const c = [0, 1, 2].map((i) => Math.round(top[i] + (bottom[i] - top[i]) * t))
    for (let x = 0; x < W; x++) px(x, y, c)
  }
}

function rect(x0, y0, x1, y1, c) {
  for (let y = sc(y0); y < sc(y1); y++) for (let x = sc(x0); x < sc(x1); x++) px(x, y, c)
}

function roundRect(x0, y0, x1, y1, r, c) {
  const [X0, Y0, X1, Y1, R] = [sc(x0), sc(y0), sc(x1), sc(y1), sc(r)]
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      const dx = x < X0 + R ? X0 + R - x : x > X1 - R - 1 ? x - (X1 - R - 1) : 0
      const dy = y < Y0 + R ? Y0 + R - y : y > Y1 - R - 1 ? y - (Y1 - R - 1) : 0
      if (dx * dx + dy * dy <= R * R) px(x, y, c)
    }
  }
}

function ellipse(cx, cy, rx, ry, c) {
  const [CX, CY, RX, RY] = [sc(cx), sc(cy), sc(rx), sc(ry)]
  for (let y = CY - RY; y <= CY + RY; y++) {
    for (let x = CX - RX; x <= CX + RX; x++) {
      const dx = (x - CX) / RX, dy = (y - CY) / RY
      if (dx * dx + dy * dy <= 1) px(x, y, c)
    }
  }
}

const circle = (cx, cy, r, c) => ellipse(cx, cy, r, r, c)

function polygon(pts, c) {
  const P = pts.map(([x, y]) => [sc(x), sc(y)])
  const ys = P.map((p) => p[1])
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    const xs = []
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j]
      if ((yi > y) !== (yj > y)) xs.push(xi + ((y - yi) / (yj - yi)) * (xj - xi))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) px(x, y, c)
    }
  }
}

// --- палитра ---
const BLUE_TOP = [79, 172, 254]
const BLUE_BOT = [25, 118, 210]
const SHADOW = [21, 101, 192]
const RED = [229, 57, 53]
const RED_DARK = [183, 28, 28]
const YELLOW = [253, 216, 53]
const ORANGE = [251, 140, 0]
const TIRE = [33, 33, 33]
const TIRE_IN = [55, 55, 55]
const RIM = [176, 190, 197]
const RIM_IN = [120, 144, 156]
const GLASS = [38, 50, 56]
const GLASS_HI = [144, 202, 249]
const CHASSIS = [55, 71, 79]

// --- сцена ---
gradientBg(BLUE_TOP, BLUE_BOT)
ellipse(256, 404, 168, 22, SHADOW) // тень под машиной

// рама между колёсами
rect(150, 292, 374, 310, CHASSIS)
polygon([[186, 288], [214, 288], [198, 322], [170, 322]], CHASSIS)
polygon([[316, 288], [344, 288], [328, 322], [300, 322]], CHASSIS)

// кузов: платформа + кабина + капот
roundRect(92, 196, 300, 280, 12, RED)
roundRect(268, 148, 388, 280, 18, RED)
roundRect(366, 208, 428, 280, 12, RED)
rect(92, 256, 428, 280, RED_DARK) // тень по низу кузова

// пламя вдоль борта — узнаваемая деталь монстр-трака.
// Языки наклонены вперёд, разной высоты: так это читается как огонь, а не как зубцы.
function flame(x0, h, c) {
  polygon([
    [x0, 262], [x0, 248], [x0 + 10, 248 - h * 0.55], [x0 + 22, 248 - h],
    [x0 + 30, 248 - h * 0.45], [x0 + 40, 248 - h * 0.7], [x0 + 44, 250], [x0 + 44, 262],
  ], c)
}
rect(100, 246, 300, 264, ORANGE)
for (const [x, h] of [[100, 34], [142, 50], [186, 38], [228, 56], [268, 30]]) flame(x, h, ORANGE)
for (const [x, h] of [[106, 22], [148, 34], [192, 24], [234, 38], [272, 18]]) flame(x, h, YELLOW)
rect(100, 254, 300, 264, YELLOW)

// стекло кабины
roundRect(286, 166, 372, 218, 10, GLASS)
polygon([[290, 214], [318, 170], [334, 170], [300, 214]], GLASS_HI)

// фара
roundRect(412, 220, 428, 242, 6, YELLOW)

// колёса
for (const cx of [168, 352]) {
  circle(cx, 322, 80, TIRE)
  circle(cx, 322, 66, TIRE_IN)
  circle(cx, 322, 34, RIM)
  circle(cx, 322, 13, RIM_IN)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    circle(cx + Math.cos(a) * 24, 322 + Math.sin(a) * 24, 5, RIM_IN)
  }
  // протектор
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    circle(cx + Math.cos(a) * 73, 322 + Math.sin(a) * 73, 6, TIRE)
  }
}

// --- уменьшение с усреднением по площади ---
function downsample(size) {
  const out = Buffer.alloc(size * size * 3)
  const step = W / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * step), x1 = Math.floor((x + 1) * step)
      const y0 = Math.floor(y * step), y1 = Math.floor((y + 1) * step)
      let r = 0, g = 0, b = 0, n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * W + sx) * 3
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; n++
        }
      }
      const o = (y * size + x) * 3
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n
    }
  }
  return out
}

// --- PNG-энкодер (RGB8, без фильтров) ---
function crc32(b) {
  let c, crc = 0xffffffff
  for (let n = 0; n < b.length; n++) {
    c = (crc ^ b[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function writePng(path, rgb, size) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  fs.writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]))
  console.log(path, size + 'x' + size, fs.statSync(path).size + ' байт')
}

const out = process.argv[2] || '.'
writePng(`${out}/icon-512.png`, downsample(512), 512)
writePng(`${out}/icon-192.png`, downsample(192), 192)
