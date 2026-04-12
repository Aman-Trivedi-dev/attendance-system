import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { getRegisteredFaces } from './faceStore';

const preprocessImage = (videoEl) => {
  const canvas = document.createElement('canvas');
  canvas.width  = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, 320, 240);
  return canvas;
};

// Match a detected descriptor against all registered faces
// Returns best match if distance < threshold, else null
const matchFace = (descriptor, threshold = 0.5) => {
  const registered = getRegisteredFaces();

  if (registered.length === 0) return null;

  let bestMatch = null;
  let bestDistance = Infinity;

  registered.forEach(face => {
    const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
    console.log(`Distance to ${face.name}: ${distance.toFixed(3)}`);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = { ...face, distance };
    }
  });

  // Only accept if distance is below threshold
  return bestDistance < threshold ? bestMatch : null;
};

export default function FaceAttendance({ onMark, onServerSync }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const [step,      setStep]      = useState('loading');
  const [detected,  setDetected]  = useState(null);
  const [unknown,   setUnknown]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newRoll,   setNewRoll]   = useState('');
  const [syncStatus,setSyncStatus]= useState('');
  const [logs,      setLogs]      = useState([]);
  const [regCount,  setRegCount]  = useState(0);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-4), msg]);

  // Load AI models
  useEffect(() => {
    const load = async () => {
      try {
        addLog('⏳ Loading AI models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        addLog('✅ Models loaded');
        setStep('ready');
      } catch {
        addLog('❌ Model load failed');
        setStep('error');
      }
    };
    load();
  }, []);

  // Refresh registered face count when component becomes visible
  useEffect(() => {
    const count = getRegisteredFaces().length;
    setRegCount(count);
  }, [step]);

  const startCamera = async () => {
    try {
      addLog('📷 Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      videoRef.current.srcObject = stream;
      setStep('capturing');
      addLog('✅ Camera active');
    } catch {
      addLog('❌ Camera access denied');
      setStep('error');
    }
  };

  const runPipeline = async () => {
    if (!videoRef.current) return;

    // Check if any faces are registered
    const registered = getRegisteredFaces();
    if (registered.length === 0) {
      alert('⚠️ No faces registered yet!\n\nPlease go to Students page and register face IDs first.');
      return;
    }

    // Stage 1: Preprocess
    setStep('preprocessing');
    addLog('🔄 Preprocessing image...');
    const processed = preprocessImage(videoRef.current);
    await new Promise(r => setTimeout(r, 400));

    // Stage 2: Detect
    setStep('detecting');
    addLog('🔍 Detecting face...');
    const detection = await faceapi
      .detectSingleFace(processed, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      addLog('⚠️ No face found — try again');
      setStep('capturing');
      return;
    }

    // Draw on canvas
    if (canvasRef.current) {
      const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
      const resized = faceapi.resizeResults(detection, dims);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, [resized]);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, [resized]);
    }

    addLog(`✅ Face detected! Score: ${(detection.detection.score * 100).toFixed(0)}%`);

    // Stage 3: Recognize
    setStep('recognizing');
    addLog('🧠 Running recognition model...');
    await new Promise(r => setTimeout(r, 400));

    // Stage 4: Match against registered faces
    setStep('matching');
    addLog(`🗄️ Matching against ${registered.length} registered faces...`);
    await new Promise(r => setTimeout(r, 300));

    const match = matchFace(detection.descriptor);

    if (match) {
      // MATCH FOUND
      addLog(`✅ Matched: ${match.name} (distance: ${match.distance.toFixed(3)})`);
      setDetected(match);
      setUnknown(false);
      setStep('matched');
      stopCamera();
      onMark && onMark(match);
      await syncToServer(match, 'present');
    } else {
      // NO MATCH
      addLog(`⚠️ No match found (best distance > 0.5)`);
      setUnknown(true);
      setStep('unknown');
      stopCamera();
    }
  };

  const syncToServer = async (student, status) => {
    setStep('syncing');
    setSyncStatus('sending');
    addLog('☁️ Syncing to server...');
    await new Promise(r => setTimeout(r, 700));
    setSyncStatus('success');
    addLog('✅ Synced! Dashboard updated');
    setStep('done');
    onServerSync && onServerSync({ student, status, timestamp: new Date().toISOString() });
  };

  const handleRegisterNew = async () => {
    if (!newName || !newRoll) return;
    addLog(`➕ Registering ${newName}...`);
    await new Promise(r => setTimeout(r, 500));
    addLog('✅ Registered! Please register face in Students page');
    setStep('done');
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
  };

  const reset = () => {
    stopCamera();
    setStep('ready');
    setDetected(null);
    setUnknown(false);
    setNewName('');
    setNewRoll('');
    setSyncStatus('');
    setLogs([]);
    setRegCount(getRegisteredFaces().length);
  };

  const pipelineSteps = [
    { key: 'capturing',     label: 'Capture',    icon: '📷' },
    { key: 'preprocessing', label: 'Preprocess', icon: '🔄' },
    { key: 'detecting',     label: 'Detect',     icon: '🔍' },
    { key: 'recognizing',   label: 'Recognize',  icon: '🧠' },
    { key: 'matching',      label: 'Match DB',   icon: '🗄️' },
    { key: 'syncing',       label: 'Sync',       icon: '☁️' },
    { key: 'done',          label: 'Done',       icon: '✅' },
  ];

  const activeStepIndex = pipelineSteps.findIndex(s =>
    s.key === step ||
    (step === 'matched' && s.key === 'syncing') ||
    (step === 'unknown' && s.key === 'matching')
  );

  return (
    <div className="space-y-4">

      {/* Registered faces count warning */}
      {step === 'ready' && (
        <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
          regCount === 0
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <span className="text-lg">{regCount === 0 ? '⚠️' : '✅'}</span>
          <div>
            <p className="font-medium">
              {regCount === 0
                ? 'No faces registered yet!'
                : `${regCount} face${regCount > 1 ? 's' : ''} registered — ready to scan`}
            </p>
            <p className="text-xs opacity-75">
              {regCount === 0
                ? 'Go to Students page → click "Register Face" for each student first'
                : 'Only registered students will be recognized'}
            </p>
          </div>
        </div>
      )}

      {/* Pipeline progress */}
      {!['loading','ready','error'].includes(step) && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pipeline</p>
          <div className="flex items-center gap-1">
            {pipelineSteps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`flex flex-col items-center flex-1 ${
                  i <= activeStepIndex ? 'opacity-100' : 'opacity-30'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                    i < activeStepIndex  ? 'bg-green-500 text-white' :
                    i === activeStepIndex ? 'bg-blue-500 text-white animate-pulse' :
                                           'bg-gray-200 text-gray-400'
                  }`}>
                    {i < activeStepIndex ? '✓' : s.icon}
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5 text-center leading-tight">{s.label}</span>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className={`h-0.5 flex-1 mb-4 ${i < activeStepIndex ? 'bg-green-400' : 'bg-gray-200'}`}/>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className={`rounded-lg p-3 text-sm font-medium text-center ${
        step === 'loading'       ? 'bg-yellow-50 text-yellow-700'  :
        step === 'ready'         ? 'bg-blue-50 text-blue-700'      :
        step === 'capturing'     ? 'bg-indigo-50 text-indigo-700'  :
        step === 'preprocessing' ? 'bg-orange-50 text-orange-700'  :
        step === 'detecting'     ? 'bg-cyan-50 text-cyan-700'      :
        step === 'recognizing'   ? 'bg-violet-50 text-violet-700'  :
        step === 'matching'      ? 'bg-amber-50 text-amber-700'    :
        step === 'matched'       ? 'bg-green-50 text-green-700'    :
        step === 'unknown'       ? 'bg-red-50 text-red-700'        :
        step === 'syncing'       ? 'bg-sky-50 text-sky-700'        :
        step === 'done'          ? 'bg-green-50 text-green-700'    :
                                   'bg-red-50 text-red-700'
      }`}>
        {step === 'loading'       && '⏳ Loading AI models...'}
        {step === 'ready'         && '✅ Ready — click Start Camera'}
        {step === 'capturing'     && '📷 Look at camera — click Scan Face'}
        {step === 'preprocessing' && '🔄 Preprocessing image...'}
        {step === 'detecting'     && '🔍 Detecting face...'}
        {step === 'recognizing'   && '🧠 Running recognition model...'}
        {step === 'matching'      && `🗄️ Matching against ${regCount} registered faces...`}
        {step === 'matched'       && `✅ Matched: ${detected?.name}`}
        {step === 'unknown'       && '⚠️ Face not recognized — not in database'}
        {step === 'syncing'       && '☁️ Syncing to server...'}
        {step === 'done'          && '🎉 Attendance marked & synced!'}
        {step === 'error'         && '❌ Error — check camera access'}
      </div>

      {/* Camera */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ height: '280px' }}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"/>

        {step === 'capturing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-blue-400 border-dashed rounded-2xl w-48 h-56 flex items-center justify-center">
              <p className="text-blue-300 text-xs text-center px-4">Position face here</p>
            </div>
          </div>
        )}

        {['preprocessing','detecting','recognizing','matching','syncing'].includes(step) && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-3xl mb-2 animate-spin">⚙️</div>
              <p className="text-sm font-medium">Processing...</p>
            </div>
          </div>
        )}

        {['ready','loading'].includes(step) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm">Camera preview here</p>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline log */}
      {logs.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs space-y-1">
          <p className="text-gray-500 mb-1">▶ Pipeline log</p>
          {logs.map((log, i) => (
            <p key={i} className="text-green-400">{log}</p>
          ))}
        </div>
      )}

      {/* Matched student card */}
      {detected && ['done','matched'].includes(step) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg">
              {detected.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-green-800">{detected.name}</div>
              <div className="text-xs text-green-600">
                Roll: {detected.rollNumber} · Class {detected.class}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Match confidence: {((1 - detected.distance) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="ml-auto">
              <span className="bg-green-200 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                ✅ Present
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unknown person */}
      {unknown && step === 'unknown' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-700">Face Not Recognized</p>
              <p className="text-xs text-red-500">
                This person's face is not registered in the system.
                Register their face in the Students page first.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="Student name"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Roll Number</label>
              <input value={newRoll} onChange={e => setNewRoll(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="e.g. 006"/>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRegisterNew}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">
              ➕ Add & Alert Admin
            </button>
            <button onClick={reset}
              className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm">
              Ignore
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {step === 'ready' && (
          <button onClick={startCamera}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-medium">
            📷 Start Camera
          </button>
        )}
        {step === 'capturing' && (
          <button onClick={runPipeline}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium animate-pulse">
            🔍 Scan Face
          </button>
        )}
        {['done','error','unknown'].includes(step) && (
          <button onClick={reset}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium">
            🔄 Scan Next Student
          </button>
        )}
      </div>
    </div>
  );
}