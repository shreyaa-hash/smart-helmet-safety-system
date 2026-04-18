import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, Thermometer, Wind, AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [data, setData] = useState({ heartRate: 80, bodyTemp: 37.0, gasMethane: 0.1, gasCO: 5, oxygen: 20.9 });

  useEffect(() => {
    // Simulate reading from local hardware/sensors
    const interval = setInterval(() => {
      const newData = {
        userId: user.id,
        heartRate: Math.max(60, Math.min(120, data.heartRate + (Math.random() * 4 - 2))),
        bodyTemp: +(37.0 + Math.random() * 0.5).toFixed(1),
        gasMethane: +(Math.random() * 0.3).toFixed(2),
        gasCO: Math.floor(Math.random() * 15),
        oxygen: 20.9
      };
      setData(newData);
      socket.emit('worker_telemetry', newData);
    }, 2000);
    return () => clearInterval(interval);
  }, [data.heartRate, user.id]);

  const handleSOS = () => {
    socket.emit('trigger_sos', { userId: user.id });
    alert('SOS Sent to Admin!');
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-8 glass-panel p-4 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold">Safe<span className="text-neonBlue">X</span> Personal HUD</h1>
          <p className="text-textMuted text-sm">Operator: {user?.fullName}</p>
        </div>
        <button onClick={logout} className="text-neonRed hover:text-white flex items-center gap-2">
          <LogOut size={18} /> Disconnect
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="glass-panel p-6 rounded-xl border-l-4 border-neonGreen">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-textMuted uppercase font-semibold">Heart Rate</p>
              <h2 className="text-3xl font-bold mt-2">{Math.round(data.heartRate)} <span className="text-sm">BPM</span></h2>
            </div>
            <Activity className="text-neonGreen" size={32} />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border-l-4 border-neonYellow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-textMuted uppercase font-semibold">Body Temp</p>
              <h2 className="text-3xl font-bold mt-2">{data.bodyTemp} <span className="text-sm">°C</span></h2>
            </div>
            <Thermometer className="text-neonYellow" size={32} />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border-l-4 border-neonBlue">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-textMuted uppercase font-semibold">Methane Gas</p>
              <h2 className="text-3xl font-bold mt-2">{data.gasMethane} <span className="text-sm">%</span></h2>
            </div>
            <Wind className="text-neonBlue" size={32} />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border-l-4 border-neonBlue">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-textMuted uppercase font-semibold">Carbon Monoxide</p>
              <h2 className="text-3xl font-bold mt-2">{data.gasCO} <span className="text-sm">ppm</span></h2>
            </div>
            <Wind className="text-neonBlue" size={32} />
          </div>
        </div>
      </div>

      <button onClick={handleSOS} className="w-full py-6 rounded-xl bg-neonRed/20 border-2 border-neonRed text-neonRed font-black text-2xl hover:bg-neonRed hover:text-white transition-all shadow-[0_0_20px_rgba(255,59,59,0.3)] flex items-center justify-center gap-4">
        <AlertTriangle size={32} /> INITIATE EMERGENCY SOS
      </button>
    </div>
  );
}
