"use client";

// EXPERIMENT (test page only, /sky-test): the Su-57 in open sky instead of the hangar. Not used by
// the main hero. Time of day `t` (0 pre-dawn → 0.5 sunrise → 1 golden hour) comes from the page.
//
// 0% is a procedural pre-dawn dome (approved as is). From there it crossfades into a real photographic
// sky (Poly Haven "Industrial Sunset 02, pure sky", CC0): an 8k tonemapped JPG (as WebP) for the
// visible background, and the matching 1k HDR, un-desaturated, for real-colour light and reflections.
// The sun stays on the horizon throughout. Instead of moving the sun, the camera and jet orbit together
// relative to the fixed sky: the sun starts behind the jet (silhouette) and ends raking across it.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  FloatType,
  LinearMipmapLinearFilter,
  PMREMGenerator,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
  type AmbientLight,
  type DataTexture,
  type DirectionalLight,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { Su57, rimUniforms } from "@/components/hero/hangar/Su57";

const SKY_PHOTO = "/test-assets/industrial_sunset_02_puresky_8k.webp";
const SKY_HDR = "/test-assets/industrial_sunset_02_puresky_1k.hdr";
const AMBER = new Color("#C98A2B");
const AMBER_HOT = new Color("#F2C879");
const STEEL = new Color("#8A96A3");
// Golden-hour sunlight: the UI palette rules don't apply to the sky or the light on the jet.
const GOLDEN = new Color("#FF9F4A");

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Where the sun is in the photo (found from the HDR's brightest pixel at load). Default: on the horizon.
const sun = { dir: new Vector3(0, 0.03, -1) };

/** Everything that changes with t. */
function timeOfDay(t: number) {
  return {
    // Pre-dawn dome (the approved 0% look) fades out as the photo sky fades in.
    predawn: 1 - smooth(0.06, 0.42, t),
    photo: lerp(0.18, 1, smooth(0.08, 0.6, t)),
    sunGlow: lerp(0, 1.6, smooth(0.2, 0.6, t)),
    sun: lerp(0, 3.2, smooth(0.25, 0.75, t)),
    // Slightly under-exposed, so the warm lit side keeps its gold instead of clipping to white.
    exposure: lerp(1, 0.82, smooth(0.4, 1, t)),
    env: lerp(0.03, 0.55, smooth(0.25, 0.85, t)),
    rim: lerp(1.2, 0, smooth(0.3, 0.6, t)),
    ambient: lerp(0.01, 0.03, t),
    streaks: lerp(0.0, 1, smooth(0.25, 0.7, t)),
    // Orbit (radians) of camera + jet around the sky: sun behind the jet → raking from the side.
    // Sun held in frame (low, glowing behind the jet) until ~55%, then swung round to the camera side.
    orbit: lerp(0, -1.15, smooth(0.5, 1, t)),
  };
}
type TimeOfDay = ReturnType<typeof timeOfDay>;

// ---------------------------------------------------------------------------------------------------
// Sky: photo background, lightly graded (contrast, a little saturation back after tone mapping, the
// below-horizon band darkened so the jet stays crisp), plus a bloomed sun glow, with the pre-dawn
// gradient dome crossfaded over it at the start.

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
    uBand: { value: AMBER.clone().lerp(STEEL, 0.45).multiplyScalar(0.45) },
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

      // Photo sky (equirectangular, same mapping as three's equirect textures).
      vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(h, -1.0, 1.0)) / PI + 0.5);
      vec3 photo = texture2D(uPhoto, uv).rgb;
      // Light grade: a touch more contrast and saturation (the tone mapper flattens an LDR photo),
      // and a darker band below the horizon so it reads as distant haze, not a bright floor.
      float l = dot(photo, vec3(0.2126, 0.7152, 0.0722));
      photo = mix(vec3(l), photo, 1.3);
      photo = pow(max(photo, 0.0), vec3(1.3));
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

