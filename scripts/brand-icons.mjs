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

function png(size) {
  const c = createCanvas(size, size), x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(base, 0, 0, size, size);
  return c.toBuffer("image/png");
}

writeFileSync("public/brand/volpe-192.png", png(192));
