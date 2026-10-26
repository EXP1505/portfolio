"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  MathUtils,
  Vector3,
  type AmbientLight,
  type DirectionalLight,
  type Group,
  type PerspectiveCamera,
} from "three";
import { Afterburners } from "./sky/Afterburners";
import { backdrop, backdropPaused, blurStill, captureCanvas, captureFlags, notifyBackdrop } from "./sky/backdrop";
import { AMBIENT_FILL, CAMERA, FLIGHT, GOLDEN, TOUR_DAMP, TOUR_SETTLE_EPSILON, TOUR_STOPS } from "./sky/config";
import { reveal, stage } from "./sky/reveal";
import { PostFX } from "./sky/PostFX";
import { sun, SkyDome, useSkyEnvironment } from "./sky/Sky";
import { rimUniforms, Su57 } from "./sky/Su57";
import { notifyTour, tour } from "./sky/tour";
import { useHeroReveal } from "./useHeroReveal";

// ?debugView=<TOUR_STOPS key> previews that camera-tour seat against the exact shipped scene,
// pinned at golden hour (no sunrise wait), for art-directing shots without reviving /sky-test.
// Not linked anywhere.
function useDebugView() {
  return useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("debugView") : null),
    [],
  );
}

/** Eases the rendered reveal toward the scroll target, so even coarse wheel steps move the light smoothly.
 * Any `?debugView` freezes it at 100% (golden hour) instead, so a preview doesn't wait on scroll. */
