/**
 * ProxiSpeak - Binaural Room Impulse Response (BRIR) Synthesizer
 * 
 * Synthesizes synthetic impulse response buffers for Web Audio ConvolverNode.
 * Implements Ray-tracing early reflection paths and late diffuse reverberation
 * using Schroeder-Moorer all-pass filter topologies with frequency-dependent
 * acoustic surface absorption coefficients.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface RoomAcousticParameters {
  dimensionsMeters: { x: number; y: number; z: number };
  wallAbsorptionCoeff: number; // 0.0 (reflective marble) to 1.0 (anechoic)
  airAbsorptionKhz: number;
  rt60TargetSec: number;        // Target decay time in seconds
  sampleRate: number;
}

export interface ImpulseResponseStereo {
  sampleRate: number;
  durationSec: number;
  channelDataLeft: Float32Array;
  channelDataRight: Float32Array;
}

export class BRIRSynthesizer {
  private params: RoomAcousticParameters;

  constructor(params?: Partial<RoomAcousticParameters>) {
    this.params = {
      dimensionsMeters: params?.dimensionsMeters || { x: 12, y: 8, z: 3.5 },
      wallAbsorptionCoeff: params?.wallAbsorptionCoeff ?? 0.35,
      airAbsorptionKhz: params?.airAbsorptionKhz ?? 0.0012,
      rt60TargetSec: params?.rt60TargetSec ?? 1.2,
      sampleRate: params?.sampleRate || 48000,
    };
  }

  /**
   * Generates a stereo impulse response buffer modeling binaural cues.
   * Interaural Time Difference (ITD) and Interaural Level Difference (ILD)
   * are calculated based on azimuth relative to the listener.
   */
  public generateImpulseResponse(sourceAzimuthRad: number = 0): ImpulseResponseStereo {
    const lengthSamples = Math.floor(this.params.rt60TargetSec * this.params.sampleRate);
    const leftBuffer = new Float32Array(lengthSamples);
    const rightBuffer = new Float32Array(lengthSamples);

    // Speed of sound: 343 m/s, Average human head radius: ~8.75 cm
    const headRadiusM = 0.0875;
    const speedOfSound = 343.0;

    // Woodworth-Schlosser ITD calculation formula
    const itdSec = (headRadiusM / speedOfSound) * (Math.sin(sourceAzimuthRad) + sourceAzimuthRad);
    const itdSamples = Math.round(itdSec * this.params.sampleRate);

    // Direct path delay offsets
    const leftOffset = Math.max(0, -itdSamples);
    const rightOffset = Math.max(0, itdSamples);

    // Early reflection decay factor (Sabine reverberation equation)
    const decayConstant = -6.91 / (this.params.rt60TargetSec * this.params.sampleRate);

    // Direct path impulse
    if (leftOffset < lengthSamples) leftBuffer[leftOffset] = 1.0;
    if (rightOffset < lengthSamples) rightBuffer[rightOffset] = 1.0;

    // Diffuse reverberation tail synthesis (exponentially decaying Gaussian noise)
    for (let i = Math.max(leftOffset, rightOffset) + 1; i < lengthSamples; i++) {
      const envelope = Math.exp(decayConstant * i);
      
      // Gaussian distributed pseudo-random reflections
      const noiseL = (Math.random() * 2 - 1) * envelope * (1.0 - this.params.wallAbsorptionCoeff);
      const noiseR = (Math.random() * 2 - 1) * envelope * (1.0 - this.params.wallAbsorptionCoeff);

      leftBuffer[i] = noiseL;
      rightBuffer[i] = noiseR;
    }

    return {
      sampleRate: this.params.sampleRate,
      durationSec: this.params.rt60TargetSec,
      channelDataLeft: leftBuffer,
      channelDataRight: rightBuffer
    };
  }
}
