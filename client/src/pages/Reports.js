import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import API from '../api/axios';

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];

  const [date,          setDate]          = useState(today);
  const [selectedClass, setSelectedClass] = useState('All');
  const [records,       setRecords]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [stats,         setStats]         = useState({ present: 0, absent: 0, total: 0 });
  const [availDates,    setAvailDates]    = useState([]);
  const [activeTab,     setActiveTab]     = useState('daily'); // daily | monthly | summary
  const [monthlyData,   setMonthlyData]   = useState([]);
  const [monthlyLoading,setMonthlyLoading]= useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear,  setSelectedYear]  = useState(new Date().getFullYear());

  const classes = ['All','6A','6B','7A','7B','8A','8B','9A','9B','10A','10B'];

  // Fetch available dates
  useEffect(() => {
    API.get('/attendance/dates')
      .then(r => setAvailDates(r.data))
      .catch(() => {});
  }, []);

  // Fetch daily records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/attendance/date/${date}`;
      if (selectedClass !== 'All') url = `/attendance/date/${date}/class/${selectedClass}`;
      const { data } = await API.get(url);
      setRecords(data);
      const present = data.filter(r => r.status === 'present').length;
      const absent  = data.filter(r => r.status === 'absent').length;
      setStats({ present, absent, total: data.length });
    } catch {
      setRecords([]);
      setStats({ present: 0, absent: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [date, selectedClass]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Fetch monthly records
  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const { data } = await API.get(
        `/attendance/stats/monthly/${selectedYear}/${selectedMonth}`
      );
      // Group by date
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.date]) grouped[r.date] = { date: r.date, present: 0, absent: 0 };
        if (r.status === 'present') grouped[r.date].present++;
        else grouped[r.date].absent++;
      });
      setMonthlyData(Object.values(grouped).sort((a,b) => a.date.localeCompare(b.date)));
    } catch {
      setMonthlyData([]);
    } finally {
      setMonthlyLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab === 'monthly') fetchMonthly();
  }, [activeTab, fetchMonthly]);

  // Export CSV
  const exportCSV = () => {
    if (records.length === 0) return alert('No records to export!');
    const csv = [
      'Roll No,Name,Class,Date,Status,Method',
      ...records.map(r =>
        `${r.student?.rollNumber},${r.student?.name},${r.student?.class},${r.date},${r.status},${r.method || 'manual'}`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendance_${date}_${selectedClass}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export monthly CSV
  const exportMonthlyCSV = () => {
    if (monthlyData.length === 0) return alert('No records to export!');
    const csv = [
      'Date,Present,Absent,Total,Rate%',
      ...monthlyData.map(d => {
        const total = d.present + d.absent;
        const rate  = total > 0 ? Math.round((d.present/total)*100) : 0;
        return `${d.date},${d.present},${d.absent},${total},${rate}%`;
      })
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `monthly_report_${selectedYear}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Attendance Reports</h1>
            <p className="text-gray-500 text-sm">View, filter and export attendance records</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'daily' && (
              <button onClick={exportCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                ⬇ Export CSV
              </button>
            )}
            {activeTab === 'monthly' && (
              <button onClick={exportMonthlyCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                ⬇ Export Monthly CSV
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl mb-6 w-fit">
          {[
            { id: 'daily',   label: '📅 Daily'   },
            { id: 'monthly', label: '📆 Monthly'  },
            { id: 'summary', label: '📊 Summary'  },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── DAILY TAB ─── */}
        {activeTab === 'daily' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {classes.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>)}
                </select>
              </div>
              {/* Available dates hint */}
              {availDates.length > 0 && (
                <div className="text-xs text-gray-500">
                  <p className="font-medium mb-1">📋 Dates with records:</p>
                  <div className="flex flex-wrap gap-1">
                    {availDates.slice(0,5).map(d => (
                      <button key={d} onClick={() => setDate(d)}
                        className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${
                          date === d
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}>
                        {new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-green-700">{stats.present}</div>
                <div className="text-sm text-green-600 font-medium mt-1">✅ Present</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-red-700">{stats.absent}</div>
                <div className="text-sm text-red-600 font-medium mt-1">❌ Absent</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-700">{rate}%</div>
                <div className="text-sm text-purple-600 font-medium mt-1">📊 Rate</div>
              </div>
            </div>

            {/* Progress bar */}
            {stats.total > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Attendance rate for {new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</span>
                  <span>{stats.present}/{stats.total} students</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all duration-500 flex"
                    style={{ width: `${rate}%`, background: rate >= 75 ? '#16a34a' : rate >= 50 ? '#f59e0b' : '#ef4444' }}/>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className={rate >= 75 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}>
                    {rate >= 75 ? '✅ Good attendance' : rate >= 50 ? '⚠️ Average attendance' : '❌ Poor attendance'}
                  </span>
                  <span className="text-gray-400">{stats.absent} absent</span>
                </div>
              </div>
            )}

            {/* Records table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 text-sm">
                  Attendance Records
                  {records.length > 0 && <span className="ml-2 text-gray-400">({records.length})</span>}
                </h3>
                {records.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {stats.present} Present
                    </span>
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {stats.absent} Absent
                    </span>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-2xl animate-spin inline-block mb-2">⚙️</div>
                  <p className="text-gray-500 text-sm">Loading records...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 text-sm font-medium">No records for this date</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Mark attendance from the Attendance page first
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Roll No.</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Class</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, i) => (
                      <tr key={record._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-mono text-gray-600">
                          {record.student?.rollNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {record.student?.name?.charAt(0)}
                            </div>
                            {record.student?.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            {record.student?.class}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(record.date).toLocaleDateString('en-IN', {
                            day:'numeric', month:'short', year:'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.method === 'face'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {record.method === 'face' ? '📸 Face' : '✋ Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {record.status === 'present' ? '✅ Present' : '❌ Absent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ─── MONTHLY TAB ─── */}
        {activeTab === 'monthly' && (
          <>
            {/* Month/Year selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={fetchMonthly}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                🔄 Refresh
              </button>
            </div>

            {/* Monthly summary stats */}
            {monthlyData.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">
                    {monthlyData.reduce((s,d) => s + d.present, 0)}
                  </div>
                  <div className="text-sm text-green-600 font-medium mt-1">✅ Total Present</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-red-700">
                    {monthlyData.reduce((s,d) => s + d.absent, 0)}
                  </div>
                  <div className="text-sm text-red-600 font-medium mt-1">❌ Total Absent</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{monthlyData.length}</div>
                  <div className="text-sm text-blue-600 font-medium mt-1">📅 Working Days</div>
                </div>
              </div>
            )}

            {/* Monthly table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700 text-sm">
                  {months[selectedMonth-1]} {selectedYear} — Day-wise Summary
                </h3>
              </div>
              {monthlyLoading ? (
                <div className="text-center py-12">
                  <div className="text-2xl animate-spin inline-block mb-2">⚙️</div>
                  <p className="text-gray-500 text-sm">Loading monthly data...</p>
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 text-sm">No attendance records for this month</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Day</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Present</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Absent</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((d, i) => {
                      const total = d.present + d.absent;
                      const r     = total > 0 ? Math.round((d.present/total)*100) : 0;
                      return (
                        <tr key={d.date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(d.date).toLocaleDateString('en-IN', { weekday:'long' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              ✅ {d.present}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              ❌ {d.absent}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-medium">{total}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
                                <div className="h-1.5 rounded-full"
                                  style={{
                                    width: `${r}%`,
                                    background: r >= 75 ? '#16a34a' : r >= 50 ? '#f59e0b' : '#ef4444'
                                  }}/>
                              </div>
                              <span className={`text-xs font-semibold ${
                                r >= 75 ? 'text-green-700' : r >= 50 ? 'text-amber-600' : 'text-red-600'
                              }`}>{r}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ─── SUMMARY TAB ─── */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📊 Quick Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">
                    {availDates.length}
                  </div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Days with Records</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {availDates.length > 0
                      ? new Date(availDates[0]).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
                      : '—'}
                  </div>
                  <div className="text-xs text-green-600 font-medium mt-1">Latest Record</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-700">
                    {availDates.length > 0
                      ? new Date(availDates[availDates.length-1]).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
                      : '—'}
                  </div>
                  <div className="text-xs text-purple-600 font-medium mt-1">First Record</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-700">
                    {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                  </div>
                  <div className="text-xs text-amber-600 font-medium mt-1">Today</div>
                </div>
              </div>
            </div>

            {/* All dates list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700 text-sm">
                  All Dates with Attendance Records ({availDates.length})
                </h3>
              </div>
              {availDates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500 text-sm">No attendance records yet</p>
                  <p className="text-gray-400 text-xs mt-1">Go to Attendance page to mark attendance</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availDates.map(d => (
                    <button key={d}
                      onClick={() => { setDate(d); setActiveTab('daily'); }}
                      className="text-left border border-gray-200 rounded-xl p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(d).toLocaleDateString('en-IN', { weekday:'long' })}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Click to view →</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}