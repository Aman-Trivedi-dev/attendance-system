import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { loadModels, detectFace, drawDetections, checkImageQuality } from './FaceEngine';
import { LivenessDetector } from './LivenessDetector';
import API from '../api/axios';

const liveness = new LivenessDetector();

export default function FaceVerification({ student, onVerified, onClose }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const intervalRef = useRef(null);

  const [phase,       setPhase]       = useState('loading');
  // phases: loading → liveness → scanning → verified → otp → done → failed
  const [logs,        setLogs]        = useState([]);
  const [livenessStatus, setLivenessStatus] = useState({ blinks: 0, hasMotion: false, passed: false });
  const [quality,     setQuality]     = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [otp,         setOtp]         = useState('');
  const [otpValue,    setOtpValue]    = useState('');
  const [otpError,    setOtpError]    = useState('');
  const [otpLoading,  setOtpLoading]  = useState(false);
  const [showPopup,   setShowPopup]   = useState(false);

  const log = (msg) => setLogs(p => [...p.slice(-5), `${new Date().toLocaleTimeString()} — ${msg}`]);

  // Init
  useEffect(() => {
    const init = async () => {
      log('Loading AI models...');
      await loadModels();
      log('Models ready');
      liveness.reset();
      await startCamera();
    };
    init();
    return () => { stopCamera(); clearInterval(intervalRef.current); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      videoRef.current.srcObject = stream;
      await new Promise(r => videoRef.current.onloadedmetadata = r);
      setPhase('liveness');
      log('Camera started — liveness check beginning');
      startLivenessLoop();
    } catch {
      setPhase('failed');
      log('Camera access denied');
    }
  };

  const startLivenessLoop = () => {
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || phase === 'scanning') return;

      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (!det) return;

      // Draw on canvas
      if (canvasRef.current) {
        const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
        const resized = faceapi.resizeResults(det, dims);
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        faceapi.draw.drawDetections(canvasRef.current, [resized]);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, [resized]);
      }

      const status = liveness.analyze(det.landmarks, videoRef.current);
      setLivenessStatus({ ...status });

      if (status.passed) {
        clearInterval(intervalRef.current);
        log(`✅ Liveness passed! Blinks: ${status.blinks}`);
        setPhase('scanning');
        await runFaceScan();
      }
    }, 150);
  };

  const runFaceScan = async () => {
    log('Running face detection...');

    const det = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!det) {
      log('No face detected — retrying');
      setPhase('liveness');
      liveness.reset();
      startLivenessLoop();
      return;
    }

    // Quality check
    const qual = checkImageQuality(videoRef.current);
    setQuality(qual);
    log(`Quality score: ${qual.score}% — ${qual.isBlurry ? 'BLURRY' : 'SHARP'}`);

    if (qual.isBlurry) {
      log('Image too blurry — please ensure good lighting');
      setPhase('liveness');
      liveness.reset();
      startLivenessLoop();
      return;
    }

    // Verify against MongoDB
    log('Verifying against registered faces...');
    try {
      const { data } = await API.post('/verification/verify-face', {
        studentId:  student._id,
        descriptor: Array.from(det.descriptor),
      });

      setMatchResult(data);

      if (data.verified) {
        log(`✅ Match found! Confidence: ${data.confidence}%`);
        setShowPopup(true);
        stopCamera();
        setTimeout(() => {
          setShowPopup(false);
          setPhase('otp');
          generateOTP();
        }, 2500);
      } else {
        log('❌ Registered face is not valid');
        setPhase('failed');
        stopCamera();
      }
    } catch (err) {
      log('Verification API error');
      setPhase('failed');
    }
  };

  const generateOTP = async () => {
    try {
      const { data } = await API.post('/verification/generate-otp', { studentId: student._id });
      setOtp(data.otp); // demo only — remove in production
      log('OTP sent (check console in production)');
    } catch {
      log('OTP generation failed');
    }
  };

  const verifyOTP = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      await API.post('/verification/verify-otp', {
        studentId: student._id,
        otp: otpValue,
      });
      setPhase('done');
      log('✅ Two-step verification complete!');
      onVerified && onVerified(student);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    clearInterval(intervalRef.current);
  };

  const retry = () => {
    liveness.reset();
    setPhase('liveness');
    setMatchResult(null);
    setQuality(null);
    setLogs([]);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-lg">Face Verification</h2>
            <p className="text-indigo-200 text-xs">{student?.name} · Roll {student?.rollNumber}</p>
          </div>
          <button onClick={() => { stopCamera(); onClose?.(); }}
            className="text-white text-2xl hover:text-indigo-200">×</button>
        </div>

        <div className="p-5">

          {/* Success Popup */}
          {showPopup && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-green-500 bg-opacity-90 rounded-2xl">
              <div className="text-center text-white">
                <div className="text-6xl mb-3">✅</div>
                <h3 className="text-2xl font-bold">Face Verified!</h3>
                <p className="text-green-100 mt-1">{matchResult?.confidence}% confidence match</p>
                <p className="text-green-200 text-sm mt-1">Proceeding to 2-step verification...</p>
              </div>
            </div>
          )}

          {/* Phase: Liveness + Scanning */}
          {['loading','liveness','scanning'].includes(phase) && (
            <>
              {/* Phase indicator */}
              <div className="flex items-center gap-2 mb-3">
                {['Liveness','Scan','Verify','OTP'].map((s, i) => (
                  <div key={s} className="flex items-center gap-1 flex-1">
                    <div className={`flex-1 text-center py-1 rounded-lg text-xs font-medium ${
                      (phase === 'liveness' && i === 0) ||
                      (phase === 'scanning' && i === 1)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}>{s}</div>
                    {i < 3 && <div className="text-gray-300">›</div>}
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className={`rounded-xl p-3 text-sm text-center font-medium mb-3 ${
                phase === 'loading'  ? 'bg-yellow-50 text-yellow-700' :
                phase === 'liveness' ? 'bg-blue-50 text-blue-700'    :
                                       'bg-purple-50 text-purple-700'
              }`}>
                {phase === 'loading'  && '⏳ Loading AI models...'}
                {phase === 'liveness' && liveness.getInstructions()}
                {phase === 'scanning' && '🔍 Scanning & verifying face...'}
              </div>

              {/* Liveness progress */}
              {phase === 'liveness' && (
                <div className="flex gap-2 mb-3">
                  <div className={`flex-1 rounded-lg p-2 text-center text-xs border ${
                    livenessStatus.blinks >= 2 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                    👁️ Blinks: {livenessStatus.blinks}/2
                  </div>
                  <div className={`flex-1 rounded-lg p-2 text-center text-xs border ${
                    livenessStatus.hasMotion ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                    🔄 Motion: {livenessStatus.hasMotion ? 'Detected ✓' : 'Waiting...'}
                  </div>
                  {quality && (
                    <div className={`flex-1 rounded-lg p-2 text-center text-xs border ${
                      !quality.isBlurry ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
                    }`}>
                      📷 Quality: {quality.score}%
                    </div>
                  )}
                </div>
              )}

              {/* Camera */}
              <div className="relative rounded-xl overflow-hidden bg-black mb-3" style={{ height: '260px' }}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"/>

                {/* Face guide */}
                {phase === 'liveness' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`border-2 border-dashed rounded-full w-40 h-48 transition-colors ${
                      livenessStatus.passed ? 'border-green-400' : 'border-blue-400'
                    }`}/>
                  </div>
                )}

                {/* Scanning overlay */}
                {phase === 'scanning' && (
                  <div className="absolute inset-0 bg-indigo-900 bg-opacity-40 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-3xl animate-spin mb-2">⚙️</div>
                      <p className="text-sm">Processing...</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Phase: OTP */}
          {phase === 'otp' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">🔐</div>
                <h3 className="font-bold text-gray-800">Two-Step Verification</h3>
                <p className="text-gray-500 text-sm">Face verified! Enter the OTP to complete.</p>
              </div>

              {/* Demo OTP display */}
              {otp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-yellow-700 font-medium">Demo OTP (remove in production):</p>
                  <p className="text-2xl font-bold text-yellow-800 tracking-widest mt-1">{otp}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit OTP</label>
                <input
                  value={otpValue}
                  onChange={e => setOtpValue(e.target.value.replace(/\D/g,'').slice(0,6))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              {otpError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-2 text-sm text-center">
                  ❌ {otpError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={verifyOTP} disabled={otpValue.length < 6 || otpLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                  {otpLoading ? '⏳ Verifying...' : '✅ Verify OTP'}
                </button>
                <button onClick={generateOTP}
                  className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">
                  Resend
                </button>
              </div>
            </div>
          )}

          {/* Phase: Done */}
          {phase === 'done' && (
            <div className="text-center py-6">
              <div className="text-6xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-green-700">Verification Complete!</h3>
              <p className="text-gray-500 text-sm mt-1">
                {student?.name} has been successfully verified via face + OTP.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-green-700">{matchResult?.confidence}%</div>
                  <div className="text-xs text-green-600">Face match</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-indigo-700">✓ OTP</div>
                  <div className="text-xs text-indigo-600">2-step verified</div>
                </div>
              </div>
              <button onClick={() => { onClose?.(); }}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium">
                Continue
              </button>
            </div>
          )}

          {/* Phase: Failed */}
          {phase === 'failed' && (
            <div className="text-center py-6">
              <div className="text-6xl mb-3">❌</div>
              <h3 className="text-xl font-bold text-red-700">Registered face is not valid</h3>
              <p className="text-gray-500 text-sm mt-1">
                The captured face does not match the registered data for {student?.name}.
              </p>
              {matchResult && (
                <div className="bg-red-50 rounded-xl p-3 mt-3 text-sm text-red-700">
                  Confidence: {matchResult.confidence}% — below threshold
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={retry}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium">
                  🔄 Try Again
                </button>
                <button onClick={() => { stopCamera(); onClose?.(); }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-medium">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Log panel */}
          {logs.length > 0 && (
            <div className="mt-3 bg-gray-900 rounded-xl p-3 font-mono text-xs space-y-0.5 max-h-24 overflow-y-auto">
              {logs.map((l, i) => <p key={i} className="text-green-400">{l}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}