function SkyDome({ tod }: { tod: TimeOfDay }) {
  const dome = useRef<Mesh>(null);
  const photo = useTexture(SKY_PHOTO, (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearMipmapLinearFilter;
    tex.anisotropy = 8;
  });

  useFrame(({ camera }) => {
    dome.current?.position.copy(camera.position);
    const u = skyMaterial.uniforms;
    u.uPhoto.value = photo;
    u.uPhotoGain.value = tod.photo;
    u.uPredawn.value = tod.predawn;
    u.uSunDir.value.copy(sun.dir);
    u.uSunGlow.value = tod.sunGlow;
    u.uGlowColor.value.copy(GOLDEN).lerp(AMBER_HOT, 0.4);
  });
  return (
    <mesh ref={dome} material={skyMaterial} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[900, 64, 32]} />
    </mesh>
  );
}

/** The matching HDR for light and reflections, at its real colours (warm sun side, cool blue sky). */
function useSkyEnvironment(onSun: () => void) {
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

// ---------------------------------------------------------------------------------------------------
// Afterburners (approved look): amber recessed in the nozzles, small hot core, faint plume.

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
let glowCache: CanvasTexture | null = null;
const getGlow = () => (glowCache ??= glowTexture());

function Afterburners() {
  const glow = getGlow();
  const plumes = useRef<MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    const f = 0.9 + 0.1 * Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7.3);
    plumes.current.forEach((m) => m && (m.opacity = 0.32 * f));
  });
  return (
    <>
      {[-1.17, 1.17].map((x, i) => (
        <group key={x} position={[x, -0.02, -7.98]}>
          <mesh rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.38, 32]} />
            <meshBasicMaterial map={glow} color={AMBER.clone().multiplyScalar(1.5)} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, -0.01]}>
            <circleGeometry args={[0.12, 24]} />
            <meshBasicMaterial map={glow} color={AMBER_HOT.clone().multiplyScalar(2.4)} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {[0, Math.PI / 2].map((rz, j) => (
            <mesh key={rz} position={[0, 0, -1.6]} rotation={[Math.PI / 2, 0, rz]}>
              <planeGeometry args={[0.7, 3.2]} />
              <meshBasicMaterial
                ref={(m) => {
                  if (m) plumes.current[i * 2 + j] = m;
                }}
                map={glow}
                color={AMBER.clone().multiplyScalar(1.6)}
                transparent
                opacity={0.32}
                blending={AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------
// Speed streaks: a few thin, fast, faint cloud streaks slipping past the jet (in the jet's frame).

function streakTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(64, 256);
  for (let y = 0; y < 256; y++) {
    const along = Math.sin((y / 255) * Math.PI) ** 1.5;
    for (let x = 0; x < 64; x++) {
      const across = Math.exp(-(((x - 31.5) / 9) ** 2));
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * along * across);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
let streakCache: CanvasTexture | null = null;
const getStreak = () => (streakCache ??= streakTexture());

const STREAKS: { x: number; y: number; z: number; length: number; width: number }[] = [
  { x: -7, y: -2.2, z: 10, length: 16, width: 0.5 },
  { x: 8.5, y: 1.6, z: -6, length: 20, width: 0.6 },
  { x: -10, y: 3.2, z: -26, length: 22, width: 0.7 },
  { x: 6, y: -3.6, z: -44, length: 18, width: 0.6 },
  { x: -4.5, y: -4.4, z: -62, length: 24, width: 0.8 },
];
const STREAK_SPEED = 60;
const STREAK_NEAR = 24;
const STREAK_FAR = -80;

function SpeedStreaks({ amount }: { amount: number }) {
  const group = useRef<Group>(null);
  const material = useMemo(
    () =>
      ({
        map: getStreak(),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }) as const,
    [],
  );
  const mats = useRef<MeshBasicMaterial[]>([]);
  useFrame((_, delta) => {
    for (const child of group.current?.children ?? []) {
      child.position.z -= STREAK_SPEED * delta;
      if (child.position.z < STREAK_FAR) child.position.z += STREAK_NEAR - STREAK_FAR;
    }
    mats.current.forEach((m) => m && (m.opacity = 0.16 * amount));
  });
  return (
    <group ref={group}>
      {STREAKS.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[s.width, s.length]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            {...material}
            color="#FFF1DE"
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------

const VIEWS: Record<"front" | "rear", { position: Vector3; target: Vector3 }> = {
  front: { position: new Vector3(6, 0.6, 19), target: new Vector3(0, 0.6, 0) },
  rear: { position: new Vector3(-9, 2.4, -17), target: new Vector3(0, 0.2, -4) },
};

function Flight({ t, view }: { t: number; view: "front" | "rear" }) {
  const rig = useRef<Group>(null);
  const jet = useRef<Group>(null);
  const key = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const tod = useMemo(() => timeOfDay(t), [t]);
  const [sunKnown, setSunKnown] = useState(0);
  useSkyEnvironment(useMemo(() => () => setSunKnown((n) => n + 1), []));

  // The rig's base heading points the front camera at the sun, so at 0% the sun is behind the jet.
  const baseHeading = useMemo(() => {
    void sunKnown;
    const v = VIEWS.front;
    const look = v.target.clone().sub(v.position).setY(0).normalize();
    const want = sun.dir.clone().setY(0).normalize();
    // Sun slightly left of the jet in the opening frame.
    return Math.atan2(look.x, look.z) - Math.atan2(want.x, want.z) + 0.18;
  }, [sunKnown]);

  useFrame(({ clock, scene, camera, gl }) => {
    const s = clock.elapsedTime;
    gl.toneMappingExposure = tod.exposure;
    const heading = baseHeading + tod.orbit;
    if (rig.current) rig.current.rotation.y = -heading;
    // Camera rides with the rig (same framing at every t), so only the sky and light change.
    const v = VIEWS[view];
    const rot = (p: Vector3) => p.clone().applyAxisAngle(new Vector3(0, 1, 0), -heading);
    camera.position.copy(rot(v.position));
    camera.lookAt(rot(v.target));
    if (jet.current) {
      // Slight bank with a gentle drift, like formation air-to-air footage.
      jet.current.rotation.set(0.04 + 0.01 * Math.sin(s * 0.5), 0.12, 0.16 + 0.03 * Math.sin(s * 0.35));
      jet.current.position.set(0.5 * Math.sin(s * 0.27), 0.35 * Math.sin(s * 0.41), 0);
    }
    scene.environmentIntensity = tod.env;
    rimUniforms.uRimIntensity.value = tod.rim;
    if (ambient.current) ambient.current.intensity = tod.ambient;
    if (key.current) {
      // Real golden-hour sun: low, warm, raking.
      key.current.position.copy(sun.dir).multiplyScalar(80);
      key.current.intensity = tod.sun;
      key.current.color.copy(GOLDEN);
    }
  });

  return (
    <>
      <Suspense fallback={null}>
        <SkyDome tod={tod} />
      </Suspense>
      <directionalLight ref={key} />
      <ambientLight ref={ambient} color="#9DB4D6" />
      <group ref={rig}>
        <group ref={jet}>
          <Suspense fallback={null}>
            <Su57 />
          </Suspense>
          <Afterburners />
        </group>
        <SpeedStreaks amount={tod.streaks} />
      </group>
    </>
  );
}

export default function SkyScene({ t, view }: { t: number; view: "front" | "rear" }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 32, near: 0.5, far: 2000 }} gl={{ antialias: false }}>
      <Flight t={t} view={view} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.25} intensity={0.75} radius={0.65} levels={6} />
        {/* ACES (not AgX) for the sky test: punchier golden-hour contrast and saturation. */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
        <Vignette offset={0.3} darkness={0.5} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.08} />
      </EffectComposer>
    </Canvas>
  );
}
