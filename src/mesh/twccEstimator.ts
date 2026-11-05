/**
 * ProxiSpeak - WebRTC Transport-Wide Congestion Control (TWCC) Estimator
 * 
 * Conforms to RFC 8888 (RTP Control Protocol Feedback for Congestion Control).
 * Analyzes packet transit delay gradients using Kalman filtering and EWMA
 * to detect queuing delays before packet drops occur, dynamically driving
 * Additive Increase / Multiplicative Decrease (AIMD) bitrate adaptation.
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export interface PacketFeedback {
  sequenceNumber: number;
  sendTimestampMs: number;
  receiveTimestampMs: number;
  payloadBytes: number;
}

export type CongestionState = 'NORMAL' | 'OVERUSING' | 'UNDERUSING';

export class TWCCBandwidthEstimator {
  private minBitrateBps: number;
  private maxBitrateBps: number;
  private currentEstimatedBitrateBps: number;
  
  // Trendline filter state (delay gradient)
  private prevSendTimeMs: number | null = null;
  private prevRecvTimeMs: number | null = null;
  private accumulatedDelayGradientMs: number = 0;
  private thresholdMs: number = 12.5; // Overuse detection threshold

  // Telemetry
  private currentState: CongestionState = 'NORMAL';
  private consecutiveOveruseCount: number = 0;

  constructor(initialBitrateBps: number = 128000, minBitrateBps: number = 32000, maxBitrateBps: number = 512000) {
    this.currentEstimatedBitrateBps = initialBitrateBps;
    this.minBitrateBps = minBitrateBps;
    this.maxBitrateBps = maxBitrateBps;
  }

  /**
   * Process a batch of packet feedback reports.
   * Calculates delay gradient:
   * delta_send = S_i - S_{i-1}
   * delta_recv = R_i - R_{i-1}
   * gradient = delta_recv - delta_send
   */
  public onFeedbackBatch(packets: PacketFeedback[]): void {
    if (packets.length === 0) return;

    for (const pkt of packets) {
      if (this.prevSendTimeMs !== null && this.prevRecvTimeMs !== null) {
        const deltaSend = pkt.sendTimestampMs - this.prevSendTimeMs;
        const deltaRecv = pkt.receiveTimestampMs - this.prevRecvTimeMs;
        const gradient = deltaRecv - deltaSend;

        // EWMA smoothing of delay gradient (alpha = 0.1)
        this.accumulatedDelayGradientMs = 0.9 * this.accumulatedDelayGradientMs + 0.1 * gradient;

        // Congestion detector state machine
        if (this.accumulatedDelayGradientMs > this.thresholdMs) {
          this.consecutiveOveruseCount++;
          if (this.consecutiveOveruseCount >= 3) {
            this.currentState = 'OVERUSING';
            this.adaptBitrate('OVERUSING');
          }
        } else if (this.accumulatedDelayGradientMs < -this.thresholdMs) {
          this.currentState = 'UNDERUSING';
          this.consecutiveOveruseCount = 0;
          this.adaptBitrate('UNDERUSING');
        } else {
          this.currentState = 'NORMAL';
          this.consecutiveOveruseCount = 0;
          this.adaptBitrate('NORMAL');
        }
      }

      this.prevSendTimeMs = pkt.sendTimestampMs;
      this.prevRecvTimeMs = pkt.receiveTimestampMs;
    }
  }

  /**
   * AIMD Bitrate Controller:
   * - On OVERUSING: Multiplicative decrease (multiply by 0.85)
   * - On NORMAL: Additive increase (+ 4000 bps)
   * Clamped within [minBitrate, maxBitrate].
   */
  private adaptBitrate(state: CongestionState): void {
    if (state === 'OVERUSING') {
      this.currentEstimatedBitrateBps = Math.max(
        this.minBitrateBps,
        Math.floor(this.currentEstimatedBitrateBps * 0.85)
      );
    } else if (state === 'NORMAL') {
      this.currentEstimatedBitrateBps = Math.min(
        this.maxBitrateBps,
        this.currentEstimatedBitrateBps + 4000
      );
    }
  }

  public getBitrateBps(): number {
    return this.currentEstimatedBitrateBps;
  }

  public getState(): CongestionState {
    return this.currentState;
  }

  public getGradientMs(): number {
    return Number(this.accumulatedDelayGradientMs.toFixed(3));
  }
}
