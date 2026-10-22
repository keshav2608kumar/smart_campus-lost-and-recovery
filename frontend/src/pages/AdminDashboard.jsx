import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Users, TrendingUp, Search, Shield, Package,
  CheckCircle, XCircle, Clock, AlertCircle, PlusCircle,
  RefreshCw, Check, ArrowRight, UserPlus, Filter, MapPin, Tag,
  Lock, Unlock, Key, Copy
} from 'lucide-react';

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const [tab, setTab] = useState(0);

  // Data states
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [handoversList, setHandoversList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // User Filter & Search states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');

  // Item Filter states
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL');
  const [itemSearch, setItemSearch] = useState('');

  // Audit Log Filter states
  const [logActionFilter, setLogActionFilter] = useState('ALL');

  // Modal: Add New User
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('STUDENT');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [addUserSubmitting, setAddUserSubmitting] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [createdUserCredentials, setCreatedUserCredentials] = useState(null);

  // Modal: Reset User Password
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const TABS = [
    { label: 'System Overview', icon: TrendingUp },
    { label: `Users (${usersList.length || stats?.users?.total || 0})`, icon: Users },
    { label: 'Campus Inventory', icon: Package },
    { label: 'Handover Log', icon: CheckCircle },
    { label: 'Audit Trail', icon: Shield },
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [statsRes, usersRes, itemsRes, handoversRes, logsRes] = await Promise.all([
        api.get('/admin/stats').catch(e => ({ data: null })),
        api.get('/admin/users?limit=200').catch(e => ({ data: { users: [] } })),
        api.get('/admin/all-items').catch(e => ({ data: [] })),
        api.get('/admin/handovers').catch(e => ({ data: [] })),
        api.get('/admin/audit-logs?limit=100').catch(e => ({ data: [] })),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data?.users) setUsersList(usersRes.data.users);
      if (itemsRes.data) setItemsList(itemsRes.data);
      if (handoversRes.data) setHandoversList(handoversRes.data);
      if (logsRes.data) setLogsList(logsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setErrorMessage('Could not load some system data. Please check if the server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Toggle user active status
  const handleToggleUserStatus = async (userId, currentActive) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { is_active: !currentActive });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
      // Refresh stats in background
      api.get('/admin/stats').then(res => setStats(res.data)).catch(() => {});
    } catch (err) {
      alert('Error updating user status: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Change user role
  const handleChangeUserRole = async (userId, newRole) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      api.get('/admin/stats').then(res => setStats(res.data)).catch(() => {});
    } catch (err) {
      alert('Error changing user role: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Submit Add User form
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddUserSubmitting(true);
    setAddUserError('');
    try {
      const res = await api.post('/admin/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        phone: newUserPhone || null
      });

      // Add to current users state (with default activity counts for new user)
      setUsersList(prev => [{ ...res.data, lost_count: 0, found_count: 0, claims_count: 0, phone: res.data.phone || '—' }, ...prev]);
      setShowAddUserModal(false);
      setCreatedUserCredentials({
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
        password: newUserPassword,
        phone: res.data.phone || '—'
      });
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('STUDENT');
      setNewUserPhone('');
      // Refresh stats
      api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    } catch (err) {
      setAddUserError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setAddUserSubmitting(false);
    }
  };

  // Reset User Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordModalUser || !newPasswordVal) return;
    if (newPasswordVal.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    setResetPasswordSubmitting(true);
    try {
      await api.patch(`/admin/users/${resetPasswordModalUser.id}/reset-password`, {
        new_password: newPasswordVal
      });
      alert(`Password for ${resetPasswordModalUser.name} (${resetPasswordModalUser.email}) has been successfully updated!`);
      setResetPasswordModalUser(null);
      setNewPasswordVal('');
    } catch (err) {
      alert('Failed to reset password: ' + (err.response?.data?.detail || err.message));
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch));
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'ALL' ||
      (userStatusFilter === 'ACTIVE' && u.is_active) ||
      (userStatusFilter === 'INACTIVE' && !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered items
  const filteredItems = itemsList.filter(item => {
    const matchesType = itemTypeFilter === 'ALL' || item.type === itemTypeFilter;
    const matchesSearch = !itemSearch ||
      item.title.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.location.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.brand.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.color.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Filtered logs
  const filteredLogs = logsList.filter(log => {
    return logActionFilter === 'ALL' || log.action === logActionFilter;
  });

  const uniqueActions = ['ALL', ...new Set(logsList.map(l => l.action))];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Professional Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2.5 rounded-xl shadow-md">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">Smart Campus Administration</h1>
                  <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-500/30">
                    Admin Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400">Executive Lost & Found Governance & Inventory Control</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition"
                title="Refresh Live Data"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin text-purple-400' : ''} />
                <span>Sync Data</span>
              </button>

              <div className="h-6 w-px bg-slate-700 mx-1"></div>

              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">System Administrator</p>
                <p className="text-[10px] text-slate-400">Superuser ID #{user?.id || 5}</p>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-800/80 backdrop-blur px-4 sm:px-6 lg:px-8 border-t border-slate-700/60 flex overflow-x-auto gap-2">
          {TABS.map((t, i) => {
            const Icon = t.icon;
            const isActive = tab === i;
            return (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 shadow-sm">
            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <RefreshCw className="animate-spin text-purple-600 mb-3" size={36} />
            <p className="text-sm font-semibold">Aggregating live campus data and metrics...</p>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* --- TAB 0: SYSTEM OVERVIEW --- */}
            {/* ============================================================== */}
            {tab === 0 && (
              <div className="space-y-6">
                {/* Header summary banner */}
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">University Lost & Found Command Center</h2>
                    <p className="text-purple-200 text-sm mt-1">
                      Campus wide monitoring: <strong>{stats?.users?.total || 0} registered accounts</strong> across students, campus safety, and administration.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-2.5 rounded-xl border border-white/10">
                    <TrendingUp className="text-emerald-400" size={24} />
                    <div>
                      <p className="text-xs uppercase text-purple-200 font-semibold tracking-wider">Overall Recovery Rate</p>
                      <p className="text-xl font-extrabold text-white">{stats?.performance?.recovery_rate_percentage || 0}%</p>
                    </div>
                  </div>
                </div>

                {/* KPI Cards Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Users */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Accounts</span>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Users size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats?.users?.total || 0}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {stats?.users?.students || 0} Students
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {stats?.users?.staff || 0} Staff
                      </span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        {stats?.users?.admins || 0} Admins
                      </span>
                    </div>
                  </div>

                  {/* Lost Items */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lost Reports</span>
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <Package size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats?.lost_items?.total || 0}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                        {stats?.lost_items?.active || 0} Active
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {stats?.lost_items?.matched || 0} Matched
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                        {stats?.lost_items?.recovered || 0} Recovered
                      </span>
                    </div>
                  </div>

                  {/* Found Items in Custody */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Found in Custody</span>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats?.found_items?.total || 0}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                        {stats?.found_items?.available || 0} Available
                      </span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                        {stats?.found_items?.claimed || 0} Claimed
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                        {stats?.found_items?.returned || 0} Returned
                      </span>
                    </div>
                  </div>

                  {/* Claims Pipeline */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Claims Pipeline</span>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats?.claims?.total || 0}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                        {stats?.claims?.pending || 0} Pending Staff
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                        {stats?.claims?.approved || 0} Approved
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                        {stats?.performance?.total_handovers || 0} Handovers
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Performance Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Campus Property Recovery Metric</h3>
                      <p className="text-xs text-slate-500">Ratio of reported lost items successfully restored to rightful owners</p>
                    </div>
                    <span className="text-2xl font-black text-purple-600">
                      {stats?.performance?.recovery_rate_percentage || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-4 rounded-full transition-all duration-1000 shadow"
                      style={{ width: `${Math.max(stats?.performance?.recovery_rate_percentage || 0, 4)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
                    <span>{stats?.lost_items?.recovered || 0} recovered of {stats?.lost_items?.total || 0} reported lost items</span>
                    <span>Target: 80% Recovery Rate</span>
                  </div>
                </div>

                {/* Visual Breakdowns: Categories & Campus Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Distribution */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Tag size={18} className="text-purple-600" />
                        <h3 className="font-bold text-slate-800 text-base">Item Distribution by Category</h3>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-semibold">
                        {stats?.category_breakdown?.length || 0} Categories
                      </span>
                    </div>
                    <div className="space-y-3.5">
                      {stats?.category_breakdown?.map(cat => {
                        const maxCount = Math.max(...(stats.category_breakdown.map(c => c.total_count)), 1);
                        const pct = Math.round((cat.total_count / maxCount) * 100);
                        return (
                          <div key={cat.id} className="text-xs">
                            <div className="flex justify-between font-semibold text-slate-700 mb-1">
                              <span>{cat.name}</span>
                              <span className="text-slate-500 font-normal">
                                {cat.lost_count} lost · {cat.found_count} found (<strong>{cat.total_count}</strong> total)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className="bg-purple-500 h-2.5 rounded-full"
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campus Hotspots */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-slate-800 text-base">Campus Incident Hotspots</h3>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-semibold">
                        {stats?.location_breakdown?.length || 0} Zones
                      </span>
                    </div>
                    <div className="space-y-3">
                      {stats?.location_breakdown?.map(loc => (
                        <div key={loc.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition border border-slate-200/60">
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{loc.name}</p>
                            <p className="text-xs text-slate-500">{loc.building}</p>
                          </div>
                          <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">
                            {loc.total_items} items reported
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent System Activity Preview */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Shield size={18} className="text-purple-600" /> Recent System Audit Events
                    </h3>
                    <button
                      onClick={() => setTab(4)}
                      className="text-purple-600 hover:text-purple-700 text-xs font-semibold flex items-center gap-1"
                    >
                      View All Logs <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {stats?.recent_activity?.slice(0, 5).map(act => (
                      <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <div>
                            <span className="font-semibold text-slate-800">{act.action}</span>
                            <span className="text-slate-500 mx-1.5">•</span>
                            <span className="text-slate-600">{act.entity_type} #{act.entity_id}</span>
                            {act.old_status && act.new_status && (
                              <span className="ml-2 font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                {act.old_status} → {act.new_status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-slate-400">
                          <span>{act.user_name}</span>
                          <span className="mx-1">•</span>
                          <span>{act.created_at ? act.created_at.slice(0, 16).replace('T', ' ') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* --- TAB 1: USER MANAGEMENT --- */}
            {/* ============================================================== */}
            {tab === 1 && (
              <div className="space-y-6">
                {/* Users Header & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Users className="text-purple-600" size={22} />
                      User Accounts &amp; Credential Directory
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Provision student/staff accounts, inspect credential details, manage password resets, and control security lock status.
                    </p>
                  </div>

                  <button
                    onClick={() => { setShowAddUserModal(true); setAddUserError(''); }}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow transition"
                  >
                    <UserPlus size={16} />
                    <span>Register Student / Staff</span>
                  </button>
                </div>

                {/* Newly Registered User Credential Banner */}
                {createdUserCredentials && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                        <CheckCircle size={18} className="text-emerald-600" />
                        <span>New User Successfully Registered &amp; Credentials Provisioned!</span>
                      </div>
                      <button onClick={() => setCreatedUserCredentials(null)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold">✕ Close</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-emerald-200 text-xs mt-2">
                      <div>
                        <p className="text-slate-400 font-medium">Full Name</p>
                        <p className="font-bold text-slate-800">{createdUserCredentials.name}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Login Email</p>
                        <p className="font-mono font-bold text-indigo-700">{createdUserCredentials.email}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Initial Password</p>
                        <p className="font-mono font-bold text-slate-800">{createdUserCredentials.password}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Role &amp; Contact</p>
                        <p className="font-semibold text-slate-700">{createdUserCredentials.role} • {createdUserCredentials.phone}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800">
                      <span>The user can now immediately sign in to their portal with these credentials.</span>
                      <button
                        onClick={() => copyToClipboard(`Email: ${createdUserCredentials.email}\nPassword: ${createdUserCredentials.password}\nRole: ${createdUserCredentials.role}`, 'new-cred')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition text-xs shadow-sm"
                      >
                        {copiedId === 'new-cred' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === 'new-cred' ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Metrics Counter Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Accounts</p>
                    <p className="text-2xl font-black text-slate-800">{usersList.length}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Active Students</p>
                    <p className="text-2xl font-black text-blue-700">{usersList.filter(u => u.role === 'STUDENT' && u.is_active).length}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Campus Staff</p>
                    <p className="text-2xl font-black text-emerald-700">{usersList.filter(u => u.role === 'STAFF').length}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Administrators</p>
                    <p className="text-2xl font-black text-purple-700">{usersList.filter(u => u.role === 'ADMIN').length}</p>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Access Locked</p>
                    <p className={`text-2xl font-black ${usersList.filter(u => !u.is_active).length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {usersList.filter(u => !u.is_active).length}
                    </p>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search name, email, or phone..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                  </div>

                  <div>
                    <select
                      className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                      value={userRoleFilter}
                      onChange={e => setUserRoleFilter(e.target.value)}
                    >
                      <option value="ALL">All Roles (Students, Staff, Admins)</option>
                      <option value="STUDENT">Students Only</option>
                      <option value="STAFF">Staff Only</option>
                      <option value="ADMIN">Admins Only</option>
                    </select>
                  </div>

                  <div>
                    <select
                      className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Access Statuses</option>
                      <option value="ACTIVE">Access Active (Unlocked)</option>
                      <option value="INACTIVE">Access Suspended (Locked)</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <Users size={40} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No users match your criteria</p>
                      <p className="text-xs mt-1">Try clearing filters or search query</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-5 py-3.5">User Identity</th>
                            <th className="px-5 py-3.5">Credential Details</th>
                            <th className="px-5 py-3.5">Role &amp; Privilege</th>
                            <th className="px-5 py-3.5">Activity</th>
                            <th className="px-5 py-3.5">Access Status</th>
                            <th className="px-5 py-3.5 text-right">Access &amp; Security Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map(u => {
                            const roleColor =
                              u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                              u.role === 'STAFF' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                  'bg-blue-100 text-blue-700 border-blue-200';
                            return (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition">
                                {/* Column 1: Identity */}
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                                      u.role === 'ADMIN' ? 'bg-purple-600 text-white' :
                                      u.role === 'STAFF' ? 'bg-emerald-600 text-white' :
                                                          'bg-blue-600 text-white'
                                    }`}>
                                      {u.name.slice(0, 2)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                                      <p className="text-[10px] text-slate-400">User ID #{u.id} • Registered {u.created_at ? u.created_at.slice(0, 10) : '—'}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Column 2: Credential Details */}
                                <td className="px-5 py-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 font-semibold">
                                      <span>{u.email}</span>
                                      <button
                                        onClick={() => copyToClipboard(u.email, `email-${u.id}`)}
                                        className="text-slate-400 hover:text-indigo-600 transition"
                                        title="Copy Login Email"
                                      >
                                        {copiedId === `email-${u.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-slate-500">Phone: {u.phone || '—'}</p>
                                  </div>
                                </td>

                                {/* Column 3: Role & Privilege */}
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleColor}`}>
                                      {u.role}
                                    </span>
                                    {/* Quick Role Switcher for Admin */}
                                    <select
                                      value={u.role}
                                      onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                                      className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-slate-700 outline-none hover:bg-slate-200 cursor-pointer"
                                      title="Change user role"
                                    >
                                      <option value="STUDENT">Set Student</option>
                                      <option value="STAFF">Set Staff</option>
                                      <option value="ADMIN">Set Admin</option>
                                    </select>
                                  </div>
                                </td>

                                {/* Column 4: Activity */}
                                <td className="px-5 py-4">
                                  <div className="text-slate-600 space-y-0.5 text-[11px]">
                                    <p>Lost: <strong className="text-rose-600">{u.lost_count}</strong></p>
                                    <p>Found: <strong className="text-emerald-600">{u.found_count}</strong></p>
                                    <p>Claims: <strong className="text-indigo-600">{u.claims_count}</strong></p>
                                  </div>
                                </td>

                                {/* Column 5: Access Status */}
                                <td className="px-5 py-4">
                                  {u.is_active ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 text-[11px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Access Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-rose-700 bg-rose-50 border border-rose-200 text-[11px]">
                                      <Lock size={11} className="text-rose-500" /> Access Locked
                                    </span>
                                  )}
                                </td>

                                {/* Column 6: Administrative Actions */}
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Reset Password */}
                                    <button
                                      onClick={() => { setResetPasswordModalUser(u); setNewPasswordVal(''); }}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-200 transition flex items-center gap-1"
                                      title="Reset user password"
                                    >
                                      <Key size={13} />
                                      <span className="hidden sm:inline">Reset Password</span>
                                    </button>

                                    {/* Lock / Unlock Access Toggle */}
                                    <button
                                      onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                                        u.is_active
                                          ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                      title={u.is_active ? 'Lock user out of system' : 'Unlock user account'}
                                    >
                                      {u.is_active ? <Lock size={13} /> : <Unlock size={13} />}
                                      <span>{u.is_active ? 'Lock Access' : 'Unlock'}</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* --- TAB 2: CAMPUS INVENTORY CONTROL --- */}
            {/* ============================================================== */}
            {tab === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Package className="text-purple-600" size={22} />
                      All Campus Lost & Found Inventory
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search, inspect, and verify every item reported across all campus zones.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setItemTypeFilter('ALL')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        itemTypeFilter === 'ALL' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      All ({itemsList.length})
                    </button>
                    <button
                      onClick={() => setItemTypeFilter('LOST')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        itemTypeFilter === 'LOST' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Lost Only
                    </button>
                    <button
                      onClick={() => setItemTypeFilter('FOUND')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        itemTypeFilter === 'FOUND' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Found Only
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                  <Search className="absolute left-7 top-6 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by title, description, color, brand, location, or reporter..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item, idx) => {
                    const isLost = item.type === 'LOST';
                    return (
                      <div
                        key={`${item.type}-${item.id}-${idx}`}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:border-purple-300 transition"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isLost ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.type} ITEM #{item.id}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'AVAILABLE' || item.status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' :
                              item.status === 'RETURNED' || item.status === 'RECOVERED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-800 text-base mb-1">{item.title}</h3>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.description}</p>

                          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="flex justify-between">
                              <span className="text-slate-400">Category:</span>
                              <span className="font-medium text-slate-700">{item.category}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Location:</span>
                              <span className="font-medium text-slate-700 truncate max-w-[180px]">{item.location}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Color / Brand:</span>
                              <span className="font-medium text-slate-700">{item.color} · {item.brand}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Reported By:</span>
                              <span className="font-medium text-slate-700">{item.reported_by}</span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                          <span>Date: {item.date}</span>
                          <span>Created: {item.created_at ? item.created_at.slice(0, 10) : '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* --- TAB 3: HANDOVER REGISTRY --- */}
            {/* ============================================================== */}
            {tab === 3 && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="text-emerald-600" size={22} />
                    Official Campus Property Handover Registry
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Legally binding audit chain of completed transfers, verifying claimant identity and staff handling.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {handoversList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <CheckCircle size={40} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No handovers logged yet</p>
                      <p className="text-xs mt-1">Handovers appear here once staff approves claims</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-5 py-3.5">Handover #</th>
                            <th className="px-5 py-3.5">Item Transferred</th>
                            <th className="px-5 py-3.5">Claimant (Owner)</th>
                            <th className="px-5 py-3.5">Handover Desk / Location</th>
                            <th className="px-5 py-3.5">Authorized Staff</th>
                            <th className="px-5 py-3.5">Handover Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {handoversList.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50 transition">
                              <td className="px-5 py-4 font-mono font-bold text-purple-700">
                                #HO-{h.id}
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-bold text-slate-800 text-sm">{h.item_title}</p>
                                <p className="text-[11px] text-slate-400">Claim ID #{h.claim_id}</p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-800">{h.claimant_name}</p>
                                <p className="text-slate-400 text-[11px]">{h.claimant_email}</p>
                              </td>
                              <td className="px-5 py-4">
                                <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                                  {h.handover_location}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-emerald-700">{h.staff_name}</p>
                                <p className="text-slate-400 text-[11px]">{h.staff_email}</p>
                              </td>
                              <td className="px-5 py-4 text-slate-500">
                                {h.handover_time ? h.handover_time.slice(0, 19).replace('T', ' ') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* --- TAB 4: AUDIT TRAIL --- */}
            {/* ============================================================== */}
            {tab === 4 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Shield className="text-purple-600" size={22} />
                      Complete System Security & Event Audit Trail
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Immutable transaction log of user creations, claim submissions, verifications, and status changes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <select
                      className="py-1.5 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-400"
                      value={logActionFilter}
                      onChange={e => setLogActionFilter(e.target.value)}
                    >
                      {uniqueActions.map(act => (
                        <option key={act} value={act}>Filter: {act}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="px-5 py-3.5">Log #</th>
                          <th className="px-5 py-3.5">Timestamp</th>
                          <th className="px-5 py-3.5">Actor</th>
                          <th className="px-5 py-3.5">Action</th>
                          <th className="px-5 py-3.5">Entity</th>
                          <th className="px-5 py-3.5">Status Transition</th>
                          <th className="px-5 py-3.5">Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 transition">
                            <td className="px-5 py-4 font-mono text-slate-400">#{log.id}</td>
                            <td className="px-5 py-4 text-slate-500 font-mono text-[11px]">
                              {log.created_at ? log.created_at.slice(0, 19).replace('T', ' ') : '—'}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-800">{log.user_name}</p>
                              <p className="text-[10px] text-slate-400">ID #{log.user_id || 'System'}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 text-[11px]">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-700 font-semibold">
                              {log.entity_type} #{log.entity_id}
                            </td>
                            <td className="px-5 py-4">
                              {log.old_status || log.new_status ? (
                                <div className="flex items-center gap-1 font-semibold text-[11px]">
                                  {log.old_status && <span className="text-slate-400">{log.old_status}</span>}
                                  {log.old_status && log.new_status && <span className="text-slate-300">→</span>}
                                  {log.new_status && <span className="text-emerald-600 font-bold">{log.new_status}</span>}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                              {log.details ? JSON.stringify(log.details) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: CREATE NEW USER */}
      {/* ============================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={20} className="text-purple-600" />
                Register New Campus User
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {addUserError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-xs font-medium">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 text-xs"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. student@campus.edu"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 text-xs"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 text-xs"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Role *</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 text-xs"
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="STAFF">Campus Staff</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 text-xs"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                >
                  {addUserSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL: RESET USER PASSWORD */}
      {/* ============================================================== */}
      {resetPasswordModalUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Key size={18} className="text-purple-600" />
                <span>Reset User Password</span>
              </h3>
              <button
                onClick={() => { setResetPasswordModalUser(null); setNewPasswordVal(''); }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 text-xs">
              <p className="text-slate-400 font-medium text-[11px]">Target Account</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{resetPasswordModalUser.name}</p>
              <p className="text-indigo-600 font-mono text-[11px] font-semibold">{resetPasswordModalUser.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  {resetPasswordModalUser.role}
                </span>
                <span className="text-[10px] text-slate-400">ID #{resetPasswordModalUser.id}</span>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    minLength={6}
                    placeholder="e.g. CampusSecure@2026"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400 font-mono text-xs"
                    value={newPasswordVal}
                    onChange={e => setNewPasswordVal(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters. The user can log in immediately after saving.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setResetPasswordModalUser(null); setNewPasswordVal(''); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordSubmitting || !newPasswordVal}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-semibold transition"
                >
                  {resetPasswordSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
