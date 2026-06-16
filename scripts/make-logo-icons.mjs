/**
 * Builds every Dinox logo asset from build/logo-master.png (the cut-out red
 * dinosaur paw, transparent). Composes it on a warm espresso circular badge
 * and emits all icons + a base64 string for the desktop launcher splash.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const paw = await loadImage(path.join(ROOT, "build/logo-master.png"));

const FILL = "#2B2017";   // espresso
const RING = "#4A3724";

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v));
  const r = cl((n >> 16) + amt), g = cl(((n >> 8) & 255) + amt), b = cl((n & 255) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function badge(size, { opaque = false } = {}) {
  const c = createCanvas(size, size);
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
  const r = size / 2;
  if (opaque) { x.fillStyle = shade(FILL, -14); x.fillRect(0, 0, size, size); }
  const g = x.createRadialGradient(r * 0.76, r * 0.64, r * 0.15, r, r, r);
  g.addColorStop(0, shade(FILL, 8));
  g.addColorStop(1, shade(FILL, -14));
  x.fillStyle = g;
  const inset = size * 0.012;
  x.beginPath(); x.arc(r, r, r - inset, 0, Math.PI * 2); x.fill();
  const lw = Math.max(2, size * 0.016);
  x.lineWidth = lw; x.strokeStyle = RING;
  x.beginPath(); x.arc(r, r, r - inset - lw / 2, 0, Math.PI * 2); x.stroke();
  const pw = size * 0.82;
  x.drawImage(paw, (size - pw) / 2, (size - pw) / 2 - size * 0.015, pw, pw);
  return c;
}
const png = (canvas) => canvas.toBuffer("image/png");

function buildIco(bufs, sizes) {
  const count = bufs.length, header = 6, entry = 16, dataOffset = header + entry * count;
  let off = dataOffset; const offsets = bufs.map((b) => { const o = off; off += b.length; return o; });
  const ico = Buffer.alloc(off); let p = 0;
  ico.writeUInt16LE(0, p); p += 2; ico.writeUInt16LE(1, p); p += 2; ico.writeUInt16LE(count, p); p += 2;
  for (let i = 0; i < count; i++) { const sz = sizes[i], dim = sz >= 256 ? 0 : sz;
    ico.writeUInt8(dim, p); p += 1; ico.writeUInt8(dim, p); p += 1; ico.writeUInt8(0, p); p += 1; ico.writeUInt8(0, p); p += 1;
    ico.writeUInt16LE(1, p); p += 2; ico.writeUInt16LE(32, p); p += 2; ico.writeUInt32LE(bufs[i].length, p); p += 4; ico.writeUInt32LE(offsets[i], p); p += 4; }
  for (let i = 0; i < count; i++) bufs[i].copy(ico, offsets[i]);
  return ico;
}

const SIZES = [16, 32, 48, 64, 128, 256];
const ico = buildIco(SIZES.map((s) => png(badge(s))), SIZES);
const W = (rel, buf) => { fs.writeFileSync(path.join(ROOT, rel), buf); console.log("✓", rel); };
W("build/logo-badge.png", png(badge(1024)));
W("build/icon.ico", ico);
W("build/icon-256.png", png(badge(256)));
W("build/icon.png", png(badge(256)));
W("app/favicon.ico", ico);
W("app/icon.png", png(badge(512)));
W("app/apple-icon.png", png(badge(256, { opaque: true })));
fs.writeFileSync(path.join(ROOT, "build/launcher-logo.b64"), png(badge(160)).toString("base64"));
console.log("✓ build/launcher-logo.b64");
