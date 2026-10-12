"use client";

import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { BEAM_ZS, COLORS, FLOOR_Y, PANEL_XS, REVEALED } from "./config";
import { BEAM_Y } from "./Hangar";
import { panelLevel, reveal } from "./reveal";
import { getTextures } from "./textures";

// Height of the pendant fittings (world y), and the rod length from the truss down to them.
const FIXTURE_Y = FLOOR_Y + 9.3;
const ROD = BEAM_Y - FIXTURE_Y;

/**
 * The overhead light rows: pendant fittings hung on long drop rods from the trusses, low enough that
 * from the hero camera every row sits below the nav and above the tail fins. Each row has a strip of emissive panels (each ramping on a beat after its
 * neighbour) and a soft pool of light on the floor beneath it. The pool is an additive decal, not a
 * real light: four spotlights cost every surface in the scene four extra light evaluations per pixel.
 * Brightness follows the shared reveal progress, so scrolling back up dims them in reverse.
 */
function createRows() {
  return BEAM_ZS.map((z) => {
    const pool = new MeshBasicMaterial({
      map: getTextures().glow,
      color: COLORS.backlight,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const panels = PANEL_XS.map(
      () =>
        new MeshStandardMaterial({
          color: COLORS.structure,
          emissive: COLORS.backlight,
          emissiveIntensity: 0,
          roughness: 0.6,
        }),
    );
    return { z, pool, panels };
  });
}

// Fixture housings: dark painted metal, so the lit diffusers read as lights inside fittings.
const housing = new MeshStandardMaterial({ color: COLORS.jackMetal, roughness: 0.55, metalness: 0.5 });

let rowsCache: ReturnType<typeof createRows> | null = null;
const getRows = () => (rowsCache ??= createRows());

export function RowLights() {
  const rows = getRows();

  useFrame(() => {
    const p = reveal.value;
    getRows().forEach((row, r) => {
      let sum = 0;
      row.panels.forEach((material, i) => {
        const level = panelLevel(r, i, p);
        material.emissiveIntensity = level * REVEALED.panelGlow;
        sum += level;
      });
      row.pool.opacity = (sum / row.panels.length) * REVEALED.rowPool;
    });
  });

  return (
    <group>
      {rows.map((row) => (
        <group key={row.z}>
          <mesh material={row.pool} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.03, row.z + 3]}>
            <planeGeometry args={[30, 12]} />
          </mesh>
          {row.panels.map((material, i) => (
            <group key={PANEL_XS[i]} position={[PANEL_XS[i], FIXTURE_Y, row.z]}>
              {/* Drop rods up to the truss, housing, and the emissive diffuser underneath */}
              {[-1, 1].map((x) => (
                <mesh key={x} material={housing} position={[x, ROD / 2 - 0.45, 0]}>
                  <boxGeometry args={[0.035, ROD, 0.035]} />
                </mesh>
              ))}
              <mesh material={housing} position={[0, -0.6, 0]}>
                <boxGeometry args={[2.7, 0.26, 0.9]} />
              </mesh>
              <mesh material={material} position={[0, -0.76, 0]}>
                <boxGeometry args={[2.4, 0.06, 0.65]} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
