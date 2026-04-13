/**
 * Generates build/icon.ico — a minimalist T-Rex for Dinox desktop app.
 * Uses @napi-rs/canvas for rasterising; packs PNG frames into ICO manually.
 */
import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "build");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Palette ──────────────────────────────────────────────────────────────────
const BG    = "#0f172a";   // deep navy
const DINO  = "#14b8a6";   // teal (app accent)
const EYE   = "#ffffff";   // white eye
const CLAW  = "#0d9488";   // darker teal for depth

// ── Draw dinosaur on a given canvas size ─────────────────────────────────────
function drawDino(size) {
  const canvas = createCanvas(size, size);
  const ctx    = canvas.getContext("2d");
  const s      = size / 64;  // scale factor (design base = 64px)

  // helpers
  const r  = (x, y, w, h, rx = 0) => {
    ctx.beginPath();
    if (rx > 0) {
      ctx.roundRect(x * s, y * s, w * s, h * s, rx * s);
    } else {
      ctx.rect(x * s, y * s, w * s, h * s);
    }
    ctx.fill();
  };

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);

  // ── Body ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = DINO;
  r(14, 30, 28, 18, 4);   // main torso

  // ── Tail ─────────────────────────────────────────────────────────────────
  // tapered tail going left-down
  ctx.beginPath();
  ctx.moveTo(14 * s, 40 * s);
  ctx.lineTo(14 * s, 46 * s);
  ctx.lineTo(5  * s, 52 * s);
  ctx.lineTo(4  * s, 50 * s);
  ctx.lineTo(10 * s, 44 * s);
  ctx.lineTo(10 * s, 40 * s);
  ctx.closePath();
  ctx.fill();

  // ── Neck + Head ──────────────────────────────────────────────────────────
  r(30, 18, 14, 16, 3);   // neck+head block
  // snout extension
  r(40, 22, 10, 8, 2);

  // ── Tiny arms ────────────────────────────────────────────────────────────
  ctx.fillStyle = CLAW;
  r(32, 37, 5, 3, 1);     // upper arm
  r(34, 40, 4, 2, 1);     // forearm

  // ── Legs ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = DINO;
  r(17, 46, 8, 12, 2);    // left leg
  r(28, 46, 8, 12, 2);    // right leg

  // claws (feet)
  ctx.fillStyle = CLAW;
  r(15, 56, 4, 3, 1);     // left claw L
  r(20, 56, 4, 3, 1);     // left claw R
  r(26, 56, 4, 3, 1);     // right claw L
  r(31, 56, 4, 3, 1);     // right claw R

  // ── Eye ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = EYE;
  ctx.beginPath();
  ctx.arc(46 * s, 23 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // pupil
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(47 * s, 23 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // ── Spikes on back ───────────────────────────────────────────────────────
  ctx.fillStyle = CLAW;
  const spikes = [[31,18],[34,15],[37,13],[40,15],[43,17]];
  for (const [sx, sy] of spikes) {
    ctx.beginPath();
    ctx.moveTo(sx      * s, (sy + 5) * s);
    ctx.lineTo((sx + 2) * s, sy      * s);
    ctx.lineTo((sx + 4) * s, (sy + 5) * s);
    ctx.closePath();
    ctx.fill();
  }

  return canvas;
}

// ── Generate PNG buffers at each ICO size ────────────────────────────────────
const SIZES = [16, 32, 48, 64, 128, 256];
const pngBuffers = SIZES.map(sz => {
  const canvas = drawDino(sz);
  return canvas.toBuffer("image/png");
});

// Save a preview PNG for inspection
fs.writeFileSync(path.join(OUT_DIR, "icon-256.png"), pngBuffers[5]);
console.log("✓ Saved build/icon-256.png (preview)");

// ── Pack PNG frames into ICO ──────────────────────────────────────────────────
// ICO format: ICONDIR (6 bytes) + N×ICONDIRENTRY (16 bytes each) + image data
// Modern ICO supports embedded PNG (Windows Vista+)
function buildIco(bufs, sizes) {
  const count        = bufs.length;
  const headerSize   = 6;
  const entrySize    = 16;
  const dataOffset   = headerSize + entrySize * count;

  // Compute offsets
  const offsets = [];
  let off = dataOffset;
  for (const buf of bufs) {
    offsets.push(off);
    off += buf.length;
  }

  const totalSize = off;
  const ico = Buffer.alloc(totalSize);
  let pos = 0;

  // ICONDIR
  ico.writeUInt16LE(0, pos);      pos += 2;  // reserved
  ico.writeUInt16LE(1, pos);      pos += 2;  // type = 1 (icon)
  ico.writeUInt16LE(count, pos);  pos += 2;  // count

  // ICONDIRENTRY per image
  for (let i = 0; i < count; i++) {
    const sz  = sizes[i];
    const dim = sz >= 256 ? 0 : sz;          // 0 means 256 in ICO spec
    ico.writeUInt8(dim,           pos);     pos += 1;  // width
    ico.writeUInt8(dim,           pos);     pos += 1;  // height
    ico.writeUInt8(0,             pos);     pos += 1;  // color count (0 = >256 colors)
    ico.writeUInt8(0,             pos);     pos += 1;  // reserved
    ico.writeUInt16LE(1,          pos);     pos += 2;  // planes
    ico.writeUInt16LE(32,         pos);     pos += 2;  // bit count
    ico.writeUInt32LE(bufs[i].length, pos); pos += 4;  // bytes in resource
    ico.writeUInt32LE(offsets[i], pos);     pos += 4;  // offset from start
  }

  // Image data
  for (const buf of bufs) {
    buf.copy(ico, pos);
    pos += buf.length;
  }

  return ico;
}

const icoBuffer = buildIco(pngBuffers, SIZES);
const icoPath   = path.join(OUT_DIR, "icon.ico");
fs.writeFileSync(icoPath, icoBuffer);
console.log(`✓ Saved build/icon.ico (${(icoBuffer.length / 1024).toFixed(1)} KB, ${SIZES.length} sizes: ${SIZES.join("×, ")}×)`);
