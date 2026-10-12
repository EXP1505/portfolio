"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, MeshBasicMaterial, type DirectionalLight, type Mesh, type Texture } from "three";
import { COLORS, DOOR_GAP, DOOR_Z, FLOOR_Y, OPENING } from "./config";
import { reveal } from "./reveal";
import { getTextures } from "./textures";

// Additive, unfogged, no depth write: soft light that stacks without sorting artefacts.
function glowMaterial(map: Texture, color: string, opacity: number, alphaMap?: Texture) {
  return new MeshBasicMaterial({
    map,
    ...(alphaMap && { alphaMap }),
    color: new Color(color),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
}

// Opening-frame opacities: deliberately dim so the start is mostly black and the glow stays in the
// door gap, clear of the title and pitch. They rise a little with the reveal (`atmosphere`).
const BASE = {
  door: 1,
  doorBloom: 0.35,
  farGlow: 0.4,
  halo: 0.2,
  shaft: 0.035,
  floorStreak: 0.1,
};
const SHAFT_ANGLES = [-0.3, -0.15, 0, 0.15, 0.3];
// Each layer samples the wispy noise at its own scale and offset, so the patches never line up into a
// uniform sheet. (The noise is high-contrast and mostly dark, hence the higher opacities.)
const HAZE_LAYERS = [
  { z: DOOR_Z + 4, y: 1, w: 50, h: 16, opacity: 0.1, speed: 0.004, repeat: [0.45, 0.35], offset: [0.1, 0.3] },
  { z: -18, y: 1.5, w: 44, h: 14, opacity: 0.06, speed: -0.006, repeat: [0.7, 0.5], offset: [0.55, 0.1] },
  { z: -12, y: 0.8, w: 38, h: 10, opacity: 0.04, speed: 0.008, repeat: [1.1, 0.8], offset: [0.3, 0.7] },
];
const SWEEP_PERIOD = 9; // seconds between sweeps
const SWEEP_DURATION = 3.5;
const SWEEP_PEAK = 0.2;

// Created once on the client and animated in place each frame.
let materialsCache: ReturnType<typeof createMaterials> | null = null;
function createMaterials() {
  const textures = getTextures();
  const door = glowMaterial(textures.slit, COLORS.backlight, BASE.door);
  // The crack between the doors: a soft-edged, over-bright streak rather than a hard slab.
  door.color.multiplyScalar(3);
  return {
    door,
    // Soft bloom in front of the door frame, wide enough to swallow the frame's straight edges,
    // so the light falls off smoothly into the haze with no visible box.
    doorBloom: glowMaterial(textures.glow, COLORS.backlight, BASE.doorBloom),
    farGlow: glowMaterial(textures.glow, COLORS.backlight, BASE.farGlow),
    halo: glowMaterial(textures.glow, COLORS.haze, BASE.halo),
    sweep: glowMaterial(textures.glow, COLORS.backlight, 0),
    shaft: glowMaterial(textures.shaft, COLORS.haze, BASE.shaft),
    floorStreak: glowMaterial(textures.glow, COLORS.backlight, BASE.floorStreak),
    // Each haze layer drifts on its own copy of the noise, masked by the radial glow.
    haze: HAZE_LAYERS.map((layer) => {
      const map = textures.haze.clone();
      map.repeat.set(layer.repeat[0], layer.repeat[1]);
      map.offset.set(layer.offset[0], layer.offset[1]);
      return glowMaterial(map, COLORS.haze, layer.opacity, textures.glow);
    }),
  };
}
const getMaterials = () => (materialsCache ??= createMaterials());

export function Backlight() {
  const materials = getMaterials();
  const sweep = useRef<Mesh>(null);
  const backTop = useRef<DirectionalLight>(null);
  const backLeft = useRef<DirectionalLight>(null);
  const backRight = useRef<DirectionalLight>(null);

  useFrame(({ clock }, delta) => {
    const m = getMaterials();
    const s = reveal.stage;
    const a = s.atmosphere;
    m.doorBloom.opacity = BASE.doorBloom * a;
    m.farGlow.opacity = BASE.farGlow * a;
    m.halo.opacity = BASE.halo * a;
    m.shaft.opacity = BASE.shaft * a;
    m.floorStreak.opacity = BASE.floorStreak * a;
    m.haze.forEach((material, i) => {
      const layer = HAZE_LAYERS[i];
      material.opacity = layer.opacity * a;
      material.map!.offset.x += layer.speed * delta;
      material.map!.offset.y += layer.speed * 0.35 * delta;
    });
    // Back-lights from the doors: a faint wrap at the start, a clear rim once the hangar is lit.
    if (backTop.current) backTop.current.intensity = s.backLight;
    if (backLeft.current) backLeft.current.intensity = s.backLight * 0.5;
    if (backRight.current) backRight.current.intensity = s.backLight * 0.5;
    // A slow brightening that drifts sideways across the doors every few seconds.
    const t = clock.elapsedTime % SWEEP_PERIOD;
    const p = Math.min(t / SWEEP_DURATION, 1);
    const eased = p < 1 ? 0.5 - 0.5 * Math.cos(p * Math.PI) : 1;
    m.sweep.opacity = p < 1 ? Math.sin(p * Math.PI) * SWEEP_PEAK : 0;
    if (sweep.current) sweep.current.position.x = -6 + 12 * eased;
  });

  return (
    <group>
      {/* The gap between the doors: the brightest thing in the frame (stays on the whole reveal) */}
      <mesh material={materials.door} position={[0, FLOOR_Y + 3.2, DOOR_Z + 0.35]}>
        <planeGeometry args={[DOOR_GAP, 7]} />
      </mesh>
      <mesh material={materials.doorBloom} position={[0, FLOOR_Y + 3.4, DOOR_Z + 1.2]}>
        <planeGeometry args={[DOOR_GAP * 3.2, 11]} />
      </mesh>

      {/* Wider bloom around the doors, and a low halo directly behind the jet */}
      <mesh material={materials.farGlow} position={[0, FLOOR_Y + 3, DOOR_Z + 1]}>
        <planeGeometry args={[16, 10]} />
      </mesh>
      <mesh material={materials.halo} position={[0, 0.6, -11]}>
        <planeGeometry args={[16, 6]} />
      </mesh>
      <mesh ref={sweep} material={materials.sweep} position={[0, FLOOR_Y + 3.2, DOOR_Z + 1.5]}>
        <planeGeometry args={[6, 10]} />
      </mesh>

      {/* Short light shafts fanning out of the door gap; too short to reach the title */}
      {SHAFT_ANGLES.map((angle) => (
        // Pivot at the door gap; the shaft's bright end sits there and it fans up and out.
        <group key={angle} position={[0, FLOOR_Y + 3, DOOR_Z + 2]} rotation={[0, 0, angle]}>
          <mesh material={materials.shaft} position={[0, 6, 0]}>
            <planeGeometry args={[2.4, 12]} />
          </mesh>
        </group>
      ))}

      {/* Light spilling across the floor from the doors toward the jet */}
      <mesh
        material={materials.floorStreak}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y + 0.02, DOOR_Z + 14]}
      >
        <planeGeometry args={[7, 30]} />
      </mesh>

      {HAZE_LAYERS.map((layer, i) => (
        <mesh key={layer.z} material={materials.haze[i]} position={[0, layer.y, layer.z]}>
          <planeGeometry args={[layer.w, layer.h]} />
        </mesh>
      ))}

      {/* Lights from behind (the open doors) so the jet and jacks pick up real wrap and a rim */}
      <directionalLight ref={backTop} position={[0, 2.5, DOOR_Z]} intensity={OPENING.backLight} color={COLORS.backlight} />
      <directionalLight
        ref={backLeft}
        position={[-10, 0.8, -18]}
        intensity={OPENING.backLight * 0.5}
        color={COLORS.backlight}
      />
      <directionalLight
        ref={backRight}
        position={[10, 0.8, -18]}
        intensity={OPENING.backLight * 0.5}
        color={COLORS.backlight}
      />
    </group>
  );
}
