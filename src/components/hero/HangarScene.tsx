"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type AmbientLight, type DirectionalLight, type PerspectiveCamera } from "three";
import { Backlight } from "./hangar/Backlight";
import {
  CAMERA,
  COLORS,
  JET_YAW,
  KEY_LIGHT_POSITION,
  OPENING,
  WINGSPAN,
  WINGSPAN_SHARE,
} from "./hangar/config";
import { loadHangarEnvironment } from "./hangar/Environment";
import { Grounding } from "./hangar/Grounding";
import { Hangar } from "./hangar/Hangar";
import { Jacks } from "./hangar/Jacks";
import { reveal, stage } from "./hangar/reveal";
import { PostFX } from "./hangar/PostFX";
import { RowLights } from "./hangar/RowLights";
import { Su57, rimUniforms } from "./hangar/Su57";
import { useHeroReveal } from "./useHeroReveal";
import { backdrop, backdropPaused, blurStill, notifyBackdrop } from "./hangar/backdrop";

/** Eases the rendered reveal toward the scroll target, so even coarse wheel steps move the light smoothly. */
function RevealDriver() {
  useFrame((_, delta) => {
    reveal.value = MathUtils.damp(reveal.value, reveal.target, 5, Math.min(delta, 0.1));
    if (Math.abs(reveal.value - reveal.target) < 1e-4) reveal.value = reveal.target;
    reveal.stage = stage(reveal.value);
  }, -1);
  return null;
}

/**
 * Head-on camera, slightly below the nose at the start. The FOV is fixed from the opening distance so
 * the wingspan keeps its share of the width at 0%; the reveal then raises the camera and pushes in.
 */
function CameraRig() {
  const get = useThree((s) => s.get);
  const { width, height } = useThree((s) => s.size);

  useLayoutEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    const halfHeight = WINGSPAN / WINGSPAN_SHARE / 2 / (width / height);
    camera.fov = MathUtils.radToDeg(2 * Math.atan(halfHeight / CAMERA.distance));
    camera.updateProjectionMatrix();
  }, [get, width, height]);

  useFrame(({ camera }) => {
    const c = reveal.stage.camera;
    camera.position.set(0, c.height, c.distance);
    camera.lookAt(0, c.targetY, 0);
  });

  return null;
}

// Rotates the HDRI so its window highlights run along the fuselage and wings.
const ENVIRONMENT_ROTATION = 1.1;

/**
 * Light that brings the jet out as the hangar wakes. Shading comes from an angled key light from
 * above and HDRI reflections (the white paint is semi-gloss, so its panel lines read through
 * reflections), with only a little ambient and front fill. Exposure eases down so white never clips.
 */
function RevealLights() {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const ambient = useRef<AmbientLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const key = useRef<DirectionalLight>(null);

  useEffect(() => {
    // Hangar HDRI, cooled to near-white; starts at zero intensity (silhouette).
    let disposed = false;
    const scene = get().scene;
    scene.environmentIntensity = 0;
    scene.environmentRotation.set(0, ENVIRONMENT_ROTATION, 0);
    loadHangarEnvironment(gl).then((env) => {
      if (disposed) return env.dispose();
      scene.environment = env;
    });
    return () => {
      disposed = true;
      scene.environment?.dispose();
      scene.environment = null;
    };
  }, [gl, get]);

  useFrame(({ scene, gl: renderer }) => {
    const s = reveal.stage;
    if (ambient.current) ambient.current.intensity = s.ambient;
    if (fill.current) fill.current.intensity = s.fill;
    if (key.current) key.current.intensity = s.key;
    scene.environmentIntensity = s.environment;
    renderer.toneMappingExposure = s.exposure;
    rimUniforms.uRimIntensity.value = s.rim;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={OPENING.ambient} />
      <directionalLight ref={fill} position={[2, 6, 26]} intensity={0} color={COLORS.backlight} />
      <directionalLight ref={key} position={KEY_LIGHT_POSITION} intensity={0} color={COLORS.backlight} />
    </>
  );
}

/**
 * Once the reveal has settled at 100% (and the HDRI is in, so reflections are in the picture), capture
 * the final frame once: a sharp still plus a pre-blurred copy for the page background. Runs after the
 * post-processing render in the same frame, so the drawing buffer is still valid. A resize clears
 * the capture; the canvas then resumes (nothing to pause behind) and captures again.
 */
function Capture() {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const { width, height } = useThree((s) => s.size);
  const busy = useRef(false);

  useEffect(() => {
    if (!backdrop.sharp) return;
    backdrop.sharp = null;
    backdrop.blurred = null;
    notifyBackdrop();
  }, [width, height]);

  useFrame(() => {
    if (backdrop.sharp || busy.current || reveal.value !== 1 || reveal.target !== 1) return;
    if (!get().scene.environment) return;
    busy.current = true;
    const sharp = gl.domElement.toDataURL("image/webp", 0.9);
    blurStill(sharp).then((blurred) => {
      backdrop.sharp = sharp;
      backdrop.blurred = blurred;
      busy.current = false;
      notifyBackdrop();
    });
  }, 2);

  return null;
}

/** Rendered inside the model's Suspense boundary, so it only mounts once the jet has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    // Wait a couple of frames so the first visible frame is fully compiled and drawn.
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(onReady)));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

export default function HangarScene() {
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useHeroReveal();

  // While the captured still covers it (content scrolling over the blurred background), don't render.
  useEffect(() => {
    const update = () => setPaused(backdropPaused());
    backdrop.listeners.add(update);
    return () => {
      backdrop.listeners.delete(update);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`h-full w-full transition-opacity duration-[1800ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        dpr={[1, 1.25]}
        frameloop={paused ? "never" : "always"}
        camera={{ near: 0.5, far: 200, position: [0, CAMERA.height, CAMERA.distance] }}
        // Antialiasing and AgX tone mapping happen in the post-processing pass (PostFX).
        gl={{ antialias: false }}
      >
        <color attach="background" args={[COLORS.bg]} />
        <fogExp2 attach="fog" args={[COLORS.bg, 0.012]} />
        <RevealDriver />
        <CameraRig />
        <RevealLights />
        <Hangar />
        <RowLights />
        <Backlight />
        <Suspense fallback={null}>
          <group rotation={[0, JET_YAW, 0]}>
            <Su57 />
            <Jacks />
            <Grounding />
          </group>
          <Capture />
          <Ready onReady={markReady} />
        </Suspense>
        <PostFX />
      </Canvas>
    </div>
  );
}
