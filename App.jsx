import React, { useState, useEffect, useMemo, Component } from 'react';
import { format, startOfToday, subDays, eachDayOfInterval } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Instagram, 
  BarChart3, 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Layers,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

import { api } from './apiClient';

// --- Error Handling ---
function handleAppError(error) {
  console.error('App Error: ', error);
}

// --- Error Boundary ---
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center border border-red-100">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold tracking-tight text-stone-900 mb-2">Application Error</h2>
            <p className="text-stone-600 mb-6">{this.state.error?.message || "Something went wrong."}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <InstaTrackApp />
    </ErrorBoundary>
  );
}

function InstaTrackApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountOwnerName, setNewAccountOwnerName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [postModal, setPostModal] = useState({
    isOpen: false,
    accountId: '',
    date: '',
    index: 0,
    link: '',
  });
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    account: null,
  });

  const fetchData = async () => {
    try {
      setError(null);
      const [projs, accs, psts] = await Promise.all([
        api.getProjects(),
        api.getAccounts(),
        api.getPosts()
      ]);
      
      setProjects(Array.isArray(projs) ? projs : []);
      setAccounts(Array.isArray(accs) ? accs : []);
      setPosts(Array.isArray(psts) ? psts : []);
      
      const activeProjs = Array.isArray(projs) ? projs : [];
      if (activeProjs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(activeProjs[0].id || activeProjs[0]._id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Fetch Data Error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const newProj = await api.addProject(newProjectName.trim());
      setProjects([...projects, newProj]);
      setSelectedProjectId(newProj.id || newProj._id);
      setNewProjectName('');
      setIsAddingProject(false);
    } catch (error) {
      handleAppError(error);
    }
  };

  const deleteProject = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Project',
      message: 'Are you sure? This will not delete accounts but they will be hidden from the current view.',
      onConfirm: async () => {
        try {
          await api.deleteProject(id);
          const remaining = projects.filter(p => (p.id || p._id) !== id);
          setProjects(remaining);
          if (selectedProjectId === id) {
            setSelectedProjectId(remaining.length > 0 ? (remaining[0].id || remaining[0]._id) : null);
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleAppError(error);
        }
      }
    });
  };

  const addAccount = async (e) => {
    e.preventDefault();
    if (!newAccountUsername.trim() || !newAccountOwnerName.trim() || !selectedProjectId) return;
    try {
      const newAcc = await api.addAccount({
        username: newAccountUsername.trim().replace(/^@/, ''),
        ownerName: newAccountOwnerName.trim(),
        projectId: selectedProjectId,
      });
      setAccounts([...accounts, newAcc]);
      setNewAccountUsername('');
      setNewAccountOwnerName('');
      setIsAddingAccount(false);
    } catch (error) {
      handleAppError(error);
    }
  };

  const deleteAccount = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Account',
      message: "Are you sure you want to delete this account? All posts for this account will remain but won't be visible.",
      onConfirm: async () => {
        try {
          await api.deleteAccount(id);
          setAccounts(accounts.filter(a => (a.id || a._id) !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleAppError(error);
        }
      }
    });
  };

  const handleCheckboxClick = (accId, date, index, existingPost) => {
    if (!existingPost) {
      setPostModal({
        isOpen: true,
        accountId: accId,
        date: date,
        index: index,
        link: '',
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'Remove Video Post',
        message: `Are you sure you want to remove video post #${index}?`,
        onConfirm: async () => {
          try {
            await api.deletePost(accId, date, index);
            setPosts(posts.filter(p => !(p.accountId === accId && p.date === date && p.index === index)));
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          } catch (error) {
            handleAppError(error);
          }
        }
      });
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    try {
      const savedPost = await api.addPost({
        accountId: postModal.accountId,
        date: postModal.date,
        index: postModal.index,
        link: getInstagramId(postModal.link),
      });
      setPosts(prev => {
        const index = prev.findIndex(p => p.accountId === savedPost.accountId && p.date === savedPost.date && p.index === savedPost.index);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = savedPost;
          return updated;
        }
        return [...prev, savedPost];
      });
      setPostModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      handleAppError(error);
    }
  };

  const viewAccountHistory = (account) => {
    setHistoryModal({
      isOpen: true,
      account,
    });
  };

  const getInstagramId = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed.includes('instagram.com')) return trimmed;
    const match = trimmed.match(/\/(reels?|p)\/([^\/]+)/i);
    return (match && match[2]) ? match[2] : trimmed;
  };

  const getFullUrl = (id) => {
    if (!id) return '#';
    if (id.startsWith('http')) return id;
    return `https://www.instagram.com/reels/${id}/`;
  };

  const filteredAccounts = useMemo(() => 
    accounts.filter(a => (a.projectId || a.projectId?._id) === selectedProjectId),
  [accounts, selectedProjectId]);

  const statsData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    }).map(d => format(d, 'yyyy-MM-dd'));

    return last7Days.map(date => {
      const dayPosts = posts.filter(p => p.date === date && filteredAccounts.some(a => (a.id || a._id) === p.accountId));
      const target = filteredAccounts.length * 3;
      return {
        date: format(new Date(date), 'MMM dd'),
        count: dayPosts.length,
        target: target
      };
    });
  }, [posts, filteredAccounts]);

  const todayStats = useMemo(() => {
    const todayPosts = posts.filter(p => p.date === selectedDate && filteredAccounts.some(a => (a.id || a._id) === p.accountId));
    const target = filteredAccounts.length * 3;
    const totalViews = todayPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    return { count: todayPosts.length, target, totalViews };
  }, [posts, filteredAccounts, selectedDate]);

  const accountPosts = useMemo(() => {
    if (!historyModal.account) return [];
    const accId = historyModal.account.id || historyModal.account._id;
    return posts
      .filter(p => p.accountId === accId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.index - a.index);
  }, [posts, historyModal.account]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4"
          >
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl shadow-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Connection Error</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6"><AlertCircle className="w-6 h-6 text-red-500" /></div>
              <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-2">{confirmModal.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                <button onClick={confirmModal.onConfirm} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-2xl font-medium text-sm hover:bg-red-600 shadow-md transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Post Submission Modal */}
      <AnimatePresence>
        {postModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPostModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6"><Plus className="w-6 h-6 text-emerald-500" /></div>
              <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-2">Video Post #{postModal.index}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">Enter video details for tracking.</p>
              
              <form onSubmit={submitPost} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Video Link</label>
                  <input autoFocus type="url" placeholder="https://instagram.com/p/..." value={postModal.link} onChange={(e) => setPostModal({...postModal, link: e.target.value})} className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPostModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-2xl font-medium text-sm hover:bg-stone-800 shadow-md transition-all">Save Post</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Account History Modal */}
      <AnimatePresence>
        {historyModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryModal({ ...historyModal, isOpen: false })} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600 font-bold text-sm">@</div>
                   <div>
                      <h3 className="text-xl font-bold tracking-tight text-stone-900">@{historyModal.account?.username}</h3>
                      <p className="text-stone-400 text-xs font-bold uppercase tracking-widest leading-none mt-1">{historyModal.account?.ownerName}'s History</p>
                   </div>
                </div>
                <button onClick={() => setHistoryModal({ ...historyModal, isOpen: false })} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><Plus className="w-6 h-6 text-stone-400 rotate-45" /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {accountPosts.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-stone-400 text-sm italic">No posts tracked yet for this account.</p>
                  </div>
                ) : (
                  accountPosts.map((post, idx) => (
                    <div key={idx} className="bg-stone-50 p-4 rounded-2xl flex items-center justify-between group transition-colors hover:bg-stone-100 border border-transparent hover:border-stone-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-bold text-stone-400 shadow-sm border border-stone-100">#{post.index}</div>
                        <div>
                          <p className="text-sm font-bold text-stone-900">
                            {format(new Date(post.date + 'T00:00:00'), 'MMM dd, yyyy')}
                            {post.submittedAt && (
                              <span className="text-[10px] text-stone-400 font-normal ml-2 lowercase">
                                at {format(new Date(post.submittedAt), 'hh:mm a')}
                              </span>
                            )}
                          </p>
                          {post.link ? (
                            <a href={getFullUrl(post.link)} target="_blank" rel="noopener noreferrer" className="text-[10px] text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1 underline underline-offset-2 break-all max-w-[150px] sm:max-w-xs">{post.link}</a>
                          ) : (
                            <p className="text-[10px] text-stone-300 italic">No link provided</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                           <Eye className="w-3 h-3 text-stone-400" />
                           <span className="text-sm font-bold text-stone-900">{(post.viewsCount || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mt-0.5">Views</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-stone-100 flex justify-between items-center text-xs">
                 <span className="text-stone-400 font-medium">Total Posts: <span className="text-stone-900 font-bold">{accountPosts.length}</span></span>
                 <span className="text-stone-400 font-medium">Total Views: <span className="text-stone-900 font-bold">{accountPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0).toLocaleString()}</span></span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center"><Layers className="w-6 h-6 text-white" /></div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">InstaTrack</h1>
            </div>
            <div className="relative">
              <button onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)} className="flex items-center gap-2 px-4 py-2 bg-stone-50 hover:bg-stone-100 rounded-xl transition-all border border-stone-200">
                <span className="text-sm font-medium text-stone-900">{projects.find(p => (p.id || p._id) === selectedProjectId)?.name || 'Select Project'}</span>
                <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isProjectDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden py-2">
                    <div className="px-4 py-2 border-b border-stone-100 mb-2 font-bold uppercase tracking-widest text-[10px] text-stone-400">Projects</div>
                    {projects.map(p => (
                      <div key={p.id || p._id} className="px-2">
                        <button onClick={() => { setSelectedProjectId(p.id || p._id); setIsProjectDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between group ${selectedProjectId === (p.id || p._id) ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
                          <span className="truncate">{p.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id || p._id); }} className={`p-1 hover:text-red-400 transition-opacity ${selectedProjectId === (p.id || p._id) ? 'text-stone-300' : 'text-stone-400 opacity-0 group-hover:opacity-100'}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </button>
                      </div>
                    ))}
                    <div className="mt-2 px-2 pt-2 border-t border-stone-100">
                      {isAddingProject ? (
                        <form onSubmit={addProject} className="p-2 space-y-2">
                          <input autoFocus type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project Name" className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none focus:border-stone-900" />
                          <div className="flex gap-1">
                            <button type="submit" className="flex-1 bg-stone-900 text-white py-1.5 rounded-lg text-[10px] font-bold uppercase">Add</button>
                            <button type="button" onClick={() => setIsAddingProject(false)} className="flex-1 bg-stone-100 text-stone-600 py-1.5 rounded-lg text-[10px] font-bold uppercase">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => setIsAddingProject(true)} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-colors"><Plus className="w-4 h-4" />New Project</button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="hidden sm:block text-sm text-stone-400 font-medium tracking-tight">MERN Activity Tracker</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {selectedProjectId ? (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-8"><h2 className="text-lg font-bold tracking-tight flex items-center gap-2"><BarChart3 className="w-5 h-5 text-stone-400" /> Weekly Performance</h2></div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a8a29e' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.count >= entry.target && entry.target > 0 ? '#10b981' : '#1c1917'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-stone-900 text-white p-8 rounded-[32px] shadow-lg flex flex-col justify-between">
                <div>
                  <p className="text-stone-400 text-sm font-medium mb-1">Total Video Posts Today</p>
                  <h3 className="text-5xl font-bold tracking-tight mb-2">{todayStats.count.toLocaleString()}</h3>
                  <p className="text-stone-400 text-xs mt-4 mb-1 uppercase tracking-widest font-bold">Post Goal Progress</p>
                  <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden mb-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (todayStats.count / (todayStats.target || 1)) * 100)}%` }} className="h-full bg-emerald-500" />
                  </div>
                  <p className="text-xs text-stone-500">{todayStats.count} / {todayStats.target} posts uploaded</p>
                </div>
                <div className="pt-6 border-t border-stone-800 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1">Accounts</p>
                    <p className="text-2xl font-bold tracking-tight">{filteredAccounts.length}</p>
                  </div>
                  <Eye className="w-8 h-8 text-stone-700" />
                </div>
              </motion.div>
            </section>

            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight">Daily Activity</h2>
                <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-stone-200">
                  <button onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                  <div className="px-4 flex items-center gap-2 font-medium text-sm"><CalendarIcon className="w-4 h-4 text-stone-400" />{format(new Date(selectedDate), 'MMMM dd, yyyy')}</div>
                  <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))} disabled={selectedDate === format(new Date(), 'yyyy-MM-dd')} className="p-2 hover:bg-stone-50 rounded-xl transition-colors disabled:opacity-20"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map((acc) => (
                  <motion.div key={acc.id || acc._id} layout className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 font-bold text-xs">@</div>
                        <div className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity" onClick={() => viewAccountHistory(acc)}>
                          <span className="font-bold text-stone-900 tracking-tight">@{acc.username}</span>
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{acc.ownerName}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteAccount(acc.id || acc._id)} className="opacity-0 group-hover:opacity-100 p-2 text-stone-300 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((i) => {
                        const post = posts.find(p => p.accountId === (acc.id || acc._id) && p.date === selectedDate && p.index === i);
                        return (
                          <div key={i} className="flex flex-col items-center gap-1.5">
                            <button onClick={() => handleCheckboxClick(acc.id || acc._id, selectedDate, i, post)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${post ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-stone-50 text-stone-300 hover:bg-stone-100'}`}>
                              {post ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                            </button>
                            {post && (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[9px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Eye className="w-2.5 h-2.5" /> {(post.viewsCount || 0).toLocaleString()}
                                </span>
                                {post.submittedAt && (
                                  <span className="text-[7px] font-bold text-stone-400 uppercase tracking-tighter">
                                    {format(new Date(post.submittedAt), 'hh:mm a')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
                <button onClick={() => setIsAddingAccount(true)} className="bg-stone-50 border-2 border-dashed border-stone-200 p-6 rounded-3xl flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-all">
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-bold">Add Account</span>
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-[40px] border border-stone-200 shadow-sm px-6">
             <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6"><Layers className="w-8 h-8 text-stone-400" /></div>
             <h2 className="text-2xl font-bold tracking-tight mb-2">No Project Selected</h2>
             <p className="text-stone-500 max-w-sm mx-auto mb-8">Create a project to start tracking your accounts and daily posts.</p>
             <button onClick={() => setIsAddingProject(true)} className="px-8 py-3 bg-stone-900 text-white rounded-2xl font-bold tracking-tight hover:bg-stone-800 transition-all shadow-md">Create First Project</button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isAddingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingAccount(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200">
              <h3 className="text-2xl font-bold tracking-tight mb-6">Add Account</h3>
              <form onSubmit={addAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Username</label>
                  <input autoFocus type="text" value={newAccountUsername} onChange={e => setNewAccountUsername(e.target.value)} placeholder="@username" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Owner Name</label>
                  <input type="text" value={newAccountOwnerName} onChange={e => setNewAccountOwnerName(e.target.value)} placeholder="Full Name" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingAccount(false)} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-2xl font-medium text-sm hover:bg-stone-800 shadow-md transition-all">Add Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
