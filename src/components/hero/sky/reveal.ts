import { smooth, lerp } from "./config";

/** Every lighting/sky/camera value for reveal progress `p` (0 pre-dawn → 1 golden hour). */
export function stage(p: number) {
  return {
    // Pre-dawn dome (the approved 0% look) fades out as the photo sky fades in.
    predawn: 1 - smooth(0.06, 0.42, p),
    photo: lerp(0.18, 1, smooth(0.08, 0.6, p)),
    sunGlow: lerp(0, 1.6, smooth(0.2, 0.6, p)),
    sun: lerp(0, 3.2, smooth(0.25, 0.75, p)),
    // Slightly under-exposed at the end, so the warm lit side keeps its gold instead of clipping.
    exposure: lerp(1, 0.82, smooth(0.4, 1, p)),
    env: lerp(0.03, 0.55, smooth(0.25, 0.85, p)),
    // Overall rim envelope; the shader itself now also masks by which edges actually face the sun
    // (see sky/Su57.tsx), so this just fades the effect out once the jet is fully lit.
    rim: lerp(1.2, 0, smooth(0.3, 0.6, p)),
    ambient: lerp(0.01, 0.03, p),
    // Orbit (radians) of the sky + jet rig under the fixed camera: sun starts held behind/beside the
    // jet (silhouette), then swings round so it rakes in from the side by 100%.
    orbit: lerp(0, -1.15, smooth(0.5, 1, p)),
  };
}
export type Stage = ReturnType<typeof stage>;

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
