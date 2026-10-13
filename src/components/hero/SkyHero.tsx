"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Vector3, type AmbientLight, type DirectionalLight, type Group } from "three";
import { Afterburners } from "./sky/Afterburners";
import { backdrop, backdropPaused, blurStill, notifyBackdrop } from "./sky/backdrop";
import { AMBIENT_FILL, CAMERA, DEBUG_REAR_CAMERA, FLIGHT, GOLDEN } from "./sky/config";
import { reveal, stage } from "./sky/reveal";
import { PostFX } from "./sky/PostFX";
import { sun, SkyDome, useSkyEnvironment } from "./sky/Sky";
import { rimUniforms, Su57 } from "./sky/Su57";
import { useHeroReveal } from "./useHeroReveal";

/** Eases the rendered reveal toward the scroll target, so even coarse wheel steps move the light smoothly. */
function RevealDriver() {
  useFrame((_, delta) => {
    reveal.value = MathUtils.damp(reveal.value, reveal.target, 5, Math.min(delta, 0.1));
    if (Math.abs(reveal.value - reveal.target) < 1e-4) reveal.value = reveal.target;
    reveal.stage = stage(reveal.value);
  }, -1);
  return null;
}

// ?debugView=rear puts the camera behind the jet (afterburners in frame) using the exact shipped
// scene/lighting/post code path, for checking fixes without reviving /sky-test. Not linked anywhere.
function useDebugRearView() {
  return useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugView") === "rear",
    [],
  );
}

const Y_AXIS = new Vector3(0, 1, 0);

/**
 * The jet, sky and light. The camera and the jet rig rotate together by the same heading each frame,
 * so the jet stays framed identically on screen throughout; what changes is which part of the fixed
 * sky dome and fixed-direction sun the camera is looking across. At 0% the heading points the camera
 * so the sun sits low behind/beside the jet (silhouette); by 100% it's swung round so the sun rakes
 * in from the side. The key light and rim both read the same real `sun.dir`, so the lit/shadow split
 * always matches what's visibly happening in the sky behind the jet.
 */
function Flight() {
  const rig = useRef<Group>(null);
  const jet = useRef<Group>(null);
  const key = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const [sunKnown, setSunKnown] = useState(0);
  useSkyEnvironment(useCallback(() => setSunKnown((n) => n + 1), []));
  const rear = useDebugRearView();
  const seat = rear ? DEBUG_REAR_CAMERA : CAMERA;

  // The seat's base heading points the camera at the sun, so at 0% the sun sits behind/beside the jet.
  const baseHeading = useMemo(() => {
    void sunKnown;
    const look = seat.target.clone().sub(seat.position).setY(0).normalize();
    const want = sun.dir.clone().setY(0).normalize();
    // Sun slightly left of the jet in the opening frame.
    return Math.atan2(look.x, look.z) - Math.atan2(want.x, want.z) + 0.18;
  }, [sunKnown, seat]);

  useFrame(({ clock, scene, camera, gl }) => {
    const s = clock.elapsedTime;
    const st = reveal.stage;
    gl.toneMappingExposure = st.exposure;

    // The rig carries the orbit heading; the camera orbits the same amount, so the jet's framing on
    // screen never changes — only which part of the fixed sky/sun the camera is looking across does.
    const heading = baseHeading + st.orbit;
    const rotate = (v: Vector3) => v.clone().applyAxisAngle(Y_AXIS, -heading);
    camera.position.copy(rotate(seat.position));
    camera.lookAt(rotate(seat.target));
    if (rig.current) rig.current.rotation.y = -heading;
    if (jet.current) {
      // The jet's own pose, local to the rig: a slight bank with a gentle drift, plus a constant yaw
      // offset so the nose doesn't point dead down the rig's centreline — like formation footage.
      jet.current.rotation.set(
        FLIGHT.bankAmplitude * Math.sin(s * FLIGHT.bankSpeed),
        FLIGHT.yaw,
        FLIGHT.rollBase + FLIGHT.rollAmplitude * Math.sin(s * FLIGHT.rollSpeed),
      );
      jet.current.position.set(
        FLIGHT.driftX * Math.sin(s * FLIGHT.driftXSpeed),
        FLIGHT.driftY * Math.sin(s * FLIGHT.driftYSpeed),
        0,
      );
    }

    scene.environmentIntensity = st.env;
    rimUniforms.uRimIntensity.value = st.rim;
    rimUniforms.uSunDir.value.copy(sun.dir);
    if (ambient.current) ambient.current.intensity = st.ambient;
    if (key.current) {
      // Real golden-hour sun: low, warm, raking. Fixed in world space — only the camera/jet orbit.
      key.current.position.copy(sun.dir).multiplyScalar(80);
      key.current.intensity = st.sun;
    }
  });

  return (
    <>
      <Suspense fallback={null}>
        <SkyDome stage={reveal.stage} />
      </Suspense>
      <directionalLight ref={key} color={GOLDEN} />
      <ambientLight ref={ambient} color={AMBIENT_FILL} />
      <group ref={rig}>
        <group ref={jet}>
          <Suspense fallback={null}>
            <Su57 />
          </Suspense>
          <Afterburners />
        </group>
      </group>
    </>
  );
}

/**
 * Once the reveal has settled at 100% (and the HDR is in, so reflections/sun direction are final),
 * capture the frame once: a sharp still plus a pre-blurred copy for the page background. Runs after
 * the post-processing render in the same frame, so the drawing buffer is still valid. A resize clears
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

export default function SkyHero() {
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
        dpr={[1, 1.5]}
        frameloop={paused ? "never" : "always"}
        camera={{ fov: CAMERA.fov, near: 0.5, far: 2000 }}
        // Antialiasing happens in the post-processing pass (SMAA, in PostFX).
        gl={{ antialias: false }}
      >
        <RevealDriver />
        <Flight />
        <Suspense fallback={null}>
          <Capture />
          <Ready onReady={markReady} />
        </Suspense>
        <PostFX />
      </Canvas>
    </div>
  );
}
