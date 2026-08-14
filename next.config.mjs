/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // better-sqlite3 — нативный модуль (драйвер-адаптер Prisma 7). Его нельзя бандлить
  // webpack'ом, иначе нативная привязка не находится в рантайме (undefined.indexOf).
  // Externalize: подгружать из node_modules во время выполнения на сервере.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
  },
}
export default nextConfig
