import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  ]);
  modelsLoaded = true;
};

export const detectFace = async (videoEl) => {
  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection || null;
};

export const detectAllFaces = async (videoEl) => {
  return await faceapi
    .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
};

export const euclideanDistance = (a, b) => {
  return faceapi.euclideanDistance(a, b);
};

export const drawDetections = (canvas, video, detections) => {
  const dims = faceapi.matchDimensions(canvas, video, true);
  const resized = faceapi.resizeResults(detections, dims);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (Array.isArray(resized)) {
    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
  } else {
    faceapi.draw.drawDetections(canvas, [resized]);
    faceapi.draw.drawFaceLandmarks(canvas, [resized]);
  }
};

// Image quality check — blur detection
export const checkImageQuality = (videoEl) => {
  const canvas = document.createElement('canvas');
  canvas.width  = 160;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, 160, 120);
  const imageData = ctx.getImageData(0, 0, 160, 120);
  const data = imageData.data;

  // Laplacian variance — measures sharpness
  let sum = 0, sumSq = 0, n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    sum   += gray;
    sumSq += gray * gray;
  }
  const mean     = sum / n;
  const variance = (sumSq / n) - (mean * mean);
  const quality  = Math.min(variance / 500, 1); // normalize to 0-1

  return {
    quality,
    isBlurry: variance < 100,
    score:    Math.round(quality * 100),
  };
};

export { faceapi };