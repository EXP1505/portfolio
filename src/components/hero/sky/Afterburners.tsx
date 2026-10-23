"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, ShaderMaterial, SRGBColorSpace, type MeshBasicMaterial } from "three";

// Nozzle exits measured from the model (engines at x ±1.17, exit plane z ≈ -8.1, centre y ≈ 0).
const NOZZLES = [-1.17, 1.17];

// HDR-overbright colours (channel values >1), not the texture's own 0..1 gradient — PostFX's bloom
// threshold is 1.0, so a plain white/amber material barely crosses it and produces almost no real
// light spill; these push comfortably past it so bloom actually bleeds past the nozzle rim, which a
// flat-alpha "halo" texture alone can't fake. A modest multiplier (2.6/2.0) looked fine in a preview
// with the golden sun nearby adding its own bloom on top, but against a plain sky (the real tour —
// CP's actual live heading doesn't put the sun in frame, unlike its standalone ?debugView preview)
// it read as flat hard-edged discs with no spill at all — pushed much higher here instead.
const CORE_COLOR = new Color(1, 1, 1).multiplyScalar(9);
const HALO_COLOR = new Color(1, 0.72, 0.4).multiplyScalar(7);

/**
 * A real radial gradient baked into the texture itself — white-hot centre through yellow and orange
 * to a transparent amber rim — rather than a flat-tinted circle whose colour never changes across the
 * disc (which is what read as a glowing lamp). RGB and alpha both fall off together.
 */
function coreTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,244,214,1)");
  g.addColorStop(0.4, "rgba(255,196,110,0.95)");
  g.addColorStop(0.68, "rgba(240,130,40,0.55)");
  g.addColorStop(1, "rgba(200,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A soft, low-opacity amber wash wider than the core, so bloom has something to spill past the rim. */
function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,170,80,0.9)");
  g.addColorStop(0.5, "rgba(230,120,40,0.35)");
  g.addColorStop(1, "rgba(200,90,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

let cache: { core: CanvasTexture; halo: CanvasTexture } | null = null;
const getTextures = () => (cache ??= { core: coreTexture(), halo: haloTexture() });

// Flame cone length/radius (metres) — see PLUME_VERTEX/PLUME_FRAGMENT below.
const PLUME_LENGTH = 4.2;
const PLUME_RADIUS = 0.42;

// A real 3D cone (ConeGeometry), not a flat billboard — flat planes (tried first, twice) always have
// an edge-on angle where they foreshorten to a sliver or go unstable (exactly CP's close-to-axial
// tour-stop angle, the one place this most needed to look right); actual geometry has no such angle,
// since there's real volume facing the camera from every direction. ConeGeometry's own axis is local
// Y (apex at +Y, base at -Y) regardless of how the mesh is rotated in the scene, so the gradient below
// is computed from the vertex's own unrotated local position — no dependence on Euler rotation order.
const PLUME_VERTEX = /* glsl */ `
  varying float vT;
  void main() {
    // 0 at the base (bright, wide), 1 at the apex/tip (dim, point) — cone apex is local +Y.
    float t = clamp((position.y + ${(PLUME_LENGTH / 2).toFixed(3)}) / ${PLUME_LENGTH.toFixed(3)}, 0.0, 1.0);
    vT = t;
    // Shock diamonds: pinch the cone's own radius periodically along its length — not just a
    // brightness ripple (the first attempt), which the bloom pass blurred away to nothing. An
    // actual geometric narrowing shows up as a real notch in the glow's outer edge, which survives
    // bloom fine since bloom only softens bright regions, it doesn't erase shape. Fades out in both
    // amplitude and frequency definition toward the tip, where a real plume's diamonds blur into haze.
    float crispness = 1.0 - smoothstep(0.3, 0.8, t);
    float pinch = 1.0 - crispness * 0.62 * (0.5 + 0.5 * cos(t * 26.0));
    vec3 pos = vec3(position.x * pinch, position.y, position.z * pinch);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const PLUME_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying float vT;
  void main() {
    // Real combustion temperature order: blue-white hottest right at the nozzle, cooling through
    // white/yellow/orange to a dim red-pink haze at the tip — not just an orange-to-pink fade.
    vec3 hot = vec3(0.75, 0.86, 1.0);
    vec3 white = vec3(1.0, 0.98, 0.9);
    vec3 yellow = vec3(1.0, 0.8, 0.47);
    vec3 orange = vec3(1.0, 0.55, 0.27);
    vec3 pink = vec3(1.0, 0.43, 0.47);
    vec3 col = vT < 0.07
      ? mix(hot, white, vT / 0.07)
      : vT < 0.24
        ? mix(white, yellow, (vT - 0.07) / 0.17)
        : vT < 0.55
          ? mix(yellow, orange, (vT - 0.24) / 0.31)
          : mix(orange, pink, (vT - 0.55) / 0.45);
    // Matches the vertex shader's geometric pinch (same frequency/phase, see PLUME_VERTEX): each
    // bulge also reads brighter and more opaque, each pinch point dimmer and more translucent, so
    // the segments separate into distinct beads instead of one continuously wavy cone.
    float crispness = 1.0 - smoothstep(0.3, 0.8, vT);
    float wave = 0.5 + 0.5 * cos(vT * 26.0);
    float pulse = 1.0 + crispness * 0.35 * wave;
    float gap = 1.0 - crispness * 0.5 * (1.0 - wave);
    float alpha = pow(1.0 - vT, 1.6) * gap * uOpacity;
    float brightness = mix(1.3, 1.0, smoothstep(0.0, 0.5, vT)) * pulse;
    gl_FragColor = vec4(col * brightness, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const CORE_OPACITY = 1;

export function Afterburners() {
  const { core, halo } = getTextures();
  // Flat list of every core/halo material across both nozzles — these flicker together (each keeps
  // its own base opacity via userData), so the whole glow breathes, not just the centre dot.
  const flicker = useRef<MeshBasicMaterial[]>([]);
  // The flame cone's shader material per nozzle, one stable instance each (not recreated per
  // render) — flickers via its uOpacity uniform instead of the plain .opacity property, since a
  // custom ShaderMaterial doesn't wire that up automatically.
  const plumeMaterials = useMemo(() => NOZZLES.map(() => new ShaderMaterial({
    vertexShader: PLUME_VERTEX,
    fragmentShader: PLUME_FRAGMENT,
    uniforms: { uOpacity: { value: 0.75 } },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })), []);

  useFrame(({ clock }) => {
    // A faint flicker, so the glow feels alive without strobing.
    const f = 0.92 + 0.08 * Math.sin(clock.elapsedTime * 23) * Math.sin(clock.elapsedTime * 7.3);
    flicker.current.forEach((m) => m && (m.opacity = m.userData.baseOpacity * f));
    plumeMaterials.forEach((m) => (m.uniforms.uOpacity.value = 0.75 * f));
  });

  return (
    <>
      {NOZZLES.map((x, i) => (
        <group key={x} position={[x, -0.02, -7.98]}>
          {/* Wide, low-opacity halo so bloom spills visibly past the physical nozzle edge. */}
          <mesh rotation={[0, Math.PI, 0]} position={[0, 0, 0.01]}>
            <circleGeometry args={[0.75, 32]} />
            <meshBasicMaterial
              ref={(m) => {
                if (!m) return;
                m.userData.baseOpacity = CORE_OPACITY * 0.6;
                flicker.current[i * 2 + 1] = m;
              }}
              map={halo}
              color={HALO_COLOR}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
              opacity={CORE_OPACITY * 0.6}
            />
          </mesh>
          {/* The nozzle's own radial gradient: white-hot centre falling off to amber at the rim. */}
          <mesh rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.36, 40]} />
            <meshBasicMaterial
              ref={(m) => {
                if (!m) return;
                m.userData.baseOpacity = CORE_OPACITY;
                flicker.current[i * 2] = m;
              }}
              map={core}
              color={CORE_COLOR}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {/* Heat plume: a real 3D cone trailing behind the nozzle exit (not a flat billboard — see
              the note above PLUME_VERTEX on why), long enough to actually read as flame projecting
              into open air rather than a glow sitting at the nozzle. Apex (-Y rotated to -Z) points
              away from the jet; the base sits just behind the nozzle disc. */}
          <mesh position={[0, 0, -0.05 - PLUME_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]} material={plumeMaterials[i]}>
            <coneGeometry args={[PLUME_RADIUS, PLUME_LENGTH, 24, 1, true]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
