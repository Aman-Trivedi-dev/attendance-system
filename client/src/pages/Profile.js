import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Profile() {
  const { user, login, logout, theme } = useAuth();
  const navigate = useNavigate();

  // Name form
  const [name,        setName]        = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg,     setNameMsg]     = useState(null);

  // Email form
  const [newEmail,      setNewEmail]      = useState(user?.email || '');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [emailMsg,      setEmailMsg]      = useState(null);

  // Password form
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [pwdLoading,  setPwdLoading]  = useState(false);
  const [pwdMsg,      setPwdMsg]      = useState(null);
  const [showPwd,     setShowPwd]     = useState(false);

  const roleColors = {
    admin:     { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👑' },
    teacher:   { bg: 'bg-green-100',  text: 'text-green-700',  icon: '🎓' },
    principal: { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: '🏫' },
  };
  const roleStyle = roleColors[user?.role] || roleColors.teacher;

  // Update name
  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setNameLoading(true);
    setNameMsg(null);
    try {
      const { data } = await API.put('/auth/update-name', { name });
      login(data); // refresh user in context
      setNameMsg({ type: 'success', text: '✅ Name updated successfully!' });
    } catch (err) {
      setNameMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update name' });
    } finally {
      setNameLoading(false);
    }
  };

  // Update email
  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const { data } = await API.put('/auth/update-email', {
        email:    newEmail,
        password: emailPassword,
      });
      login(data); // refresh token + email
      setEmailPassword('');
      setEmailMsg({ type: 'success', text: '✅ Email updated! Please use new email to login next time.' });
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update email' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Update password
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      await API.put('/auth/update-password', {
        currentPassword: currentPwd,
        newPassword:     newPwd,
      });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdMsg({ type: 'success', text: '✅ Password updated successfully!' });
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const passwordStrength = (pwd) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6)  return { label: 'Weak',   color: 'bg-red-500',    width: '25%'  };
    if (pwd.length < 8)  return { label: 'Fair',   color: 'bg-amber-500',  width: '50%'  };
    if (pwd.length < 10) return { label: 'Good',   color: 'bg-blue-500',   width: '75%'  };
    return               { label: 'Strong', color: 'bg-green-500',  width: '100%' };
  };
  const strength = passwordStrength(newPwd);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Profile header card */}
        <div className={`bg-white rounded-2xl border border-gray-200 p-6`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${roleStyle.bg} flex items-center justify-center text-3xl`}>
              {roleStyle.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{user?.name}</h1>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-3 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
            <button onClick={handleLogout}
              className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
              Logout
            </button>
          </div>
        </div>

        {/* Update Name */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">👤 Update Name</h2>
          <p className="text-xs text-gray-500 mb-4">Change your display name across the system</p>

          {nameMsg && (
            <div className={`rounded-lg p-3 mb-4 text-sm ${
              nameMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>{nameMsg.text}</div>
          )}

          <form onSubmit={handleNameUpdate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Your full name"
                required
              />
            </div>
            <button type="submit" disabled={nameLoading || name === user?.name}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {nameLoading ? '⏳ Updating...' : 'Update Name'}
            </button>
          </form>
        </div>

        {/* Update Email */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">✉️ Update Email</h2>
          <p className="text-xs text-gray-500 mb-4">Enter your current password to confirm email change</p>

          {emailMsg && (
            <div className={`rounded-lg p-3 mb-4 text-sm ${
              emailMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>{emailMsg.text}</div>
          )}

          <form onSubmit={handleEmailUpdate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="new@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password (to confirm)</label>
              <input
                type="password"
                value={emailPassword}
                onChange={e => setEmailPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter current password"
                required
              />
            </div>
            <button type="submit" disabled={emailLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {emailLoading ? '⏳ Updating...' : 'Update Email'}
            </button>
          </form>
        </div>

        {/* Update Password */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">🔐 Update Password</h2>
            <button onClick={() => setShowPwd(!showPwd)}
              className="text-xs text-gray-500 hover:text-gray-700">
              {showPwd ? '👁️ Hide' : '👁️ Show'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-4">Use a strong password with at least 8 characters</p>

          {pwdMsg && (
            <div className={`rounded-lg p-3 mb-4 text-sm ${
              pwdMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>{pwdMsg.text}</div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Current password"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="New password (min 6 chars)"
                required
              />
              {/* Password strength bar */}
              {strength && (
                <div className="mt-1.5">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${strength.color}`}
                      style={{ width: strength.width }}/>
                  </div>
                  <p className={`text-xs mt-0.5 font-medium ${
                    strength.label === 'Weak'   ? 'text-red-600'   :
                    strength.label === 'Fair'   ? 'text-amber-600' :
                    strength.label === 'Good'   ? 'text-blue-600'  : 'text-green-600'
                  }`}>{strength.label} password</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
                  confirmPwd && confirmPwd !== newPwd
                    ? 'border-red-300 bg-red-50'
                    : confirmPwd && confirmPwd === newPwd
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
                required
              />
              {confirmPwd && confirmPwd !== newPwd && (
                <p className="text-xs text-red-600 mt-0.5">Passwords do not match</p>
              )}
              {confirmPwd && confirmPwd === newPwd && (
                <p className="text-xs text-green-600 mt-0.5">✅ Passwords match</p>
              )}
            </div>
            <button type="submit" disabled={pwdLoading || (confirmPwd && confirmPwd !== newPwd)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {pwdLoading ? '⏳ Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="font-semibold text-red-700 mb-1">⚠️ Account Actions</h2>
          <p className="text-xs text-gray-500 mb-4">Manage your session</p>
          <button onClick={handleLogout}
            className="w-full border-2 border-red-300 hover:bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            🚪 Logout from all devices
          </button>
        </div>

      </div>
    </div>
  );
}