// Utilities for face vectorization and similarity
export const IMG_SIZE = 100;
export const MATCH_THRESHOLD = 25; // distance threshold
export const MAX_SAMPLES = 50;

export interface ProcessResult {
  vector: number[]; // length 10000
  brightness: number;
  contrast: number;
}

export function processImageData(grayPixels: Uint8ClampedArray): ProcessResult {
  // Expect length = IMG_SIZE*IMG_SIZE
  const len = IMG_SIZE * IMG_SIZE;
  const vector = new Array(len);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const v = grayPixels[i] / 255; // normalize
    vector[i] = v;
    sum += v;
  }
  const mean = sum / len;
  let variance = 0;
  for (let i = 0; i < len; i++) {
    const diff = vector[i] - mean;
    variance += diff * diff;
  }
  const contrast = Math.sqrt(variance / len);
  return { vector, brightness: mean, contrast };
}

export function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export function similarityFromDistance(distance: number): number {
  return Math.max(0, 1 - distance / 100) * 100; // heuristic
}

// Attempt to use FaceDetector API if available
export const detectorAvailable = 'FaceDetector' in window;

export async function detectFace(video: HTMLVideoElement): Promise<DOMRect | null> {
  if (!detectorAvailable) return null;
  try {
    // @ts-ignore experimental
    const detector = new window.FaceDetector();
    const faces = await detector.detect(video);
    if (faces && faces[0]) return faces[0].boundingBox as DOMRect;
  } catch {}
  return null;
}

export function extractGrayscaleFromVideo(video: HTMLVideoElement, faceBox: DOMRect | null): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = IMG_SIZE; canvas.height = IMG_SIZE;
  const ctx = canvas.getContext('2d')!;
  const sx = faceBox ? faceBox.x : (video.videoWidth - IMG_SIZE) / 2;
  const sy = faceBox ? faceBox.y : (video.videoHeight - IMG_SIZE) / 2;
  const sw = faceBox ? faceBox.width : IMG_SIZE;
  const sh = faceBox ? faceBox.height : IMG_SIZE;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, IMG_SIZE, IMG_SIZE);
  const img = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);
  const gray = new Uint8ClampedArray(IMG_SIZE * IMG_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i+1], b = img.data[i+2];
    const y = 0.299*r + 0.587*g + 0.114*b;
    gray[i/4] = y;
  }
  return gray;
}

export function extractGrayscaleFromImage(imgEl: HTMLImageElement, faceBox: DOMRect | null): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = IMG_SIZE; canvas.height = IMG_SIZE;
  const ctx = canvas.getContext('2d')!;
  const sx = faceBox ? faceBox.x : (imgEl.naturalWidth - IMG_SIZE) / 2;
  const sy = faceBox ? faceBox.y : (imgEl.naturalHeight - IMG_SIZE) / 2;
  const sw = faceBox ? faceBox.width : IMG_SIZE;
  const sh = faceBox ? faceBox.height : IMG_SIZE;
  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, IMG_SIZE, IMG_SIZE);
  const img = ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE);
  const gray = new Uint8ClampedArray(IMG_SIZE * IMG_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i+1], b = img.data[i+2];
    const y = 0.299*r + 0.587*g + 0.114*b;
    gray[i/4] = y;
  }
  return gray;
}
