import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

const src = await loadImage("docs/brand/volpe-logo.jpg");
const W = src.width, H = src.height;
const base = createCanvas(W, H), bx = base.getContext("2d");
bx.drawImage(src, 0, 0);
const img = bx.getImageData(0, 0, W, H), d = img.data;
const seen = new Uint8Array(W * H), stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const p = stack.pop();
  if (seen[p]) continue;
  const i = p * 4;
  if (Math.min(d[i], d[i + 1], d[i + 2]) < 225) continue;
  seen[p] = 1;
  d[i + 3] = 0;
  const x = p % W;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (p >= W) stack.push(p - W);
  if (p < W * (H - 1)) stack.push(p + W);
}
bx.putImageData(img, 0, 0);

function png(size, { bg, scale = 1 } = {}) {
  const c = createCanvas(size, size), x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, size, size); }
  const s = size * scale, o = (size - s) / 2;
  x.drawImage(base, o, o, s, s);
  return c.toBuffer("image/png");
}

writeFileSync("public/brand/volpe-128.png", png(128));
writeFileSync("public/brand/volpe-512.png", png(512));
writeFileSync("public/icons/icon-192.png", png(192));
writeFileSync("public/icons/icon-512.png", png(512));
writeFileSync("public/icons/icon-maskable-512.png", png(512, { bg: "#5ccdf0", scale: 0.8 }));
writeFileSync("public/icons/apple-touch-icon.png", png(180, { bg: "#ffffff", scale: 0.92 }));

const sizes = [16, 32, 48], pngs = sizes.map((s) => png(s));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, k) => {
  const e = 6 + 16 * k;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(pngs[k].length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += pngs[k].length;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([head, ...pngs]));
