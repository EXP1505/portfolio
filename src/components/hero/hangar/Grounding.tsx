"use client";

import { useFrame } from "@react-three/fiber";
import { Color, MeshBasicMaterial } from "three";
import { FLOOR_Y, JACK_POINTS } from "./config";
import { reveal } from "./reveal";
import { getTextures } from "./textures";

// Soft shadow blobs that ground the jet and jacks on the floor (the export has no AO, and the scene is
// static, so a few soft decals do the job of contact shadows at no runtime cost). They fade in with the
// reveal: there are no shadows in the dark opening frame.
const BLOBS: { x: number; z: number; w: number; d: number; strength: number }[] = [
  // Broad, faint occlusion under the whole airframe, then a darker core under the fuselage.
  { x: 0, z: -0.5, w: 13, d: 15, strength: 0.45 },
  { x: 0, z: 0, w: 4, d: 14, strength: 0.55 },
  // Tight, darker pools where each jack's tripod meets the floor.
  ...JACK_POINTS.map(([x, z]) => ({ x, z, w: 2.6, d: 2.6, strength: 0.8 })),
];

let materials: MeshBasicMaterial[] | null = null;
function getMaterials() {
  // Black through the radial-glow texture: colour × white map = black, alpha from the soft falloff.
  materials ??= BLOBS.map(
    () =>
      new MeshBasicMaterial({
        map: getTextures().glow,
        color: new Color("#000000"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
  );
  return materials;
}

/** Place inside the jet's group so the blobs follow its yaw, like the jacks. */
export function Grounding() {
  const mats = getMaterials();
  useFrame(() => {
    const s = reveal.stage.shadow;
    getMaterials().forEach((m, i) => (m.opacity = BLOBS[i].strength * s));
  });
  return (
    <group>
      {BLOBS.map((b, i) => (
        <mesh
          key={i}
          material={mats[i]}
          rotation={[-Math.PI / 2, 0, 0]}
          // Stacked a hair apart above the floor so they never z-fight with it or each other.
          position={[b.x, FLOOR_Y + 0.01 + i * 0.002, b.z]}
          renderOrder={1}
        >
          <planeGeometry args={[b.w, b.d]} />
        </mesh>
      ))}
    </group>
  );
}
