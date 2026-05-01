import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_THEMES } from '../context/AuthContext';
import API from '../api/axios';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('teacher');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();
  const theme     = ROLE_THEMES[role];

  const roles = [
    { value: 'admin',     label: 'Administrator', icon: '👑', desc: 'Full system access',     color: 'border-purple-400 bg-purple-50', text: 'text-purple-700' },
    { value: 'teacher',   label: 'Teacher',       icon: '🎓', desc: 'Mark & view attendance',  color: 'border-green-400 bg-green-50',   text: 'text-green-700'  },
    { value: 'principal', label: 'Principal',     icon: '🏫', desc: 'View reports only',       color: 'border-blue-400 bg-blue-50',     text: 'text-blue-700'   },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await API.post('/auth/login', { email, password });
      login(data);
      navigate('/dashboard'); // ✅ updated from '/' to '/dashboard'
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏫</div>
          <h1 className="text-2xl font-bold text-gray-800">Attendance System</h1>
          <p className="text-gray-500 text-sm mt-1">Rural Schools — Punjab · SIH 2025</p>
        </div>

        {/* Role selector */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select your role</p>
          <div className="grid grid-cols-3 gap-2">
            {roles.map(r => (
              <button key={r.value} type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  role === r.value ? r.color : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className="text-2xl mb-1">{r.icon}</div>
                <div className={`text-xs font-bold ${role === r.value ? r.text : 'text-gray-600'}`}>
                  {r.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active role banner */}
        <div className={`${theme.light} ${theme.border} border rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2`}>
          <span className="text-lg">{theme.icon}</span>
          <div>
            <p className={`text-xs font-semibold ${theme.text}`}>Logging in as {theme.label}</p>
            <p className="text-xs text-gray-400">Dashboard will reflect your role permissions</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                role === 'admin'     ? 'focus:ring-purple-400' :
                role === 'principal' ? 'focus:ring-blue-400'   : 'focus:ring-green-400'
              }`}
              placeholder={
                role === 'admin'     ? 'admin@school.edu'     :
                role === 'principal' ? 'principal@school.edu' : 'teacher@school.edu'
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                role === 'admin'     ? 'focus:ring-purple-400' :
                role === 'principal' ? 'focus:ring-blue-400'   : 'focus:ring-green-400'
              }`}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full ${theme.button} text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50`}>
            {loading ? '⏳ Signing in...' : `${theme.icon} Sign In as ${theme.label}`}
          </button>
        </form>
        {/* ← form closes here */}

        {/* Role permission hints */}
        <div className="mt-4 grid grid-cols-3 gap-1 text-center">
          <div className="bg-purple-50 rounded-lg p-2">
            <p className="text-xs text-purple-600 font-medium">👑 Admin</p>
            <p className="text-xs text-gray-400">All access</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-xs text-green-600 font-medium">🎓 Teacher</p>
            <p className="text-xs text-gray-400">Mark only</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-xs text-blue-600 font-medium">🏫 Principal</p>
            <p className="text-xs text-gray-400">View only</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Smart Education Initiative · Problem ID: 25012
        </p>

      </div>
    </div>
  );
}