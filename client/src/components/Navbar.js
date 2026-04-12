import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, theme } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { 
    logout(); 
    navigate('/login'); 
  };

  const allNavLinks = [
    { path: '/', label: '🏠 Dashboard', roles: ['admin', 'teacher', 'principal'] },
    { path: '/students', label: '👨‍🎓 Students', roles: ['admin'] },
    { path: '/attendance', label: '✅ Attendance', roles: ['admin', 'teacher'] },
    { path: '/reports', label: '📊 Reports', roles: ['admin', 'teacher', 'principal'] },
  ];

  const navLinks = allNavLinks.filter(link => link.roles.includes(user?.role));

  return (
    <nav className={`${theme.nav} px-6 py-3 flex items-center justify-between shadow-sm`}>
      
      {/* LEFT SIDE */}
      <div className="flex items-center gap-6">
        <span className="font-bold text-white text-lg">🏫 AttendanceAI</span>

        <div className="flex gap-1">
          {navLinks.map(link => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === link.path
                  ? 'bg-white bg-opacity-20 text-white font-medium'
                  : 'text-white text-opacity-75 hover:bg-white hover:bg-opacity-10'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-3">
        
        {/* Role badge */}
        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-20 text-white font-medium">
          {theme.icon} {theme.label}
        </span>

        {/* ✅ CLICKABLE PROFILE NAME */}
        <Link 
          to="/profile"
          className="text-sm text-white opacity-90 hover:opacity-100 hover:underline cursor-pointer"
        >
          👤 {user?.name}
        </Link>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="text-sm text-white opacity-75 hover:opacity-100 transition-opacity border border-white border-opacity-30 px-3 py-1 rounded-lg"
        >
          Logout
        </button>

      </div>
    </nav>
  );
}