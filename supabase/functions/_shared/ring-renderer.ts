/**
 * ring-renderer.ts — SVG donut-ring PNG generator for invite emails.
 *
 * Builds each ring as an SVG with Instrument Sans 700 text,
 * rasterizes at 2x via @resvg/resvg-wasm, and uploads to the
 * public `email-assets` bucket.
 *
 * v3: SVG + resvg rasterization, real Instrument Sans type,
 *     208x208 (2x retina), opaque background.
 *
 * Content-addressed keys: rings/v3/fire-1-5.png, rings/v3/food-0-13.png
 * Same numerator/denominator pair reuses the same image.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import { INSTRUMENT_SANS_BOLD_B64 } from "./fonts/InstrumentSansBold.ts";

/* ── Constants (all values are 2x for retina) ────────────────── */

const SIZE = 208;           // displayed at 104 CSS px
const R = 68;               // circle radius (34 * 2)
const STROKE = 18;          // stroke width (9 * 2)
const CX = 104;             // centre x
const CY = 104;             // centre y

const TRACK_COLOR = '#E6DFCE';
const BG_COLOR = '#FAF7F0';
const TEXT_COLOR = '#1C2A3A';
const FONT_SIZE = 46;

/* ── WASM + font initialisation (once per cold start) ────────── */

let wasmReady = false;
let fontBytes: Uint8Array | null = null;

function decodeFontBytes(): Uint8Array {
  const bin = atob(INSTRUMENT_SANS_BOLD_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function ensureWasm(): Promise<void> {
  if (wasmReady) return;

  await initWasm(
    fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm'),
  );

  fontBytes = decodeFontBytes();
  wasmReady = true;
}

/* ── SVG builder ─────────────────────────────────────────────── */

function buildRingSvg(
  numerator: number,
  denominator: number,
  fgColor: string,
): string {
  const pct = denominator > 0 ? numerator / denominator : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;

  // Arc path: clockwise from 12 o'clock
  let arcMarkup = '';
  if (pct > 0 && pct < 1) {
    const angle = pct * 2 * Math.PI;
    const endX = CX + R * Math.sin(angle);
    const endY = CY - R * Math.cos(angle);
    const largeArc = angle > Math.PI ? 1 : 0;
    arcMarkup = `<path d="M ${CX} ${CY - R} A ${R} ${R} 0 ${largeArc} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}" fill="none" stroke="${fgColor}" stroke-width="${STROKE}"/>`;
  } else if (pct >= 1) {
    // Full circle (SVG arcs cannot sweep exactly 360)
    arcMarkup = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${fgColor}" stroke-width="${STROKE}"/>`;
  }
  // pct === 0: no arc, just the track

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG_COLOR}"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${TRACK_COLOR}" stroke-width="${STROKE}"/>
  ${arcMarkup}
  <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-family="Instrument Sans" font-weight="700" font-size="${FONT_SIZE}" fill="${TEXT_COLOR}">${pctLabel}</text>
</svg>`;
}

/* ── Render SVG to PNG via resvg-wasm ────────────────────────── */

async function renderRingPng(
  numerator: number,
  denominator: number,
  fgColor: string,
): Promise<Uint8Array> {
  await ensureWasm();

  const svg = buildRingSvg(numerator, denominator, fgColor);
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers: [fontBytes!],
    },
  });
  const rendered = resvg.render();
  return rendered.asPng();
}

/* ── Upload + public URL ─────────────────────────────────────── */

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
  const fireKey = `rings/v3/fire-${fireN}-${fireD}.png`;
  const foodKey = `rings/v3/food-${foodN}-${foodD}.png`;

  const supaUrl = Deno.env.get('SUPABASE_URL') || '';
  const base = `${supaUrl}/storage/v1/object/public/email-assets`;

  const { data: existing } = await supabase.storage
    .from('email-assets')
    .list('rings/v3', { search: `fire-${fireN}-${fireD}.png` });

  const fireExists = existing?.some(f => f.name === `fire-${fireN}-${fireD}.png`);

  if (!fireExists) {
    const firePng = await renderRingPng(fireN, fireD, '#B24A2E');
    await supabase.storage.from('email-assets').upload(fireKey, firePng, {
      contentType: 'image/png', upsert: true,
    });
  }

  const { data: existingFood } = await supabase.storage
    .from('email-assets')
    .list('rings/v3', { search: `food-${foodN}-${foodD}.png` });

  const foodExists = existingFood?.some(f => f.name === `food-${foodN}-${foodD}.png`);

  if (!foodExists) {
    const foodPng = await renderRingPng(foodN, foodD, '#3E6B8A');
    await supabase.storage.from('email-assets').upload(foodKey, foodPng, {
      contentType: 'image/png', upsert: true,
    });
  }

  return {
    fireRingUrl: `${base}/${fireKey}`,
    foodRingUrl: `${base}/${foodKey}`,
  };
}
