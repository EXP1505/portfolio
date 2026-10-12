import { CAMERA, OPENING, REVEALED, lerp } from "./config";

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(Math.max((x - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

// Overhead rows (4) switch on back to front: row 0 at ~25%, row 1 by ~45%, row 2 by ~60%, row 3 by ~80%.
const ROW_START = 0.18;
const ROW_STEP = 0.17;
const ROW_RAMP = 0.12;
// Panels within a row come on a beat apart, like real floodlights.
const PANEL_STAGGER = 0.015;

/** 0..1 brightness of one light panel (row 0 = back of the hangar). */
export function panelLevel(row: number, panel: number, p: number) {
  const start = ROW_START + row * ROW_STEP + panel * PANEL_STAGGER;
  return smooth(start, start + ROW_RAMP, p);
}

/** Every lighting and camera value for reveal progress `p`. Nothing changes past 90%: a short hold. */
export function stage(p: number) {
  const push = smooth(0.1, 0.9, p);
  return {
    ambient: lerp(OPENING.ambient, REVEALED.ambient, smooth(0.3, 0.9, p)),
    // The angled key light, then reflections, bring the camo and panel lines out after the first rows.
    key: lerp(0, REVEALED.key, smooth(0.32, 0.8, p)),
    fill: lerp(0, REVEALED.fill, smooth(0.35, 0.8, p)),
    environment: lerp(0, REVEALED.environment, smooth(0.42, 0.88, p)),
    backLight: lerp(OPENING.backLight, REVEALED.backLight, smooth(0.3, 0.85, p)),
    exposure: lerp(OPENING.exposure, REVEALED.exposure, smooth(0.4, 0.9, p)),
    // Contact shadows grounding the jet and jacks only once there's light to cast them.
    shadow: smooth(0.45, 0.85, p),
    // The outline is for the silhouette; around a lit jet it would look drawn on.
    rim: lerp(OPENING.rimIntensity, 0, smooth(0.45, 0.8, p)),
    // Haze and glow brighten a little as the hangar wakes, instead of starting bright.
    atmosphere: lerp(1, REVEALED.atmosphere, smooth(0.2, 0.9, p)),
    camera: {
      height: lerp(CAMERA.height, REVEALED.cameraHeight, push),
      distance: lerp(CAMERA.distance, REVEALED.cameraDistance, push),
      targetY: lerp(CAMERA.targetY, REVEALED.targetY, smooth(0.1, 0.8, p)),
    },
  };
}

/**
 * Scroll-driven reveal state, shared between the scroll code and the scene without React re-renders.
 * `target` is written by ScrollTrigger (0 = top of the pinned hero, 1 = end of the runway);
 * the scene eases `value` toward it every frame and derives `stage` from it.
 */
export const reveal = {
  target: 0,
  value: 0,
  stage: stage(0),
};
