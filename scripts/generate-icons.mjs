import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// CRC32 helper for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function createIconPng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const rOuter = size * 0.38;
  const rRingMax = size * 0.23;
  const rRingMin = size * 0.14;
  const rDot = size * 0.07;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      // Graphite background (#141415)
      let r = 20, g = 20, b = 21, a = 255;

      // Emerald circle (#4cc38a)
      if (dist <= rOuter) {
        r = 76;
        g = 195;
        b = 138;
      }

      // Inner target ring & bullseye (#141415)
      if ((dist >= rRingMin && dist <= rRingMax) || dist <= rDot) {
        r = 20;
        g = 20;
        b = 21;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
}

/**
 * Wraps PNG buffers into a valid Windows .ico container (PNG-in-ICO format supported since Windows Vista).
 */
function createIcoFromPngs(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4); // Color planes
    dir.writeUInt16LE(32, 6); // Bits per pixel
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.png)]);
}

const extIconsDir = path.resolve("extension/assets/icons");
const tauriIconsDir = path.resolve("desktop/src-tauri/icons");
fs.mkdirSync(extIconsDir, { recursive: true });
fs.mkdirSync(tauriIconsDir, { recursive: true });

for (const size of [16, 32, 48, 128, 256]) {
  const png = createIconPng(size);
  if ([16, 48, 128].includes(size)) {
    fs.writeFileSync(path.join(extIconsDir, `icon${size}.png`), png);
    fs.writeFileSync(path.join(tauriIconsDir, `icon${size}.png`), png);
  }
  if (size === 32) {
    fs.writeFileSync(path.join(tauriIconsDir, "32x32.png"), png);
  }
  if (size === 128) {
    fs.writeFileSync(path.join(tauriIconsDir, "128x128.png"), png);
    fs.writeFileSync(path.join(tauriIconsDir, "icon.png"), png);
  }
  if (size === 256) {
    fs.writeFileSync(path.join(tauriIconsDir, "128x128@2x.png"), png);
  }
}

const icoBuf = createIcoFromPngs([
  { size: 16, png: createIconPng(16) },
  { size: 32, png: createIconPng(32) },
  { size: 48, png: createIconPng(48) },
  { size: 256, png: createIconPng(256) }
]);
fs.writeFileSync(path.join(tauriIconsDir, "icon.ico"), icoBuf);
console.log("Generated PNG and Windows ICO icons for extension and Tauri desktop");
