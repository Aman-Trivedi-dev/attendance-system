import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: '📸', title: 'Face Recognition', desc: 'AI-powered attendance using real-time face detection with 93%+ accuracy' },
    { icon: '👁️', title: 'Liveness Detection', desc: 'Eye blink & motion detection prevents spoofing and fake images' },
    { icon: '📊', title: 'Smart Reports', desc: 'Daily & monthly attendance reports with CSV export and analytics' },
    { icon: '🔐', title: 'Role-Based Access', desc: 'Separate dashboards for Admin, Teacher and Principal' },
    { icon: '☁️', title: 'Cloud Storage', desc: 'All data securely stored in MongoDB Atlas — accessible anywhere' },
    { icon: '📱', title: 'Works Everywhere', desc: 'Responsive design works on mobile, tablet and desktop' },
  ];

  const stats = [
    { value: '93%+', label: 'Face Detection Accuracy' },
    { value: '80%',  label: 'Time Saved vs Manual'   },
    { value: '3',    label: 'Role Types Supported'   },
    { value: '100%', label: 'Browser Based AI'       },
  ];

  const steps = [
    { step: '01', title: 'Register Students',    desc: 'Add students and capture their face ID using the camera',      icon: '👤' },
    { step: '02', title: 'Mark Attendance',       desc: 'Camera auto-identifies students and marks them present',        icon: '📸' },
    { step: '03', title: 'View Reports',          desc: 'Access daily/monthly reports and export to CSV instantly',      icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏫</span>
          <span className="font-bold text-gray-800 text-lg">AttendanceAI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            SIH 2025 · Problem #25012
          </span>
          <button
            onClick={() => navigate('/login')}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
            Login →
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-6 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
            🚀 Smart Education Initiative · Punjab Government
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Automated Attendance
            <span className="text-green-600"> for Rural Schools</span>
          </h1>
          <p className="text-gray-500 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            AI-powered face recognition attendance system that saves teachers 80% of their time.
            Built for under-resourced schools with minimal infrastructure requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:-translate-y-0.5">
              🚀 Get Started Free
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-gray-200 hover:border-green-400 text-gray-600 hover:text-green-700 px-8 py-3.5 rounded-xl font-semibold text-base transition-all">
              Learn More ↓
            </button>
          </div>
        </div>

        {/* Hero visual */}
        <div className="max-w-3xl mx-auto mt-14">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Mock browser bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"/>
              <div className="w-3 h-3 rounded-full bg-amber-400"/>
              <div className="w-3 h-3 rounded-full bg-green-400"/>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-5 flex items-center px-3">
                <span className="text-xs text-gray-500">attendance-system.vercel.app</span>
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Students', value: '50', color: 'bg-blue-50 text-blue-700'   },
                  { label: "Today's Present", value: '44', color: 'bg-green-50 text-green-700' },
                  { label: "Today's Absent",  value: '6',  color: 'bg-red-50 text-red-700'    },
                  { label: 'Attendance Rate', value: '88%', color: 'bg-purple-50 text-purple-700' },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs opacity-75 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                  <span className="text-xs font-medium text-gray-600">Face Recognition Active</span>
                </div>
                <div className="flex gap-2">
                  {['Rahul Kumar ✅','Priya Sharma ✅','Amit Singh ❌','Sneha Verma ✅'].map(s => (
                    <div key={s} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-green-600">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-green-200 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need</h2>
            <p className="text-gray-500">Powerful features built for rural school environments</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title}
                className="bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500">Three simple steps to automated attendance</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="text-center relative">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {s.icon}
                </div>
                <div className="text-xs font-bold text-green-600 mb-1">STEP {s.step}</div>
                <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full text-gray-300 text-2xl -translate-x-4">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for everyone</h2>
            <p className="text-gray-500">Role-based access for the entire school</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '👑', role: 'Administrator', color: 'purple', features: ['Full system access','Manage all students','View all reports','User management'] },
              { icon: '🎓', role: 'Teacher',       color: 'green',  features: ['Mark attendance','Face recognition scan','View class reports','Export CSV data'] },
              { icon: '🏫', role: 'Principal',     color: 'blue',   features: ['View all reports','School analytics','Monthly summaries','Read-only access'] },
            ].map(r => (
              <div key={r.role} className={`rounded-2xl border-2 p-6 ${
                r.color === 'purple' ? 'border-purple-200 bg-purple-50' :
                r.color === 'green'  ? 'border-green-200 bg-green-50'  :
                                       'border-blue-200 bg-blue-50'
              }`}>
                <div className="text-3xl mb-2">{r.icon}</div>
                <h3 className={`font-bold text-lg mb-4 ${
                  r.color === 'purple' ? 'text-purple-700' :
                  r.color === 'green'  ? 'text-green-700'  : 'text-blue-700'
                }`}>{r.role}</h3>
                <ul className="space-y-2">
                  {r.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-green-600 to-green-700 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to modernize attendance?
          </h2>
          <p className="text-green-100 mb-8 text-lg">
            Join the Smart Education Initiative and bring AI-powered attendance to rural schools.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-green-700 hover:bg-green-50 px-10 py-4 rounded-xl font-bold text-base transition-all hover:shadow-xl hover:-translate-y-0.5">
            🚀 Start Now — It's Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-xl">🏫</span>
          <span className="font-bold text-white">AttendanceAI</span>
        </div>
        <p className="text-sm mb-2">Smart Education Initiative · Government of Punjab</p>
        <p className="text-xs">SIH 2025 · Problem Statement ID: 25012 · Department of Higher Education</p>
        <div className="mt-4 flex justify-center gap-4 text-xs">
          <span>Built with React.js</span>
          <span>·</span>
          <span>Node.js</span>
          <span>·</span>
          <span>MongoDB</span>
          <span>·</span>
          <span>face-api.js</span>
        </div>
      </footer>

    </div>
  );
}