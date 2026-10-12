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
  type Object3D,
  type Texture,
} from "three";
import { BODY_NORMAL_SCALE, COLORS, OPENING } from "./config";

export const MODEL = "/models/su57.glb";
// Self-hosted Draco decoder (copied from three/examples) so the scene makes no third-party requests.
export const DRACO = "/draco/";

// Shared by every rim shell, so the reveal can drive the rim from one place.
export const rimUniforms = {
  uRimColor: { value: new Color(COLORS.backlight) },
  uRimIntensity: { value: OPENING.rimIntensity },
  uRimWidth: { value: OPENING.rimWidth },
};

/**
 * Backlit rim as an inverted hull: a back-face-only copy of the airframe inflated along its normals.
 * It can only show where it pokes past the silhouette, so it reads as a razor-thin line of light
 * wrapping the edges. Brighter on up-facing edges (light comes from the doors above/behind), faint
 * underneath. A Fresnel term can't do this head-on: most of a jet's surface grazes the camera.
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
    varying float vUp;
    void main() {
      vUp = normalize(normalMatrix * normal).y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uRimWidth, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uRimColor;
    uniform float uRimIntensity;
    varying float vUp;
    void main() {
      float lit = 0.03 + 0.97 * smoothstep(0.05, 0.75, vUp);
      gl_FragColor = vec4(uRimColor * uRimIntensity * lit, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});

// Only the outer airframe gets a rim: not the canopy glass, cockpit, or the fans inside the intakes.
const RIM_MATERIALS = new Set(["Su57-body"]);

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
      if (source.name === "Su57-body") material.normalScale.setScalar(BODY_NORMAL_SCALE);
      for (const slot of TEXTURE_SLOTS) if (material[slot]) textures.add(material[slot]);
      mesh.material = material;
      if (RIM_MATERIALS.has(source.name)) mesh.add(new Mesh(mesh.geometry, rimMaterial));
    }
    // The painted panel lines, rivet rows and weathering are fine detail, and from the low hero camera
    // the upper surfaces are seen almost edge-on. Without anisotropic filtering they blur away there.
    for (const texture of textures) {
      texture.anisotropy = maxAnisotropy;
      texture.needsUpdate = true;
    }
    return clone;
  }, [scene, maxAnisotropy]);

  return <primitive object={model} />;
}

useGLTF.preload(MODEL, DRACO);
