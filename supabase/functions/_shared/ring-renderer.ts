/**
 * ring-renderer.ts — pure-JS donut-ring PNG generator for invite emails.
 *
 * Renders an anti-aliased donut arc as raw RGBA pixels, encodes to PNG
 * using Deno's built-in CompressionStream (no npm dependency), and
 * uploads to the public `email-assets` Storage bucket.
 *
 * Content-addressed keys: rings/fire-1-5.png, rings/food-0-13.png, etc.
 * Same numerator/denominator pair reuses the same image.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/* ── Pixel rendering ─────────────────────────────────────────────── */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Render a donut-ring arc as RGBA pixel data.
 * Arc starts at 12-o'clock, sweeps clockwise.
 */
function renderRingPixels(
  numerator: number,
  denominator: number,
  fgHex: string,
  size: number,
  strokeWidth: number,
): Uint8Array {
  const [fgR, fgG, fgB] = parseHex(fgHex);
  const [bgR, bgG, bgB] = parseHex('#E6DFCE'); // track colour (matches mock)

  const pct = denominator > 0 ? numerator / denominator : 0;
  const arcAngle = pct * 2 * Math.PI;
  const cx = size / 2;
  const cy = size / 2;
  // Ring inset to ~74% of half-size (matches mock SVG r=34 in 104×104)
  const outerR = size * 0.37;
  const innerR = outerR - strokeWidth;

  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Anti-aliased ring mask (1px feather at edges)
      const aouter = clamp((outerR - dist) + 0.5, 0, 1);
      const ainner = clamp((dist - innerR) + 0.5, 0, 1);
      const ringAlpha = aouter * ainner;

      if (ringAlpha <= 0) continue;

      // Determine if pixel falls in active arc or background track
      let angle = Math.atan2(dx, -dy); // 12-o'clock = 0, clockwise
      if (angle < 0) angle += 2 * Math.PI;

      const inArc = arcAngle > 0 && angle <= arcAngle;
      const r = inArc ? fgR : bgR;
      const g = inArc ? fgG : bgG;
      const b = inArc ? fgB : bgB;

      const idx = (y * size + x) * 4;
      const a = Math.round(ringAlpha * 255);
      data[idx]     = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  return data;
}

/* ── Minimal PNG encoder (no npm dependency) ─────────────────────── */

function crc32Table(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}

const CRC_TABLE = crc32Table();

function crc32(buf: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function writeU32BE(arr: Uint8Array, offset: number, val: number) {
  arr[offset]     = (val >>> 24) & 0xFF;
  arr[offset + 1] = (val >>> 16) & 0xFF;
  arr[offset + 2] = (val >>>  8) & 0xFF;
  arr[offset + 3] =  val         & 0xFF;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  writeU32BE(chunk, 0, data.length);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  chunk.set(data, 8);
  // CRC over type + data
  const crcBuf = new Uint8Array(4 + data.length);
  crcBuf.set(chunk.subarray(4, 8), 0);
  crcBuf.set(data, 4);
  writeU32BE(chunk, 8 + data.length, crc32(crcBuf));
  return chunk;
}

async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  writer.write(raw);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function encodePng(width: number, height: number, rgba: Uint8Array): Promise<Uint8Array> {
  // PNG signature
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = new Uint8Array(13);
  writeU32BE(ihdr, 0, width);
  writeU32BE(ihdr, 4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: prepend filter byte (0 = None) to each row, then deflate
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + width * 4);
    raw[rowOff] = 0; // filter: None
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowOff + 1);
  }
  const compressed = await deflate(raw);

  // IEND
  const iendData = new Uint8Array(0);

  // Assemble
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', iendData);

  const png = new Uint8Array(sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let p = 0;
  png.set(sig, p); p += sig.length;
  png.set(ihdrChunk, p); p += ihdrChunk.length;
  png.set(idatChunk, p); p += idatChunk.length;
  png.set(iendChunk, p);
  return png;
}

/* ── Upload + public URL ─────────────────────────────────────────── */

const RING_SIZE = 104;
const STROKE_WIDTH = 9;

export interface RingUrls {
  fireRingUrl: string;
  foodRingUrl: string;
}

/**
 * Generate fire + food ring PNGs and upload to Supabase Storage.
 * Returns public URLs for use in email HTML.
 * Content-addressed: same n/d values reuse the same image.
 */
export async function generateRingImages(
  supabase: SupabaseClient,
  fireN: number,
  fireD: number,
  foodN: number,
  foodD: number,
): Promise<RingUrls> {
  const fireKey = `rings/fire-${fireN}-${fireD}.png`;
  const foodKey = `rings/food-${foodN}-${foodD}.png`;

  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const base = `${supaUrl}/storage/v1/object/public/email-assets`;

  // Check if images already exist (HEAD-like check via getPublicUrl + list)
  const { data: existing } = await supabase.storage
    .from('email-assets')
    .list('rings', { search: `fire-${fireN}-${fireD}.png` });

  const fireExists = existing?.some(f => f.name === `fire-${fireN}-${fireD}.png`);

  if (!fireExists) {
    const firePixels = renderRingPixels(fireN, fireD, '#B24A2E', RING_SIZE, STROKE_WIDTH);
    const firePng = await encodePng(RING_SIZE, RING_SIZE, firePixels);
    await supabase.storage.from('email-assets').upload(fireKey, firePng, {
      contentType: 'image/png', upsert: true,
    });
  }

  const { data: existingFood } = await supabase.storage
    .from('email-assets')
    .list('rings', { search: `food-${foodN}-${foodD}.png` });

  const foodExists = existingFood?.some(f => f.name === `food-${foodN}-${foodD}.png`);

  if (!foodExists) {
    const foodPixels = renderRingPixels(foodN, foodD, '#3E6B8A', RING_SIZE, STROKE_WIDTH);
    const foodPng = await encodePng(RING_SIZE, RING_SIZE, foodPixels);
    await supabase.storage.from('email-assets').upload(foodKey, foodPng, {
      contentType: 'image/png', upsert: true,
    });
  }

  return {
    fireRingUrl: `${base}/${fireKey}`,
    foodRingUrl: `${base}/${foodKey}`,
  };
}
