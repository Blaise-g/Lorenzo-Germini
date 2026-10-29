/* N8AO ships no types: the part of its post-processing pass the board
   uses. */
declare module "n8ao" {
  import type { Pass } from "postprocessing";
  import type { Camera, Color, Scene } from "three";

  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    /* Its full-screen quads, each with a dispose of its own; the ones a
       configuration does not use are unset. */
    copyQuad?: { dispose(): void };
    accumulationQuad?: { dispose(): void };
    depthDownsampleQuad?: { dispose(): void };
    effectShaderQuad?: { dispose(): void };
    poissonBlurQuad?: { dispose(): void };
    effectCompositerQuad?: { dispose(): void };
    /** Rescans the scene for transparent materials on every render. */
    autoDetectTransparency: boolean;
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      aoSamples: number;
      denoiseSamples: number;
      denoiseRadius: number;
      halfRes: boolean;
      depthAwareUpsampling: boolean;
      screenSpaceRadius: boolean;
      transparencyAware: boolean;
      gammaCorrection: boolean;
      color: Color;
    };
  }
}
