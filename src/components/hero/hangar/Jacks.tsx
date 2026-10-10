"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { MeshStandardMaterial, Quaternion, Raycaster, Vector3, type Object3D } from "three";
import { COLORS, FLOOR_Y, JACK_POINTS } from "./config";
import { DRACO, MODEL } from "./Su57";

const UP = new Vector3(0, 1, 0);
const LEG_COUNT = 3;
const FOOT_RADIUS = 0.95;
const HUB_Y = 0.55;

// Shared by every jack part (this module only loads client-side, with the scene).
const metal = new MeshStandardMaterial({ color: COLORS.jackMetal, metalness: 0.35, roughness: 0.75 });

/** Tripod aircraft jack: splayed legs with foot pads, a hub, a thick column, screw collar and cap. */
function AircraftJack({ x, z, height }: { x: number; z: number; height: number }) {
  const legs = useMemo(
    () =>
      Array.from({ length: LEG_COUNT }, (_, i) => {
        const a = (i / LEG_COUNT) * Math.PI * 2 + Math.PI / 2;
        const foot = new Vector3(Math.cos(a) * FOOT_RADIUS, 0.05, Math.sin(a) * FOOT_RADIUS);
        const hub = new Vector3(0, HUB_Y, 0);
        const dir = foot.clone().sub(hub);
        return {
          foot,
          mid: hub.clone().add(foot).multiplyScalar(0.5),
          length: dir.length(),
          quaternion: new Quaternion().setFromUnitVectors(UP, dir.normalize()),
        };
      }),
    [],
  );

  const columnBottom = HUB_Y + 0.1;
  const columnTop = height - 0.14;
  const columnLength = columnTop - columnBottom;

  return (
    <group position={[x, FLOOR_Y, z]}>
      {legs.map((leg, i) => (
        <group key={i}>
          <mesh material={metal} position={leg.mid} quaternion={leg.quaternion}>
            <cylinderGeometry args={[0.055, 0.07, leg.length, 10]} />
          </mesh>
          <mesh material={metal} position={leg.foot}>
            <cylinderGeometry args={[0.14, 0.16, 0.06, 16]} />
          </mesh>
        </group>
      ))}
      {/* Hub */}
      <mesh material={metal} position={[0, HUB_Y, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.3, 20]} />
      </mesh>
      {/* Column */}
      <mesh material={metal} position={[0, columnBottom + columnLength / 2, 0]}>
        <cylinderGeometry args={[0.09, 0.11, columnLength, 16]} />
      </mesh>
      {/* Screw collar */}
      <mesh material={metal} position={[0, columnBottom + columnLength * 0.55, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.14, 20]} />
      </mesh>
      {/* Cap */}
      <mesh material={metal} position={[0, height - 0.07, 0]}>
        <cylinderGeometry args={[0.17, 0.12, 0.14, 20]} />
      </mesh>
    </group>
  );
}

/** Find where each jack meets the airframe by casting straight down onto the model. */
function useJackHeights(model: Object3D) {
  return useMemo(() => {
    model.updateMatrixWorld(true);
    const raycaster = new Raycaster();
    return JACK_POINTS.map(([x, z]) => {
      raycaster.set(new Vector3(x, 10, z), new Vector3(0, -1, 0));
      const hit = raycaster.intersectObject(model, true)[0];
      // Fall back to the belly height if the ray misses (shouldn't happen at these points).
      const skinY = hit ? hit.point.y : -0.82;
      return { x, z, height: skinY - FLOOR_Y };
    });
  }, [model]);
}

export function Jacks() {
  const { scene } = useGLTF(MODEL, DRACO);
  const jacks = useJackHeights(scene);
  return (
    <>
      {jacks.map((j) => (
        <AircraftJack key={`${j.x},${j.z}`} {...j} />
      ))}
    </>
  );
}
