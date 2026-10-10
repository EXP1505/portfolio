"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, MeshBasicMaterial, type Mesh, type Texture } from "three";
import { COLORS, DOOR_GAP, DOOR_Z, FLOOR_Y, OPENING } from "./config";
import { getTextures } from "./textures";

// Additive, unfogged, no depth write: soft light that stacks without sorting artefacts.
function glowMaterial(map: Texture, color: string, opacity: number, alphaMap?: Texture) {
  return new MeshBasicMaterial({
    map,
    alphaMap,
    color: new Color(color),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
}

const SHAFT_ANGLES = [-0.32, -0.16, 0, 0.16, 0.32];
const HAZE_LAYERS = [
  { z: DOOR_Z + 4, y: 1.5, w: 64, h: 20, opacity: 0.12, speed: 0.004 },
  { z: -18, y: 2.5, w: 56, h: 20, opacity: 0.07, speed: -0.006 },
  { z: -12, y: 1.2, w: 48, h: 14, opacity: 0.05, speed: 0.008 },
  // Low haze hugging the floor, kept below the belly so it never washes over the jet.
  { z: 3, y: FLOOR_Y + 0.6, w: 50, h: 2, opacity: 0.05, speed: -0.01 },
];
const SWEEP_PERIOD = 9; // seconds between sweeps
const SWEEP_DURATION = 3.5;

// Created once on the client and animated in place each frame.
let materialsCache: ReturnType<typeof createMaterials> | null = null;
function createMaterials() {
  const textures = getTextures();
  return {
    // The crack between the doors: a soft-edged, over-bright streak rather than a hard slab.
    door: glowMaterial(textures.glow, COLORS.backlight, 1),
    farGlow: glowMaterial(textures.glow, COLORS.backlight, 0.9),
    halo: glowMaterial(textures.glow, COLORS.haze, 0.55),
    sweep: glowMaterial(textures.glow, COLORS.backlight, 0),
    shaft: glowMaterial(textures.shaft, COLORS.haze, 0.09),
    floorStreak: glowMaterial(textures.glow, COLORS.backlight, 0.16),
    // Each haze layer drifts on its own copy of the noise, masked by the radial glow.
    haze: HAZE_LAYERS.map((layer) => glowMaterial(textures.haze.clone(), COLORS.haze, layer.opacity, textures.glow)),
  };
}
function getMaterials() {
  if (!materialsCache) {
    materialsCache = createMaterials();
    materialsCache.door.color.multiplyScalar(3);
  }
  return materialsCache;
}

export function Backlight() {
  const materials = getMaterials();

  const sweep = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    const { haze, sweep: sweepMaterial } = getMaterials();
    haze.forEach((m, i) => {
      m.map!.offset.x += HAZE_LAYERS[i].speed * delta;
      m.map!.offset.y += HAZE_LAYERS[i].speed * 0.35 * delta;
    });
    // A slow brightening that drifts sideways across the doors every few seconds.
    const t = clock.elapsedTime % SWEEP_PERIOD;
    const p = Math.min(t / SWEEP_DURATION, 1);
    const eased = p < 1 ? 0.5 - 0.5 * Math.cos(p * Math.PI) : 1;
    sweepMaterial.opacity = p < 1 ? Math.sin(p * Math.PI) * 0.35 : 0;
    if (sweep.current) sweep.current.position.x = -10 + 20 * eased;
  });

  return (
    <group>
      {/* The gap between the doors: the brightest thing in the frame */}
      <mesh material={materials.door} position={[0, FLOOR_Y + 3.5, DOOR_Z + 0.35]}>
        <planeGeometry args={[DOOR_GAP * 1.4, 8]} />
      </mesh>

      {/* Bloom around the doors, and a halo directly behind the jet like the teaser reference */}
      <mesh material={materials.farGlow} position={[0, FLOOR_Y + 3, DOOR_Z + 1]}>
        <planeGeometry args={[36, 22]} />
      </mesh>
      <mesh material={materials.halo} position={[0, 1.4, -11]}>
        <planeGeometry args={[30, 13]} />
      </mesh>
      <mesh ref={sweep} material={materials.sweep} position={[0, FLOOR_Y + 3.5, DOOR_Z + 1.5]}>
        <planeGeometry args={[10, 18]} />
      </mesh>

      {/* Light shafts fanning out of the door gap */}
      {SHAFT_ANGLES.map((angle) => (
        // Pivot at the door gap; the shaft's bright end sits there and it fans up and out.
        <group key={angle} position={[0, FLOOR_Y + 5, DOOR_Z + 2]} rotation={[0, 0, angle]}>
          <mesh material={materials.shaft} position={[0, 17, 0]}>
            <planeGeometry args={[3.2, 34]} />
          </mesh>
        </group>
      ))}

      {/* Light spilling across the floor from the doors toward the jet */}
      <mesh
        material={materials.floorStreak}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y + 0.02, DOOR_Z + 14]}
      >
        <planeGeometry args={[9, 34]} />
      </mesh>

      {HAZE_LAYERS.map((layer, i) => (
        <mesh key={layer.z} material={materials.haze[i]} position={[0, layer.y, layer.z]}>
          <planeGeometry args={[layer.w, layer.h]} />
        </mesh>
      ))}

      {/* Dim lights from behind so the jet and jacks pick up a little real wrap */}
      <directionalLight position={[0, 2.5, DOOR_Z]} intensity={OPENING.backLight} color={COLORS.backlight} />
      <directionalLight position={[-10, 0.8, -18]} intensity={OPENING.backLight * 0.5} color={COLORS.backlight} />
      <directionalLight position={[10, 0.8, -18]} intensity={OPENING.backLight * 0.5} color={COLORS.backlight} />
    </group>
  );
}
