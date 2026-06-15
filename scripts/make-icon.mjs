/**
 * Generates build/icon.ico from build/icon.svg — the design dinosaur used
 * throughout the app. Renders the SVG at multiple sizes via @resvg/resvg-js
 * (proper gradient support) and packs the PNG frames into a multi-resolution ICO.
 */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "build");
const SVG_PATH = path.join(OUT_DIR, "icon.svg");

if (!fs.existsSync(SVG_PATH)) {
  console.error(`✗ Missing ${SVG_PATH}`);
  process.exit(1);
}

const svgBuffer = fs.readFileSync(SVG_PATH);

function rasterize(size) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  return resvg.render().asPng();
}

const SIZES = [16, 32, 48, 64, 128, 256];
const pngBuffers = SIZES.map(rasterize);

fs.writeFileSync(path.join(OUT_DIR, "icon-256.png"), pngBuffers[5]);
fs.writeFileSync(path.join(OUT_DIR, "icon.png"), pngBuffers[5]);
console.log("✓ Saved build/icon-256.png + build/icon.png (preview)");

function buildIco(bufs, sizes) {
  const count      = bufs.length;
  const headerSize = 6;
  const entrySize  = 16;
  const dataOffset = headerSize + entrySize * count;

  const offsets = [];
  let off = dataOffset;
  for (const buf of bufs) {
    offsets.push(off);
    off += buf.length;
  }

  const totalSize = off;
  const ico = Buffer.alloc(totalSize);
  let pos = 0;

  ico.writeUInt16LE(0, pos);      pos += 2;
  ico.writeUInt16LE(1, pos);      pos += 2;
  ico.writeUInt16LE(count, pos);  pos += 2;

  for (let i = 0; i < count; i++) {
    const sz  = sizes[i];
    const dim = sz >= 256 ? 0 : sz;
    ico.writeUInt8(dim, pos);                   pos += 1;
    ico.writeUInt8(dim, pos);                   pos += 1;
    ico.writeUInt8(0, pos);                     pos += 1;
    ico.writeUInt8(0, pos);                     pos += 1;
    ico.writeUInt16LE(1, pos);                  pos += 2;
    ico.writeUInt16LE(32, pos);                 pos += 2;
    ico.writeUInt32LE(bufs[i].length, pos);     pos += 4;
    ico.writeUInt32LE(offsets[i], pos);         pos += 4;
  }

  for (const buf of bufs) {
    buf.copy(ico, pos);
    pos += buf.length;
  }

  return ico;
}

const icoBuffer = buildIco(pngBuffers, SIZES);
fs.writeFileSync(path.join(OUT_DIR, "icon.ico"), icoBuffer);
console.log(`✓ Saved build/icon.ico (${(icoBuffer.length / 1024).toFixed(1)} KB, ${SIZES.length} sizes: ${SIZES.join("×, ")}×)`);
