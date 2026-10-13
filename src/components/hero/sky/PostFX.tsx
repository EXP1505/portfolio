"use client";

import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { POSTFX } from "./config";

/**
 * Camera finish for the sunrise scene: bloom (sun flare, afterburner spill), ACES tone mapping
 * (punchier golden-hour contrast/saturation than AgX), SMAA, a light vignette and film grain.
 * No depth of field or ambient occlusion: this scene is always moving (scroll-driven reveal), and the
 * "later phases" performance rules reserve those passes for when the camera is still.
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={POSTFX.bloomThreshold}
        luminanceSmoothing={0.25}
        intensity={POSTFX.bloomIntensity}
        radius={POSTFX.bloomRadius}
        levels={6}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
      <Vignette offset={0.3} darkness={POSTFX.vignette} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={POSTFX.grain} />
    </EffectComposer>
  );
}
