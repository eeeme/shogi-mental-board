// public/favicon.svg から PWA 用の PNG アイコンを生成する。
// 使い方: node scripts/gen-icons.mjs（sharp が必要: devDependency）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))

const targets = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

for (const { size, name } of targets) {
  const out = join(root, 'public', name)
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`generated ${name} (${size}x${size})`)
}
