"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
  type Object3D,
  type Texture,
} from "three";
import { AMBER_HOT, BODY_NORMAL_SCALE, RIM_WIDTH } from "./config";

export const MODEL = "/models/su57.glb";
// Self-hosted Draco decoder (copied from three/examples) so the scene makes no third-party requests.
export const DRACO = "/draco/";

// Shared by every rim shell, so the reveal can drive the rim from one place. uSunDir is world-space
// and constant per frame (the sun doesn't move; the sky+jet rig orbits under it) — the scene copies
// the same direction used for the key light into this uniform every frame.
export const rimUniforms = {
  uRimColor: { value: new Color(AMBER_HOT) },
  uRimIntensity: { value: 1.2 },
  uRimWidth: { value: RIM_WIDTH },
  uSunDir: { value: new Vector3(0, 0.03, -1) },
};

/**
 * Backlit rim as an inverted hull: a back-face-only copy of the airframe inflated along its normals.
 * It can only show where it pokes past the silhouette, so it reads as a razor-thin line of light
 * wrapping the edges. Lit by how much each edge's WORLD-space normal faces the real sun direction
 * (not a fixed "up", which was wrong once the camera/jet began orbiting a sun that itself moves
 * through the frame) — so the rim only lights edges actually facing the sun, at every orbit angle:
 * near-full-silhouette rim at 0%, a raking highlight once the sun swings to the side by 100%.
 * Additive, so fading the intensity to zero makes the line vanish rather than turn into a dark outline.
 */
const rimMaterial = new ShaderMaterial({
  uniforms: rimUniforms,
  side: BackSide,
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
  fog: false,
  vertexShader: /* glsl */ `
    uniform float uRimWidth;
    uniform vec3 uSunDir;
    varying float vSunFacing;
    void main() {
      vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
      vSunFacing = dot(worldNormal, normalize(uSunDir));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uRimWidth, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uRimColor;
    uniform float uRimIntensity;
    varying float vSunFacing;
    void main() {
      float lit = 0.02 + 0.98 * smoothstep(-0.1, 0.55, vSunFacing);
      gl_FragColor = vec4(uRimColor * uRimIntensity * lit, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

// Only the outer airframe gets a rim: not the canopy glass, cockpit, or the fans inside the intakes.
// The engine nacelle housing ("Su57-engine") is its own exterior surface with the same kind of
// painted panel-line/rivet detail as the body (not to be confused with "Engine-interior", the dark
// untextured fan/duct material seen looking into the intake — that one stays rim-free).
const RIM_MATERIALS = new Set(["Su57-body", "Su57-engine"]);
// Materials whose normal map gets the same subtle-detail boost — without it, close-up tour stops
// (e.g. CP's nozzle shot) make the nacelle read flat next to the rim-lit, normal-boosted body.
const DETAIL_MATERIALS = RIM_MATERIALS;

const TEXTURE_SLOTS = ["map", "normalMap", "roughnessMap", "metalnessMap"] as const;

export function Su57() {
  const { scene } = useGLTF(MODEL, DRACO);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  // Clone so the cached GLTF (reused later by the inspect mode) keeps its original materials.
  const model = useMemo(() => {
    const clone: Object3D = scene.clone(true);
    const meshes: Mesh[] = [];
    clone.traverse((obj) => obj instanceof Mesh && meshes.push(obj));
    const textures = new Set<Texture>();
    for (const mesh of meshes) {
      const source = mesh.material as MeshStandardMaterial;
      const material = source.clone();
      // The airframe's panel lines are also in a subtle normal map; strengthen it a touch.
      if (DETAIL_MATERIALS.has(source.name)) material.normalScale.setScalar(BODY_NORMAL_SCALE);
      for (const slot of TEXTURE_SLOTS) if (material[slot]) textures.add(material[slot]);
      mesh.material = material;
      if (RIM_MATERIALS.has(source.name)) mesh.add(new Mesh(mesh.geometry, rimMaterial));
    }
    // The painted panel lines, rivet rows and weathering are fine detail, seen close to edge-on from
    // this camera angle. Without anisotropic filtering they blur away there.
    for (const texture of textures) {
      texture.anisotropy = maxAnisotropy;
      texture.needsUpdate = true;
    }
    return clone;
  }, [scene, maxAnisotropy]);

  return <primitive object={model} />;
}

useGLTF.preload(MODEL, DRACO);
