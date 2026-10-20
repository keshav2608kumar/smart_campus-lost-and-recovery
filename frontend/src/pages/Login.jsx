import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Shield, UserCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

const DEMO_USERS = {
  students: [
    {
      id: 1,
      name: 'Alice Smith',
      tag: 'Demo Student 1 (Item Reporter)',
      email: 'alice@campus.edu',
      password: 'password123',
      regNo: 'STU-2024-001',
      role: 'STUDENT',
      color: 'blue',
      hint: 'Use Alice to report a lost laptop or wallet'
    },
    {
      id: 2,
      name: 'Bob Jones',
      tag: 'Demo Student 2 (Item Finder)',
      email: 'bob@campus.edu',
      password: 'password123',
      regNo: 'STU-2024-002',
      role: 'STUDENT',
      color: 'blue',
      hint: 'Use Bob to report finding that item'
    },
    {
      id: 3,
      name: 'Charlie Brown',
      tag: 'Demo Student 3',
      email: 'charlie@campus.edu',
      password: 'password123',
      regNo: 'STU-2024-003',
      role: 'STUDENT',
      color: 'blue',
      hint: 'Independent student account'
    },
    {
      id: 4,
      name: 'David Miller',
      tag: 'Demo Student 4',
      email: 'david@campus.edu',
      password: 'password123',
      regNo: 'STU-2024-004',
      role: 'STUDENT',
      color: 'blue',
      hint: 'Independent student account'
    },
    {
      id: 5,
      name: 'Emma Watson',
      tag: 'Demo Student 5',
      email: 'emma@campus.edu',
      password: 'password123',
      regNo: 'STU-2024-005',
      role: 'STUDENT',
      color: 'blue',
      hint: 'Independent student account'
    },
  ],
  staff: [
    {
      id: 6,
      name: 'Sarah Staff',
      tag: 'Campus Property & Safety Officer',
      email: 'staff@campus.edu',
      password: 'password123',
      regNo: 'STAFF-OFFICE-01',
      role: 'STAFF',
      color: 'green',
      hint: 'Verifies claims and conducts atomic handovers'
    }
  ],
  admin: [
    {
      id: 7,
      name: 'Admin User',
      tag: 'System Superadministrator',
      email: 'admin@campus.edu',
      password: 'password123',
      regNo: 'ADM-SUPER-01',
      role: 'ADMIN',
      color: 'purple',
      hint: 'Monitors KPIs, recovery rate, and user directory'
    }
  ]
};

const ROLE_ROUTES = { STUDENT: '/student', STAFF: '/staff', ADMIN: '/admin' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'staff', 'admin'
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_ROUTES[user.role] || '/login');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginUser = async (userObj) => {
    setEmail(userObj.email);
    setPassword(userObj.password);
    setError('');
    setLoading(true);
    try {
      const user = await login(userObj.email, userObj.password);
      navigate(ROLE_ROUTES[user.role] || '/login');
    } catch (err) {
      setError('Failed to authenticate. Server may be initializing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-2xl">
        
        {/* Campus Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg mb-3">
            <GraduationCap size={36} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Smart Campus Recovery System</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated Lost & Found Engine with Role-Based Access Control
          </p>
        </div>

        {/* Login Form Box */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-8 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-slate-800">Sign in to your Portal</h2>
            <span className="text-xs text-slate-400">MySQL 8.x • JWT Authentication</span>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg mb-4 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Address</label>
              <input
                type="email"
                placeholder="name@campus.edu"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-2 text-sm"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Multi-Student & Multi-Role Demo Switcher */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Teacher & Evaluation Demo Hub</p>
              <p className="text-xs text-slate-400">Click any user card below to test multi-student workflows instantly</p>
            </div>
            
            {/* Category Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'students' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Students (5)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'staff' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Staff (1)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Admin (1)
              </button>
            </div>
          </div>

          {/* Demonstration Workflow Guide Banner */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
            <strong>💡 Teacher Demonstration Workflow:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-0.5 text-blue-800">
              <li>Log in as <strong>Alice Smith (Student 1)</strong> → Report a lost item (e.g. Silver Laptop).</li>
              <li>Log out, then log in as <strong>Bob Jones (Student 2)</strong> → Report finding that same item.</li>
              <li>Log back in as <strong>Alice</strong> → Click <em>"Find Matches ⚡"</em> → See Bob's item scored and submit claim.</li>
              <li>Log in as <strong>Sarah Staff</strong> → Review pending claim and approve handover!</li>
            </ol>
          </div>

          {/* User Cards List */}
          <div className="space-y-2.5">
            {DEMO_USERS[activeTab].map(userObj => (
              <div
                key={userObj.email}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 transition gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                    userObj.role === 'ADMIN' ? 'bg-purple-600' : userObj.role === 'STAFF' ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}>
                    {userObj.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">{userObj.name}</span>
                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {userObj.regNo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{userObj.email}</p>
                    <p className="text-[11px] text-blue-700 font-medium mt-0.5">{userObj.tag}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(userObj.email);
                      setPassword(userObj.password);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    title="Fill input fields"
                  >
                    Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => quickLoginUser(userObj)}
                    className={`px-3.5 py-1.5 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1 ${
                      userObj.role === 'ADMIN' ? 'bg-purple-600 hover:bg-purple-700' :
                      userObj.role === 'STAFF' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <span>Instant Login</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
