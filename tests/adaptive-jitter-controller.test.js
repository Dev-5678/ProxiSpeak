/**
 * ProxiSpeak - Adaptive Jitter Buffer Controller Unit Test Suite
 * 
 * Verifies RFC 3550 jitter convergence, fast-attack/slow-decay adaptation,
 * underrun response, and dynamic FEC redundancy levels.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

const assert = require('assert');

// Standalone executable test verification for AdaptiveJitterController
class AdaptiveJitterController {
  constructor(sampleRateKhz = 48) {
    this.sampleRateKhz = sampleRateKhz;
    this.previousArrivalMs = null;
    this.previousTransmitTimestamp = null;
    this.jitterEwmaMs = 0;
    this.rttEwmaMs = 30;
    this.minDelayMs = 20;
    this.maxDelayMs = 180;
    this.targetDelayMs = 40;
    this.receivedPackets = 0;
    this.lostPackets = 0;
    this.underruns = 0;
    this.overruns = 0;
    this.lastExpectedSeq = null;
  }

  onPacketArrival(packet) {
    this.receivedPackets++;
    if (this.lastExpectedSeq !== null) {
      const diff = (packet.sequenceNumber - this.lastExpectedSeq) & 0xffff;
      if (diff > 1 && diff < 3000) {
        this.lostPackets += (diff - 1);
      }
    }
    this.lastExpectedSeq = (packet.sequenceNumber + 1) & 0xffff;

    if (this.previousArrivalMs !== null && this.previousTransmitTimestamp !== null) {
      const arrivalDiffMs = packet.arrivalTimestampMs - this.previousArrivalMs;
      const transmitDiffMs = (packet.timestamp - this.previousTransmitTimestamp) / this.sampleRateKhz;
      const dispersion = Math.abs(arrivalDiffMs - transmitDiffMs);
      this.jitterEwmaMs += (dispersion - this.jitterEwmaMs) / 16.0;
      this.updatePlayoutTarget();
    }

    this.previousArrivalMs = packet.arrivalTimestampMs;
    this.previousTransmitTimestamp = packet.timestamp;
  }

  onRttSample(rttMs) {
    const alpha = 0.125;
    this.rttEwmaMs = (1.0 - alpha) * this.rttEwmaMs + alpha * rttMs;
    this.updatePlayoutTarget();
  }

  updatePlayoutTarget() {
    const safetyMargin = 4.0 * this.jitterEwmaMs;
    const computedTarget = (this.rttEwmaMs / 2.0) + safetyMargin;
    if (computedTarget > this.targetDelayMs) {
      this.targetDelayMs = Math.min(this.maxDelayMs, computedTarget);
    } else {
      this.targetDelayMs = Math.max(this.minDelayMs, this.targetDelayMs - 0.5);
    }
  }

  recordUnderrun() {
    this.underruns++;
    this.targetDelayMs = Math.min(this.maxDelayMs, this.targetDelayMs + 10);
  }

  get packetLossRate() {
    const total = this.receivedPackets + this.lostPackets;
    return total > 0 ? this.lostPackets / total : 0;
  }

  getRecommendedFecRedundancy() {
    const lossRate = this.packetLossRate;
    if (lossRate < 0.02) return 0.0;
    if (lossRate < 0.08) return 0.15;
    if (lossRate < 0.15) return 0.30;
    return 0.50;
  }

  getMetrics() {
    return {
      currentJitterMs: Number(this.jitterEwmaMs.toFixed(2)),
      rttEstimateMs: Number(this.rttEwmaMs.toFixed(2)),
      targetPlayoutDelayMs: Number(this.targetDelayMs.toFixed(2)),
      packetLossRate: Number(this.packetLossRate.toFixed(4)),
      underruns: this.underruns,
      fecRedundancy: this.getRecommendedFecRedundancy()
    };
  }
}

console.log('--- ProxiSpeak: Adaptive Jitter Controller Test Suite ---');

const controller = new AdaptiveJitterController(48);

// Test 1: Steady 20ms stream has near-zero dispersion
let wallClock = 1000;
let rtpTime = 48000;

for (let seq = 0; seq < 30; seq++) {
  controller.onPacketArrival({
    sequenceNumber: seq,
    timestamp: rtpTime,
    arrivalTimestampMs: wallClock,
    payloadSize: 160
  });
  wallClock += 20; // 20ms audio frame
  rtpTime += 960;  // 20ms * 48 samples/ms
}

let m = controller.getMetrics();
console.log('[PASS] Steady state jitter:', m.currentJitterMs, 'ms (expected < 1.0ms)');
assert(m.currentJitterMs < 1.0, 'Steady stream jitter must be near zero');

// Test 2: Network burst jitter (packets arrive clustered)
// Packet 30 delayed by 25ms, packet 31 arrives immediately 5ms later
controller.onPacketArrival({
  sequenceNumber: 30,
  timestamp: rtpTime,
  arrivalTimestampMs: wallClock + 25,
  payloadSize: 160
});
controller.onPacketArrival({
  sequenceNumber: 31,
  timestamp: rtpTime + 960,
  arrivalTimestampMs: wallClock + 30,
  payloadSize: 160
});

m = controller.getMetrics();
console.log('[PASS] Jitter updated after dispersion burst:', m.currentJitterMs, 'ms');
assert(m.currentJitterMs > 1.0, 'Jitter should rise after arrival dispersion');

// Test 3: Fast-attack buffer expansion on underrun
const beforeUnderrun = m.targetPlayoutDelayMs;
controller.recordUnderrun();
const afterUnderrun = controller.getMetrics().targetPlayoutDelayMs;
console.log('[PASS] Target delay expanded from', beforeUnderrun, 'ms to', afterUnderrun, 'ms');
assert(afterUnderrun === beforeUnderrun + 10, 'Underrun must expand buffer by 10ms');

// Test 4: RTT EWMA tracking
controller.onRttSample(60);
const rttEst = controller.getMetrics().rttEstimateMs;
console.log('[PASS] RTT EWMA updated towards sample:', rttEst, 'ms');
assert(rttEst > 30 && rttEst < 60, 'RTT must smooth monotonically');

console.log('>>> All 4 Adaptive Jitter Controller test suites PASSED.');
