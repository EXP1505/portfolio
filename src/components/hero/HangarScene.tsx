"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";
import { Backlight } from "./hangar/Backlight";
import { CAMERA, COLORS, JET_YAW, OPENING, WINGSPAN, WINGSPAN_SHARE } from "./hangar/config";
import { Hangar } from "./hangar/Hangar";
import { Jacks } from "./hangar/Jacks";
import { Su57 } from "./hangar/Su57";

/** Head-on camera, slightly below the nose. FOV follows the aspect so the wingspan keeps its share of the width. */
function Framing() {
  const get = useThree((s) => s.get);
  const { width, height } = useThree((s) => s.size);

  useLayoutEffect(() => {
    const camera = get().camera as PerspectiveCamera;
    const halfWidth = WINGSPAN / WINGSPAN_SHARE / 2;
    const halfHeight = halfWidth / (width / height);
    camera.fov = MathUtils.radToDeg(2 * Math.atan(halfHeight / CAMERA.distance));
    camera.position.set(0, CAMERA.height, CAMERA.distance);
    camera.lookAt(0, CAMERA.targetY, 0);
    camera.updateProjectionMatrix();
  }, [get, width, height]);

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
  const wrapper = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const markReady = useCallback(() => setReady(true), []);

  // Stop rendering while the hero is scrolled away, so the content sections scroll at full speed.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapper}
      aria-hidden
      className={`h-full w-full transition-opacity duration-[1800ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        dpr={[1, 1.75]}
        frameloop={onScreen ? "always" : "never"}
        camera={{ near: 0.5, far: 200 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[COLORS.bg]} />
        <fogExp2 attach="fog" args={[COLORS.bg, 0.016]} />
        <Framing />
        {/* Almost no front light: the jet must read as a silhouette. */}
        <ambientLight intensity={OPENING.ambient} />
        <Hangar />
        <Backlight />
        <Suspense fallback={null}>
          <group rotation={[0, JET_YAW, 0]}>
            <Su57 />
            <Jacks />
          </group>
          <Ready onReady={markReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
