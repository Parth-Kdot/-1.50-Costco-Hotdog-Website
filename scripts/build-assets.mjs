// Generates every raster the site uses from the one group photo plus procedural noise.
// Run with `npm run assets`. Output goes to public/gen and is committed.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { portraits, screen } from './regions.mjs'

const SRC = 'public/photos/family.webp'
const OUT = 'public/gen'
await mkdir(OUT, { recursive: true })

const INK = [0x2c, 0x2b, 0x33]
const PAPER = [0xf5, 0xf2, 0xea]
const CARD_PAPER = [0xe9, 0xe4, 0xd8]

// Deterministic PRNG so rebuilding gives identical files.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Tileable value noise on a lattice that wraps every `period` cells.
function valueNoise(size, period, seed) {
  const r = rng(seed)
  const lattice = Array.from({ length: period * period }, () => r())
  const at = (x, y) => lattice[((y % period) + period) % period * period + (((x % period) + period) % period)]
  const smooth = (t) => t * t * (3 - 2 * t)
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * period
      const fy = (y / size) * period
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = smooth(fx - x0)
      const ty = smooth(fy - y0)
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
      out[y * size + x] = a + (b - a) * ty
    }
  }
  return out
}

function rawPng(data, width, height, channels) {
  return sharp(Buffer.from(data), { raw: { width, height, channels } }).png({ compressionLevel: 9 })
}

// 1. Concrete floor tile
{
  const S = 512
  const big = valueNoise(S, 4, 11)
  const mid = valueNoise(S, 16, 12)
  const r = rng(13)
  const px = new Uint8Array(S * S * 3)
  const base = [0xd9, 0xd6, 0xcf]
  for (let i = 0; i < S * S; i++) {
    const blotch = (big[i] - 0.5) * 0.08 + (mid[i] - 0.5) * 0.05
    const grain = (r() - 0.5) * 0.08
    const k = 1 + blotch + grain
    px[i * 3] = Math.max(0, Math.min(255, base[0] * k))
    px[i * 3 + 1] = Math.max(0, Math.min(255, base[1] * k))
    px[i * 3 + 2] = Math.max(0, Math.min(255, base[2] * k))
  }
  await rawPng(px, S, S, 3).toFile(`${OUT}/concrete.png`)
}

// 2. Paper grain, used as a multiply layer
{
  const S = 256
  const r = rng(21)
  const fib = valueNoise(S, 32, 22)
  const px = new Uint8Array(S * S * 4)
  for (let i = 0; i < S * S; i++) {
    const v = 120 + (r() - 0.5) * 90 + (fib[i] - 0.5) * 40
    px[i * 4] = v
    px[i * 4 + 1] = v
    px[i * 4 + 2] = v
    px[i * 4 + 3] = Math.round(r() * 30 + fib[i] * 20)
  }
  await rawPng(px, S, S, 4).toFile(`${OUT}/grain.png`)
}

// 3. Rubber stamp ink mask: mostly solid, with dry gaps, speckle and uneven pressure
{
  const S = 1024
  const Ht = 512
  const a1 = valueNoise(S, 20, 31)
  const a2 = valueNoise(S, 44, 35)
  const press = valueNoise(S, 5, 32)
  const r = rng(34)
  const alpha = new Float32Array(S * Ht)
  for (let y = 0; y < Ht; y++) {
    for (let x = 0; x < S; x++) {
      const j = y * S + x
      let a = 0.78 + 0.22 * (press[j] * 0.6 + (x / S) * 0.4)
      const gap = a1[j] * 0.65 + a2[j] * 0.35
      // soft-edged dry patches
      a *= 1 - Math.max(0, Math.min(1, (gap - 0.66) / 0.05)) * 0.8
      alpha[y * S + x] = a
    }
  }
  // round speckles where the rubber missed
  for (let k = 0; k < 900; k++) {
    const cx = r() * S
    const cy = r() * Ht
    const rad = 0.6 + r() * r() * 3.2
    for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
      for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        if (x < 0 || y < 0 || x >= S || y >= Ht) continue
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) alpha[y * S + x] *= 0.15
      }
    }
  }
  const px = new Uint8Array(S * Ht * 4)
  for (let i = 0; i < S * Ht; i++) px[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, alpha[i])) * 255)
  await rawPng(px, S, Ht, 4).toFile(`${OUT}/ink.png`)
}

