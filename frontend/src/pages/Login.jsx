import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GraduationCap, ArrowRight, ChevronDown, ChevronUp, Shield, Users, UserCheck } from 'lucide-react';

const ROLE_ROUTES = { STUDENT: '/student', STAFF: '/staff', ADMIN: '/admin' };

const ROLE_CREDENTIALS = [
  {
    role: 'Student',
    color: 'blue',
    icon: Users,
    bgClass: 'bg-blue-50 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700',
    accounts: [
      { name: 'Alice Smith', email: 'alice@campus.edu' },
      { name: 'Bob Jones', email: 'bob@campus.edu' },
      { name: 'Charlie Brown', email: 'charlie@campus.edu' },
      { name: 'David Miller', email: 'david@campus.edu' },
      { name: 'Emma Watson', email: 'emma@campus.edu' },
    ],
  },
  {
    role: 'Staff',
    color: 'emerald',
    icon: UserCheck,
    bgClass: 'bg-emerald-50 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    accounts: [
      { name: 'Sarah Staff', email: 'staff@campus.edu' },
    ],
  },
  {
    role: 'Admin',
    color: 'purple',
    icon: Shield,
    bgClass: 'bg-purple-50 border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-700',
    accounts: [
      { name: 'Admin User', email: 'admin@campus.edu' },
    ],
  },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Pre-warm backend container immediately on mount so login is fast
    api.get('/categories').catch(() => {});
  }, []);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setSlowLoading(true), 2500);
    } else {
      setSlowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_ROUTES[user.role] || '/login');
    } catch (err) {
      setError('Invalid email or password. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-md">

        {/* Campus Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg mb-4">
            <GraduationCap size={38} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Smart Campus</h1>
          <p className="text-base font-semibold text-blue-700 mt-0.5">Lost &amp; Found Recovery System</p>
          <p className="text-xs text-slate-500 mt-1">Role-Based Access · Automated AI Matching · Secure Handover Protocol</p>
        </div>

        {/* Login Form Box */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-7 mb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Sign In to Your Portal</h2>
          <p className="text-xs text-slate-400 mb-5">Enter your campus credentials to access the system</p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@campus.edu"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>

            {loading && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs text-blue-700 font-medium flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                <span>
                  {slowLoading
                    ? '⚡ Server initializing (cloud free tier) — please hold on for a moment...'
                    : 'Connecting to secure cloud server...'}
                </span>
              </div>
            )}
          </form>
        </div>

        {/* System Demo Credentials Accordion */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCredentials(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Shield size={16} className="text-slate-500" />
              <span>System Demo Credentials</span>
              <span className="text-xs font-normal text-slate-400">
                — All passwords: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">password123</code>
              </span>
            </div>
            {showCredentials ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
          </button>

          {showCredentials && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
              {ROLE_CREDENTIALS.map(group => {
                const Icon = group.icon;
                return (
                  <div key={group.role} className={`rounded-xl border p-3.5 ${group.bgClass}`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon size={14} />
                      <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${group.badgeClass}`}>
                        {group.role} Portal
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {group.accounts.map(acc => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => {
                            setEmail(acc.email);
                            setPassword('password123');
                          }}
                          className="w-full text-left flex items-center justify-between bg-white/70 hover:bg-white border border-white/80 rounded-lg px-3 py-2 transition group"
                          title="Click to fill credentials into the form above"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{acc.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{acc.email}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 group-hover:text-blue-600 transition font-medium">
                            Fill →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400 text-center pt-1">
                Click any account to auto-fill credentials above, then press Sign In
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-5">
          Smart Campus Lost &amp; Found System · Secure JWT Authentication · TiDB Cloud
        </p>
      </div>
    </div>
  );
}
