/**
 * ProxiSpeak - TWCC Estimator Unit Tests
 * 
 * Verifies delay gradient calculation, overuse detection,
 * AIMD additive increase on clean link and multiplicative decrease under queue pressure.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

const assert = require('assert');

class TWCCBandwidthEstimator {
  constructor(initialBitrateBps = 128000, minBitrateBps = 32000, maxBitrateBps = 512000) {
    this.currentBitrateBps = initialBitrateBps;
    this.minBitrateBps = minBitrateBps;
    this.maxBitrateBps = maxBitrateBps;
    this.prevSendTimeMs = null;
    this.prevRecvTimeMs = null;
    this.gradientMs = 0;
    this.thresholdMs = 10.0;
    this.state = 'NORMAL';
    this.overuseCount = 0;
  }

  onFeedback(sendMs, recvMs) {
    if (this.prevSendTimeMs !== null && this.prevRecvTimeMs !== null) {
      const deltaSend = sendMs - this.prevSendTimeMs;
      const deltaRecv = recvMs - this.prevRecvTimeMs;
      const rawGradient = deltaRecv - deltaSend;
      this.gradientMs = 0.8 * this.gradientMs + 0.2 * rawGradient;

      if (this.gradientMs > this.thresholdMs) {
        this.overuseCount++;
        if (this.overuseCount >= 2) {
          this.state = 'OVERUSING';
          this.currentBitrateBps = Math.max(this.minBitrateBps, Math.floor(this.currentBitrateBps * 0.85));
        }
      } else {
        this.overuseCount = 0;
        this.state = 'NORMAL';
        this.currentBitrateBps = Math.min(this.maxBitrateBps, this.currentBitrateBps + 4000);
      }
    }
    this.prevSendTimeMs = sendMs;
    this.prevRecvTimeMs = recvMs;
  }
}

console.log('--- ProxiSpeak: TWCC Bandwidth Estimator Test Suite ---');

const estimator = new TWCCBandwidthEstimator(128000);

// Test 1: Symmetrical transit times result in additive bitrate increase
let send = 1000;
let recv = 1050; // Constant 50ms latency
for (let i = 0; i < 10; i++) {
  estimator.onFeedback(send, recv);
  send += 20;
  recv += 20;
}
assert(estimator.currentBitrateBps > 128000, 'Clean link should additively increase bitrate');
console.log('[PASS] Additive bitrate increase under normal conditions:', estimator.currentBitrateBps, 'bps');

// Test 2: Queue buildup (receive interval stretches while send interval is steady)
const bitrateBeforeCongestion = estimator.currentBitrateBps;
for (let i = 0; i < 8; i++) {
  send += 20;
  recv += 45; // Delay gradient = 25ms per packet (severe network queuing)
  estimator.onFeedback(send, recv);
}
assert(estimator.state === 'OVERUSING', 'Detector must flag OVERUSING state');
assert(estimator.currentBitrateBps < bitrateBeforeCongestion, 'Overuse must trigger multiplicative backoff');
console.log('[PASS] Congestion detected, bitrate backed off to:', estimator.currentBitrateBps, 'bps (State: OVERUSING)');

console.log('>>> All TWCC Estimator test suites PASSED.');