// Helpers for dithering
async function grey(input, width, lift = 1) {
  const { data, info } = await sharp(input)
    .resize({ width })
    .greyscale()
    .normalise()
    .linear(1.15, -12)
    .raw()
    .toBuffer({ resolveWithObject: true })
  // lift > 1 brightens the mid-tones so the wall thins out and faces keep detail
  const g = Float32Array.from(data, (v) => 255 * Math.pow(v / 255, 1 / lift))
  return { g, w: info.width, h: info.height }
}

function twoTone(bits, w, h, ink, paper) {
  const px = new Uint8Array(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    const c = bits[i] ? paper : ink
    px[i * 3] = c[0]
    px[i * 3 + 1] = c[1]
    px[i * 3 + 2] = c[2]
  }
  return px
}

function atkinson({ g, w, h }) {
  const bits = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const old = g[i]
      const nv = old > 128 ? 255 : 0
      bits[i] = nv ? 1 : 0
      const err = (old - nv) / 8
      const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]
      for (const [dx, dy] of spread) {
        const xx = x + dx
        const yy = y + dy
        if (xx >= 0 && xx < w && yy < h) g[yy * w + xx] += err
      }
    }
  }
  return bits
}

const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
]
function bayer({ g, w, h }) {
  const bits = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = ((BAYER8[(y % 8) * 8 + (x % 8)] + 0.5) / 64) * 255
      bits[y * w + x] = g[y * w + x] > t ? 1 : 0
    }
  }
  return bits
}

// 4. Scanner layers: colour photo at two widths, and a 1-bit Atkinson print
await sharp(SRC).resize({ width: 900 }).webp({ quality: 82 }).toFile(`${OUT}/family-900.webp`)
await sharp(SRC).webp({ quality: 86 }).toFile(`${OUT}/family-1396.webp`)
{
  const src = await grey(SRC, 698)
  const bits = atkinson(src)
  await rawPng(twoTone(bits, src.w, src.h, INK, PAPER), src.w, src.h, 3).toFile(`${OUT}/family-dither.png`)
}

// 5. Membership card portraits: ordered dither, ink on card paper, rendered at 2x
for (const [id, region] of Object.entries(portraits)) {
  const crop = await sharp(SRC).extract(region).toBuffer()
  const src = await grey(crop, id === 'jay' ? 150 : 176, id === 'jay' ? 1 : 1.6)
  const bits = bayer(src)
  await rawPng(twoTone(bits, src.w, src.h, INK, CARD_PAPER), src.w, src.h, 3).toFile(`${OUT}/portrait-${id}.png`)
}

// 6. Jay on the laptop screen: three block sizes, then sharp
{
  const crop = await sharp(SRC).extract(screen).toBuffer()
  for (const block of [16, 8, 4]) {
    const w = Math.ceil(screen.width / block)
    const h = Math.ceil(screen.height / block)
    await sharp(crop)
      .resize(w, h, { kernel: 'cubic' })
      .resize(w * block, h * block, { kernel: 'nearest' })
      .extract({ left: 0, top: 0, width: screen.width, height: screen.height })
      .png()
      .toFile(`${OUT}/screen-${block}.png`)
  }
  await sharp(crop).resize({ width: screen.width * 2, kernel: 'lanczos3' }).png().toFile(`${OUT}/screen-sharp.png`)
}

// 7. Share card for link previews
{
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#D9D6CF"/>
    <rect x="120" y="120" width="960" height="390" fill="#15130F"/>
    <text x="600" y="330" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="190" fill="#FFF4DA" text-anchor="middle">$1.50</text>
    <text x="600" y="420" font-family="Courier New, monospace" font-size="34" fill="#F3C12E" text-anchor="middle" letter-spacing="6">SINCE 1985 · 6 MEMBERS</text>
    <rect x="0" y="580" width="1200" height="50" fill="#F3C12E"/>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/share.png`)
}

console.log('assets written to', OUT)
