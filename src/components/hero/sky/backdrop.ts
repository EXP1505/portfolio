import { tour } from "./tour";

/**
 * Shared state for the blurred page background (desktop only), like `reveal` but for after the reveal:
 * once the lit scene has settled at 100%, its final frame is captured as a sharp still plus a
 * pre-blurred copy. While content scrolls over it, those images are shown and the canvas is paused.
 *
 * `blur` (0..1) is written by ScrollTrigger: 0 = still in the hero runway (live scene), 1 = fully
 * blurred and dimmed. `listeners` let the React side flip the canvas frameloop without per-frame renders.
 */
export const backdrop = {
  sharp: null as string | null,
  blurred: null as string | null,
  blur: 0,
  listeners: new Set<() => void>(),
};

export const notifyBackdrop = () => backdrop.listeners.forEach((fn) => fn());

/** The canvas pauses only past the hero, with a still ready, and no live camera-tour stop active. */
export const backdropPaused = () => tour.active === null && backdrop.blur > 0 && backdrop.sharp !== null;

/** Set by `Capture` for exactly one frame, read by `Flight` to hide the jet so it can grab a
 * jet-free sky still for `blurred` — a blur radius big enough to dissolve the jet's own silhouette
 * would also flatten the sky's own detail, so the clean fix is a second, jet-free capture rather
 * than a stronger blur on the one with the jet in it. */
export const captureFlags = { hideJet: false };

/** Apply the scroll-driven crossfade straight to the DOM (no React render per scroll frame). */
export function applyBackdropStyles() {
  const set = (selector: string, opacity: number) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) el.style.opacity = String(opacity);
  };
  const shown = backdropPaused();
  set("[data-backdrop-sharp]", shown ? 1 : 0);
  set("[data-backdrop-blurred]", shown ? backdrop.blur : 0);
  // Scroll position alone drives `blur`, independent of whether a capture exists yet. Gating the
  // dim on a real capture means a fast scroller who outruns asset loading sees the live (loading)
  // scene undimmed instead of a dark overlay stacked on top of nothing — it still self-corrects
  // the moment the first capture lands, same as the sharp/blurred crossfade above.
  set("[data-backdrop-dim]", backdrop.sharp !== null ? backdrop.blur * BACKDROP_DIM : 0);
}

// Strength of the atmospheric blur, in CSS px at the captured resolution, and the dim at full blur.
// Modest now that `blurred` is captured from a jet-free frame (see `captureFlags`) — this just
// softens the sky's own detail a touch, it doesn't need to dissolve anything sharp-edged anymore.
export const BACKDROP_BLUR_PX = 14;
export const BACKDROP_DIM = 0.62;

/** Make the pre-blurred copy once, on a downscaled 2D canvas (cheaper and blurrier per pixel).
 * `src` is a throwaway intermediate (the caller never keeps it, only this function's own return
 * value ends up in `backdrop.blurred`), so it's revoked here once decoded rather than leaking it. */
export async function blurStill(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  URL.revokeObjectURL(src);
  const scale = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  // Draw slightly oversized so the blur doesn't pull dark edges in from outside the frame.
  const pad = BACKDROP_BLUR_PX * 2;
  ctx.filter = `blur(${BACKDROP_BLUR_PX * scale}px)`;
  ctx.drawImage(img, -pad, -pad, canvas.width + pad * 2, canvas.height + pad * 2);
  return canvasToObjectUrl(canvas);
}

/** `canvas.toBlob` wrapped in a promise, returning an object URL (not a base64 data URL — smaller,
 * and avoids the base64-encode cost on top of the image encode). */
function canvasToObjectUrl(canvas: HTMLCanvasElement, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : ""), "image/webp", quality);
  });
}

/** Snapshot of the live canvas, downscaled first and encoded via the async `toBlob` API rather than
 * the synchronous `toDataURL` — on a throttled/weaker machine, encoding the full canvas resolution
 * synchronously measured as a 600ms+ main-thread stall right at a tour-stop scroll boundary (every
 * time `Capture` re-arms, not just once like the original hero-only version). `toBlob`'s encode runs
 * off the main thread in Chromium; downscaling first also cuts the pixel count it has to encode. The
 * pixel data itself is still read synchronously at the moment this is called (same timing guarantee
 * `toDataURL` gave), so callers that need to flip state right after calling this (e.g. restoring jet
 * visibility) can still do so immediately without waiting on the returned promise.
 */
export function captureCanvas(source: HTMLCanvasElement, scale = 0.6, quality = 0.9): Promise<string> {
  if (scale >= 1) return canvasToObjectUrl(source, quality);
  const small = document.createElement("canvas");
  small.width = Math.round(source.width * scale);
  small.height = Math.round(source.height * scale);
  small.getContext("2d")!.drawImage(source, 0, 0, small.width, small.height);
  return canvasToObjectUrl(small, quality);
}
