/**
 * Draws the Wagez app icons.
 *
 * The icons are the Wagez gradient with the W of the wordmark cut into it, so
 * an installed Wagez is recognisable from the home screen before it is opened.
 * They are drawn here rather than exported from a design tool because the
 * gradient is a design token: it is defined once, in `globals.css`, and the
 * icons have to be that gradient rather than a copy of it that drifts.
 *
 * Run with `node scripts/generate-icons.mjs` after changing anything below.
 * The output is committed — this is not part of the build.
 */

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The gradient, exactly as `--wagez-gradient` defines it. */
const GRADIENT = {
  angle: 315,
  stops: [
    { at: 0, color: [0x00, 0xff, 0x87] },
    { at: 0.5, color: [0x00, 0xff, 0xd0] },
    { at: 1, color: [0x60, 0xef, 0xff] },
  ],
};

/** `--wagez-ink`, the colour the wordmark is written in. */
const INK = [0x16, 0x16, 0x1d];

/**
 * The W, as the path a pen would take: down, up, down, up, in a box running
 * from 0 to 1 across and 0 (top) to 1 (bottom).
 */
const W_PATH = [
  [0.0, 0.0],
  [0.26, 1.0],
  [0.5, 0.36],
  [0.74, 1.0],
  [1.0, 0.0],
];

/** Half the pen's width, as a fraction of the box the W is drawn in. */
const STROKE = 0.088;

/** Samples per pixel per axis. Enough to keep the diagonals smooth. */
const SUPERSAMPLE = 4;

/**
 * Where a point falls along a CSS gradient line, from 0 at the first stop to 1
 * at the last.
 *
 * A CSS angle is measured clockwise from "up", and the line is long enough that
 * the corners of the box land exactly on its ends.
 */
function gradientPosition(x, y, size, angle) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(size * dx) + Math.abs(size * dy);
  const half = size / 2;
  return ((x - half) * dx + (y - half) * dy) / length + 0.5;
}

/** The gradient's colour at `position`, interpolated between its stops. */
function gradientColor(position) {
  const { stops } = GRADIENT;
  const clamped = Math.min(Math.max(position, 0), 1);

  for (let i = 1; i < stops.length; i += 1) {
    const from = stops[i - 1];
    const to = stops[i];
    if (clamped > to.at) continue;

    const span = to.at - from.at;
    const t = span === 0 ? 0 : (clamped - from.at) / span;
    return from.color.map((channel, c) =>
      Math.round(channel + (to.color[c] - channel) * t),
    );
  }

  return stops.at(-1).color;
}

/** Distance from a point to a line segment. */
function distanceToSegment(x, y, [ax, ay], [bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const lengthSquared = vx * vx + vy * vy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(
          Math.max(((x - ax) * vx + (y - ay) * vy) / lengthSquared, 0),
          1,
        );
  return Math.hypot(x - (ax + vx * t), y - (ay + vy * t));
}

/**
 * How much of the W covers this sample, from 0 (none) to 1 (solid).
 *
 * The mark is a stroked path rather than a filled outline, so a point is inside
 * it when it is within half a pen width of any of its segments.
 */
function inMark(x, y, box) {
  const u = (x - box.x) / box.size;
  const v = (y - box.y) / box.size;
  if (u < -STROKE || u > 1 + STROKE || v < -STROKE || v > 1 + STROKE) {
    return false;
  }

  for (let i = 1; i < W_PATH.length; i += 1) {
    if (distanceToSegment(u, v, W_PATH[i - 1], W_PATH[i]) <= STROKE) {
      return true;
    }
  }
  return false;
}

/**
 * The icon itself, as raw RGBA pixels.
 *
 * @param {number} size    pixels on a side.
 * @param {number} markSize how much of that the W takes up, 0 to 1.
 */
function drawIcon(size, markSize) {
  const pixels = Buffer.alloc(size * size * 4);
  const box = {
    size: size * markSize,
    x: (size * (1 - markSize)) / 2,
    // The W reads as centred when it sits a little above the true middle.
    y: (size * (1 - markSize)) / 2 - size * markSize * 0.02,
  };
  const step = 1 / SUPERSAMPLE;
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const background = gradientColor(
        gradientPosition(x + 0.5, y + 0.5, size, GRADIENT.angle),
      );

      let covered = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          if (inMark(x + (sx + 0.5) * step, y + (sy + 0.5) * step, box)) {
            covered += 1;
          }
        }
      }

      const coverage = covered / samples;
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        pixels[offset + c] = Math.round(
          background[c] + (INK[c] - background[c]) * coverage,
        );
      }
      pixels[offset + 3] = 0xff;
    }
  }

  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** RGBA pixels as a PNG file. */
function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 6; // truecolour with alpha
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlacing

  // One filter byte per scanline. Every row is stored unfiltered: these are
  // small images and the gradient compresses well enough as it is.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Several PNGs in one `.ico`, which is what a browser tab still asks for.
 * Windows has read PNG-inside-ICO since Vista.
 */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

function write(path, contents) {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
  console.log(`${path} — ${contents.length} bytes`);
}

const icon = (size, markSize) => encodePng(size, drawIcon(size, markSize));

/** How much of the canvas the W takes up, per use. */
const FULL = 0.62;
/** Android crops an adaptive icon to a circle, so the mark stays well inside. */
const MASKABLE = 0.44;
/** iOS rounds the corners itself and adds no padding of its own. */
const APPLE = 0.56;
/** A favicon is 16 pixels across at worst, and needs the room. */
const FAVICON = 0.7;

write("public/icons/icon-192.png", icon(192, FULL));
write("public/icons/icon-512.png", icon(512, FULL));
write("public/icons/maskable-512.png", icon(512, MASKABLE));
write("public/icons/apple-touch-icon.png", icon(180, APPLE));
write(
  "src/app/favicon.ico",
  encodeIco(
    [16, 32, 48].map((size) => ({
      size,
      png: encodePng(size, drawIcon(size, FAVICON)),
    })),
  ),
);
