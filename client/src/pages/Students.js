import { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import * as faceapi from 'face-api.js';
import API from '../api/axios';
import FaceVerification  from '../faceRecognition/FaceVerification';
import MultiFaceRegister from '../faceRecognition/MultiFaceRegister';
import ZipUploader       from '../faceRecognition/ZipUploader';


export default function Students() {
  const [students,       setStudents]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [search,         setSearch]         = useState('');
  const [form,           setForm]           = useState({ name: '', rollNumber: '', class: '' });
  const [registeringId,  setRegisteringId]  = useState(null);
  const [camStatus,      setCamStatus]      = useState('idle');
  const [modelsLoaded,   setModelsLoaded]   = useState(false);
  const [toast,          setToast]          = useState(null);
  const [dupStudent,     setDupStudent]     = useState(null);
  const [verifyStudent,  setVerifyStudent]  = useState(null);
  const [multiRegStudent,setMultiRegStudent]= useState(null);
  const [showZipUpload,  setShowZipUpload]  = useState(false);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/students');
      setStudents(data);
    } catch {
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

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
      } catch (err) {
        console.error('Model load error:', err);
      }
    };
    load();
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.includes(search) ||
    s.class.toLowerCase().includes(search.toLowerCase())
  );

  const openCamera = async (studentId) => {
    setDupStudent(null);
    setRegisteringId(studentId);
    setCamStatus('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCamStatus('ready');
        }
      }, 300);
    } catch {
      setCamStatus('error');
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    setCamStatus('capturing');
    setDupStudent(null);

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setCamStatus('ready');
      alert('No face detected! Please look directly at the camera.');
      return;
    }

    const newDescriptor = detection.descriptor;
    const DUPLICATE_THRESHOLD = 0.45;

    setCamStatus('checking');
    const registeredWithFace = students.filter(
      s => s.faceRegistered && s._id !== registeringId && s.faceDescriptor?.length > 0
    );

    for (const existingStudent of registeredWithFace) {
      const existingDescriptor = new Float32Array(existingStudent.faceDescriptor);
      const distance = faceapi.euclideanDistance(newDescriptor, existingDescriptor);
      if (distance < DUPLICATE_THRESHOLD) {
        setDupStudent(existingStudent);
        setCamStatus('duplicate');
        stopCamera();
        return;
      }
    }

    if (canvasRef.current) {
      const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
      const resized = faceapi.resizeResults(detection, dims);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      faceapi.draw.drawDetections(canvasRef.current, [resized]);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, [resized]);
    }

    try {
      const descriptor = Array.from(newDescriptor);
      await API.put(`/students/${registeringId}/face`, { faceDescriptor: descriptor });
      setCamStatus('done');
      showToast('✅ Face registered & saved to MongoDB!');
      await fetchStudents();
      setTimeout(() => {
        stopCamera();
        setRegisteringId(null);
        setCamStatus('idle');
      }, 1500);
    } catch {
      setCamStatus('error');
      showToast('Failed to save face data', 'error');
    }
  };

  // ✅ FIXED: handleDeleteFace — better confirm message + cleaner toast
  const handleDeleteFace = async (student) => {
    if (!window.confirm(
      `Delete face ID for ${student.name}?\n\nThe student record will be kept but they will need to re-register their face.`
    )) return;
    try {
      await API.delete(`/students/${student._id}/face`);
      showToast(`🗑️ Face ID deleted for ${student.name}`, 'error');
      await fetchStudents();
    } catch (err) {
      showToast('Failed to delete face data', 'error');
    }
  };

  // ✅ FIXED: handleDeleteStudent — better confirm message + error handling
  const handleDeleteStudent = async (student) => {
    if (!window.confirm(
      `⚠️ Delete ${student.name}?\n\nThis will permanently delete:\n• Student record\n• Face ID data\n• All attendance records`
    )) return;
    try {
      await API.delete(`/students/${student._id}`);
      showToast(`🗑️ ${student.name} deleted successfully`, 'error');
      await fetchStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete student', 'error');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await API.post('/students', {
        name: form.name, rollNumber: form.rollNumber, class: form.class,
      });
      showToast(`✅ ${form.name} added!`);
      setForm({ name: '', rollNumber: '', class: '' });
      setShowForm(false);
      await fetchStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add student', 'error');
    }
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
  };

  const closeCamera = () => {
    stopCamera();
    setRegisteringId(null);
    setCamStatus('idle');
    setDupStudent(null);
  };

  const registeredCount = students.filter(s => s.faceRegistered).length;
  const registeringStudent = students.find(s => s._id === registeringId);

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

      <div className="max-w-5xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Students</h1>
            <p className="text-gray-500 text-sm">
              {students.length} registered ·
              <span className="text-green-600 font-medium"> {registeredCount} face IDs</span> ·
              <span className="text-yellow-600 font-medium"> {students.length - registeredCount} pending</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowZipUpload(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              📦 Bulk Upload
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              {showForm ? '✕ Cancel' : '+ Add Student'}
            </button>
          </div>
        </div>

        {/* Face Registration Modal */}
        {registeringId && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-800">Register Face ID</h2>
                  <p className="text-sm text-gray-500">
                    {registeringStudent?.name} · Roll {registeringStudent?.rollNumber}
                  </p>
                </div>
                <button onClick={closeCamera} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>

              <div className={`rounded-lg p-2.5 text-sm text-center font-medium mb-4 ${
                camStatus === 'loading'   ? 'bg-yellow-50 text-yellow-700' :
                camStatus === 'ready'     ? 'bg-blue-50 text-blue-700'    :
                camStatus === 'capturing' ? 'bg-purple-50 text-purple-700':
                camStatus === 'checking'  ? 'bg-orange-50 text-orange-700':
                camStatus === 'duplicate' ? 'bg-red-50 text-red-700'      :
                camStatus === 'done'      ? 'bg-green-50 text-green-700'  :
                                           'bg-red-50 text-red-700'
              }`}>
                {camStatus === 'loading'   && '⏳ Starting camera...'}
                {camStatus === 'ready'     && '📷 Look at camera → click Capture Face'}
                {camStatus === 'capturing' && '🔍 Detecting face landmarks...'}
                {camStatus === 'checking'  && '🔎 Checking for duplicate faces...'}
                {camStatus === 'duplicate' && '⚠️ Duplicate face detected!'}
                {camStatus === 'done'      && '✅ Face saved to MongoDB!'}
                {camStatus === 'error'     && '❌ Face save failed — check server connection'}
              </div>

              {camStatus === 'duplicate' && dupStudent && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-700">Face Already Registered!</p>
                      <p className="text-xs text-red-500">This face belongs to another student</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm">
                        {dupStudent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{dupStudent.name}</p>
                        <p className="text-xs text-gray-500">Roll: {dupStudent.rollNumber} · Class {dupStudent.class}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 mt-2 text-center">
                    Each student must have a unique face. Please use a different person.
                  </p>
                  <button
                    onClick={() => { setDupStudent(null); setCamStatus('idle'); openCamera(registeringId); }}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">
                    🔄 Try Again with Different Person
                  </button>
                </div>
              )}

              {camStatus !== 'duplicate' && (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-gray-900 mb-4" style={{ height: '240px' }}>
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"/>
                    {camStatus === 'ready' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="border-2 border-dashed border-green-400 rounded-full w-36 h-44 flex items-center justify-center">
                          <p className="text-green-300 text-xs text-center px-4">Position face here</p>
                        </div>
                      </div>
                    )}
                    {(camStatus === 'capturing' || camStatus === 'checking') && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="text-2xl mb-1 animate-spin">⚙️</div>
                          <p className="text-xs">{camStatus === 'checking' ? 'Checking duplicates...' : 'Processing...'}</p>
                        </div>
                      </div>
                    )}
                    {camStatus === 'done' && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center">
                        <div className="text-5xl">✅</div>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 mb-4 text-xs text-blue-700">
                    <p className="font-semibold mb-1">💡 Important:</p>
                    <p>• Each student must have a <strong>unique face</strong></p>
                    <p>• System will block duplicate face registrations</p>
                    <p>• Face data saved permanently</p>
                  </div>

                  <div className="flex gap-3">
                    {camStatus === 'ready' && (
                      <button onClick={captureFace}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium">
                        📸 Capture Face
                      </button>
                    )}
                    <button onClick={closeCamera}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-medium">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Student Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold text-gray-700 mb-4">Register New Student</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="e.g. Rahul Kumar" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Roll Number</label>
                <input value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="e.g. 006" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={form.class} onChange={e => setForm({...form, class: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  required>
                  <option value="">Select class</option>
                  {['6A','6B','7A','7B','8A','8B','9A','9B','10A','10B'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <button type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium">
                  Add
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="🔍 Search by name, roll number or class..." />
        </div>

        {/* Student Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-3xl mb-2 animate-spin inline-block">⚙️</div>
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Roll No.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Face ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Registered On</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-400">
                    {students.length === 0 ? '📭 No students yet — add one above!' : 'No results found'}
                  </td></tr>
                ) : (
                  filtered.map((student, index) => (
                    <tr key={student._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-mono text-gray-600">{student.rollNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                            {student.name.charAt(0)}
                          </div>
                          {student.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {student.class}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {student.faceRegistered ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            ✅ Registered
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">
                            ⚠️ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {student.faceRegisteredAt
                          ? new Date(student.faceRegisteredAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">

                          {/* Register / Re-register */}
                          <button onClick={() => openCamera(student._id)}
                            className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                              student.faceRegistered
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}>
                            {student.faceRegistered ? '🔄 Re-register' : '📸 Register Face'}
                          </button>

                          {/* Verify face */}
                          {student.faceRegistered && (
                            <button onClick={() => setVerifyStudent(student)}
                              className="text-xs font-medium px-3 py-1 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200">
                              🔒 Verify
                            </button>
                          )}

                          {/* Multi-face register */}
                          <button onClick={() => setMultiRegStudent(student)}
                            className="text-xs font-medium px-3 py-1 rounded-lg bg-teal-100 text-teal-600 hover:bg-teal-200">
                            👥 Multi-Face
                          </button>

                          {/* ✅ FIXED: Remove Face button */}
                          {student.faceRegistered && (
                            <button
                              onClick={() => handleDeleteFace(student)}
                              className="text-xs font-medium px-3 py-1 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200">
                              🗑️ Remove Face
                            </button>
                          )}

                          {/* ✅ FIXED: Delete student button */}
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-50">
                            🗑️ Delete
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Face Registration Progress</p>
            <p className="text-sm text-gray-500">{registeredCount}/{students.length}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${students.length > 0 ? (registeredCount / students.length) * 100 : 0}%` }}/>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {students.length - registeredCount > 0
              ? `${students.length - registeredCount} students need face registration`
              : '🎉 All students registered!'}
          </p>
        </div>

      </div>

      {/* FaceVerification Modal */}
      {verifyStudent && (
        <FaceVerification
          student={verifyStudent}
          onVerified={(s) => { showToast(`✅ ${s.name} verified!`); setVerifyStudent(null); }}
          onClose={() => setVerifyStudent(null)}
        />
      )}

      {/* MultiFaceRegister Modal */}
      {multiRegStudent && (
        <MultiFaceRegister
          student={multiRegStudent}
          onComplete={() => { fetchStudents(); setMultiRegStudent(null); }}
          onClose={() => setMultiRegStudent(null)}
        />
      )}

      {/* ZipUploader Modal */}
      {showZipUpload && (
        <ZipUploader
          student={students[0]}
          onClose={() => setShowZipUpload(false)}
        />
      )}

    </div>
  );
}