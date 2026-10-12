// Single tuning place for the hangar hero. Units are metres; the jet sits at the origin,
// nose toward +z (toward the camera), as exported.

export const COLORS = {
  bg: "#0B0F14",
  // Backlight reuses the Text-primary token value: cold white, never a second accent colour.
  backlight: "#E8ECF1",
  // Haze: desaturated steel white.
  haze: "#CDD8E3",
  jackMetal: "#22282E",
  structure: "#161C22",
  // Dark concrete: reads as black in the opening frame, a deep grey when lit (never a bright plane).
  floor: "#11151A",
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

// Overhead structure: ceiling beams (back to front) and the light panels along each. All set well
// behind the jet: anything nearer sits at the very top of the frame, under the nav.
export const BEAM_ZS = [-28, -22, -16, -10];
export const PANEL_XS = [-12, -6, 0, 6, 12];

// Opening frame (reveal = 0): mostly black, just enough rim to read the outline.
export const OPENING = {
  ambient: 0.02,
  rimIntensity: 1.2,
  // Hull inflation in metres (~1.5–2 px at the hero framing).
  rimWidth: 0.024,
  backLight: 0.3,
  exposure: 1,
};

// Fully lit hangar (reveal = 1). reveal.ts eases between OPENING and these as the visitor scrolls.
// Shading comes from an angled key light and HDRI reflections, not flat front light: the white
// paint is semi-gloss (roughness ~0.37), so its panel lines only read through reflections.
export const REVEALED = {
  ambient: 0.03,
  // Soft front fill: just enough to keep the intakes and shadow side from going black.
  fill: 0.1,
  // Side key light raking across the airframe from high on the left (position below), so one flank
  // is lit and the other falls into shade. The camera is low, so a light from straight above would
  // only hit surfaces it can't see.
  key: 2.6,
  // The door back-lights rise so the airframe keeps a light rim once the outline effect fades.
  backLight: 1,
  // HDRI reflection strength (scene.environmentIntensity): the main source of detail on the paint.
  environment: 0.55,
  // AgX exposure: below 1 so the white paint rolls off instead of clipping.
  exposure: 0.8,
  atmosphere: 1.5,
  // Peak opacity of the light pool on the floor under each overhead row, and of its panels' emissive.
  // Accents, not the main light on the jet.
  rowPool: 0.14,
  panelGlow: 1.5,
  // Keep the low, slightly-below-nose hero angle; the push-in moves toward the jet, not over it.
  // Between "just below the nose" (-0.1) and nose level (0.8): just high enough for a strip of
  // wing-top camo to show.
  cameraHeight: 0.4,
  cameraDistance: 21,
  targetY: 1,
};

export const KEY_LIGHT_POSITION: [number, number, number] = [-18, 8, 8];

// Post-processing (PostFX.tsx). Subtle on purpose: a camera finish, not a filter.
export const POSTFX = {
  aoRadius: 1.2,
  aoIntensity: 2.2,
  // Focus sits on the forward fuselage; the in-focus depth (metres) spans the whole airframe, nose to
  // tails (~17 m), so only the back wall, doors and haze soften.
  focusTarget: [0, 0.6, 2] as [number, number, number],
  focusRange: 24,
  bokehScale: 2.2,
  // Bloom only on pixels well above white in the HDR buffer (door gap, lit fixtures, rim).
  bloomThreshold: 1.1,
  bloomIntensity: 0.4,
  vignette: 0.55,
  grain: 0.12,
};

// Panel lines and rivets live in a subtle normal map; a little extra strength lets them read.
export const BODY_NORMAL_SCALE = 1.5;

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
