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

// Camera-tour seats (metres, radians; jet-local, before the rig's orbit). One per non-text-heavy
// section, reachable while authoring/previewing via ?debugView=<key> (see SkyHero.tsx) — a chase
// -plane angle onto a real landmark found by walking the loaded model (?debugView=inspect):
// canopy centre ~(0, 0.9, 4.3), intakes ~(±4.9, 0.1, -5.4), wing root~tip z 3..-7.5 at x up to
// ±6.65, nozzles (±1.17, 0, -8.1), nose tip z~12, tail z~-13.
export const TOUR_STOPS = {
  // Establishing shot: full aircraft, broadside profile.
  about: { position: new Vector3(40, 3.5, -1), target: new Vector3(0, 0.3, -1), fov: 22 },
  // Forward 3/4 held in the nose/intake half of the fuselage (z > 0) — every earlier pass let the
  // target or camera drift aft toward the wing root, and the much larger wing/tail/stab surfaces,
  // being physically closer to the camera than the intake itself, dominated the frame regardless
  // of aim. Keeping both camera and target forward avoids that entirely.
  systems: { position: new Vector3(14, 2, 8), target: new Vector3(3, 0.3, 2), fov: 24 },
  // Close 3/4-high over the spine, canopy as the focal point.
  projects: { position: new Vector3(5.5, 3, 9.5), target: new Vector3(0, 0.9, 4.3), fov: 26 },
  // Elevated 3/4 along the wing with the horizon in frame — the first pass was nearly flat top-down
  // and too close, reading as an abstract panel instead of a wing.
  fincraft: { position: new Vector3(20, 7, -3), target: new Vector3(3, -0.3, -3), fov: 22 },
  // Rear 3/4, low, on the twin nozzle cluster (afterburners render lit by default).
  cp: { position: new Vector3(-9, 2.2, -17), target: new Vector3(0, 0.1, -6), fov: 30 },
  // Wide pull-back, near head-on — the closing beat.
  contact: { position: new Vector3(3, 1.4, 48), target: new Vector3(0, 0.5, 0), fov: 18 },
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
