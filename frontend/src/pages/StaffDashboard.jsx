import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, CheckCircle, XCircle, Eye, ClipboardList, Package,
  Search, TrendingUp, Clock, AlertCircle, RefreshCw, ArrowRight,
  Shield, MapPin, Tag, Check
} from 'lucide-react';

export default function StaffDashboard() {
  const { logout, user } = useAuth();
  const [tab, setTab] = useState(0);

  // Data states
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [handoversList, setHandoversList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected claim for review
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimsFilter, setClaimsFilter] = useState('PENDING'); // PENDING, APPROVED, REJECTED, ALL

  // Verification note input
  const [verificationNotes, setVerificationNotes] = useState('');

  // Approve & Handover modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [handoverLocation, setHandoverLocation] = useState('Campus Security Main Office');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [approvingClaim, setApprovingClaim] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Inventory Search state
  const [itemSearch, setItemSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL');

  const TABS = [
    { label: 'Operations Hub', icon: TrendingUp },
    { label: `Claims Review (${claims.filter(c => c.status === 'PENDING').length} Pending)`, icon: ClipboardList },
    { label: 'Campus Inventory', icon: Package },
    { label: 'Handover Log', icon: CheckCircle },
    { label: 'Audit Trail', icon: Shield },
  ];

  useEffect(() => {
    fetchAll();
  }, []);

  // Auto-refresh when switching tabs
  useEffect(() => {
    fetchAll(false);
  }, [tab]);

  // Live sync every 12 seconds in background
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAll(false);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const fetchAll = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setErrorMessage('');
    try {
      const [statsRes, claimsRes, itemsRes, handoversRes, logsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: null })),
        api.get('/claims').catch(() => ({ data: [] })),
        api.get('/admin/all-items').catch(() => ({ data: [] })),
        api.get('/admin/handovers').catch(() => ({ data: [] })),
        api.get('/admin/audit-logs?limit=100').catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (claimsRes.data) {
        setClaims(claimsRes.data);
        if (claimsRes.data.length > 0 && !selectedClaim) {
          const firstPending = claimsRes.data.find(c => c.status === 'PENDING') || claimsRes.data[0];
          setSelectedClaim(firstPending);
        }
      }
      if (itemsRes.data) setItemsList(itemsRes.data);
      if (handoversRes.data) setHandoversList(handoversRes.data);
      if (logsRes.data) setLogsList(logsRes.data);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch operations data. Please ensure the backend server is active.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // Staff Verifies Claim
  const handleVerify = async (claimId) => {
    setSubmittingAction(true);
    try {
      await api.post(`/claims/${claimId}/verify`, {
        verification_notes: verificationNotes || 'Identity verified and proof checked by campus staff member.',
        result: 'VALID',
      });
      alert('Verification successfully recorded.');
      setVerificationNotes('');
      fetchAll();
    } catch (err) {
      alert('Verification Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Handover Modal
  const openApproveModal = (claim) => {
    setApprovingClaim(claim);
    setHandoverLocation('Campus Security Main Office');
    setHandoverNotes('');
    setShowApproveModal(true);
  };

  // Confirm Approval & Handover (Triggers atomic transaction)
  const handleApprove = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      await api.post(`/claims/${approvingClaim.id}/approve`, {
        handover_location: handoverLocation,
        notes: handoverNotes || 'Handover completed in person.',
        handover_time: new Date().toISOString(),
      });
      alert('Claim Approved! Database updated: Item marked RETURNED, Lost Item marked RECOVERED, and Handover logged.');
      setShowApproveModal(false);
      fetchAll();
    } catch (err) {
      alert('Approval Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reject Claim
  const handleReject = async (claimId) => {
    if (!window.confirm('Reject this ownership claim? This will restore the found item to AVAILABLE for other rightful owners.')) return;
    setSubmittingAction(true);
    try {
      await api.post(`/claims/${claimId}/reject`);
      alert('Claim rejected. Found item restored to AVAILABLE.');
      fetchAll();
    } catch (err) {
      alert('Rejection Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered claims
  const filteredClaims = claims.filter(c => {
    if (claimsFilter === 'ALL') return true;
    return c.status === claimsFilter;
  });

  // Filtered inventory items
  const filteredItems = itemsList.filter(item => {
    const matchesType = itemTypeFilter === 'ALL' || item.type === itemTypeFilter;
    if (!itemSearch) return matchesType;
    const s = itemSearch.toLowerCase();
    const matchesSearch =
      (item.title || '').toLowerCase().includes(s) ||
      (item.description || '').toLowerCase().includes(s) ||
      (item.category || '').toLowerCase().includes(s) ||
      (item.location || '').toLowerCase().includes(s) ||
      (item.brand || '').toLowerCase().includes(s) ||
      (item.color || '').toLowerCase().includes(s) ||
      (item.reported_by || '').toLowerCase().includes(s);
    return matchesType && matchesSearch;
  });

  const statusCls = (s) =>
    s === 'PENDING'  ? 'bg-amber-100 text-amber-800 border-amber-200' :
    s === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    s === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      'bg-slate-100 text-slate-700 border-slate-200';

  const pendingCount = claims.filter(c => c.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Professional Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2.5 rounded-xl shadow-md">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-white">Campus Lost & Found Operations</h1>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                    Staff Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400">Security & Custody Desk Management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 transition"
                title="Sync Live Data"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
                <span>Sync Data</span>
              </button>

              <div className="h-6 w-px bg-slate-700 mx-1"></div>

              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">Campus Staff Officer</p>
                <p className="text-[10px] text-slate-400">Staff ID #{user?.id || 4}</p>
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
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
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
            <RefreshCw className="animate-spin text-emerald-600 mb-3" size={36} />
            <p className="text-sm font-semibold">Loading operations queue and inventory...</p>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* --- TAB 0: OPERATIONS HUB (OVERVIEW) --- */}
            {/* ============================================================== */}
            {tab === 0 && (
              <div className="space-y-6">
                {/* Urgent Attention Alert Banner */}
                {pendingCount > 0 ? (
                  <div className="bg-amber-500 text-slate-900 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-900 text-amber-400 rounded-xl">
                        <Clock size={24} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-950">
                          {pendingCount} Ownership {pendingCount === 1 ? 'Claim' : 'Claims'} Awaiting Verification
                        </h3>
                        <p className="text-xs text-slate-900 font-medium">
                          Students have provided proof of property. Review identification and authorize handovers.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setTab(1); setClaimsFilter('PENDING'); }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <span>Process Claims Queue</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-lg flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base">All Claims Up to Date</h3>
                      <p className="text-xs text-emerald-100 font-medium">
                        No pending claims in the queue. Ready for student walk-ins and intake of found property.
                      </p>
                    </div>
                  </div>
                )}

                {/* Operations KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Pending Claims */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Action</span>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{pendingCount}</p>
                    <p className="text-xs text-slate-400 mt-2">Requires proof check and staff sign-off</p>
                  </div>

                  {/* Items in Custody */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Items in Custody</span>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Package size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">
                      {(stats?.found_items?.available || 0) + (stats?.found_items?.claimed || 0)}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {stats?.found_items?.available || 0} Available · {stats?.found_items?.claimed || 0} Under Review
                    </p>
                  </div>

                  {/* Total Handover Transfers */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Handovers Done</span>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <CheckCircle size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats?.performance?.total_handovers || 0}</p>
                    <p className="text-xs text-slate-400 mt-2">Items successfully returned to owners</p>
                  </div>

                  {/* Campus Recovery Rate */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Rate</span>
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                        <TrendingUp size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-800">{stats?.performance?.recovery_rate_percentage || 0}%</p>
                    <p className="text-xs text-slate-400 mt-2">Campus lost items successfully resolved</p>
                  </div>
                </div>

                {/* Operations Quick Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => { setTab(1); setClaimsFilter('PENDING'); }}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-emerald-500 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Review Pending Claims</h4>
                      <p className="text-xs text-slate-500 mt-1">Verify proofs and hand over items</p>
                    </div>
                    <ArrowRight className="text-emerald-600" size={18} />
                  </div>

                  <div
                    onClick={() => setTab(2)}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-emerald-500 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Search Item Inventory</h4>
                      <p className="text-xs text-slate-500 mt-1">Check if student item was found</p>
                    </div>
                    <ArrowRight className="text-emerald-600" size={18} />
                  </div>

                  <div
                    onClick={() => setTab(3)}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-emerald-500 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">View Handover Log</h4>
                      <p className="text-xs text-slate-500 mt-1">Official registry of return receipts</p>
                    </div>
                    <ArrowRight className="text-emerald-600" size={18} />
                  </div>
                </div>

                {/* Categories & Campus Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                      <Tag size={18} className="text-emerald-600" /> Current Inventory by Category
                    </h3>
                    <div className="space-y-3">
                      {stats?.category_breakdown?.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-semibold text-slate-700">{cat.name}</span>
                          <span className="text-slate-500">
                            <strong className="text-emerald-700">{cat.found_count}</strong> in custody · <strong className="text-rose-600">{cat.lost_count}</strong> reported lost
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Campus Hotspots */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                      <MapPin size={18} className="text-emerald-600" /> Campus Hotspots
                    </h3>
                    <div className="space-y-3">
                      {stats?.location_breakdown?.map(loc => (
                        <div key={loc.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <div>
                            <p className="font-semibold text-slate-700">{loc.name}</p>
                            <p className="text-[10px] text-slate-400">{loc.building}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-xs">
                            {loc.total_items} items
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* --- TAB 1: CLAIMS QUEUE & REVIEW --- */}
            {/* ============================================================== */}
            {tab === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList className="text-emerald-600" size={22} />
                      Claims Verification & Approval Desk
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify student ownership proofs and execute transaction-safe property handovers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setClaimsFilter('PENDING')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        claimsFilter === 'PENDING' ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Pending ({claims.filter(c => c.status === 'PENDING').length})
                    </button>
                    <button
                      onClick={() => setClaimsFilter('APPROVED')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        claimsFilter === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Approved ({claims.filter(c => c.status === 'APPROVED').length})
                    </button>
                    <button
                      onClick={() => setClaimsFilter('REJECTED')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        claimsFilter === 'REJECTED' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Rejected ({claims.filter(c => c.status === 'REJECTED').length})
                    </button>
                    <button
                      onClick={() => setClaimsFilter('ALL')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        claimsFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      All ({claims.length})
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Claims List */}
                  <div className="flex-1 space-y-3">
                    {filteredClaims.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                        <CheckCircle size={40} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No claims in this category</p>
                        <p className="text-xs mt-1">Select another filter or await new student submissions</p>
                      </div>
                    ) : (
                      filteredClaims.map(claim => {
                        const isSelected = selectedClaim?.id === claim.id;
                        const score = claim.match?.match_score || 0;
                        const scoreColor =
                          score >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          score >= 75 ? 'bg-amber-100 text-amber-800' :
                                        'bg-blue-100 text-blue-800';

                        return (
                          <div
                            key={claim.id}
                            onClick={() => setSelectedClaim(claim)}
                            className={`bg-white rounded-xl border p-4 cursor-pointer transition shadow-sm hover:shadow ${
                              isSelected
                                ? 'border-emerald-500 ring-2 ring-emerald-400/20 bg-emerald-50/10'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm">
                                  {claim.match?.found_item?.title || `Item Match #${claim.match_id}`}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  Claimant ID: <strong>#{claim.claimant_id}</strong> • Submitted: {claim.submitted_at?.slice(0, 10)}
                                </p>
                              </div>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusCls(claim.status)}`}>
                                {claim.status}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic line-clamp-2">
                              "{claim.proof_details}"
                            </p>

                            <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100 text-xs">
                              <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${scoreColor}`}>
                                Match Score: {score}%
                              </span>
                              <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                                Inspect Details <ArrowRight size={12} />
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Right Column: Detailed Review & Verification Station */}
                  {selectedClaim ? (
                    <div className="w-full lg:w-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 p-6 self-start sticky top-20 space-y-5">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="font-bold text-slate-800 text-base">Claim Verification Station</h3>
                          <p className="text-xs text-slate-400">Claim File #{selectedClaim.id}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusCls(selectedClaim.status)}`}>
                          {selectedClaim.status}
                        </span>
                      </div>

                      {/* Side-by-Side: Lost vs Found Specifications */}
                      <div className="space-y-3 text-xs">
                        {/* Lost Item Details */}
                        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
                          <p className="font-bold text-rose-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>🔴 Reported Lost Item</span>
                          </p>
                          <p className="font-bold text-slate-800 text-sm">{selectedClaim.match?.lost_item?.title || '—'}</p>
                          <p className="text-slate-600 mt-1">{selectedClaim.match?.lost_item?.description || '—'}</p>
                          <p className="text-[11px] text-slate-500 mt-2">
                            Lost Date: {selectedClaim.match?.lost_item?.lost_date || '—'}
                          </p>
                        </div>

                        {/* Found Item Details */}
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                          <p className="font-bold text-emerald-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>🟢 Custody Found Item</span>
                          </p>
                          <p className="font-bold text-slate-800 text-sm">{selectedClaim.match?.found_item?.title || '—'}</p>
                          <p className="text-slate-600 mt-1">{selectedClaim.match?.found_item?.description || '—'}</p>
                          <p className="text-[11px] text-slate-500 mt-2">
                            Found Date: {selectedClaim.match?.found_item?.found_date || '—'}
                          </p>
                        </div>

                        {/* Claimant Proof Description */}
                        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
                          <p className="font-bold text-blue-800 text-xs uppercase tracking-wider mb-1">
                            📝 Claimant's Proof of Ownership
                          </p>
                          <p className="text-slate-800 leading-relaxed font-medium">
                            {selectedClaim.proof_details}
                          </p>
                        </div>
                      </div>

                      {/* Verification Form & Action Controls */}
                      {selectedClaim.status === 'PENDING' && (
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Staff Verification Notes:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Verified student ID and matching serial number."
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
                              value={verificationNotes}
                              onChange={e => setVerificationNotes(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleVerify(selectedClaim.id)}
                              disabled={submittingAction}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs py-2.5 rounded-lg border border-blue-200 transition"
                            >
                              Mark Verified
                            </button>

                            <button
                              onClick={() => handleReject(selectedClaim.id)}
                              disabled={submittingAction}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs py-2.5 rounded-lg border border-rose-200 transition"
                            >
                              Reject Claim
                            </button>
                          </div>

                          <button
                            onClick={() => openApproveModal(selectedClaim)}
                            disabled={submittingAction}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle size={16} />
                            <span>Approve & Authorize Handover</span>
                          </button>
                        </div>
                      )}

                      {selectedClaim.status !== 'PENDING' && (
                        <div className="bg-slate-50 p-4 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                          This claim is <strong>{selectedClaim.status}</strong>. No further pending staff actions required.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full lg:w-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                      Select a claim from the list to review details.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* --- TAB 2: CAMPUS INVENTORY LOOKUP --- */}
            {/* ============================================================== */}
            {tab === 2 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Package className="text-emerald-600" size={22} />
                      Live Campus Property Inventory
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fast lookup for walk-in inquiries. Check if an item has been reported lost or found.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAll()}
                      disabled={refreshing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
                      title="Sync live inventory"
                    >
                      <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
                      <span>Sync</span>
                    </button>
                    <button
                      onClick={() => setItemTypeFilter('ALL')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        itemTypeFilter === 'ALL' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      All ({itemsList.length})
                    </button>
                    <button
                      onClick={() => setItemTypeFilter('FOUND')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        itemTypeFilter === 'FOUND' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Found Only (In Custody)
                    </button>
                    <button
                      onClick={() => setItemTypeFilter('LOST')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        itemTypeFilter === 'LOST' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      Lost Only
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                  <Search className="absolute left-7 top-6 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by keyword, item title, color, brand, location, or student name..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400"
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
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:border-emerald-300 transition"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isLost ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.type} #{item.id}
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
                    Staff Completed Handover Registry
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official records of property handovers completed by campus safety staff.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {handoversList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <CheckCircle size={40} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No handovers logged yet</p>
                      <p className="text-xs mt-1">Approve pending claims to record completed handovers</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-5 py-3.5">Handover #</th>
                            <th className="px-5 py-3.5">Item Transferred</th>
                            <th className="px-5 py-3.5">Claimant (Owner)</th>
                            <th className="px-5 py-3.5">Handover Desk</th>
                            <th className="px-5 py-3.5">Handover Officer</th>
                            <th className="px-5 py-3.5">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {handoversList.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50 transition">
                              <td className="px-5 py-4 font-mono font-bold text-emerald-700">
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
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="text-emerald-600" size={22} />
                    Operations Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable event log of claim evaluations, state changes, and handovers.
                  </p>
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logsList.map(log => (
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
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-[11px]">
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
      {/* MODAL: APPROVE CLAIM & COMPLETE HANDOVER */}
      {/* ============================================================== */}
      {showApproveModal && approvingClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-600" />
                Authorize Property Handover
              </h3>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Approving claim #{approvingClaim.id} will execute an atomic database transaction:
              <br />
              • Claim status → <strong className="text-emerald-600">APPROVED</strong>
              <br />
              • Found item status → <strong className="text-blue-600">RETURNED</strong>
              <br />
              • Lost item status → <strong className="text-purple-600">RECOVERED</strong>
            </p>

            <form onSubmit={handleApprove} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handover Location / Desk *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Main Security Desk, North Gate"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-xs"
                  value={handoverLocation}
                  onChange={e => setHandoverLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handover Notes & Observations</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Student presented valid ID, item inspected, student signed receipt."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 text-xs"
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                >
                  {submittingAction ? 'Executing Transaction...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
