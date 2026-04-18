import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Users, AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000');

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState({});
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    socket.on('admin_dashboard_update', (data) => {
      setWorkers(prev => ({ ...prev, [data.userId._id]: data }));
    });

    socket.on('emergency_alert', (alert) => {
      setAlerts(prev => [alert, ...prev]);
    });

    return () => {
      socket.off('admin_dashboard_update');
      socket.off('emergency_alert');
    };
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const activeWorkersList = Object.values(workers);

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-neonGreen animate-pulse"></div>
          <h1 className="text-2xl font-bold tracking-widest">Safe<span className="text-neonBlue">X</span> Central Command</h1>
        </div>
        <button onClick={logout} className="text-neonRed hover:text-white flex items-center gap-2">
          <LogOut size={18} /> Disconnect
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workers List */}
        <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden border border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <Users className="text-neonBlue" />
            <h2 className="font-semibold text-lg">Active Field Personnel</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-textMuted uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Heart Rate</th>
                <th className="px-6 py-4">Body Temp</th>
                <th className="px-6 py-4">Methane</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeWorkersList.map(w => (
                <tr key={w.userId._id} className="hover:bg-white/5">
                  <td className="px-6 py-4 font-medium">{w.userId.fullName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${w.condition === 'Safe' ? 'bg-neonGreen/10 text-neonGreen' : 'bg-neonRed/10 text-neonRed animate-pulse'}`}>
                      {w.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4">{Math.round(w.heartRate)} BPM</td>
                  <td className="px-6 py-4">{w.bodyTemp} °C</td>
                  <td className="px-6 py-4">{w.gasMethane}%</td>
                </tr>
              ))}
              {activeWorkersList.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-textMuted">No personnel currently transmitting.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Live Alerts Panel */}
        <div className="glass-panel rounded-xl overflow-hidden border border-white/10 flex flex-col h-full">
          <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-neonRed/10">
            <AlertTriangle className="text-neonRed" />
            <h2 className="font-semibold text-lg text-neonRed">Emergency Uplink</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="bg-neonRed/20 border border-neonRed/50 p-3 rounded-lg text-sm">
                <div className="font-bold text-white mb-1">{alert.type} ALERT</div>
                <div className="text-red-200">{alert.message}</div>
                <div className="text-xs text-red-400 mt-2">{new Date().toLocaleTimeString()}</div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center text-textMuted py-8">Monitoring active. No critical alerts.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
