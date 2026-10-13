"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, SRGBColorSpace, type MeshBasicMaterial } from "three";

// Nozzle exits measured from the model (engines at x ±1.17, exit plane z ≈ -8.1, centre y ≈ 0).
const NOZZLES = [-1.17, 1.17];

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

/** The heat plume, with a faint periodic brightness ripple along its length — a restrained hint of
 *  shock diamonds rather than literal rings. */
function plumeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(64, 256);
  for (let y = 0; y < 256; y++) {
    const along = Math.pow(1 - y / 255, 1.3);
    const ripple = 0.82 + 0.18 * Math.max(0, Math.sin((y / 255) * Math.PI * 5));
    for (let x = 0; x < 64; x++) {
      const across = Math.exp(-(((x - 31.5) / 10) ** 2));
      const i = (y * 64 + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 190;
      img.data[i + 2] = 120;
      img.data[i + 3] = Math.round(255 * along * across * ripple * 0.5);
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
  const flicker = useRef<MeshBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    // A faint flicker, so the glow feels alive without strobing.
    const f = 0.92 + 0.08 * Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7.3);
    flicker.current.forEach((m) => m && (m.opacity = CORE_OPACITY * f));
  });

  return (
    <>
      {NOZZLES.map((x, i) => (
        <group key={x} position={[x, -0.02, -7.98]}>
          {/* Wide, low-opacity halo so bloom spills visibly past the physical nozzle edge. */}
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.01]}>
            <circleGeometry args={[0.52, 32]} />
            <meshBasicMaterial map={halo} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} opacity={0.6} />
          </mesh>
          {/* The nozzle's own radial gradient: white-hot centre falling off to amber at the rim. */}
          <mesh rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.36, 40]} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) flicker.current[i] = m;
              }}
              map={core}
              color="#FFFFFF"
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Heat plume: faint and translucent, with a subtle ripple along its length. */}
          {[0, Math.PI / 2].map((rz) => (
            <mesh key={rz} position={[0, 0, -1.4]} rotation={[Math.PI / 2, 0, rz]}>
              <planeGeometry args={[0.7, 2.6]} />
              <meshBasicMaterial
                map={plume}
                color="#FFB46E"
                transparent
                opacity={0.4}
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
