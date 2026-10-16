/**
 * ProxiSpeak Web Audio API Spatial Manager
 * Handles dynamic Web Audio GainNode volume attenuation and StereoPannerNode directional panning
 * based on 2D avatar Euclidean distance relative to peer emitters.
 */

export class SpatialAudioManager {
  constructor(options = {}) {
    this.minDistance = options.minDistance || 30;
    this.maxDistance = options.maxDistance || 350;
    this.rolloffFactor = options.rolloffFactor || 1.2;
    this.audioCtx = null;
    this.peers = new Map();
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  calculateGain(distance) {
    if (distance <= this.minDistance) return 1.0;
    if (distance >= this.maxDistance) return 0.0;

    const normalized = (distance - this.minDistance) / (this.maxDistance - this.minDistance);
    return Math.max(0, Math.min(1, 1 / (1 + this.rolloffFactor * normalized * normalized)));
  }

  calculatePan(listenerPos, sourcePos) {
    const dx = sourcePos.x - listenerPos.x;
    const halfAudible = this.maxDistance / 2;
    return Math.max(-1.0, Math.min(1.0, dx / halfAudible));
  }

  updatePeerPosition(peerId, listenerPos, peerPos) {
    const dx = peerPos.x - listenerPos.x;
    const dy = peerPos.y - listenerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const gain = this.calculateGain(distance);
    const pan = this.calculatePan(listenerPos, peerPos);

    const peerNodes = this.peers.get(peerId);
    if (peerNodes) {
      if (peerNodes.gainNode && this.audioCtx) {
        peerNodes.gainNode.gain.setTargetAtTime(gain, this.audioCtx.currentTime, 0.05);
      }
      if (peerNodes.pannerNode && this.audioCtx) {
        peerNodes.pannerNode.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.05);
      }
    }

    return { distance, gain, pan };
  }
}

export default SpatialAudioManager;
