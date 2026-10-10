"use client";

import { MeshLambertMaterial, MeshStandardMaterial } from "three";
import { CEILING_Y, COLORS, DOOR_GAP, DOOR_Z, FLOOR_Y } from "./config";

// Simple geometry only; in the opening frame most of it reads as dark shapes against the glow.
const structure = new MeshStandardMaterial({ color: COLORS.structure, roughness: 0.9, metalness: 0.2 });
// Diffuse only: low back light would otherwise put a broad glancing sheen across the whole floor.
const floor = new MeshLambertMaterial({ color: COLORS.floor });
// Overhead light panels: unlit in the opening frame; step 2 drives their emissive from the reveal.
export const panelMaterial = new MeshStandardMaterial({
  color: COLORS.structure,
  emissive: COLORS.backlight,
  emissiveIntensity: 0,
  roughness: 0.6,
});

const HALF_WIDTH = 22;
const WALL_HEIGHT = CEILING_Y - FLOOR_Y;
const WALL_THICKNESS = 0.6;
const BEAM_ZS = [-24, -16, -8, 0, 8];
const PANEL_XS = [-12, -6, 0, 6, 12];

export function Hangar() {
  const doorWall = HALF_WIDTH - DOOR_GAP / 2;
  const midY = FLOOR_Y + WALL_HEIGHT / 2;

  return (
    <group>
      {/* Floor */}
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, -8]}>
        <planeGeometry args={[HALF_WIDTH * 2, 80]} />
      </mesh>

      {/* Back wall: two halves leaving the doors cracked open in the middle */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          material={structure}
          position={[side * (DOOR_GAP / 2 + doorWall / 2), midY, DOOR_Z]}
        >
          <boxGeometry args={[doorWall, WALL_HEIGHT, WALL_THICKNESS]} />
        </mesh>
      ))}

      {/* Door leaves standing slightly proud of the wall, edges framing the gap */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={structure} position={[side * (DOOR_GAP / 2 + 3), midY - 1, DOOR_Z + 0.7]}>
          <boxGeometry args={[6, WALL_HEIGHT - 2, 0.35]} />
        </mesh>
      ))}

      {/* Side walls and ceiling */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={structure} position={[side * HALF_WIDTH, midY, -8]}>
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, 80]} />
        </mesh>
      ))}
      <mesh material={structure} position={[0, CEILING_Y, -8]}>
        <boxGeometry args={[HALF_WIDTH * 2, WALL_THICKNESS, 80]} />
      </mesh>

      {/* Ceiling beams, each carrying a row of light panels */}
      {BEAM_ZS.map((z) => (
        <group key={z} position={[0, CEILING_Y - 1.2, z]}>
          <mesh material={structure}>
            <boxGeometry args={[HALF_WIDTH * 2, 0.9, 0.45]} />
          </mesh>
          {PANEL_XS.map((x) => (
            <mesh key={x} material={panelMaterial} position={[x, -0.6, 0]}>
              <boxGeometry args={[3.2, 0.12, 0.9]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
