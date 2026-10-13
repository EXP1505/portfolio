import { Vector3 } from "three";

// Single tuning place for the sunrise hero. Units are metres; the jet sits near the origin,
// nose toward +z, as exported.

export const SKY_PHOTO = "/sky/sunset-sky-8k.webp";
export const SKY_HDR = "/sky/sunset-sky-1k.hdr";

// UI accent stays amber everywhere else on the site; the sky itself is exempt (real photography).
export const AMBER = "#C98A2B";
export const AMBER_HOT = "#F2C879";
export const STEEL = "#8A96A3";
// Golden-hour sunlight on the jet: warm, not the UI amber.
export const GOLDEN = "#FF9F4A";
// Cool blue sky-fill on the shadow side, opposite the warm key light.
export const AMBIENT_FILL = "#9DB4D6";

// Camera framing (metres, radians). The rig (sky + jet + light) orbits under a camera that stays in
// this same seat throughout the reveal, so only the sky and light change, never the shot.
export const CAMERA = {
  position: new Vector3(6, 0.6, 19),
  target: new Vector3(0, 0.6, 0),
  fov: 32,
};
// A debug-only rear seat, reachable via ?debugView=rear — not part of the shipped reveal, kept for
// checking the afterburners/seam fix against the exact scene code the site ships.
export const DEBUG_REAR_CAMERA = {
  position: new Vector3(-9, 2.4, -17),
  target: new Vector3(0, 0.2, -4),
};

// Jet flight motion: slight bank with a gentle drift, like formation air-to-air footage.
export const FLIGHT = {
  bankAmplitude: 0.03,
  bankSpeed: 0.5,
  yaw: 0.12,
  rollBase: 0.16,
  rollAmplitude: 0.03,
  rollSpeed: 0.35,
  driftX: 0.5,
  driftXSpeed: 0.27,
  driftY: 0.35,
  driftYSpeed: 0.41,
};

// Rim hull (backlit edge light; see sky/Su57.tsx). Width in metres; intensity set per reveal stage.
export const RIM_WIDTH = 0.024;

// Panel lines and rivets live in a subtle normal map; a little extra strength lets them read.
export const BODY_NORMAL_SCALE = 1.5;

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
export const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(Math.max((x - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

// Post-processing (sky/PostFX.tsx). No AO/DOF here: this scene is always moving (scroll-driven),
// and the "later phases" performance rules reserve those for when the camera is still.
export const POSTFX = {
  bloomThreshold: 1.0,
  bloomIntensity: 0.75,
  bloomRadius: 0.65,
  vignette: 0.5,
  grain: 0.08,
};