function RevealDriver() {
  const debugView = useDebugView();
  useFrame((_, delta) => {
    if (debugView) {
      reveal.value = 1;
      reveal.target = 1;
      reveal.stage = stage(1);
      return;
    }
    reveal.value = MathUtils.damp(reveal.value, reveal.target, 5, Math.min(delta, 0.1));
    if (Math.abs(reveal.value - reveal.target) < 1e-4) reveal.value = reveal.target;
    reveal.stage = stage(reveal.value);
  }, -1);
  return null;
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
  const debugView = useDebugView();
  const debugSeat = debugView && debugView in TOUR_STOPS ? TOUR_STOPS[debugView as keyof typeof TOUR_STOPS] : null;

  // Base heading points the camera at the sun, so at 0% the sun sits behind/beside the jet. Tied to
  // the hero seat for the whole live page (even once a camera-tour stop is active) so the
  // world-space sun direction never jumps when the camera changes seats — only `current` (below)
  // moves. Debug previews recompute it per seat instead, since each is judged standalone.
  const headingSeat = debugSeat ?? CAMERA;
  const baseHeading = useMemo(() => {
    void sunKnown;
    const look = headingSeat.target.clone().sub(headingSeat.position).setY(0).normalize();
    const want = sun.dir.clone().setY(0).normalize();
    // Sun slightly left of the jet in the opening frame.
    return Math.atan2(look.x, look.z) - Math.atan2(want.x, want.z) + 0.18;
  }, [sunKnown, headingSeat]);

  // The live (non-debug) camera seat the tour chases toward — TOUR_STOPS[tour.active], or back to
  // CAMERA once no stop is active. Starts already at CAMERA, so the hero itself is completely
  // unaffected (damping toward a target you're already at is a no-op) — only scrolling into a tour
  // stop ever moves it. Debug previews bypass this and pin straight to debugSeat, as before.
  const current = useRef({ position: CAMERA.position.clone(), target: CAMERA.target.clone(), fov: CAMERA.fov });
  // 0 = idle flight animation, 1 = held rock-steady (identity pose) for a tour close-up. A blend
  // factor rather than damping the pose values directly, so both steady states stay exactly exact
  // (no asymptotic creep away from the idle sinusoid) and only the transition between them glides.
  const holdFactor = useRef(0);

  useFrame(({ clock, scene, camera, gl }, delta) => {
    const s = clock.elapsedTime;
    const st = reveal.stage;
    const d = Math.min(delta, 0.1);
    gl.toneMappingExposure = st.exposure;

    let seatPosition: Vector3;
    let seatTarget: Vector3;
    let seatFov: number;
    if (debugSeat) {
      seatPosition = debugSeat.position;
      seatTarget = debugSeat.target;
      seatFov = debugSeat.fov;
    } else {
      const want = tour.active ? TOUR_STOPS[tour.active] : CAMERA;
      current.current.position.x = MathUtils.damp(current.current.position.x, want.position.x, TOUR_DAMP, d);
      current.current.position.y = MathUtils.damp(current.current.position.y, want.position.y, TOUR_DAMP, d);
      current.current.position.z = MathUtils.damp(current.current.position.z, want.position.z, TOUR_DAMP, d);
      current.current.target.x = MathUtils.damp(current.current.target.x, want.target.x, TOUR_DAMP, d);
      current.current.target.y = MathUtils.damp(current.current.target.y, want.target.y, TOUR_DAMP, d);
      current.current.target.z = MathUtils.damp(current.current.target.z, want.target.z, TOUR_DAMP, d);
      current.current.fov = MathUtils.damp(current.current.fov, want.fov, TOUR_DAMP, d);
      seatPosition = current.current.position;
      seatTarget = current.current.target;
      seatFov = current.current.fov;

      if (tour.active) {
        const dist = current.current.position.distanceTo(want.position) + current.current.target.distanceTo(want.target);
        const settled = dist < TOUR_SETTLE_EPSILON;
        if (settled !== tour.settled) {
          tour.settled = settled;
          notifyTour();
        }
      } else if (tour.settled) {
        tour.settled = false;
        notifyTour();
      }
    }

    // The rig carries the orbit heading; the camera orbits the same amount, so the jet's framing on
    // screen never changes — only which part of the fixed sky/sun the camera is looking across does.
    const heading = baseHeading + st.orbit;
    const rotate = (v: Vector3) => v.clone().applyAxisAngle(Y_AXIS, -heading);
    camera.position.copy(rotate(seatPosition));
    camera.lookAt(rotate(seatTarget));
    const persp = camera as PerspectiveCamera;
    if (Math.abs(persp.fov - seatFov) > 1e-3) {
      persp.fov = seatFov;
      persp.updateProjectionMatrix();
    }
    if (rig.current) rig.current.rotation.y = -heading;
    if (jet.current) {
      // `Capture` flips this for exactly one frame to grab a jet-free sky still for `blurred`.
      jet.current.visible = !captureFlags.hideJet;
      // The jet's own pose, local to the rig: a slight bank with a gentle drift, plus a constant yaw
      // offset so the nose doesn't point dead down the rig's centreline — like formation footage.
      // The camera only compensates for the rig's heading, not for this — fine at the hero seat's
      // long distance, but it visibly throws off the closer camera-tour seats, so previews (and a
      // live tour stop) hold the jet at identity pose to match the plain jet-local coordinates the
      // seats were authored against ("the jet stays rock-steady" during a close-up).
      if (debugView) {
        jet.current.rotation.set(0, 0, 0);
        jet.current.position.set(0, 0, 0);
      } else {
        const wantHold = tour.active !== null ? 1 : 0;
        holdFactor.current = MathUtils.damp(holdFactor.current, wantHold, TOUR_DAMP, d);
        if (Math.abs(holdFactor.current - wantHold) < 1e-3) holdFactor.current = wantHold;
        const idle = 1 - holdFactor.current;
        jet.current.rotation.set(
          FLIGHT.bankAmplitude * Math.sin(s * FLIGHT.bankSpeed) * idle,
          FLIGHT.yaw * idle,
          (FLIGHT.rollBase + FLIGHT.rollAmplitude * Math.sin(s * FLIGHT.rollSpeed)) * idle,
        );
        jet.current.position.set(
          FLIGHT.driftX * Math.sin(s * FLIGHT.driftXSpeed) * idle,
          FLIGHT.driftY * Math.sin(s * FLIGHT.driftYSpeed) * idle,
          0,
        );
      }
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
        <SkyDome />
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
 * Freezes a still of whatever the scene currently shows each time it goes from live to paused —
 * the hero settling at 100%, leaving a camera-tour stop with no next stop yet active, or entering
 * VyominCaseStudy's long-read span. Captures two stills: a sharp one (jet included, shown first as
 * the blur ramps in) and a jet-free one that becomes `blurred` — blurring a frame that still has
 * the jet in it only softens its edges (a radius big enough to actually dissolve a shape that large
 * would flatten the sky's own detail too), so the clean background instead comes from a second
 * capture with the jet hidden for exactly one frame via `captureFlags`. Runs after the
 * post-processing render in the same frame, so the drawing buffer is still valid each time.
 */
function Capture() {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const { width, height } = useThree((s) => s.size);
  const busy = useRef(false);
  // 0: idle: 1: sharp captured, jet just hidden, next frame grabs the sky-only still; 2: done —
  // without this terminal state, the frame right after `blurred` resolves (busy flips back to
  // false, but step was still 1) fell straight back into the sky-only branch, except the jet was
  // already visible again by then, silently overwriting `blurred` with a jet-included capture.
  const step = useRef<0 | 1 | 2>(0);
  // Whether the scene was "live" (still moving) as of last frame — a live→paused edge re-arms the
  // capture (so each freeze reflects wherever the camera actually stopped, not a stale one from
  // the hero or an earlier tour stop); a paused→live edge clears stale captures too, so a quick
  // re-pause before a fresh one lands can't briefly flash an old frame.
  const wasLive = useRef(true);

  const reset = useCallback(() => {
    // Object URLs (captureCanvas/blurStill return those now, not base64 data URLs) need explicit
    // cleanup — there are many more capture cycles per visit now (one per tour-stop boundary) than
    // the original one-shot hero capture, so leaving these unrevoked would leak real memory over a
    // full scroll-through.
    if (backdrop.sharp) URL.revokeObjectURL(backdrop.sharp);
    if (backdrop.blurred) URL.revokeObjectURL(backdrop.blurred);
    backdrop.sharp = null;
    backdrop.blurred = null;
    step.current = 0;
    captureFlags.hideJet = false;
    notifyBackdrop();
  }, []);

  useEffect(() => {
    if (!backdrop.sharp) return;
    reset();
  }, [width, height, reset]);

  useFrame(() => {
    const isLive = tour.active !== null || reveal.value !== 1 || reveal.target !== 1;
    if (wasLive.current !== isLive) {
      wasLive.current = isLive;
      reset();
    }

    if (busy.current || step.current === 2) return;
    if (step.current === 0) {
      if (backdrop.sharp || isLive) return;
      if (!get().scene.environment) return;
      // Downscaled + async (toBlob, not toDataURL) — the synchronous full-resolution encode this
      // used to do measured as a 600ms+ main-thread stall under CPU throttling, right at a
      // tour-stop scroll boundary. The pixel data is still grabbed synchronously at this call (so
      // `hideJet` below is safe to flip immediately); only the encode is deferred off-thread.
      captureCanvas(gl.domElement).then((url) => {
        backdrop.sharp = url;
        notifyBackdrop();
      });
      captureFlags.hideJet = true; // Flight applies this before next frame's render
      step.current = 1;
      return;
    }
    // This frame rendered with the jet hidden (Flight set visible=false before PostFX drew it).
    busy.current = true;
    step.current = 2;
    const skyOnly = captureCanvas(gl.domElement);
    captureFlags.hideJet = false; // restore for the live scene — safe immediately, see note above
    skyOnly
      .then((url) => blurStill(url))
      .then((blurred) => {
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
