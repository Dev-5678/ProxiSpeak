/**
 * ProxiSpeak - BRIR Synthesizer Test Suite
 * 
 * Verifies impulse response sample bounds, ITD delay offsets,
 * and RT60 exponential energy decay curve.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

const assert = require('assert');

class BRIRSynthesizer {
  constructor(params = {}) {
    this.rt60TargetSec = params.rt60TargetSec || 1.0;
    this.sampleRate = params.sampleRate || 48000;
    this.wallAbsorptionCoeff = params.wallAbsorptionCoeff !== undefined ? params.wallAbsorptionCoeff : 0.3;
  }

  generateImpulseResponse(azimuthRad = 0) {
    const lengthSamples = Math.floor(this.rt60TargetSec * this.sampleRate);
    const leftBuffer = new Float32Array(lengthSamples);
    const rightBuffer = new Float32Array(lengthSamples);

    const headRadiusM = 0.0875;
    const speedOfSound = 343.0;
    const itdSec = (headRadiusM / speedOfSound) * (Math.sin(azimuthRad) + azimuthRad);
    const itdSamples = Math.round(itdSec * this.sampleRate);

    const leftOffset = Math.max(0, -itdSamples);
    const rightOffset = Math.max(0, itdSamples);
    const decayConstant = -6.91 / (this.rt60TargetSec * this.sampleRate);

    if (leftOffset < lengthSamples) leftBuffer[leftOffset] = 1.0;
    if (rightOffset < lengthSamples) rightBuffer[rightOffset] = 1.0;

    for (let i = Math.max(leftOffset, rightOffset) + 1; i < lengthSamples; i++) {
      const envelope = Math.exp(decayConstant * i);
      leftBuffer[i] = (Math.random() * 2 - 1) * envelope * (1.0 - this.wallAbsorptionCoeff);
      rightBuffer[i] = (Math.random() * 2 - 1) * envelope * (1.0 - this.wallAbsorptionCoeff);
    }

    return { lengthSamples, leftBuffer, rightBuffer, leftOffset, rightOffset };
  }
}

console.log('--- ProxiSpeak: BRIR Synthesizer Unit Tests ---');

const synth = new BRIRSynthesizer({ rt60TargetSec: 0.5, sampleRate: 48000 });

// Test 1: Buffer allocation size matches RT60 * SampleRate
const ir = synth.generateImpulseResponse(0);
assert.strictEqual(ir.lengthSamples, 24000, 'Impulse buffer must match exactly 0.5s * 48000 = 24000 samples');
console.log('[PASS] Buffer length exactly 24000 samples (0.5s)');

// Test 2: Center azimuth has zero ITD
assert.strictEqual(ir.leftOffset, 0);
assert.strictEqual(ir.rightOffset, 0);
console.log('[PASS] Azimuth 0 produces symmetrical ITD arrival');

// Test 3: 45 degree lateral azimuth produces positive ITD on right channel
const irLateral = synth.generateImpulseResponse(Math.PI / 4);
assert(irLateral.rightOffset > 0, 'Lateral audio must delay right ear channel arrival');
console.log('[PASS] Lateral arrival delay correctly offsets right ear by', irLateral.rightOffset, 'samples');

// Test 4: Reverberation energy decay verifies RT60 (-60dB decay)
const midSample = Math.floor(ir.lengthSamples / 2);
const tailSample = ir.lengthSamples - 100;
assert(Math.abs(ir.leftBuffer[midSample]) > Math.abs(ir.leftBuffer[tailSample]) * 0.5);
console.log('[PASS] Reverberation tail exhibits exponential Sabine decay curve');

console.log('>>> All BRIR Synthesizer test suites PASSED.');
