"use client";

import { useEffect, useState } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { POSTFX } from "./config";

/**
 * Photographic finish, in order:
 *  - N8AO: soft ambient occlusion in crevices (intake lips, wing roots, under the jacks' caps)
 *  - depth of field: the jet is the sharpest thing on screen; the back wall and doors fall softly out
 *  - bloom: only very bright pixels (the door gap, lit fixtures, the rim), so it stays a lens effect
 *  - AgX tone mapping (the composer turns the renderer's own off; exposure still comes from
 *    renderer.toneMappingExposure, which the reveal drives)
 *  - SMAA antialiasing, then vignette and light film grain, like a camera.
 *
 * Adaptive quality: depth of field and AO are the expensive passes (~20+ fps each on a mid GPU). If the
 * frame rate declines they're dropped; if it recovers they come back. After a few flip-flops the
 * lower tier sticks, so quality never oscillates. Only runs during the reveal: afterwards the canvas
 * is paused behind a still.
 */
export function PostFX() {
  const [full, setFull] = useState(true);

  // Exposed for diagnostics (which tier this device ended up on).
  useEffect(() => {
    document.documentElement.dataset.heroQuality = full ? "full" : "reduced";
  }, [full]);

  const effects = [
    full && (
      <N8AO
        key="ao"
        aoRadius={POSTFX.aoRadius}
        distanceFalloff={0.6}
        intensity={POSTFX.aoIntensity}
        aoSamples={8}
        denoiseSamples={4}
        denoiseRadius={8}
        halfRes
        color="black"
      />
    ),
    full && (
      <DepthOfField
        key="dof"
        target={POSTFX.focusTarget}
        worldFocusRange={POSTFX.focusRange}
        bokehScale={POSTFX.bokehScale}
        resolutionScale={0.5}
      />
    ),
    <Bloom
      key="bloom"
      mipmapBlur
      luminanceThreshold={POSTFX.bloomThreshold}
      luminanceSmoothing={0.2}
      intensity={POSTFX.bloomIntensity}
      radius={0.55}
      levels={5}
    />,
    <ToneMapping key="tone" mode={ToneMappingMode.AGX} />,
    <SMAA key="smaa" />,
    <Vignette key="vignette" offset={0.32} darkness={POSTFX.vignette} />,
    <Noise key="grain" premultiply blendFunction={BlendFunction.SCREEN} opacity={POSTFX.grain} />,
  ].filter((effect): effect is React.JSX.Element => Boolean(effect));

  return (
    <PerformanceMonitor
      // Step down below 58 fps (the effects are the cost). Only step back up well above 60, so a 60 Hz
      // display that dropped to the lighter tier stays there instead of flip-flopping.
      bounds={() => [58, 110]}
      flipflops={3}
      onDecline={() => setFull(false)}
      onIncline={() => setFull(true)}
      onFallback={() => setFull(false)}
    >
      <EffectComposer multisampling={0}>{effects}</EffectComposer>
    </PerformanceMonitor>
  );
}
