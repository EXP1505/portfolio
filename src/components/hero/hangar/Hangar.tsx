"use client";

import { useLayoutEffect, useRef } from "react";
import {
  BoxGeometry,
  InstancedMesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from "three";
import { BEAM_ZS, CEILING_Y, COLORS, DOOR_GAP, DOOR_Z, FLOOR_Y } from "./config";
import { getTextures } from "./textures";

// Simple geometry; the hangar reads through lighting, reflections and contrast, not detail.
const structure = new MeshStandardMaterial({ color: COLORS.structure, roughness: 0.85, metalness: 0.25 });
const steel = new MeshStandardMaterial({ color: COLORS.jackMetal, roughness: 0.6, metalness: 0.6 });
// Subtly reflective concrete: picks up the HDRI and the door glow once the hangar is lit, and stays
// dark in the opening frame (no environment light then).
const floor = new MeshPhysicalMaterial({
  color: COLORS.floor,
  roughness: 0.8,
  metalness: 0,
  roughnessMap: getTextures().concrete,
  // Seen at a grazing angle from the low camera, concrete reflects strongly (Fresnel), and the low
  // back-lights from the doors would glare across it. A reduced specular layer keeps a soft sheen
  // without that glare; the floor never mirrors the hangar.
  specularIntensity: 0.25,
  envMapIntensity: 0.4,
});

export const HALF_WIDTH = 22;
const WALL_HEIGHT = CEILING_Y - FLOOR_Y;
const WALL_THICKNESS = 0.6;
const DOOR_HEIGHT = 7;
const HALL_FRONT = 22;
const HALL_LENGTH = HALL_FRONT - DOOR_Z;
const HALL_MID_Z = (HALL_FRONT + DOOR_Z) / 2;

// Ceiling trusses: a top and bottom chord with verticals and alternating diagonals, one per row.
const TRUSS_TOP = CEILING_Y - 0.4;
const TRUSS_BOTTOM = CEILING_Y - 2;
export const BEAM_Y = TRUSS_BOTTOM;
const TRUSS_BAY = 2.2;

type Member = { from: Vector3; to: Vector3; size: number };

function trussMembers(z: number): Member[] {
  const members: Member[] = [
    { from: new Vector3(-HALF_WIDTH, TRUSS_TOP, z), to: new Vector3(HALF_WIDTH, TRUSS_TOP, z), size: 0.28 },
    { from: new Vector3(-HALF_WIDTH, TRUSS_BOTTOM, z), to: new Vector3(HALF_WIDTH, TRUSS_BOTTOM, z), size: 0.28 },
  ];
  const bays = Math.round((HALF_WIDTH * 2) / TRUSS_BAY);
  for (let i = 0; i <= bays; i++) {
    const x = -HALF_WIDTH + i * TRUSS_BAY;
    members.push({ from: new Vector3(x, TRUSS_BOTTOM, z), to: new Vector3(x, TRUSS_TOP, z), size: 0.12 });
    if (i < bays) {
      const [y0, y1] = i % 2 ? [TRUSS_TOP, TRUSS_BOTTOM] : [TRUSS_BOTTOM, TRUSS_TOP];
      members.push({ from: new Vector3(x, y0, z), to: new Vector3(x + TRUSS_BAY, y1, z), size: 0.1 });
    }
  }
  return members;
}

// Side-wall columns and a mid-height rail: structure at the edges of the frame. (Thin full-height ribs
// on the back wall read as stray lines from the hero camera, so the back wall stays plain.)
function wallMembers(): Member[] {
  const members: Member[] = [];
  const top = CEILING_Y;
  for (const side of [-1, 1]) {
    const x = side * (HALF_WIDTH - 0.5);
    for (let z = DOOR_Z + 4; z <= HALL_FRONT; z += 8) {
      members.push({ from: new Vector3(x, FLOOR_Y, z), to: new Vector3(x, top, z), size: 0.6 });
    }
    members.push({
      from: new Vector3(x, FLOOR_Y + 4.5, DOOR_Z),
      to: new Vector3(x, FLOOR_Y + 4.5, HALL_FRONT),
      size: 0.25,
    });
  }
  return members;
}

const UNIT_BOX = new BoxGeometry(1, 1, 1);
const Y_AXIS = new Vector3(0, 1, 0);

/** Many thin members in one draw call: each is a unit box scaled and rotated along its from→to line. */
function Members({ members, material }: { members: Member[]; material: MeshStandardMaterial }) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const dummy = new Object3D();
    const dir = new Vector3();
    members.forEach((m, i) => {
      dir.subVectors(m.to, m.from);
      dummy.position.addVectors(m.from, m.to).multiplyScalar(0.5);
      dummy.quaternion.copy(new Quaternion().setFromUnitVectors(Y_AXIS, dir.clone().normalize()));
      dummy.scale.set(m.size, dir.length(), m.size);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.computeBoundingSphere();
  }, [members]);

  return <instancedMesh ref={mesh} args={[UNIT_BOX, material, members.length]} />;
}

const TRUSSES = BEAM_ZS.flatMap(trussMembers);
const WALL_MEMBERS = wallMembers();

export function Hangar() {
  const doorWall = HALF_WIDTH - DOOR_GAP / 2;
  const midY = FLOOR_Y + WALL_HEIGHT / 2;

  return (
    <group>
      {/* Floor */}
      <mesh material={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, HALL_MID_Z]}>
        <planeGeometry args={[HALF_WIDTH * 2, HALL_LENGTH]} />
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

      {/* Lintel over the doors, so the opening is door-height rather than a slot to the ceiling */}
      <mesh material={structure} position={[0, (FLOOR_Y + DOOR_HEIGHT + CEILING_Y) / 2, DOOR_Z]}>
        <boxGeometry args={[DOOR_GAP + 0.2, CEILING_Y - FLOOR_Y - DOOR_HEIGHT, WALL_THICKNESS]} />
      </mesh>

      {/* Door leaves standing slightly proud of the wall, with a steel frame around the opening */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={structure} position={[side * (DOOR_GAP / 2 + 3), FLOOR_Y + DOOR_HEIGHT / 2, DOOR_Z + 0.7]}>
          <boxGeometry args={[6, DOOR_HEIGHT, 0.35]} />
        </mesh>
      ))}
      <mesh material={steel} position={[0, FLOOR_Y + DOOR_HEIGHT + 0.3, DOOR_Z + 0.9]}>
        <boxGeometry args={[DOOR_GAP + 12.6, 0.6, 0.5]} />
      </mesh>

      {/* Side walls and ceiling */}
      {[-1, 1].map((side) => (
        <mesh key={side} material={structure} position={[side * HALF_WIDTH, midY, HALL_MID_Z]}>
          <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, HALL_LENGTH]} />
        </mesh>
      ))}
      <mesh material={structure} position={[0, CEILING_Y, HALL_MID_Z]}>
        <boxGeometry args={[HALF_WIDTH * 2, WALL_THICKNESS, HALL_LENGTH]} />
      </mesh>

      {/* Wall ribs, side columns and rails; ceiling trusses (light fixtures hang from them in RowLights) */}
      <Members members={WALL_MEMBERS} material={structure} />
      <Members members={TRUSSES} material={steel} />
    </group>
  );
}
