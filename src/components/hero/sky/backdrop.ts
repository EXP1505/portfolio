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

/** The canvas pauses only when there is a still to show in its place. */
export const backdropPaused = () => backdrop.blur > 0 && backdrop.sharp !== null;

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
export const BACKDROP_BLUR_PX = 14;
export const BACKDROP_DIM = 0.62;

/** Make the pre-blurred copy once, on a downscaled 2D canvas (cheaper and blurrier per pixel). */
export async function blurStill(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  // Draw slightly oversized so the blur doesn't pull dark edges in from outside the frame.
  const pad = BACKDROP_BLUR_PX * 2;
  ctx.filter = `blur(${BACKDROP_BLUR_PX * scale}px)`;
  ctx.drawImage(img, -pad, -pad, canvas.width + pad * 2, canvas.height + pad * 2);
  return canvas.toDataURL("image/webp", 0.85);
}
