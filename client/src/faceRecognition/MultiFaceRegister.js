import { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels, checkImageQuality } from './FaceEngine';
import API from '../api/axios';

export default function MultiFaceRegister({ student, onComplete, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [faces,   setFaces]   = useState([]); // captured faces
  const [status,  setStatus]  = useState('loading');
  const [toast,   setToast]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [existingFaces, setExistingFaces] = useState([]);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const init = async () => {
      await loadModels();
      await fetchExisting();
      await startCamera();
    };
    init();
    return () => stopCamera();
  }, []);

  const fetchExisting = async () => {
    try {
      const { data } = await API.get(`/verification/${student._id}/faces`);
      setExistingFaces(data.embeddings || []);
    } catch {}
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  const captureFace = async (label) => {
    if (!videoRef.current) return;
    setStatus('capturing');

    const det = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det) {
      showToast('No face detected!', 'error');
      setStatus('ready');
      return;
    }

    const qual = checkImageQuality(videoRef.current);
    if (qual.isBlurry) {
      showToast('Image too blurry — improve lighting', 'error');
      setStatus('ready');
      return;
    }

    // Draw landmarks
    if (canvasRef.current) {
      const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
      const resized = faceapi.resizeResults(det, dims);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, [resized]);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, [resized]);
    }

    // Check duplicate within captured list
    const THRESHOLD = 0.45;
    for (const f of faces) {
      const dist = faceapi.euclideanDistance(det.descriptor, new Float32Array(f.descriptor));
      if (dist < THRESHOLD) {
        showToast('This face was already captured!', 'error');
        setStatus('ready');
        return;
      }
    }

    // Capture screenshot
    const snap = document.createElement('canvas');
    snap.width  = 120;
    snap.height = 90;
    snap.getContext('2d').drawImage(videoRef.current, 0, 0, 120, 90);

    setFaces(prev => [...prev, {
      id:         Date.now(),
      descriptor: Array.from(det.descriptor),
      label:      label || `face_${prev.length + 1}`,
      quality:    qual.score,
      thumbnail:  snap.toDataURL(),
    }]);

    showToast(`✅ Face ${faces.length + 1} captured!`);
    setStatus('ready');
  };

  const removeFace = (id) => {
    setFaces(prev => prev.filter(f => f.id !== id));
  };

  const saveAll = async () => {
    if (faces.length === 0) return;
    setSaving(true);
    let saved = 0;
    let errors = [];

    for (const face of faces) {
      try {
        await API.post('/verification/add-face', {
          studentId:  student._id,
          descriptor: face.descriptor,
          label:      face.label,
          quality:    face.quality / 100,
        });
        saved++;
      } catch (err) {
        errors.push(err.response?.data?.message || 'Error saving face');
      }
    }

    setSaving(false);
    if (saved > 0) {
      showToast(`✅ ${saved} face(s) saved to MongoDB!`);
      setTimeout(() => onComplete?.(), 1500);
    }
    if (errors.length > 0) {
      showToast(errors[0], 'error');
    }
  };

  const deleteExisting = async (embeddingId) => {
    try {
      await API.delete(`/verification/${student._id}/face/${embeddingId}`);
      showToast('Face deleted', 'error');
      await fetchExisting();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
  };

  const faceLabels = ['Primary', 'Side profile', 'With glasses', 'With mask'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-screen overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 flex items-center justify-between sticky top-0">
          <div>
            <h2 className="font-bold text-white text-lg">Multi-Face Registration</h2>
            <p className="text-green-100 text-xs">{student?.name} · Register multiple face angles</p>
          </div>
          <button onClick={() => { stopCamera(); onClose?.(); }} className="text-white text-2xl">×</button>
        </div>

        {toast && (
          <div className={`mx-5 mt-4 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
          }`}>{toast.msg}</div>
        )}

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Camera panel */}
          <div>
            <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ height: '220px' }}>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"/>
              {status === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-dashed border-teal-400 rounded-full w-32 h-40"/>
                </div>
              )}
            </div>

            {/* Capture buttons for each angle */}
            <div className="grid grid-cols-2 gap-2">
              {faceLabels.map(label => (
                <button key={label}
                  onClick={() => captureFace(label)}
                  disabled={status === 'capturing'}
                  className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                  📸 {label}
                </button>
              ))}
            </div>
          </div>

          {/* Captured faces panel */}
          <div>
            <h3 className="font-semibold text-gray-700 text-sm mb-2">
              Captured ({faces.length}) {faces.length > 0 && '✅'}
            </h3>

            {faces.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
                No faces captured yet.<br/>Use buttons on the left to capture.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-3">
                {faces.map(f => (
                  <div key={f.id} className="relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                    <img src={f.thumbnail} alt={f.label} className="w-full object-cover" style={{ height: '70px' }}/>
                    <div className="p-1.5">
                      <p className="text-xs font-medium text-gray-700 truncate">{f.label}</p>
                      <p className="text-xs text-gray-400">Quality: {f.quality}%</p>
                    </div>
                    <button onClick={() => removeFace(f.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing registered faces */}
            {existingFaces.length > 0 && (
              <div className="mt-3">
                <h3 className="font-semibold text-gray-700 text-sm mb-2">
                  Registered in DB ({existingFaces.length})
                </h3>
                <div className="space-y-1">
                  {existingFaces.map(f => (
                    <div key={f._id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-green-800">{f.label}</p>
                        <p className="text-xs text-green-600">
                          {new Date(f.addedAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <button onClick={() => deleteExisting(f._id)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="px-5 pb-5">
          <button
            onClick={saveAll}
            disabled={faces.length === 0 || saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
            {saving ? '⏳ Saving to MongoDB...' : `💾 Save ${faces.length} Face(s) to Database`}
          </button>
        </div>
      </div>
    </div>
  );
}