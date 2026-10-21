import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, CheckCircle, Zap, LogOut, Search, FileText, ArrowRight, Package, Tag, MapPin, User, AlertCircle } from 'lucide-react';

const TABS = ['My Lost Items', 'My Found Submissions', 'Report Item', 'Match Results & Claims', 'All Campus Items'];

const SCORE_BADGE = (score) => {
  if (score >= 90) return { label: 'Very Strong Match (90-100%)', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
  if (score >= 75) return { label: 'Strong Match (75-89%)', cls: 'bg-amber-100 text-amber-800 border border-amber-300' };
  return { label: 'Possible Match (50-74%)', cls: 'bg-blue-100 text-blue-800 border border-blue-300' };
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(0);

  // Data states
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [allCampusItems, setAllCampusItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedLost, setSelectedLost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);

  // Report Lost form
  const [lTitle, setLTitle] = useState('');
  const [lDesc, setLDesc] = useState('');
  const [lColor, setLColor] = useState('');
  const [lBrand, setLBrand] = useState('');
  const [lRegNo, setLRegNo] = useState('');

  // Report Found form
  const [fTitle, setFTitle] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fColor, setFColor] = useState('');
  const [fBrand, setFBrand] = useState('');
  const [fRegNo, setFRegNo] = useState('');

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMatch, setClaimMatch] = useState(null);
  const [proofDetails, setProofDetails] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Categories & locations
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lCat, setLCat] = useState(1);
  const [lLoc, setLLoc] = useState(1);
  const [fCat, setFCat] = useState(1);
  const [fLoc, setFLoc] = useState(1);

  // All Campus Items Search
  const [campusSearch, setCampusSearch] = useState('');

  useEffect(() => {
    fetchAll();
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/locations').then(r => setLocations(r.data)).catch(() => {});
  }, [user]);

  const fetchAll = () => {
    setLoading(true);
    const userIdParam = user?.id ? `?user_id=${user.id}` : '';
    Promise.all([
      api.get(`/lost-items${userIdParam}`).then(r => setMyLostItems(r.data)).catch(() => []),
      api.get(`/found-items${userIdParam}`).then(r => setMyFoundItems(r.data)).catch(() => []),
      api.get('/matches').then(r => setMatches(r.data)).catch(() => []),
      api.get('/admin/all-items').then(r => setAllCampusItems(r.data)).catch(() => []),
    ]).finally(() => setLoading(false));
  };

  const handleReportLost = async (e) => {
    e.preventDefault();
    try {
      await api.post('/lost-items', {
        title: lTitle,
        description: lDesc + (lRegNo ? ` [Student Reg: ${lRegNo}]` : ''),
        color: lColor || null,
        brand: lBrand || null,
        category_id: lCat,
        location_id: lLoc,
        lost_date: new Date().toISOString().split('T')[0],
        lost_time: '12:00:00',
      });
      alert('✅ Lost item reported successfully! You can now check for matches.');
      setLTitle(''); setLDesc(''); setLColor(''); setLBrand(''); setLRegNo('');
      fetchAll();
      setTab(0);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleReportFound = async (e) => {
    e.preventDefault();
    try {
      await api.post('/found-items', {
        title: fTitle,
        description: fDesc + (fRegNo ? ` [Found by Student Reg: ${fRegNo}]` : ''),
        color: fColor || null,
        brand: fBrand || null,
        category_id: fCat,
        location_id: fLoc,
        found_date: new Date().toISOString().split('T')[0],
        found_time: '12:00:00',
      });
      alert('✅ Found item submitted! The system will match it against lost reports.');
      setFTitle(''); setFDesc(''); setFColor(''); setFBrand(''); setFRegNo('');
      fetchAll();
      setTab(1);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleFindMatches = async (item) => {
    setSelectedLost(item);
    setMatchLoading(true);
    setTab(3);
    try {
      await api.post(`/lost-items/${item.id}/generate-matches`);
      const res = await api.get(`/matches?lost_item_id=${item.id}`);
      setMatches(res.data);
    } catch (err) {
      alert('Error finding matches: ' + (err.response?.data?.detail || err.message));
    } finally {
      setMatchLoading(false);
    }
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    setSubmittingClaim(true);
    try {
      await api.post('/claims', {
        match_id: claimMatch.id,
        proof_details: proofDetails,
      });
      alert('✅ Claim submitted successfully! Campus Staff will review your proof.');
      setShowClaimModal(false);
      setProofDetails('');
      fetchAll();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingClaim(false);
    }
  };

  const filteredCampusItems = allCampusItems.filter(item => {
    if (!campusSearch) return true;
    const s = campusSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(s) ||
      item.description.toLowerCase().includes(s) ||
      item.category.toLowerCase().includes(s) ||
      item.location.toLowerCase().includes(s) ||
      item.brand.toLowerCase().includes(s)
    );
  });

  const tabCls = (i) =>
    `px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
      tab === i ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar with Student Identity */}
      <nav className="bg-blue-700 text-white px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-md gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-base">
            🎓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight">Smart Campus Lost & Found</h1>
              <span className="bg-blue-800 text-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Student Portal
              </span>
            </div>
            <p className="text-xs text-blue-200">
              Logged in as: <strong className="text-white underline">{user?.name || 'Student User'}</strong> ({user?.email || `ID #${user?.id}`})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs bg-blue-800 text-blue-200 px-3 py-1 rounded-full font-semibold border border-blue-600">
            Student ID #{user?.id}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm"
          >
            <LogOut size={14} />
            <span>Switch User / Logout</span>
          </button>
        </div>
      </nav>

      {/* Tabs Row */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 flex overflow-x-auto gap-1">
        {TABS.map((t, i) => (
          <button key={i} className={tabCls(i)} onClick={() => setTab(i)}>
            {t} {i === 0 ? `(${myLostItems.length})` : i === 1 ? `(${myFoundItems.length})` : ''}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
        {loading && <p className="text-slate-400 text-center py-12">Loading campus items...</p>}

        {/* --- Tab 0: My Lost Items --- */}
        {tab === 0 && !loading && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Lost Items Reported by {user?.name || 'You'}
                </h2>
                <p className="text-xs text-slate-500">
                  Click <strong>"Find Matches ⚡"</strong> to scan what other students turned in.
                </p>
              </div>
              <button
                onClick={() => setTab(2)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow flex items-center gap-1"
              >
                <PlusCircle size={14} />
                <span>Report Lost Item</span>
              </button>
            </div>

            {myLostItems.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                <Package size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">You haven't reported any lost items</p>
                <p className="text-xs mt-1">Use the "Report Item" tab to register a lost property</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200 bg-white">
                <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Item Title</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Color / Brand</th>
                      <th className="px-4 py-3">Date Lost</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Matching Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myLostItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-800 text-sm">{item.title}</td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{item.description}</td>
                        <td className="px-4 py-3.5 text-slate-600">{item.color || '—'} · {item.brand || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-500">{item.lost_date}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'ACTIVE'    ? 'bg-amber-100 text-amber-800' :
                            item.status === 'MATCHED'   ? 'bg-blue-100 text-blue-800' :
                            item.status === 'RECOVERED' ? 'bg-emerald-100 text-emerald-800' :
                                                         'bg-slate-100 text-slate-600'
                          }`}>{item.status}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleFindMatches(item)}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            <Zap size={12} />
                            <span>Find Matches ⚡</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- Tab 1: My Found Submissions --- */}
        {tab === 1 && !loading && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Items Found & Turned in by {user?.name || 'You'}
                </h2>
                <p className="text-xs text-slate-500">
                  Thank you for helping keep our campus honest and helpful.
                </p>
              </div>
              <button
                onClick={() => setTab(2)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow flex items-center gap-1"
              >
                <PlusCircle size={14} />
                <span>Report Found Item</span>
              </button>
            </div>

            {myFoundItems.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                <CheckCircle size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">You haven't submitted any found items</p>
                <p className="text-xs mt-1">If you found someone's lost property, submit it under "Report Item"</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200 bg-white">
                <table className="min-w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Item Title</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Color / Brand</th>
                      <th className="px-4 py-3">Date Found</th>
                      <th className="px-4 py-3">Custody Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myFoundItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-800 text-sm">{item.title}</td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{item.description}</td>
                        <td className="px-4 py-3.5 text-slate-600">{item.color || '—'} · {item.brand || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-500">{item.found_date}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'CLAIMED'   ? 'bg-amber-100 text-amber-800' :
                            item.status === 'RETURNED'  ? 'bg-blue-100 text-blue-800' :
                                                         'bg-slate-100 text-slate-600'
                          }`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- Tab 2: Report Item Forms --- */}
        {tab === 2 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Report Lost Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6 border-t-4 border-t-rose-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">I Lost Something</h3>
                  <p className="text-xs text-slate-500">Register lost item so the AI engine can match it</p>
                </div>
              </div>

              <form onSubmit={handleReportLost} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Title *</label>
                  <input
                    required
                    placeholder="e.g. Silver HP Pavilion 14-inch Laptop"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                    value={lTitle}
                    onChange={e => setLTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Left on table 4 at central library. Has Intel sticker and black sleeve case."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                    value={lDesc}
                    onChange={e => setLDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Color</label>
                    <input
                      placeholder="e.g. Silver / Grey"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                      value={lColor}
                      onChange={e => setLColor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                    <input
                      placeholder="e.g. HP / Apple / Dell"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                      value={lBrand}
                      onChange={e => setLBrand(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                      value={lCat}
                      onChange={e => setLCat(Number(e.target.value))}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Location Lost *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                      value={lLoc}
                      onChange={e => setLLoc(Number(e.target.value))}
                    >
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.building})</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Student Reg / ID No *</label>
                  <input
                    required
                    placeholder="e.g. STU-2024-001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                    value={lRegNo}
                    onChange={e => setLRegNo(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition shadow text-xs mt-2"
                >
                  Submit Lost Report
                </button>
              </form>
            </div>

            {/* Report Found Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6 border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">I Found Something</h3>
                  <p className="text-xs text-slate-500">Log found property to reunite it with its owner</p>
                </div>
              </div>

              <form onSubmit={handleReportFound} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Found Item Title *</label>
                  <input
                    required
                    placeholder="e.g. Found Silver Laptop at Library"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                    value={fTitle}
                    onChange={e => setFTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Found on study table near 2nd floor window. Has sticker on lid."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                    value={fDesc}
                    onChange={e => setFDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Color</label>
                    <input
                      placeholder="e.g. Silver / Grey"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                      value={fColor}
                      onChange={e => setFColor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                    <input
                      placeholder="e.g. HP / Apple / Dell"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                      value={fBrand}
                      onChange={e => setFBrand(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                      value={fCat}
                      onChange={e => setFCat(Number(e.target.value))}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Where Did You Find It? *</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                      value={fLoc}
                      onChange={e => setFLoc(Number(e.target.value))}
                    >
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.building})</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Finder Student ID / Reg No *</label>
                  <input
                    required
                    placeholder="e.g. STU-2024-002"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                    value={fRegNo}
                    onChange={e => setFRegNo(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition shadow text-xs mt-2"
                >
                  Submit Found Item
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- Tab 3: Match Results & Claims --- */}
        {tab === 3 && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Zap className="text-indigo-600" size={20} />
                Automated Match Results
                {selectedLost && (
                  <span className="text-sm font-normal text-slate-500">for your lost item: <strong>"{selectedLost.title}"</strong></span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                The matching engine scores candidates based on category, location, date range, color, brand, and feature keywords.
              </p>
            </div>

            {matchLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center text-slate-400">
                <Zap size={36} className="mx-auto mb-2 text-indigo-500 animate-bounce" />
                <p className="font-semibold text-slate-700">AI similarity engine is scanning campus inventory...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center text-slate-400">
                <Zap size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No high-confidence matches found yet</p>
                <p className="text-xs mt-1">
                  Go to <strong>"My Lost Items"</strong> tab and click <strong>"Find Matches ⚡"</strong> on an item.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {matches.map(match => {
                  const badge = SCORE_BADGE(match.match_score);
                  return (
                    <div
                      key={match.id}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-indigo-300 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-slate-800 text-base">{match.found_item?.title}</h3>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{match.found_item?.description}</p>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Found Date: <strong>{match.found_item?.found_date}</strong>
                        </p>

                        {match.matching_details && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {Object.entries(match.matching_details).map(([k, v]) => (
                              <span key={k} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-medium border border-slate-200">
                                {k}: +{v}pts
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 min-w-[140px] w-full md:w-auto">
                        <div className="text-right">
                          <span className="text-2xl font-black text-indigo-700">
                            {Number(match.match_score).toFixed(1)}%
                          </span>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Similarity Score</p>
                        </div>

                        {match.status === 'SUGGESTED' || match.status === 'UNDER_REVIEW' ? (
                          <button
                            onClick={() => { setClaimMatch(match); setShowClaimModal(true); }}
                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow flex items-center justify-center gap-1.5"
                          >
                            <span>Claim This Item</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            {match.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- Tab 4: All Campus Items --- */}
        {tab === 4 && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Campus-Wide Lost & Found Directory
                </h2>
                <p className="text-xs text-slate-500">
                  Browse what items other students have lost or turned in across university zones.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Filter campus items..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                  value={campusSearch}
                  onChange={e => setCampusSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampusItems.map((item, idx) => {
                const isLost = item.type === 'LOST';
                return (
                  <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isLost ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{item.description}</p>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p>📍 {item.location}</p>
                        <p>🏷️ {item.category}</p>
                        <p>👤 Reported by: {item.reported_by}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                      Date: {item.date}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Claim Submission Modal */}
      {showClaimModal && claimMatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Submit Ownership Proof</h3>
            <p className="text-xs text-slate-500 mb-4">
              Item to Claim: <strong>"{claimMatch.found_item?.title}"</strong>
            </p>

            <form onSubmit={handleSubmitClaim} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proof of Ownership (Identifying Details) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details only the true owner would know: serial number, lockscreen wallpaper, contents inside pockets/bag, receipt, unique scratches, etc."
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                  value={proofDetails}
                  onChange={e => setProofDetails(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow transition"
                >
                  {submittingClaim ? 'Submitting...' : 'Submit Claim to Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
