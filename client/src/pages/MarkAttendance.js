import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';
import * as faceapi from 'face-api.js';

export default function MarkAttendance() {
  const today = new Date().toISOString().split('T')[0];

  const [date,          setDate]          = useState(today);
  const [selectedClass, setSelectedClass] = useState('All');
  const [students,      setStudents]      = useState([]);
  const [attendance,    setAttendance]    = useState({});
  const [saved,         setSaved]         = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [showCamera,    setShowCamera]    = useState(false);
  const [camStep,       setCamStep]       = useState('idle');
  // idle | loading | ready | scanning | matched | unknown | error
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [modelsLoaded,   setModelsLoaded]   = useState(false);
  const [toast,          setToast]          = useState(null);
  const [saveResult,     setSaveResult]     = useState(null);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load students from MongoDB
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/students');
        setStudents(data);
      } catch {
        showToast('Failed to load students', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Load existing attendance for this date
  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const { data } = await API.get(`/attendance/date/${date}`);
        const map = {};
        data.forEach(r => {
          if (r.student?._id) map[r.student._id] = r.status;
        });
        setAttendance(map);
        setSaved(false);
        setSaveResult(null);
      } catch {
        setAttendance({});
      }
    };
    fetchExisting();
  }, [date]);

  // Load face-api models
  useEffect(() => {
    const load = async () => {
      if (modelsLoaded) return;
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        console.error('Model load error:', e);
      }
    };
    load();
  }, []);

  const classes = ['All','6A','6B','7A','7B','8A','8B','9A','9B','10A','10B'];

  const classStudents = selectedClass === 'All'
    ? students
    : students.filter(s => s.class === selectedClass);

  const toggle = (id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
    setSaved(false);
    setSaveResult(null);
  };

  const markAll = (status) => {
    const all = {};
    classStudents.forEach(s => { all[s._id] = status; });
    setAttendance(prev => ({ ...prev, ...all }));
    setSaved(false);
    setSaveResult(null);
  };

  // ✅ FIXED: Save attendance to MongoDB
  const handleSave = async () => {
    const toSave = classStudents.filter(s => attendance[s._id]);

    if (toSave.length === 0) {
      showToast('⚠️ Please mark at least one student before saving', 'error');
      return;
    }

    setSaving(true);
    setSaveResult(null);
    let savedCount  = 0;
    let failedCount = 0;

    for (const student of toSave) {
      try {
        await API.post('/attendance', {
          studentId: student._id,
          date:      date,
          status:    attendance[student._id],
          method:    'manual',
        });
        savedCount++;
      } catch (err) {
        console.error(`Failed to save for ${student.name}:`, err);
        failedCount++;
      }
    }

    setSaving(false);

    if (savedCount > 0) {
      setSaved(true);
      setSaveResult({ saved: savedCount, failed: failedCount });
      showToast(`✅ Attendance saved! ${savedCount} records saved to MongoDB`);
    } else {
      showToast('❌ Failed to save attendance — check server connection', 'error');
    }
  };

  // Face recognition camera
  const startCamera = async () => {
    setCamStep('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCamStep('ready');
    } catch {
      setCamStep('error');
    }
  };

  const scanFace = async () => {
    if (!videoRef.current) return;
    setCamStep('scanning');
    setMatchedStudent(null);

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setCamStep('ready');
      showToast('No face detected — try again', 'error');
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

    // Match against registered students
    const THRESHOLD = 0.5;
    let bestMatch = null;
    let bestDist  = Infinity;

    const registeredStudents = students.filter(
      s => s.faceRegistered && s.faceDescriptor?.length > 0
    );

    for (const student of registeredStudents) {
      const stored = new Float32Array(student.faceDescriptor);
      const dist   = faceapi.euclideanDistance(detection.descriptor, stored);
      if (dist < bestDist) { bestDist = dist; bestMatch = student; }
    }

    if (bestMatch && bestDist < THRESHOLD) {
      setMatchedStudent({ ...bestMatch, confidence: Math.round((1 - bestDist) * 100) });
      setCamStep('matched');
      stopCamera();
      // Auto-mark present
      setAttendance(prev => ({ ...prev, [bestMatch._id]: 'present' }));
      setSaved(false);
      showToast(`✅ ${bestMatch.name} recognized & marked present!`);
    } else {
      setCamStep('unknown');
      stopCamera();
      showToast('Face not recognized — not registered', 'error');
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
  };

  const resetCamera = () => {
    stopCamera();
    setCamStep('idle');
    setMatchedStudent(null);
    setShowCamera(false);
  };

  const presentCount = classStudents.filter(s => attendance[s._id] === 'present').length;
  const absentCount  = classStudents.filter(s => attendance[s._id] === 'absent').length;
  const unmarked     = classStudents.filter(s => !attendance[s._id]).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mark Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Select class, mark students, then click Save</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSaved(false); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => markAll('present')}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-xs font-medium">
              ✅ All Present
            </button>
            <button onClick={() => markAll('absent')}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-medium">
              ❌ All Absent
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{classStudents.length}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-green-700">{presentCount}</div>
            <div className="text-xs text-green-600">Present</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-red-700">{absentCount}</div>
            <div className="text-xs text-red-600">Absent</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-amber-700">{unmarked}</div>
            <div className="text-xs text-amber-600">Unmarked</div>
          </div>
        </div>

        {/* Student list */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-3xl animate-spin inline-block mb-2">⚙️</div>
            <p className="text-gray-500">Loading students from MongoDB...</p>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">No students found</p>
            <p className="text-gray-400 text-xs mt-1">Add students from the Students page</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
            {classStudents.map((student, index) => (
              <div key={student._id}
                className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } ${attendance[student._id] === 'present' ? 'border-l-4 border-l-green-400' :
                    attendance[student._id] === 'absent'  ? 'border-l-4 border-l-red-400'   :
                    'border-l-4 border-l-transparent'}`}>

                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    attendance[student._id] === 'present' ? 'bg-green-100 text-green-700' :
                    attendance[student._id] === 'absent'  ? 'bg-red-100 text-red-700'     :
                                                            'bg-gray-100 text-gray-500'
                  }`}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{student.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <span>Roll: {student.rollNumber}</span>
                      <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-xs">
                        {student.class}
                      </span>
                      {student.faceRegistered && (
                        <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-xs">
                          📸 Face ID
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  {/* Already saved indicator */}
                  {saved && attendance[student._id] && (
                    <span className="text-xs text-gray-400">✓ saved</span>
                  )}
                  <button
                    onClick={() => toggle(student._id, 'present')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      attendance[student._id] === 'present'
                        ? 'bg-green-600 text-white shadow-sm scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                    }`}>
                    Present
                  </button>
                  <button
                    onClick={() => toggle(student._id, 'absent')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      attendance[student._id] === 'absent'
                        ? 'bg-red-500 text-white shadow-sm scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                    }`}>
                    Absent
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Face Recognition Section */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-800">📸 Face Recognition Mode</h3>
              <p className="text-xs text-gray-500 mt-0.5">Auto-mark attendance using AI camera</p>
            </div>
            <button
              onClick={() => { setShowCamera(!showCamera); if (!showCamera) { setCamStep('idle'); setMatchedStudent(null); } }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {showCamera ? 'Hide Camera' : '📷 Launch Camera'}
            </button>
          </div>

          {showCamera && (
            <div className="space-y-3">
              {/* Status */}
              <div className={`rounded-lg p-2.5 text-sm text-center font-medium ${
                camStep === 'idle'     ? 'bg-blue-50 text-blue-700'    :
                camStep === 'loading'  ? 'bg-yellow-50 text-yellow-700':
                camStep === 'ready'    ? 'bg-green-50 text-green-700'  :
                camStep === 'scanning' ? 'bg-purple-50 text-purple-700':
                camStep === 'matched'  ? 'bg-green-50 text-green-700'  :
                camStep === 'unknown'  ? 'bg-red-50 text-red-700'      :
                                        'bg-red-50 text-red-700'
              }`}>
                {camStep === 'idle'     && '📷 Click Start Camera to begin'}
                {camStep === 'loading'  && '⏳ Starting camera...'}
                {camStep === 'ready'    && '✅ Ready — click Start Camera'}
                {camStep === 'scanning' && '🔍 Scanning face...'}
                {camStep === 'matched'  && `✅ ${matchedStudent?.name} recognized! (${matchedStudent?.confidence}% match)`}
                {camStep === 'unknown'  && '⚠️ Face not recognized — not registered in system'}
                {camStep === 'error'    && '❌ Camera error — check permissions'}
              </div>

              {/* Camera view */}
              <div className="relative rounded-xl overflow-hidden bg-gray-900" style={{ height: '280px' }}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"/>

                {camStep === 'ready' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-dashed border-purple-400 rounded-2xl w-48 h-56 flex items-center justify-center">
                      <p className="text-purple-300 text-xs text-center px-4">Position face here</p>
                    </div>
                  </div>
                )}

                {camStep === 'scanning' && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-3xl animate-spin mb-2">⚙️</div>
                      <p className="text-sm">Recognizing face...</p>
                    </div>
                  </div>
                )}

                {camStep === 'matched' && matchedStudent && (
                  <div className="absolute bottom-0 left-0 right-0 bg-green-600 bg-opacity-90 p-3 text-center">
                    <p className="text-white font-semibold text-sm">
                      ✅ {matchedStudent.name} — Marked Present
                    </p>
                    <p className="text-green-200 text-xs">
                      Roll: {matchedStudent.rollNumber} · {matchedStudent.confidence}% confidence
                    </p>
                  </div>
                )}

                {(camStep === 'idle' || camStep === 'loading') && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm">Camera will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="flex gap-3">
                {camStep === 'idle' && (
                  <button onClick={startCamera}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-medium text-sm">
                    📷 Start Camera
                  </button>
                )}
                {camStep === 'ready' && (
                  <button onClick={scanFace}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium text-sm animate-pulse">
                    🔍 Scan Face
                  </button>
                )}
                {(camStep === 'matched' || camStep === 'unknown' || camStep === 'error') && (
                  <button onClick={() => { setCamStep('idle'); setMatchedStudent(null); startCamera(); }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 rounded-xl font-medium text-sm">
                    🔄 Scan Next Student
                  </button>
                )}
                {camStep !== 'idle' && (
                  <button onClick={resetCamera}
                    className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-medium text-sm">
                    Close
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Result */}
        {saveResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="font-semibold text-green-700">✅ Attendance Saved to MongoDB!</p>
            <p className="text-sm text-green-600 mt-1">
              {saveResult.saved} record(s) saved successfully
              {saveResult.failed > 0 && ` · ${saveResult.failed} failed`}
            </p>
            <p className="text-xs text-green-500 mt-1">
              Date: {date} · Class: {selectedClass} · Present: {presentCount} · Absent: {absentCount}
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || classStudents.length === 0}
          className={`w-full font-semibold py-3.5 rounded-xl transition-all text-white text-sm ${
            saving
              ? 'bg-gray-400 cursor-not-allowed'
              : saved
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-green-600 hover:bg-green-700 hover:shadow-lg active:scale-95'
          } disabled:opacity-50`}>
          {saving ? '⏳ Saving to MongoDB...' :
           saved   ? '✅ Saved! Click to Update' :
                     '💾 Save Attendance'}
        </button>

      </div>
    </div>
  );
}