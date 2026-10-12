import { FloatType, PMREMGenerator, type Texture, type WebGLRenderer } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

// Poly Haven "Small Hangar 02" (CC0), 1k. Used only for reflections and soft light, never shown.
export const HDRI = "/hdri/small_hangar_02_1k.hdr";

// The HDRI is lit by warm sunlight; pull it almost to grey with a faint steel tint so the jet's
// reflections stay cold white (one accent colour only: amber stays in the UI).
const DESATURATE = 0.88;
const TINT = [0.97, 0.99, 1.03] as const;

/** Load the hangar HDRI, cool it down, and return a prefiltered environment map for scene.environment. */
export async function loadHangarEnvironment(gl: WebGLRenderer): Promise<Texture> {
  const hdr = await new HDRLoader().setDataType(FloatType).loadAsync(HDRI);
  const data = hdr.image.data as Float32Array;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = r + (lum * TINT[0] - r) * DESATURATE;
    data[i + 1] = g + (lum * TINT[1] - g) * DESATURATE;
    data[i + 2] = b + (lum * TINT[2] - b) * DESATURATE;
  }
  hdr.needsUpdate = true;

  const pmrem = new PMREMGenerator(gl);
  const env = pmrem.fromEquirectangular(hdr).texture;
  hdr.dispose();
  pmrem.dispose();
  return env;
}
