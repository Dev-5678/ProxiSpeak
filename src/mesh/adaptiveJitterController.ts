/**
 * ProxiSpeak - Adaptive WebRTC Jitter Buffer Controller
 * 
 * Conforms to RFC 3550 (RTP Inter-Arrival Jitter Estimation) and ITU-T G.114 delay bounds.
 * Implements EWMA packet dispersion tracking with dynamic playout buffer sizing
 * and FEC redundancy scaling for spatial WebRTC mesh streams.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface RTPPacketHeader {
  sequenceNumber: number;
  timestamp: number;        // Media timestamp in RTP sampling units (e.g. 48kHz)
  arrivalTimestampMs: number; // Wall-clock monotonic arrival timestamp
  payloadSize: number;
}

export interface JitterMetrics {
  currentJitterMs: number;
  rttEstimateMs: number;
  targetPlayoutDelayMs: number;
  packetLossRate: number;
  underrunEvents: number;
  overrunEvents: number;
  fecRedundancyLevel: number;
}

export class AdaptiveJitterController {
  private previousArrivalMs: number | null = null;
  private previousTransmitTimestamp: number | null = null;
  private jitterEwmaMs: number = 0;
  private rttEwmaMs: number = 30; // Nominal initial RTT
  private sampleRateKhz: number;
  
  // Playout Bounds (ITU-T G.114 guidelines)
  private readonly minDelayMs: number = 20;
  private readonly maxDelayMs: number = 180;
  private targetDelayMs: number = 40;

  // Telemetry counters
  private receivedPackets: number = 0;
  private lostPackets: number = 0;
  private underruns: number = 0;
  private overruns: number = 0;
  private lastExpectedSeq: number | null = null;

  constructor(sampleRateKhz: number = 48) {
    this.sampleRateKhz = sampleRateKhz;
  }

  /**
   * Updates RFC 3550 inter-arrival jitter metric for an incoming RTP audio frame.
   * D(i, j) = (R_j - R_i) - (S_j - S_i)
   * J(i) = J(i-1) + (|D(i-1, i)| - J(i-1)) / 16
   */
  public onPacketArrival(packet: RTPPacketHeader): void {
    this.receivedPackets++;

    // Sequence continuity check
    if (this.lastExpectedSeq !== null) {
      const diff = (packet.sequenceNumber - this.lastExpectedSeq) & 0xffff;
      if (diff > 1 && diff < 3000) {
        this.lostPackets += (diff - 1);
      }
    }
    this.lastExpectedSeq = (packet.sequenceNumber + 1) & 0xffff;

    if (this.previousArrivalMs !== null && this.previousTransmitTimestamp !== null) {
      // Transit time difference in milliseconds
      const arrivalDiffMs = packet.arrivalTimestampMs - this.previousArrivalMs;
      const transmitDiffMs = (packet.timestamp - this.previousTransmitTimestamp) / this.sampleRateKhz;
      const dispersion = Math.abs(arrivalDiffMs - transmitDiffMs);

      // RFC 3550 1st order low-pass filter (gain 1/16 = 0.0625)
      this.jitterEwmaMs += (dispersion - this.jitterEwmaMs) / 16.0;

      // Fast-attack, slow-decay dynamic target playout sizing
      this.updatePlayoutTarget();
    }

    this.previousArrivalMs = packet.arrivalTimestampMs;
    this.previousTransmitTimestamp = packet.timestamp;
  }

  /**
   * Ingests round-trip time (RTT) feedback from RTCP Receiver Reports.
   */
  public onRttSample(rttMs: number): void {
    const alpha = 0.125; // Standard TCP/WebRTC EWMA coefficient
    this.rttEwmaMs = (1.0 - alpha) * this.rttEwmaMs + alpha * rttMs;
    this.updatePlayoutTarget();
  }

  /**
   * Adapts target playout delay:
   * Target = RTT / 2 + 4 * Jitter (clamped between minDelay and maxDelay)
   */
  private updatePlayoutTarget(): void {
    const safetyMargin = 4.0 * this.jitterEwmaMs;
    const computedTarget = (this.rttEwmaMs / 2.0) + safetyMargin;

    if (computedTarget > this.targetDelayMs) {
      // Fast-attack: expand buffer immediately to prevent audio underrun
      this.targetDelayMs = Math.min(this.maxDelayMs, computedTarget);
    } else {
      // Slow-decay: gently shrink buffer by 0.5ms per update to avoid pitch artifacts
      this.targetDelayMs = Math.max(this.minDelayMs, this.targetDelayMs - 0.5);
    }
  }

  public recordUnderrun(): void {
    this.underruns++;
    // Immediately bump target delay upon buffer starvation
    this.targetDelayMs = Math.min(this.maxDelayMs, this.targetDelayMs + 10);
  }

  public recordOverrun(): void {
    this.overruns++;
    this.targetDelayMs = Math.max(this.minDelayMs, this.targetDelayMs - 5);
  }

  /**
   * Computes recommended Forward Error Correction (FEC) redundancy ratio (0.0 - 0.5)
   * based on loss rate and current network jitter dispersion.
   */
  public getRecommendedFecRedundancy(): number {
    const lossRate = this.packetLossRate;
    if (lossRate < 0.02) return 0.0;
    if (lossRate < 0.08) return 0.15;
    if (lossRate < 0.15) return 0.30;
    return 0.50; // Maximum 50% redundancy under harsh packet drops
  }

  public get packetLossRate(): number {
    const total = this.receivedPackets + this.lostPackets;
    return total > 0 ? this.lostPackets / total : 0;
  }

  public getMetrics(): JitterMetrics {
    return {
      currentJitterMs: Number(this.jitterEwmaMs.toFixed(2)),
      rttEstimateMs: Number(this.rttEwmaMs.toFixed(2)),
      targetPlayoutDelayMs: Number(this.targetDelayMs.toFixed(2)),
      packetLossRate: Number(this.packetLossRate.toFixed(4)),
      underrunEvents: this.underruns,
      overrunEvents: this.overruns,
      fecRedundancyLevel: this.getRecommendedFecRedundancy()
    };
  }
}
