"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BackSide,
  Color,
  FloatType,
  LinearFilter,
  PMREMGenerator,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
  type DataTexture,
  type Mesh,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { AMBER, AMBER_HOT, SKY_HDR, SKY_PHOTO, STEEL } from "./config";
import { reveal } from "./reveal";

// Where the sun is in the photo (found from the HDR's brightest pixel once it loads). World-space and
// constant for the rest of the session: the sky+jet rig orbits under it, the sun itself never moves.
// Default points it low on the horizon, matching the pre-dawn frame before the HDR has resolved.
export const sun = { dir: new Vector3(0, 0.03, -1) };

// ---------------------------------------------------------------------------------------------------
// Sky dome: the photo as the visible background, lightly graded, with a bloomed sun glow baked in,
// crossfaded from the approved procedural pre-dawn gradient at the start of the reveal.

const skyMaterial = new ShaderMaterial({
  side: BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uPhoto: { value: null },
    uPhotoGain: { value: 1 },
    uPredawn: { value: 1 },
    uSunDir: { value: new Vector3() },
    uSunGlow: { value: 0 },
    uGlowColor: { value: new Color() },
    uZenith: { value: new Color("#05070A") },
    uHorizon: { value: new Color("#121921") },
    uBand: { value: new Color(AMBER).lerp(new Color(STEEL), 0.45).multiplyScalar(0.45) },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D uPhoto;
    uniform float uPhotoGain, uPredawn, uSunGlow;
    uniform vec3 uSunDir, uGlowColor, uZenith, uHorizon, uBand;
    varying vec3 vDir;
    const float PI = 3.141592653589793;
    void main() {
      vec3 dir = normalize(vDir);
      float h = dir.y;

      // Photo sky (equirectangular, same mapping as three's equirect textures). uPhoto has mipmapping
      // disabled (see Sky.tsx), which matters here: a derivative-based mip selection on a UV computed
      // by hand from atan2 spikes hugely right at the u=0/1 wrap seam, picking a wrong, unstable mip
      // there and showing as a vertical seam line. Sampling only the base level removes that entirely.
      vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(h, -1.0, 1.0)) / PI + 0.5);
      vec3 photo = texture2D(uPhoto, uv).rgb;
      // Light grade: a touch more contrast and saturation (the tone mapper flattens an LDR photo),
      // and a darker band below the horizon so it reads as distant haze, not a bright floor. The
      // source photo's own horizon band is quite muted once exposure/ACES compress it, so a flat
      // gain lifts it back to an actual golden-hour read instead of a thin grey-brown line.
      float l = dot(photo, vec3(0.2126, 0.7152, 0.0722));
      photo = mix(vec3(l), photo, 1.3);
      photo = pow(max(photo, 0.0), vec3(1.3));
      photo *= 2.2;
      photo *= mix(1.0, 0.45, smoothstep(0.0, -0.18, h));
      // Sun glow: a bright core plus soft halo, over-bright so bloom gives a real sun flare.
      float s = max(dot(dir, normalize(uSunDir)), 0.0);
      photo += uGlowColor * uSunGlow * (2.5 * smoothstep(0.99975, 0.99992, s) + 0.5 * pow(s, 600.0) + 0.12 * pow(s, 40.0));
      photo *= uPhotoGain;

      // Pre-dawn dome: the approved 0% gradient with a thin pale-gold band toward the sun.
      vec3 pre = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, h));
      pre = mix(pre, uHorizon * 0.35, smoothstep(0.0, -0.25, h));
      float toward = 0.5 + 0.5 * dot(normalize(dir.xz + 1e-5), normalize(uSunDir.xz + 1e-5));
      pre += uBand * exp(-abs(h - 0.01) * 48.0) * pow(toward, 3.0);

      gl_FragColor = vec4(mix(photo, pre, uPredawn), 1.0);
      #include <colorspace_fragment>
    }
  `,
});

export function SkyDome() {
  const dome = useRef<Mesh>(null);
  const photo = useTexture(SKY_PHOTO, (tex) => {
    tex.colorSpace = SRGBColorSpace;
    // No mipmaps: disables the derivative-based mip selection that caused the seam artefact at the
    // equirect wrap (see the shader comment above). A single full-res sample is used everywhere; any
    // resulting grazing-angle shimmer is well masked by SMAA, bloom, vignette and grain.
    tex.generateMipmaps = false;
    tex.minFilter = LinearFilter;
  });

  useFrame(({ camera }) => {
    dome.current?.position.copy(camera.position);
    // Read `reveal.stage` directly, every frame — not as a prop. `SkyDome` mounts once (behind its
    // own Suspense, waiting on the texture) and essentially never re-renders afterward, so a `stage`
    // prop would freeze at whatever reveal.stage happened to be at that one render and never update
    // again, no matter how far the page is scrolled.
    const st = reveal.stage;
    const u = skyMaterial.uniforms;
    u.uPhoto.value = photo;
    u.uPhotoGain.value = st.photo;
    u.uPredawn.value = st.predawn;
    u.uSunDir.value.copy(sun.dir);
    u.uSunGlow.value = st.sunGlow;
    u.uGlowColor.value.set(GOLDEN_GLOW).lerp(AMBER_HOT_COLOR, 0.4);
  });
  return (
    <mesh ref={dome} material={skyMaterial} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[900, 64, 32]} />
    </mesh>
  );
}

const GOLDEN_GLOW = new Color("#FF9F4A");
const AMBER_HOT_COLOR = new Color(AMBER_HOT);

/** The matching HDR for light and reflections, at its real colours (warm sun side, cool blue sky). */
export function useSkyEnvironment(onSun: () => void) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  useEffect(() => {
    let disposed = false;
    const scene = get().scene;
    new HDRLoader()
      .setDataType(FloatType)
      .loadAsync(SKY_HDR)
      .then((hdr: DataTexture) => {
        if (disposed) return hdr.dispose();
        const { data, width, height } = hdr.image as { data: Float32Array; width: number; height: number };
        let best = 0, bestI = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          if (lum > best) {
            best = lum;
            bestI = i / 4;
          }
        }
        // Equirect pixel → direction (u = atan2(z, x) / 2π + 0.5; row 0 = zenith).
        const u = (bestI % width) / width, v = Math.floor(bestI / width) / height;
        const az = (u - 0.5) * Math.PI * 2, el = Math.max((0.5 - v) * Math.PI, 0.02);
        sun.dir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
        const pmrem = new PMREMGenerator(gl);
        scene.environment = pmrem.fromEquirectangular(hdr).texture;
        pmrem.dispose();
        hdr.dispose();
        onSun();
      });
    return () => {
      disposed = true;
      scene.environment?.dispose();
      scene.environment = null;
    };
  }, [gl, get, onSun]);
}
