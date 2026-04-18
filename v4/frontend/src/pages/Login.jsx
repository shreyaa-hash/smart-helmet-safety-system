import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await axios.post(`${backendUrl}/api/auth/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/worker');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-darkBg">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neonBlue/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neonGreen/10 rounded-full blur-[100px]"></div>
      
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-panelBg border border-white/10 mb-4 shadow-[0_0_15px_rgba(0,209,255,0.5)]">
            <Shield className="w-8 h-8 text-neonBlue" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Safe<span className="text-neonBlue">X</span> Access</h1>
          <p className="text-textMuted mt-2 text-sm">Central Monitoring Authentication</p>
        </div>

        {error && (
          <div className="bg-neonRed/10 border border-neonRed text-neonRed text-sm p-3 rounded-lg text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-textMuted uppercase mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-neonBlue"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-textMuted uppercase mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-neonBlue"
              required 
            />
          </div>
          <button type="submit" className="w-full py-3 rounded-lg bg-neonBlue text-black font-bold hover:bg-white transition-all">
            INITIALIZE UPLINK
          </button>
        </form>
      </div>
    </div>
  );
}
