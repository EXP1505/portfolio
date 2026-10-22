"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, SRGBColorSpace, type MeshBasicMaterial } from "three";

// Nozzle exits measured from the model (engines at x ±1.17, exit plane z ≈ -8.1, centre y ≈ 0).
const NOZZLES = [-1.17, 1.17];

// HDR-overbright colours (channel values >1), not the texture's own 0..1 gradient — PostFX's bloom
// threshold is 1.0, so a plain white/amber material barely crosses it and produces almost no real
// light spill; these push comfortably past it so bloom actually bleeds past the nozzle rim, which a
// flat-alpha "halo" texture alone can't fake (the earlier version only read as a bigger flat circle
// up close, e.g. at the CP tour stop, rather than a glow).
const CORE_COLOR = new Color(1, 1, 1).multiplyScalar(2.6);
const HALO_COLOR = new Color(1, 0.72, 0.4).multiplyScalar(2.0);
// Near-white, not tinted amber: the plume's own texture already bakes a white→orange→pink gradient
// along its length (see plumeTexture), so a strongly-coloured multiply here would just flatten that
// back into one uniform hue — the exact "cartoonish" look a real afterburner's flame doesn't have.
// Modest HDR boost: three overlapping crossed planes already stack their alpha additively near the
// nozzle where they cross, so a high multiplier here clipped the whole core to white, losing the
// gradient entirely instead of just making it glow.
const PLUME_COLOR = new Color(1, 1, 1).multiplyScalar(1.05);

/**
 * A real radial gradient baked into the texture itself — white-hot centre through yellow and orange
 * to a transparent amber rim — rather than a flat-tinted circle whose colour never changes across the
 * disc (which is what read as a glowing lamp). RGB and alpha both fall off together.
 */
function coreTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,244,214,1)");
  g.addColorStop(0.4, "rgba(255,196,110,0.95)");
  g.addColorStop(0.68, "rgba(240,130,40,0.55)");
  g.addColorStop(1, "rgba(200,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A soft, low-opacity amber wash wider than the core, so bloom has something to spill past the rim. */
function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,170,80,0.9)");
  g.addColorStop(0.5, "rgba(230,120,40,0.35)");
  g.addColorStop(1, "rgba(200,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Lerp between two RGB triples. */
function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * The flame cone trailing behind the nozzle — a real white→yellow→orange→pink colour gradient baked
 * into the texture's own RGB (not a single tint multiplied over a flat-coloured shape, which read as
 * a uniform orange smear with no sense of a hot core cooling as it trails off), narrowing from a
 * wide base at the nozzle to a thin wisp at the tip, with a faint periodic brightness ripple along
 * its length as a restrained hint of shock diamonds rather than literal rings.
 */
function plumeTexture() {
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(96, 320);
  const WHITE: [number, number, number] = [255, 250, 230];
  const YELLOW: [number, number, number] = [255, 205, 120];
  const ORANGE: [number, number, number] = [255, 140, 70];
  const PINK: [number, number, number] = [255, 110, 120];
  for (let y = 0; y < 320; y++) {
    const t = y / 319; // 0 at the nozzle end (bright, wide), 1 at the far tip (dim, thin)
    const along = Math.pow(1 - t, 1.6);
    const ripple = 0.85 + 0.15 * Math.max(0, Math.sin(t * Math.PI * 6));
    // Widest just past the nozzle (a slight bulge as the flame leaves the nozzle), then tapers.
    const widthT = Math.min(1, t / 0.12);
    const sigma = 17 * (1 - 0.1 * widthT) * (1 - 0.72 * Math.pow(Math.max(0, t - 0.12) / 0.88, 1.2));
    const [r, g, b] =
      t < 0.22
        ? lerpRgb(WHITE, YELLOW, t / 0.22)
        : t < 0.55
          ? lerpRgb(YELLOW, ORANGE, (t - 0.22) / 0.33)
          : lerpRgb(ORANGE, PINK, (t - 0.55) / 0.45);
    for (let x = 0; x < 96; x++) {
      const across = Math.exp(-(((x - 47.5) / sigma) ** 2));
      const i = (y * 96 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(255 * along * across * ripple);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

let cache: { core: CanvasTexture; halo: CanvasTexture; plume: CanvasTexture } | null = null;
const getTextures = () => (cache ??= { core: coreTexture(), halo: haloTexture(), plume: plumeTexture() });

const CORE_OPACITY = 1;

export function Afterburners() {
  const { core, halo, plume } = getTextures();
  // Flat list of every core/halo/plume material across both nozzles — all flicker together (each
  // keeps its own base opacity via userData), so the whole glow breathes, not just the centre dot.
  const flicker = useRef<MeshBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    // A faint flicker, so the glow feels alive without strobing.
    const f = 0.92 + 0.08 * Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7.3);
    flicker.current.forEach((m) => m && (m.opacity = m.userData.baseOpacity * f));
  });

  return (
    <>
      {NOZZLES.map((x, i) => (
        <group key={x} position={[x, -0.02, -7.98]}>
          {/* Wide, low-opacity halo so bloom spills visibly past the physical nozzle edge. */}
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.01]}>
            <circleGeometry args={[0.52, 32]} />
            <meshBasicMaterial
              ref={(m) => {
                if (!m) return;
                m.userData.baseOpacity = CORE_OPACITY * 0.6;
                flicker.current[i * 5 + 1] = m;
              }}
              map={halo}
              color={HALO_COLOR}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              opacity={CORE_OPACITY * 0.6}
            />
          </mesh>
          {/* The nozzle's own radial gradient: white-hot centre falling off to amber at the rim. */}
          <mesh rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.36, 40]} />
            <meshBasicMaterial
              ref={(m) => {
                if (!m) return;
                m.userData.baseOpacity = CORE_OPACITY;
                flicker.current[i * 5] = m;
              }}
              map={core}
              color={CORE_COLOR}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Heat plume: a flame cone trailing behind the nozzle exit, long enough to actually read
              as flame projecting into open air rather than a glow sitting at the nozzle. Three
              crossed planes (60° apart), DoubleSide so they're visible from both faces — a camera-
              facing billboard (tried first) looks better from the side but goes unstable looking
              nearly down the exhaust axis (up-vector and view direction go near-parallel), which is
              exactly CP's angle, so static crossed planes are the more reliable choice here even
              though they read a bit thin/wedge-like from that one steep angle. */}
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rz, j) => (
            <mesh key={rz} position={[0, 0, -2.15]} rotation={[Math.PI / 2, 0, rz]}>
              <planeGeometry args={[1.1, 4.2]} />
              <meshBasicMaterial
                ref={(m) => {
                  if (!m) return;
                  m.userData.baseOpacity = 0.5;
                  flicker.current[i * 5 + 2 + j] = m;
                }}
                map={plume}
                color={PLUME_COLOR}
                transparent
                opacity={0.5}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
