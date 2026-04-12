import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

const weeklyData = [
  { day: 'Mon',  present: 42, absent: 8  },
  { day: 'Tue',  present: 38, absent: 12 },
  { day: 'Wed',  present: 45, absent: 5  },
  { day: 'Thu',  present: 40, absent: 10 },
  { day: 'Fri',  present: 35, absent: 15 },
  { day: 'Sat',  present: 30, absent: 5  },
  { day: 'Today',present: 44, absent: 6  },
];

const classData = [
  { name: 'Class 6',  present: 18, absent: 2 },
  { name: 'Class 7',  present: 22, absent: 3 },
  { name: 'Class 8',  present: 19, absent: 6 },
  { name: 'Class 9',  present: 15, absent: 5 },
  { name: 'Class 10', present: 20, absent: 2 },
];

const todayPie = [
  { name: 'Present', value: 44 },
  { name: 'Absent',  value: 6  },
];
const PIE_COLORS = ['#16a34a', '#ef4444'];

const CLASS_PATTERNS = [
  {
    id: 'c6', presentId: 'c6p', absentId: 'c6a', label: 'Class 6',
    presentPattern: (
      <pattern id="c6p" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <rect width="4" height="8" fill="#16a34a"/>
        <rect x="4" width="4" height="8" fill="#bbf7d0"/>
      </pattern>
    ),
    absentPattern: (
      <pattern id="c6a" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <rect width="4" height="8" fill="#ef4444"/>
        <rect x="4" width="4" height="8" fill="#fecaca"/>
      </pattern>
    ),
  },
  {
    id: 'c7', presentId: 'c7p', absentId: 'c7a', label: 'Class 7',
    presentPattern: (
      <pattern id="c7p" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#15803d"/>
        <circle cx="4" cy="4" r="2" fill="#4ade80"/>
      </pattern>
    ),
    absentPattern: (
      <pattern id="c7a" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#dc2626"/>
        <circle cx="4" cy="4" r="2" fill="#fca5a5"/>
      </pattern>
    ),
  },
  {
    id: 'c8', presentId: 'c8p', absentId: 'c8a', label: 'Class 8',
    presentPattern: (
      <pattern id="c8p" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#166534"/>
        <line x1="0" y1="4" x2="8" y2="4" stroke="#86efac" strokeWidth="2"/>
      </pattern>
    ),
    absentPattern: (
      <pattern id="c8a" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#b91c1c"/>
        <line x1="0" y1="4" x2="8" y2="4" stroke="#fca5a5" strokeWidth="2"/>
      </pattern>
    ),
  },
  {
    id: 'c9', presentId: 'c9p', absentId: 'c9a', label: 'Class 9',
    presentPattern: (
      <pattern id="c9p" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#14532d"/>
        <rect width="4" height="4" fill="#4ade80"/>
        <rect x="4" y="4" width="4" height="4" fill="#4ade80"/>
      </pattern>
    ),
    absentPattern: (
      <pattern id="c9a" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#991b1b"/>
        <rect width="4" height="4" fill="#f87171"/>
        <rect x="4" y="4" width="4" height="4" fill="#f87171"/>
      </pattern>
    ),
  },
  {
    id: 'c10', presentId: 'c10p', absentId: 'c10a', label: 'Class 10',
    presentPattern: (
      <pattern id="c10p" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#16a34a"/>
        <line x1="0" y1="0" x2="8" y2="8" stroke="#bbf7d0" strokeWidth="1.5"/>
        <line x1="8" y1="0" x2="0" y2="8" stroke="#bbf7d0" strokeWidth="1.5"/>
      </pattern>
    ),
    absentPattern: (
      <pattern id="c10a" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect width="8" height="8" fill="#ef4444"/>
        <line x1="0" y1="0" x2="8" y2="8" stroke="#fecaca" strokeWidth="1.5"/>
        <line x1="8" y1="0" x2="0" y2="8" stroke="#fecaca" strokeWidth="1.5"/>
      </pattern>
    ),
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PatternLegend = () => (
  <div className="flex flex-wrap gap-3 mt-3">
    {CLASS_PATTERNS.map((cp) => (
      <div key={cp.id} className="flex items-center gap-1.5">
        <svg width="16" height="16" className="rounded">
          <defs>{cp.presentPattern}</defs>
          <rect width="16" height="16" fill={`url(#${cp.presentId})`} rx="3"/>
        </svg>
        <span className="text-xs text-gray-600">{cp.label}</span>
      </div>
    ))}
    <div className="flex items-center gap-1.5 ml-2">
      <div className="w-4 h-4 rounded" style={{ background: 'repeating-linear-gradient(45deg,#ef4444,#ef4444 2px,#fecaca 2px,#fecaca 6px)' }}/>
      <span className="text-xs text-gray-500">= Absent variant</span>
    </div>
  </div>
);

export default function Dashboard() {
  const { user, theme } = useAuth();
  const [activeClass, setActiveClass] = useState('All');

  const totalStudents  = 50;
  const todayPresent   = 44;
  const todayAbsent    = 6;
  const attendanceRate = Math.round((todayPresent / totalStudents) * 100);

  const presentAvg = Math.round(weeklyData.reduce((s, d) => s + d.present, 0) / weeklyData.length);
  const absentAvg  = Math.round(weeklyData.reduce((s, d) => s + d.absent,  0) / weeklyData.length);

  const stats = [
    { label: 'Total Students',  value: totalStudents,        icon: '👨‍🎓', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    { label: "Today's Present", value: todayPresent,         icon: '✅',   bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
    { label: "Today's Absent",  value: todayAbsent,          icon: '❌',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: '📊',   bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  ];

  const allQuickActions = [
    { label: 'Mark Attendance', desc: 'Face recognition or manual', path: '/attendance', icon: '📸', color: 'bg-green-600',  roles: ['admin', 'teacher']             },
    { label: 'Add Student',     desc: 'Register a new student',     path: '/students',   icon: '➕', color: 'bg-blue-600',   roles: ['admin']                        },
    { label: 'View Reports',    desc: 'Export attendance records',   path: '/reports',    icon: '📄', color: 'bg-purple-600', roles: ['admin', 'teacher', 'principal'] },
    { label: 'Analytics',       desc: 'School-wide attendance data', path: '/reports',    icon: '📊', color: 'bg-blue-700',   roles: ['principal', 'admin']            },
  ];

  const quickActions = allQuickActions.filter(a => a.roles.includes(user?.role));
  const classes = ['All', '6', '7', '8', '9', '10'];

  const filteredClassData = activeClass === 'All'
    ? classData
    : classData.filter(d => d.name === `Class ${activeClass}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Good morning, {user?.name} 👋</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
            🟢 System Active
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
              <div className={`text-xs font-medium mt-1 ${s.text} opacity-75`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Weekly Bar Chart — Growth Style */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800">Weekly Attendance</h2>
                <p className="text-xs text-gray-500">Present vs Absent — last 7 days</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gray-400 inline-block"/>Absent
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={weeklyData}
                barGap={4}
                barCategoryGap="25%"
                margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />}/>

                {/* Present bars with value labels */}
                <Bar
                  dataKey="present"
                  name="Present"
                  radius={[6,6,0,0]}
                  label={{
                    position: 'top',
                    fontSize: 10,
                    fontWeight: 600,
                    fill: '#16a34a',
                    formatter: (v) => `+${v}`,
                  }}
                >
                  {weeklyData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={index === weeklyData.length - 1 ? '#00c49f' : theme.chartColor}
                      opacity={index === weeklyData.length - 1 ? 1 : 0.7}
                    />
                  ))}
                </Bar>

                {/* Absent bars with value labels */}
                <Bar
                  dataKey="absent"
                  name="Absent"
                  radius={[6,6,0,0]}
                  label={{
                    position: 'top',
                    fontSize: 10,
                    fontWeight: 600,
                    fill: '#6b7280',
                    formatter: (v) => `-${v}`,
                  }}
                >
                  {weeklyData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={index === weeklyData.length - 1 ? '#374151' : '#9ca3af'}
                      opacity={index === weeklyData.length - 1 ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Growth summary panel — like Image 1 */}
            <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-green-600">{attendanceRate}%</div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">This Week</p>
                  <p className="text-xs text-gray-400">Attendance rate</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>
                  <span className="text-gray-600">Present avg: <strong className="text-green-700">{presentAvg}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-gray-400 inline-block"/>
                  <span className="text-gray-600">Absent avg: <strong className="text-red-600">{absentAvg}</strong></span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-600 font-bold text-lg">↗ +12%</div>
                <div className="text-xs text-gray-400">vs last week</div>
              </div>
            </div>
          </div>

          {/* Today's Overview — Pie Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
            <div className="mb-2">
              <h2 className="font-semibold text-gray-800">Today's Overview</h2>
              <p className="text-xs text-gray-500">Present vs Absent ratio</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={todayPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {todayPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]}/>
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color, fontSize: 12, fontWeight: 500 }}>
                        {value}: {entry.payload.value}
                      </span>
                    )}
                  />
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-green-50 rounded-xl p-2 text-center">
                <div className="text-lg font-bold text-green-700">{todayPresent}</div>
                <div className="text-xs text-green-600">Present</div>
              </div>
              <div className="bg-red-50 rounded-xl p-2 text-center">
                <div className="text-lg font-bold text-red-700">{todayAbsent}</div>
                <div className="text-xs text-red-600">Absent</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-2 text-center">
                <div className="text-lg font-bold text-purple-700">{attendanceRate}%</div>
                <div className="text-xs text-purple-600">Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Class-wise bar chart with patterns */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-semibold text-gray-800">Class-wise Attendance</h2>
              <p className="text-xs text-gray-500">Today's breakdown — each class has a unique pattern</p>
            </div>
            <div className="flex gap-1">
              {classes.map(c => (
                <button key={c} onClick={() => setActiveClass(c)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeClass === c
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {c === 'All' ? 'All' : `Class ${c}`}
                </button>
              ))}
            </div>
          </div>

          <PatternLegend />

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredClassData} barGap={4} barCategoryGap="30%">
              <defs>
                {CLASS_PATTERNS.map(cp => (
                  <g key={cp.id}>
                    {cp.presentPattern}
                    {cp.absentPattern}
                  </g>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="present" name="Present" radius={[6,6,0,0]}>
                {filteredClassData.map((entry) => {
                  const p = CLASS_PATTERNS.find(cp => cp.label === entry.name);
                  return <Cell key={entry.name} fill={p ? `url(#${p.presentId})` : '#16a34a'}/>;
                })}
              </Bar>
              <Bar dataKey="absent" name="Absent" radius={[6,6,0,0]}>
                {filteredClassData.map((entry) => {
                  const p = CLASS_PATTERNS.find(cp => cp.label === entry.name);
                  return <Cell key={entry.name} fill={p ? `url(#${p.absentId})` : '#f87171'}/>;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link key={action.path + action.label} to={action.path}>
                <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white text-xl mb-3`}>
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-gray-800">{action.label}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}