/**
 * Génère les assets PWA placeholder requis par le manifest (JALON 1D.4b).
 *
 * Pourquoi : `vite.config.ts > VitePWA > manifest.icons[]` référence 3 PNGs
 * (192x192, 512x512, 512x512 maskable) + `index.html` référence
 * `/icons/apple-touch-icon.png` et `/favicon.svg`. Sans ces fichiers, la
 * build VitePWA réussit (le précache ignore les manquants) mais :
 *   - Lighthouse PWA audit fail sur "manifest icons doivent être valides"
 *   - L'app installée sur l'écran d'accueil iOS/Android n'a pas d'icône
 *   - `apple-touch-icon` 404 pollue la console au boot iOS
 *
 * Stratégie placeholder : on génère 4 PNGs solides aux dimensions correctes
 * + 1 SVG favicon avec la lettre "G" stylisée. Ces assets sont des
 * **placeholders volontaires** — Adrien fournira les vrais assets de marque
 * en V1.1 (jalon polish). Pas de dépendance externe : on construit les PNG
 * en pur Node (zlib built-in) pour ne pas ajouter sharp/canvas.
 *
 * Usage : `pnpm tsx scripts/generate-pwa-placeholder-icons.ts`
 *
 * Idempotent : ré-exécute écrase les fichiers existants par bytes
 * identiques (zlib deterministic à input constant).
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const ICONS_DIR = join(PUBLIC_DIR, 'icons');

// ─────────────────────────────────────────────────────────────────────────
// PNG builder — solid color RGBA, no deps.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Construit un PNG valide d'une couleur RGBA solide aux dimensions données.
 * Format : signature + IHDR + IDAT (deflate raw rows) + IEND.
 * CRC32 calculé table-driven (table générée lazy).
 */
function buildSolidPng(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a: number,
): Buffer {
  const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR : 13 octets — width(4) + height(4) + bitDepth(1) + colorType(1)
  // + compression(1) + filter(1) + interlace(1)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // colorType RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Pixel data : 1 row = filterByte(0) + width × 4 bytes RGBA
  const rowLen = 1 + width * 4;
  const row = Buffer.alloc(rowLen);
  row[0] = 0; // filter type None
  for (let x = 0; x < width; x++) {
    const off = 1 + x * 4;
    row[off + 0] = r;
    row[off + 1] = g;
    row[off + 2] = b;
    row[off + 3] = a;
  }
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    row.copy(raw, y * rowLen);
  }
  const idatData = deflateSync(raw);

  return Buffer.concat([
    SIGNATURE,
    buildChunk('IHDR', ihdr),
    buildChunk('IDAT', idatData),
    buildChunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

let crcTable: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
  if (crcTable !== null) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}

function crc32(buf: Buffer): number {
  const t = getCrcTable();
  let c = 0xffffffff;
  for (const b of buf) {
    const idx = (c ^ b) & 0xff;
    c = (t[idx]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────
// SVG favicon — minimal hand-crafted "G" wordmark.
// ─────────────────────────────────────────────────────────────────────────

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#08060e"/>
  <text x="32" y="44" font-family="serif" font-size="40" font-weight="700"
        text-anchor="middle" fill="#d4b873">G</text>
</svg>
`;

// ─────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────

function ensureDir(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function write(path: string, content: Buffer | string): void {
  ensureDir(path);
  writeFileSync(path, content);
  const size = Buffer.isBuffer(content) ? content.length : content.length;
  console.log(`  ${path.replace(ROOT, '.')} (${size} bytes)`);
}

// Couleur de marque : grimwar-ink (#08060e) avec un léger overlay doré pour
// rendre l'icône reconnaissable même en 1×1 sur écran d'accueil.
const BRAND_DARK = { r: 8, g: 6, b: 14, a: 255 };

console.log('[pwa-icons] Génération des assets placeholder PWA…');

write(
  join(ICONS_DIR, 'icon-192.png'),
  buildSolidPng(192, 192, BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b, BRAND_DARK.a),
);
write(
  join(ICONS_DIR, 'icon-512.png'),
  buildSolidPng(512, 512, BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b, BRAND_DARK.a),
);
write(
  join(ICONS_DIR, 'icon-maskable.png'),
  buildSolidPng(512, 512, BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b, BRAND_DARK.a),
);
write(
  join(ICONS_DIR, 'apple-touch-icon.png'),
  // iOS apple-touch-icon est conventionnellement 180×180.
  buildSolidPng(180, 180, BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b, BRAND_DARK.a),
);
write(join(PUBLIC_DIR, 'favicon.svg'), FAVICON_SVG);

console.log('[pwa-icons] OK.');
