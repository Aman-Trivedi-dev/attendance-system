import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const ROLE_THEMES = {
  admin: {
    primary:    'bg-purple-600',
    light:      'bg-purple-50',
    text:       'text-purple-700',
    border:     'border-purple-200',
    nav:        'bg-purple-700',
    navText:    'text-purple-100',
    active:     'bg-purple-500 text-white',
    badge:      'bg-purple-100 text-purple-700',
    button:     'bg-purple-600 hover:bg-purple-700',
    gradient:   'from-purple-50 to-indigo-50',
    icon:       '👑',
    label:      'Administrator',
    chartColor: '#7c3aed',
  },
  teacher: {
    primary:    'bg-green-600',
    light:      'bg-green-50',
    text:       'text-green-700',
    border:     'border-green-200',
    nav:        'bg-green-700',
    navText:    'text-green-100',
    active:     'bg-green-500 text-white',
    badge:      'bg-green-100 text-green-700',
    button:     'bg-green-600 hover:bg-green-700',
    gradient:   'from-green-50 to-teal-50',
    icon:       '🎓',
    label:      'Teacher',
    chartColor: '#16a34a',
  },
  principal: {
    primary:    'bg-blue-600',
    light:      'bg-blue-50',
    text:       'text-blue-700',
    border:     'border-blue-200',
    nav:        'bg-blue-700',
    navText:    'text-blue-100',
    active:     'bg-blue-500 text-white',
    badge:      'bg-blue-100 text-blue-700',
    button:     'bg-blue-600 hover:bg-blue-700',
    gradient:   'from-blue-50 to-cyan-50',
    icon:       '🏫',
    label:      'Principal',
    chartColor: '#2563eb',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const theme = ROLE_THEMES[user?.role] || ROLE_THEMES.teacher;

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, theme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);