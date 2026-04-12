import { faceapi } from './FaceEngine';

// Eye Aspect Ratio — detects blink
const EAR = (eye) => {
  const A = dist(eye[1], eye[5]);
  const B = dist(eye[2], eye[4]);
  const C = dist(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
};

const dist = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

const EAR_THRESHOLD = 0.25;
const BLINK_FRAMES  = 2;

export class LivenessDetector {
  constructor() {
    this.blinkCount   = 0;
    this.earHistory   = [];
    this.isBlinking   = false;
    this.frameCount   = 0;
    this.motionFrames = [];
    this.lastFrame    = null;
    this.required     = { blinks: 2, motion: true };
    this.status       = { blinks: 0, hasMotion: false, passed: false };
  }

  reset() {
    this.blinkCount   = 0;
    this.earHistory   = [];
    this.isBlinking   = false;
    this.frameCount   = 0;
    this.motionFrames = [];
    this.lastFrame    = null;
    this.status       = { blinks: 0, hasMotion: false, passed: false };
  }

  analyze(landmarks, videoEl) {
    if (!landmarks) return this.status;

    const positions = landmarks.positions;

    // Eye landmarks (face-api.js 68-point model)
    const leftEye  = positions.slice(36, 42);
    const rightEye = positions.slice(42, 48);

    const leftEAR  = EAR(leftEye);
    const rightEAR = EAR(rightEye);
    const avgEAR   = (leftEAR + rightEAR) / 2;

    this.earHistory.push(avgEAR);
    if (this.earHistory.length > 30) this.earHistory.shift();

    // Blink detection
    if (avgEAR < EAR_THRESHOLD && !this.isBlinking) {
      this.isBlinking = true;
    } else if (avgEAR >= EAR_THRESHOLD && this.isBlinking) {
      this.isBlinking = false;
      this.blinkCount++;
      this.status.blinks = this.blinkCount;
    }

    // Motion detection via pixel diff
    const motionScore = this._detectMotion(videoEl);
    if (motionScore > 0.02) this.status.hasMotion = true;

    // Check if liveness passed
    this.status.passed = this.blinkCount >= this.required.blinks && this.status.hasMotion;

    return this.status;
  }

  _detectMotion(videoEl) {
    const canvas = document.createElement('canvas');
    canvas.width  = 80;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, 80, 60);
    const frame = ctx.getImageData(0, 0, 80, 60).data;

    if (!this.lastFrame) {
      this.lastFrame = frame;
      return 0;
    }

    let diff = 0;
    for (let i = 0; i < frame.length; i += 4) {
      diff += Math.abs(frame[i] - this.lastFrame[i]);
    }
    this.lastFrame = frame;
    return diff / (frame.length / 4) / 255;
  }

  getInstructions() {
    if (this.status.blinks < this.required.blinks) {
      return `👁️ Please blink ${this.required.blinks - this.status.blinks} more time(s)`;
    }
    if (!this.status.hasMotion) {
      return '🔄 Please move your head slightly';
    }
    return '✅ Liveness confirmed!';
  }
}