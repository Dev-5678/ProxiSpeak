/**
 * ProxiSpeak - Doppler Shift & High-Frequency Air Absorption Benchmark Suite
 * 
 * Verifies:
 * 1. Classical Doppler pitch shift calculation under moving audio emitter/listener vectors.
 * 2. High-frequency atmospheric absorption lowpass cutoff frequency scaling over distance.
 * 3. Spatial stereo pan clamping between -1.0 (Full Left) and +1.0 (Full Right).
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

const assert = require('assert');

console.log('================================================================');
console.log(' ProxiSpeak Doppler Pitch Shift & Acoustic Physics Benchmark');
console.log('================================================================\n');

const SPEED_OF_SOUND_MPS = 343.0; // m/s at 20°C in dry air

/**
 * Calculates observed frequency using classical 1D Doppler formulation:
 * f_observed = f_source * ((c + v_listener) / (c - v_source))
 */
function calculateDopplerShift(baseFreqHz, listenerVelocityMps, sourceVelocityMps) {
  const numerator = SPEED_OF_SOUND_MPS + listenerVelocityMps;
  const denominator = SPEED_OF_SOUND_MPS - sourceVelocityMps;
  if (denominator <= 0) return baseFreqHz; // Subsonic barrier safety
  return baseFreqHz * (numerator / denominator);
}

console.log('Test 1: Doppler Pitch Shift Under Relative Velocity...');
// Stationary emitter, listener moving towards emitter at 15 m/s (~54 km/h)
const basePitch = 440.0; // A4
const approachingPitch = calculateDopplerShift(basePitch, 15.0, 0.0);
assert.ok(approachingPitch > 440.0, 'Approaching velocity must shift frequency upwards');
assert.ok(approachingPitch > 458.0 && approachingPitch < 461.0, `Observed pitch should be ~459Hz, got ${approachingPitch.toFixed(2)}Hz`);

// Listener moving away from emitter at 15 m/s
const recedingPitch = calculateDopplerShift(basePitch, -15.0, 0.0);
assert.ok(recedingPitch < 440.0, 'Receding velocity must shift frequency downwards');
assert.ok(recedingPitch > 420.0 && recedingPitch < 422.0, `Observed pitch should be ~420Hz, got ${recedingPitch.toFixed(2)}Hz`);
console.log('  [PASS] Doppler frequency modulation conforms to physical acoustic propagation.\n');

/**
 * Atmospheric high-frequency attenuation simulation (air damping):
 * Cutoff frequency scales down from 20,000 Hz at 0m to 1,000 Hz at 150m.
 */
function calculateAirAbsorptionCutoff(distanceMeters, maxFreq = 20000, minFreq = 1000, maxDist = 150) {
  const normDist = Math.min(Math.max(distanceMeters, 0), maxDist) / maxDist;
  return maxFreq - normDist * (maxFreq - minFreq);
}

console.log('Test 2: Atmospheric Absorption Lowpass Filter Cutoff...');
const cutoffNear = calculateAirAbsorptionCutoff(0);
const cutoffMid = calculateAirAbsorptionCutoff(75);
const cutoffFar = calculateAirAbsorptionCutoff(150);

assert.strictEqual(cutoffNear, 20000, 'Zero distance must preserve full audible spectrum (20kHz)');
assert.strictEqual(cutoffMid, 10500, 'Mid-range must moderately damp high frequencies (~10.5kHz)');
assert.strictEqual(cutoffFar, 1000, 'Far perimeter must damp audio down to 1kHz');
console.log('  [PASS] High-frequency absorption curve accurately attenuates distant sound sources.\n');

/**
 * Calculates stereo panning value [-1.0, +1.0] from azimuth angle theta (-PI to +PI)
 */
function calculateStereoPan(azimuthRadians) {
  return Math.sin(azimuthRadians);
}

console.log('Test 3: Stereo Pan Azimuth Trigonometric Clamping...');
assert.ok(Math.abs(calculateStereoPan(Math.PI / 2) - 1.0) < 0.001, '90 degrees right must yield pan = +1.0');
assert.ok(Math.abs(calculateStereoPan(-Math.PI / 2) - (-1.0)) < 0.001, '90 degrees left must yield pan = -1.0');
assert.ok(Math.abs(calculateStereoPan(0)) < 0.001, 'Direct front must yield centered pan = 0.0');
console.log('  [PASS] Stereo panning coordinates strictly bounded within [-1.0, +1.0].\n');

console.log('================================================================');
console.log(' All 3 Doppler & Spatial Acoustic Physics Tests Passed [OK]');
console.log('================================================================');
