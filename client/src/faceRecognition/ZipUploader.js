import { useState } from 'react';
import API from '../api/axios';

export default function ZipUploader({ student, onClose }) {
  const [file,     setFile]     = useState(null);
  const [status,   setStatus]   = useState('idle');
  const [result,   setResult]   = useState(null);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('zipFile', file);
    formData.append('studentId', student._id);

    try {
      const { data } = await API.post('/verification/upload-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      setResult(data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setResult({ message: err.response?.data?.message || 'Upload failed' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">Bulk ZIP Upload</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
          <p className="font-semibold mb-1">📦 ZIP File Format:</p>
          <p>• Put JPG/PNG images inside a ZIP file</p>
          <p>• Name files: <code>rollno_angle.jpg</code> (e.g. <code>001_front.jpg</code>)</p>
          <p>• Max ZIP size: 50MB</p>
        </div>

        {/* Drop zone */}
        <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
        }`}>
          <input type="file" accept=".zip" className="hidden"
            onChange={e => setFile(e.target.files[0])}/>
          <div className="text-3xl mb-2">{file ? '📦' : '⬆️'}</div>
          <p className="text-sm font-medium text-gray-700">
            {file ? file.name : 'Click to select ZIP file'}
          </p>
          {file && (
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
        </label>

        {/* Progress */}
        {status === 'uploading' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}/>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-xl p-3 mb-4 text-sm ${
            status === 'done' ? 'bg-green-50 text-green-700 border border-green-200' :
                                'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <p className="font-medium">{result.message}</p>
            {result.files && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                {result.files.map((f, i) => (
                  <p key={i} className="text-xs">📄 {f.name} ({(f.size/1024).toFixed(1)}KB)</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleUpload} disabled={!file || status === 'uploading'}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium disabled:opacity-50">
            {status === 'uploading' ? '⏳ Processing...' : '📤 Upload & Process'}
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}