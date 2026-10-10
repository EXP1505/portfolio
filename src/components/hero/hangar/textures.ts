import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

// Procedural textures generated once on the client: no image downloads for the atmosphere.

let cache: { glow: CanvasTexture; shaft: CanvasTexture; haze: CanvasTexture } | null = null;

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!] as const;
}

/** Soft radial falloff, white centre to transparent edge. */
function radialGlow() {
  const [c, ctx] = canvas(256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

/** Light shaft: soft across its width, bright at the bottom (door) fading out toward the top. */
function shaft() {
  const [c, ctx] = canvas(128);
  const img = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    const along = Math.pow(y / 127, 1.6); // 0 at top (far end), 1 at bottom (door)
    for (let x = 0; x < 128; x++) {
      const across = Math.exp(-Math.pow((x - 63.5) / 22, 2));
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * along * across);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Tileable fractal value noise for drifting haze. */
function hazeNoise() {
  const size = 256;
  const [c, ctx] = canvas(size);
  const img = ctx.createImageData(size, size);
  const octaves = [8, 16, 32, 64];
  const grids = octaves.map((n) => Array.from({ length: n * n }, () => Math.random()));
  const sample = (grid: number[], n: number, u: number, v: number) => {
    const x = u * n, y = v * n;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (ix: number, iy: number) => grid[((iy + n) % n) * n + ((ix + n) % n)];
    const a = at(x0, y0), b = at(x0 + 1, y0), c2 = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0, amp = 0.55, total = 0;
      octaves.forEach((n, o) => {
        v += sample(grids[o], n, x / size, y / size) * amp;
        total += amp;
        amp *= 0.5;
      });
      v = Math.pow(v / total, 1.8);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(255 * v);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function getTextures() {
  if (cache) return cache;
  const glow = new CanvasTexture(radialGlow());
  const shaftTex = new CanvasTexture(shaft());
  const haze = new CanvasTexture(hazeNoise());
  haze.wrapS = haze.wrapT = RepeatWrapping;
  for (const t of [glow, shaftTex, haze]) t.colorSpace = SRGBColorSpace;
  cache = { glow, shaft: shaftTex, haze };
  return cache;
}
