// Single tuning place for the hangar hero. Units are metres; the jet sits at the origin,
// nose toward +z (toward the camera), as exported.

export const COLORS = {
  bg: "#0B0F14",
  // Backlight reuses the Text-primary token value: cold white, never a second accent colour.
  backlight: "#E8ECF1",
  // Haze: desaturated steel white.
  haze: "#CDD8E3",
  jackMetal: "#22282E",
  structure: "#10151A",
  floor: "#07090C",
} as const;

export const FLOOR_Y = -2.4;
export const CEILING_Y = FLOOR_Y + 15;
export const DOOR_Z = -30;
export const DOOR_GAP = 2.6;

// Wingspan is ~12.4 m. Framing keeps it at about this share of the canvas width.
export const WINGSPAN = 12.4;
export const WINGSPAN_SHARE = 0.62;

export const CAMERA = {
  distance: 27,
  // Slightly below nose level, looking up a touch so the jet feels imposing.
  height: -0.4,
  // Aim above the jet so it sits in the lower-middle of the frame, under the title.
  targetY: 1.6,
};

// A few degrees off dead-centre for depth; small enough to read as symmetrical.
export const JET_YAW = 0.06;

// Where the jacks meet the airframe, in model space (from the model bounds).
export const JACK_POINTS: [number, number][] = [
  [0, 4.6], // nose
  [-3.6, -3.4], // left wing
  [3.6, -3.4], // right wing
];

// Opening frame (reveal = 0). Step 2 lerps these toward the lit hangar as the reveal value rises.
export const OPENING = {
  ambient: 0.02,
  rimIntensity: 1.8,
  // Hull inflation in metres (~1.5–2 px at the hero framing).
  rimWidth: 0.024,
  backLight: 0.3,
};

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
