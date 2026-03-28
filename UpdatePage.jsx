import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Instagram,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Plus,
  Layers,
  ClipboardPaste,
  Facebook,
  Youtube,
  Download,
  ExternalLink,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PLATFORMS = [
  { value: 'instagram', icon: Instagram, gradient: 'from-purple-500 via-pink-500 to-orange-400' },
  { value: 'facebook', icon: Facebook, gradient: 'from-blue-600 to-blue-400' },
  { value: 'youtube', icon: Youtube, gradient: 'from-red-600 to-red-400' },
  { value: 'tiktok', icon: Layers, gradient: 'from-stone-900 via-cyan-500 to-pink-500' },
];
const getPlatformConfig = (platform) => PLATFORMS.find(p => p.value === platform) || PLATFORMS[0];

const PlatformIcon = ({ platform, size = 'w-10 h-10' }) => {
  const config = getPlatformConfig(platform);
  const Icon = config.icon;
  return (
    <div className={`${size} bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center text-white`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api';

export default function UpdatePage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postModal, setPostModal] = useState({ isOpen: false, accId: '', index: 0, link: '', saving: false, isEditing: false });
  const [inputId, setInputId] = useState('');
  const [handlerName, setHandlerName] = useState('');
  const [copiedAccountId, setCopiedAccountId] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const urlHandlerId = new URLSearchParams(window.location.search).get('h');
  const savedHandlerId = localStorage.getItem('handlerId');
  const handlerId = urlHandlerId || savedHandlerId;
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'dd MMM, EEEE');

  useEffect(() => {
    const loadAll = async () => {
      if (!handlerId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/accounts/handler/${handlerId}`);
        if (!res.ok) throw new Error("Failed to load your accounts. Invalid handler link.");
        const data = await res.json();

        const handlerAccounts = Array.isArray(data) ? data : data.accounts;
        if (!Array.isArray(data) && data.handler?.name) {
          setHandlerName(data.handler.name);
        }

        const accsWithPosts = await Promise.all(handlerAccounts.map(async (account) => {
          const accId = account._id || account.id;
          const postsRes = await fetch(`${API_BASE_URL}/posts/${accId}/${today}`);
          const postsData = await postsRes.json();
          return { account, posts: Array.isArray(postsData) ? postsData : [] };
        }));
        setAccounts(accsWithPosts);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    loadAll();

    if (urlHandlerId) {
      localStorage.setItem('handlerId', urlHandlerId);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', () => { });
    };
  }, [handlerId, today]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const getPostForSlot = (accData, index) => {
    return accData.posts.find(p => p.index === index);
  };

  const handleCheckboxClick = (accId, index) => {
    const accData = accounts.find(a => (a.account._id || a.account.id) === accId);
    if (!accData) return;
    const existingPost = getPostForSlot(accData, index);
    setPostModal({
      isOpen: true,
      accId,
      index,
      link: existingPost?.link || '',
      saving: false,
      isEditing: !!existingPost,
    });
  };

  const handleDeletePost = async () => {
    if (!confirm(`Are you sure you want to remove video post #${postModal.index}?`)) return;
    try {
      setPostModal(prev => ({ ...prev, saving: true }));
      const res = await fetch(`${API_BASE_URL}/posts/${postModal.accId}/${today}/${postModal.index}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete post');

      setAccounts(prev => prev.map(a => {
        if ((a.account._id || a.account.id) !== postModal.accId) return a;
        return { ...a, posts: a.posts.filter(p => p.index !== postModal.index) };
      }));
      setPostModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err.message);
      setPostModal(prev => ({ ...prev, saving: false }));
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPostModal(prev => ({ ...prev, link: text }));
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    try {
      setPostModal(prev => ({ ...prev, saving: true }));
      const res = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: postModal.accId,
          date: today,
          index: postModal.index,
          link: getPlatformId(postModal.link),
        }),
      });
      if (!res.ok) throw new Error('Failed to save post');
      const saved = await res.json();

      setAccounts(prev => prev.map(a => {
        if ((a.account._id || a.account.id) !== postModal.accId) return a;
        const newPosts = [...a.posts];
        const idx = newPosts.findIndex(p => p.index === postModal.index);
        if (idx > -1) newPosts[idx] = saved;
        else newPosts.push(saved);
        return { ...a, posts: newPosts };
      }));
      setPostModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      setError(err.message);
      setPostModal(prev => ({ ...prev, saving: false }));
    }
  };

  const getPlatformId = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed.includes('.com')) return trimmed;
    const match = trimmed.match(/\/(reels?|p|video|shorts|share\/[rv])\/([^/?]+)/i);
    return match && match[2] ? match[2] : trimmed;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!handlerId) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200">
          <div className="max-w-xl mx-auto px-6 h-16 flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TW</h1>
          </div>
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all animate-bounce"
            >
              <Download className="w-4 h-4" /> Install App
            </button>
          )}
          {handlerId && (
            <button
              onClick={() => {
                localStorage.removeItem('handlerId');
                window.location.href = '/';
              }}
              className="ml-2 flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all"
            >
              Log Out
            </button>
          )}
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-stone-200 text-center">
            <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h2>
            <p className="text-stone-500 text-sm mb-8 leading-relaxed">Enter your Handle ID to access your assigned tracking accounts.</p>

            <form onSubmit={(e) => { e.preventDefault(); if (inputId.trim()) window.location.search = `?h=${inputId.trim()}`; }} className="space-y-4">
              <input
                autoFocus
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                placeholder="Enter Handle ID..."
                className="w-full bg-stone-50 p-4 rounded-xl border border-stone-200 focus:ring-2 focus:ring-stone-900 outline-none text-center font-bold tracking-tight"
              />
              <button
                type="submit"
                disabled={!inputId.trim()}
                className="w-full px-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm hover:bg-stone-800 shadow-md transition-all disabled:opacity-50"
              >
                Access Dashboard
              </button>
            </form>
          </motion.div>
        </main>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans flex flex-col items-center justify-center px-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-stone-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200">
          <div className="max-w-xl mx-auto px-6 h-16 flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TW</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full max-w-sm">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6"><Layers className="w-8 h-8 text-stone-400" /></div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              {handlerName ? `Hi, ${handlerName}!` : 'No Accounts Assigned'}
            </h2>
            <p className="text-stone-500 mb-8 leading-relaxed">
              {handlerName ? "You currently have no accounts to track. An admin must assign them to you." : "An admin must assign accounts to you."}
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  const totalCompleted = accounts.reduce((sum, a) => sum + a.posts.filter(p => p.date === today).length, 0);
  const totalSlots = accounts.length * 3;

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-20">
      <AnimatePresence>
        {postModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPostModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6"><Plus className="w-6 h-6 text-emerald-500" /></div>
              <h3 className="text-xl font-bold tracking-tight text-stone-900 mb-2">Video Post #{postModal.index}</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">Paste the video link below.</p>
              <form onSubmit={submitPost} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Video Link</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="https://.../video/..."
                      value={postModal.link}
                      onChange={(e) => setPostModal({ ...postModal, link: e.target.value })}
                      className="w-full bg-stone-50 p-3 pr-12 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm"
                    />
                    <button type="button" onClick={handlePaste} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Paste from clipboard">
                      <ClipboardPaste className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  {postModal.isEditing && (
                    <button
                      type="button"
                      disabled={postModal.saving}
                      onClick={handleDeletePost}
                      className="px-4 py-3 bg-red-50 text-red-500 rounded-2xl font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Delete post"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button type="button" onClick={() => setPostModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={postModal.saving || !postModal.link?.trim()} className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-2xl font-medium text-sm hover:bg-stone-800 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {postModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (postModal.isEditing ? 'Update Post' : 'Save Post')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TW</h1>
          </div>
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all"
            >
              <Download className="w-4 h-4" /> Install App
            </button>
          )}
          {handlerId && (
            <button
              onClick={() => {
                localStorage.removeItem('handlerId');
                window.location.href = '/';
              }}
              className="ml-2 flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all"
            >
              Log Out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-4 mb-2">
          {handlerName && <h2 className="text-3xl font-bold text-stone-900 tracking-tight leading-tight mb-2">Hello, {handlerName}!</h2>}
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-bold text-stone-900 tracking-tight">{todayDisplay}</h3>
            <div className="bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xl font-bold text-stone-900">{totalCompleted}</span>
              <span className="text-stone-400 font-medium mx-1">/</span>
              <span className="text-stone-400 font-medium">{totalSlots}</span>
              <span className="ml-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Posted</span>
            </div>
          </div>

          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalSlots > 0 ? (totalCompleted / totalSlots) * 100 : 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><Plus className="w-4 h-4 rotate-45" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accounts.map((accData, accIdx) => {
            const accId = accData.account._id || accData.account.id;
            return (
              <motion.div
                key={accId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: accIdx * 0.08 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <PlatformIcon platform={accData.account.platform} />
                    <div>
                      <span className="font-bold text-stone-900 tracking-tight">{accData.account.name || `@${accData.account.username}`}</span>
                      <span className="block text-[10px] text-stone-400 font-bold uppercase tracking-wider">{accData.account.ownerName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => {
                    const post = getPostForSlot(accData, i);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => handleCheckboxClick(accId, i)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${post ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-stone-50 text-stone-300 hover:bg-stone-100'
                            }`}
                        >
                          {post ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        {post && post.submittedAt && (
                          <span className="text-[7px] font-bold text-stone-400 uppercase tracking-tighter">
                            {format(new Date(post.submittedAt), 'hh:mm a')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3">
                  {accData.account.assetsLink && (
                    <a
                      href={accData.account.assetsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-2xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Assets
                    </a>
                  )}
                  {accData.account.description && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(accData.account.description).then(() => {
                          setCopiedAccountId(accId);
                          setTimeout(() => setCopiedAccountId(null), 2000);
                        });
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                        copiedAccountId === accId
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {copiedAccountId === accId ? (
                        <><Check className="w-3.5 h-3.5" /> Copied!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
