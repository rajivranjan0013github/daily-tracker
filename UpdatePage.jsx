import React, { useState, useEffect, useRef } from 'react';
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
  Link2,
  Check,
  Trash2,
  Upload,
  CloudUpload,
  FolderUp,
  Send,
  CheckCheck,
  RefreshCw,
  BarChart3,
  Bell,
  BellOff,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

// Clipboard helper — works on HTTPS and HTTP (local network)
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      resolve();
    } catch (e) {
      reject(e);
    } finally {
      document.body.removeChild(ta);
    }
  });
}

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

const ProfileLinkButton = ({ username, platform }) => {
  if (!username) return null;

  const getUrl = () => {
    switch (platform) {
      case 'instagram': return `https://www.instagram.com/${username}/`;
      case 'facebook': return `https://www.facebook.com/${username}`;
      case 'youtube': return `https://www.youtube.com/@${username}`;
      case 'tiktok': return `https://www.tiktok.com/@${username}`;
      default: return `https://www.instagram.com/${username}/`;
    }
  };

  return (
    <a
      href={getUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Open profile"
      className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-900 transition-all font-sans"
    >
      <ExternalLink className="w-4 h-4" />
    </a>
  );
};


const API_BASE_URL = '/api';

const VAPID_PUBLIC_KEY = 'BHJA3mAcYm1zwyt7o4DrY6n5r9OWevS4Xhc-DWODqJk2sQEGoDh9grbHwsWP1pgwNcPKyZSFoWJYlRyPJReEwlU';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

const REMINDER_TIMES = [
  { label: '9:00 AM', value: '09:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '3:00 PM', value: '15:00' },
  { label: '6:00 PM', value: '18:00' },
  { label: '9:00 PM', value: '21:00' },
];

const NotificationPanel = ({ handlerId, onClose }) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [times, setTimes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notifTimes') || '[]'); } catch { return []; }
  });
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    setEnabled(localStorage.getItem('notifEnabled') === 'true');
  }, []);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        alert('Notification permission denied. Please enable it in browser settings.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handlerId, subscription: sub.toJSON() }),
      });
      if (times.length > 0) {
        await fetch(`${API_BASE_URL}/notifications/times`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handlerId, times }),
        });
      }
      localStorage.setItem('notifEnabled', 'true');
      localStorage.setItem('notifEndpoint', sub.endpoint);
      setEnabled(true);
    } catch (err) {
      alert('Failed to enable notifications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const endpoint = localStorage.getItem('notifEndpoint');
      if (endpoint) {
        await fetch(`${API_BASE_URL}/notifications/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handlerId, endpoint }),
        });
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      localStorage.removeItem('notifEnabled');
      localStorage.removeItem('notifEndpoint');
      setEnabled(false);
    } catch (err) {
      alert('Failed to disable: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTimes = async (newTimes) => {
    setTimes(newTimes);
    localStorage.setItem('notifTimes', JSON.stringify(newTimes));
    if (enabled && handlerId) {
      await fetch(`${API_BASE_URL}/notifications/times`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handlerId, times: newTimes }),
      });
    }
  };

  const toggleTime = (value) => {
    const next = times.includes(value) ? times.filter(t => t !== value) : [...times, value];
    saveTimes(next);
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-72 bg-white border border-stone-200 rounded-2xl shadow-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-stone-900">Post Reminders</span>
        <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {permissionState === 'denied' ? (
        <p className="text-xs text-red-500 font-medium">Notifications are blocked. Enable them in your browser site settings.</p>
      ) : (
        <button
          onClick={enabled ? unsubscribe : subscribe}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
            enabled
              ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              : 'bg-stone-900 text-white hover:bg-stone-700'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : enabled ? (
            <><BellOff className="w-4 h-4" /> Turn Off Reminders</>
          ) : (
            <><Bell className="w-4 h-4" /> Enable Reminders</>
          )}
        </button>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Remind me at (IST)</p>
        <div className="flex flex-wrap gap-2">
          {REMINDER_TIMES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => toggleTime(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                times.includes(value)
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-stone-400">Select times → then Enable Reminders</p>
      </div>
    </div>
  );
};
 
const Header = ({
  handlerId,
  handlerName,
  isAdmin,
  setIsAdmin,
  handlerData,
  deferredPrompt,
  handleInstallClick,
  onLogout,
  accounts = []
}) => {
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const notifEnabled = localStorage.getItem('notifEnabled') === 'true';

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TW</h1>
          {handlerName && accounts.length === 0 && (
            <span className="text-stone-400 text-xs font-medium ml-2">/ {handlerName}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all"
            >
              <Download className="w-4 h-4" /> Install App
            </button>
          )}

          {handlerId && (
            <div className="relative">
              <button
                onClick={() => setNotifPanelOpen(o => !o)}
                title="Post reminders"
                className={`p-2 rounded-xl transition-all ${notifEnabled ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                {notifEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              {notifPanelOpen && (
                <NotificationPanel handlerId={handlerId} onClose={() => setNotifPanelOpen(false)} />
              )}
            </div>
          )}

          {handlerId && (
            <>
              {isAdmin && (
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              )}
              <button
                onClick={async () => {
                  if (!handlerData?.id) return;
                  try {
                    const nextStatus = !isAdmin;
                    const res = await fetch(`${API_BASE_URL}/handlers/${handlerData.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ isAdmin: nextStatus })
                    });
                    if (res.ok) {
                      setIsAdmin(nextStatus);
                      alert(nextStatus ? 'Promoted to Admin!' : 'Demoted to Handler');
                    }
                  } catch (err) {
                    alert('Failed to update: ' + err.message);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-stone-900 text-white'} rounded-xl text-[10px] font-bold hover:opacity-90 transition-all`}
              >
                {isAdmin ? '🛡️ Admin' : '💎 Go Admin'}
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all"
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default function UpdatePage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postModal, setPostModal] = useState({ 
    isOpen: false, 
    accId: '', 
    index: 0, 
    link: '', 
    saving: false, 
    isEditing: false,
    assetsLink: '',
    videoIndex: 1,
    directLink: ''
  });
  const [inputId, setInputId] = useState('');
  const [handlerName, setHandlerName] = useState('');
  const [captionCopied, setCaptionCopied] = useState({});
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [uploadState, setUploadState] = useState({});
  const [sharingAccId, setSharingAccId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [handlerData, setHandlerData] = useState(null); // { id, name }
  // Preloaded video blobs keyed by accId: { blob, videoNumber }
  const preloadedBlobs = useRef({});
  // Preloaded captions keyed by accId: { text, videoNumber }
  const preloadedCaptions = useRef({});
  const [pendingDone, setPendingDone] = useState(() => {
    try {
      const saved = localStorage.getItem('pendingDone');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load pendingDone from localStorage", e);
      return {};
    }
  }); // { [accId]: videoNumber } — tracks accounts awaiting "Mark Done"

  // Sync pendingDone to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pendingDone', JSON.stringify(pendingDone));
  }, [pendingDone]);

  // Preload the next video blob for each account directly from Cloudflare.
  // account.r2Prefix is the full https:// public CDN URL — no proxy, no Vercel involved.
  useEffect(() => {
    if (!accounts.length) return;
    let cancelled = false;

    const preload = async () => {
      for (const { account } of accounts) {
        if (cancelled) break;
        const accId = account._id || account.id;
        const videoNumber = account.videoIndex || 1;
        const videoCount = account.videoCount || 0;
        if (videoNumber > videoCount) continue;

        // Skip if we already have a fresh blob for this exact video number
        const existing = preloadedBlobs.current[accId];
        if (existing && existing.videoNumber === videoNumber) continue;

        const prefix = account.r2Prefix?.startsWith('http')
          ? account.r2Prefix.replace(/\/+$/, '')
          : null;
        if (!prefix) continue;

        try {
          const videoRes = await fetch(`${prefix}/${videoNumber}.mp4`);
          if (cancelled || !videoRes.ok) continue;
          const blob = await videoRes.blob();
          if (cancelled) break;
          preloadedBlobs.current[accId] = { blob, videoNumber };
        } catch {
          // Non-fatal — handlePostNext will fetch on demand
        }

        // Preload caption so it can be copied synchronously on button tap
        try {
          const capRes = await fetch(`${API_BASE_URL}/accounts/${accId}/caption/${videoNumber}`);
          if (!cancelled && capRes.ok) {
            const capData = await capRes.json();
            if (capData.caption) {
              preloadedCaptions.current[accId] = { text: capData.caption, videoNumber };
            }
          }
        } catch {
          // Non-fatal
        }
      }
    };

    preload();
    return () => { cancelled = true; };
  }, [accounts]);

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
        if (!Array.isArray(data) && data.handler) {
          setHandlerName(data.handler.name);
          setIsAdmin(data.handler.isAdmin);
          setHandlerData(data.handler);
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

  const handleVideoUpload = async (accId, files) => {
    if (!files || files.length === 0) return;
    const accData = accounts.find(a => (a.account._id || a.account.id) === accId);
    if (!accData) return;

    const allFiles = Array.from(files);

    // Filter to only video files and sort by name for consistent ordering
    const videoFiles = allFiles
      .filter(f => f.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Extract caption .txt files and map by base filename
    const captionMap = {};
    const txtFiles = allFiles.filter(f => /\.txt$/i.test(f.name));
   
    txtFiles.forEach(f => {
      const baseName = f.name.replace(/\.[^.]+$/, '');
      captionMap[baseName] = f;
    });

    // If no videos but there are captions, upload captions standalone
    if (videoFiles.length === 0 && txtFiles.length > 0) {
      setUploadState(prev => ({
        ...prev,
        [accId]: { progress: 0, uploading: true, error: '', success: '', current: 1, total: txtFiles.length }
      }));
      try {
        for (let i = 0; i < txtFiles.length; i++) {
          const tf = txtFiles[i];
          const videoNumber = tf.name.replace(/\.txt$/i, ''); // e.g., "14.txt" → "14"
          setUploadState(prev => ({
            ...prev,
            [accId]: { ...prev[accId], current: i + 1, progress: Math.round(((i) / txtFiles.length) * 100) }
          }));
          const capRes = await fetch(`${API_BASE_URL}/accounts/${accId}/caption-upload-url?videoNumber=${videoNumber}`);
          if (capRes.ok) {
            const { uploadUrl: capUploadUrl } = await capRes.json();
            await fetch(capUploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'text/plain' },
              body: tf,
            });
          }
        }
        const msg = `${txtFiles.length} caption${txtFiles.length > 1 ? 's' : ''} uploaded!`;
        setUploadState(prev => ({ ...prev, [accId]: { progress: 100, uploading: false, error: '', success: msg, current: txtFiles.length, total: txtFiles.length } }));
        setTimeout(() => setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], success: '' } })), 4000);
      } catch (err) {
        setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], uploading: false, error: err.message } }));
      }
      return;
    }

    if (videoFiles.length === 0) return;

    const total = videoFiles.length;
    setUploadState(prev => ({
      ...prev,
      [accId]: { progress: 0, uploading: true, error: '', success: '', current: 1, total }
    }));

    let lastVideoNumber = 0;
    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        const fileNum = i + 1;

        setUploadState(prev => ({
          ...prev,
          [accId]: { ...prev[accId], current: fileNum, progress: 0 }
        }));

        // Step 1: Get presigned URL
        const res = await fetch(`${API_BASE_URL}/accounts/${accId}/upload-url?filename=${encodeURIComponent(file.name)}`);
        if (!res.ok) throw new Error(`Failed to get upload URL for file ${fileNum}`);
        const { uploadUrl, videoNumber } = await res.json();

        // Step 2: Upload file directly to R2 with progress
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], progress: pct } }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed for file ${fileNum}: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error(`Network error uploading file ${fileNum}`));
          xhr.send(file);
        });

        // Step 3: Confirm upload
        await fetch(`${API_BASE_URL}/accounts/${accId}/confirm-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoNumber }),
        });

        // Step 4: Upload matching caption if exists
        const videoBaseName = file.name.replace(/\.[^.]+$/, '');
        const captionFile = captionMap[videoBaseName];
        if (captionFile) {
          try {
            const capRes = await fetch(`${API_BASE_URL}/accounts/${accId}/caption-upload-url?videoNumber=${videoNumber}`);
            if (capRes.ok) {
              const { uploadUrl: capUploadUrl } = await capRes.json();
              await fetch(capUploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/plain' },
                body: captionFile,
              });
            }
          } catch (capErr) {
            console.warn(`Caption upload failed for video #${videoNumber}:`, capErr);
          }
        }

        lastVideoNumber = videoNumber;

        // Update local state progressively
        setAccounts(prev => prev.map(a => {
          if ((a.account._id || a.account.id) !== accId) return a;
          return { ...a, account: { ...a.account, videoCount: videoNumber } };
        }));
      }

      const captionCount = videoFiles.filter(f => captionMap[f.name.replace(/\.[^.]+$/, '')]).length;
      const capSuffix = captionCount > 0 ? ` + ${captionCount} caption${captionCount > 1 ? 's' : ''}` : '';
      const msg = total === 1 ? `Video #${lastVideoNumber} uploaded!${capSuffix}` : `${total} videos uploaded! (#${lastVideoNumber - total + 1} → #${lastVideoNumber})${capSuffix}`;
      setUploadState(prev => ({ ...prev, [accId]: { progress: 100, uploading: false, error: '', success: msg, current: total, total } }));
      setTimeout(() => setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], success: '' } })), 4000);
    } catch (err) {
      setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], uploading: false, error: err.message } }));
    }
  };

  const handlePostNext = async (accId) => {
    // Copy caption synchronously within the user gesture — MUST be before any await
    const preloadedCaption = preloadedCaptions.current[accId];
    if (preloadedCaption) {
      copyToClipboard(preloadedCaption.text)
        .then(() => {
          setCaptionCopied(prev => ({ ...prev, [accId]: true }));
          setTimeout(() => setCaptionCopied(prev => { const n = { ...prev }; delete n[accId]; return n; }), 5000);
        })
        .catch(e => console.warn('Caption copy failed:', e));
    }

    setSharingAccId(accId);
    try {
      // Step 1: Get video info WITHOUT advancing pointer
      const res = await fetch(`${API_BASE_URL}/accounts/${accId}/next-video`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to get next video');
        setSharingAccId(null);
        return;
      }

      const videoNumber = data.currentVideoNumber;

      // Step 1.5: If no preloaded caption, try async fallback (works on desktop/Chrome)
      if (!preloadedCaption) {
        try {
          const captionRes = await fetch(`${API_BASE_URL}/accounts/${accId}/caption/${videoNumber}`);
          const captionData = await captionRes.json();
          if (captionData.caption) {
            await copyToClipboard(captionData.caption);
            setCaptionCopied(prev => ({ ...prev, [accId]: true }));
            setTimeout(() => setCaptionCopied(prev => { const n = { ...prev }; delete n[accId]; return n; }), 5000);
          }
        } catch (captionErr) {
          console.warn('Could not fetch/copy caption:', captionErr);
        }
      }

      // Step 2: Try native share if on HTTPS (production)
      if (window.isSecureContext && navigator.share) {
        try {
          // Use preloaded blob if available, otherwise fetch directly from Cloudflare
          let blob = null;
          const preloaded = preloadedBlobs.current[accId];
          if (preloaded && preloaded.videoNumber === videoNumber) {
            blob = preloaded.blob;
          } else {
            // data.videoUrl is the direct Cloudflare public URL — no Vercel proxy needed
            const videoRes = await fetch(data.videoUrl);
            if (videoRes.ok) blob = await videoRes.blob();
          }

          if (blob) {
            const fileName = `video_${videoNumber}.mp4`;
            const file = new File([blob], fileName, { type: 'video/mp4' });

            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title: fileName });
              // Share sheet opened — mark as pending done
              setPendingDone(prev => ({ ...prev, [accId]: videoNumber }));
              // Invalidate preload so the next video gets preloaded
              delete preloadedBlobs.current[accId];
              delete preloadedCaptions.current[accId];
              setSharingAccId(null);
              return;
            }
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // User cancelled share — still mark as pending so they can retry or confirm
            setPendingDone(prev => ({ ...prev, [accId]: videoNumber }));
            delete preloadedBlobs.current[accId];
            delete preloadedCaptions.current[accId];
            setSharingAccId(null);
            return;
          }
          console.error('Share failed:', shareErr);
        }
      }

      // Step 3: Fallback — open video URL directly
      window.open(data.videoUrl, '_blank');
      // Mark as pending done
      setPendingDone(prev => ({ ...prev, [accId]: videoNumber }));
      setSharingAccId(null);
    } catch (err) {
      setError(err.message);
      setSharingAccId(null);
    }
  };

  const handleMarkDone = async (accId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${accId}/next-video/mark-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to mark video as done');
        return;
      }

      // Update local state — advance the pointer AND add the new post record
      setAccounts(prev => prev.map(a => {
        if ((a.account._id || a.account.id) !== accId) return a;
        
        const updatedPosts = [...a.posts];
        if (data.post) {
          const existingIdx = updatedPosts.findIndex(p => p.index === data.post.index);
          if (existingIdx > -1) {
            updatedPosts[existingIdx] = data.post;
          } else {
            updatedPosts.push(data.post);
          }
        }

        return { 
          ...a, 
          account: { ...a.account, videoIndex: data.nextVideoNumber },
          posts: updatedPosts
        };
      }));

      // Clear pending state
      setPendingDone(prev => {
        const next = { ...prev };
        delete next[accId];
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNotPosted = (accId) => {
    // Video wasn't posted — keep the pointer where it is, just dismiss the pending state
    setPendingDone(prev => {
      const next = { ...prev };
      delete next[accId];
      return next;
    });
  };

  const handleLinkR2 = async (accId) => {
    const accData = accounts.find(a => (a.account._id || a.account.id) === accId);
    if (!accData) return;
    const currentPrefix = accData.account.r2Prefix || '';
    const input = prompt(
      `Link Cloudflare R2 folder to @${accData.account.username}\n\nEnter the FULL Cloudflare URL (e.g., https://content.thethousandways.com/folder_name):`,
      currentPrefix
    );
    if (input === null) return; // cancelled
    const r2Prefix = input.trim();
    if (!r2Prefix || !r2Prefix.startsWith('https://')) {
      setError('A full Cloudflare URL starting with https:// is required');
      return;
    }

    // Ask for video count separately — each account tracks its own count
    const countInput = prompt(
      `How many videos are in the "${r2Prefix}" folder?\n\n(Leave blank to AUTO-DETECT from folder)`,
      ''
    );
    if (countInput === null) return; // cancelled

    const body = { r2Prefix };
    if (countInput.trim() !== '') {
      const parsed = parseInt(countInput.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        body.videoCount = parsed;
      }
    }

    // Ask for video index (the pointer)
    const indexInput = prompt(
      `Starting Video Index (which video to post next)?\n\n(Leave blank to keep current index: ${accData.account.videoIndex || 1})`,
      ''
    );
    if (indexInput === null) return; // cancelled
    if (indexInput.trim() !== '') {
      const parsed = parseInt(indexInput.trim(), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        body.videoIndex = parsed;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/accounts/${accId}/link-r2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to link R2 directory');
        return;
      }

      if (data.warning) {
        alert(data.warning);
      } else {
        const countMsg = data.videoCount !== undefined ? ` (Detected ${data.videoCount} videos)` : '';
      }
      // Update local state
      setAccounts(prev => prev.map(a => {
        if ((a.account._id || a.account.id) !== accId) return a;
        return { 
          ...a, 
          account: { 
            ...a.account, 
            r2Prefix: data.r2Prefix, 
            videoCount: data.videoCount,
            videoIndex: data.videoIndex 
          } 
        };
      }));
    } catch (err) {
      setError(err.message);
    }
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
      assetsLink: accData.account.assetsLink || '',
      videoIndex: accData.account.videoIndex || 1,
      directLink: (!existingPost && accData.account.videoQueue?.length > 0) ? accData.account.videoQueue[0] : '',
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

      // Increment videoIndex & handle Queue after a new post
      if (!postModal.isEditing) {
        const updateData = {};
        if (postModal.assetsLink) updateData.videoIndex = (postModal.videoIndex || 1) + 1;
        
        const accData = accounts.find(a => (a.account._id || a.account.id) === postModal.accId);
        if (accData && accData.account.videoQueue?.length > 0 && postModal.directLink === accData.account.videoQueue[0]) {
          updateData.videoQueue = accData.account.videoQueue.slice(1);
        }

        if (Object.keys(updateData).length > 0) {
          await fetch(`${API_BASE_URL}/accounts/${postModal.accId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          });
          setAccounts(prev => prev.map(a => {
            if ((a.account._id || a.account.id) !== postModal.accId) return a;
            return { ...a, account: { ...a.account, ...updateData } };
          }));
        }
      }
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
        <Header 
          handlerId={handlerId}
          deferredPrompt={deferredPrompt}
          handleInstallClick={handleInstallClick}
          accounts={accounts}
        />
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
        <Header 
          handlerId={handlerId}
          handlerName={handlerName}
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
          handlerData={handlerData}
          deferredPrompt={deferredPrompt}
          handleInstallClick={handleInstallClick}
          accounts={accounts}
          onLogout={() => {
            localStorage.removeItem('handlerId');
            window.location.href = '/';
          }}
        />
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
              <h3 className="text-2xl font-bold tracking-tight text-center text-stone-900 mb-2">Post Video #{postModal.videoIndex}</h3>
              <p className="text-stone-400 text-xs text-center font-medium mb-8">@{accounts.find(a => (a.account._id || a.account.id) === postModal.accId)?.account.username}</p>

              {/* Sequential Posting Actions */}
              {!postModal.isEditing && (postModal.assetsLink || postModal.directLink) && (
                <div className="space-y-3 mb-8">
                  <a
                    href={postModal.directLink || postModal.assetsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all group"
                  >
                    <ExternalLink className="w-5 h-5" />
                    {postModal.directLink ? `Open Direct Video #${postModal.videoIndex}` : `Open Folder for Video #${postModal.videoIndex}`}
                  </a>
                  
                  <a
                    href={(() => {
                      const accData = accounts.find(a => (a.account._id || a.account.id) === postModal.accId);
                      if (accData?.account.platform === 'instagram') return 'https://www.instagram.com/reels/create/';
                      if (accData?.account.platform === 'tiktok') return 'https://www.tiktok.com/upload';
                      if (accData?.account.platform === 'youtube') return 'https://studio.youtube.com/';
                      return '#';
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Open {accounts.find(a => (a.account._id || a.account.id) === postModal.accId)?.account.platform || 'Platform'}
                  </a>
                </div>
              )}

              <form onSubmit={submitPost} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Paste Final Video Link</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="https://.../video/..."
                      value={postModal.link}
                      onChange={(e) => setPostModal({ ...postModal, link: e.target.value })}
                      className="w-full bg-stone-50 p-4 pr-12 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm font-medium"
                    />
                    <button type="button" onClick={handlePaste} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Paste from clipboard">
                      <ClipboardPaste className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPostModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-4 bg-stone-100 text-stone-400 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-colors uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={postModal.saving || !postModal.link?.trim()} className="flex-[2] px-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm hover:bg-stone-800 shadow-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                    {postModal.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (postModal.isEditing ? 'Update Tracking' : 'Confirm Tracked')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Header 
        handlerId={handlerId}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        handlerData={handlerData}
        deferredPrompt={deferredPrompt}
        handleInstallClick={handleInstallClick}
        accounts={accounts}
        onLogout={() => {
          localStorage.removeItem('handlerId');
          window.location.href = '/';
        }}
      />

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
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlatformIcon platform={accData.account.platform} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-stone-900 tracking-tight truncate">{accData.account.name || `@${accData.account.username}`}</span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider truncate">{accData.account.ownerName}</span>
                    </div>
                  </div>

                  {/* Unified Action Cluster */}
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <ProfileLinkButton username={accData.account.username} platform={accData.account.platform} />

                    {/* Compact Plus Icon Upload */}
                    {isAdmin && (
                      <label className={`cursor-pointer p-1.5 rounded-full transition-all ${uploadState[accId]?.uploading ? 'text-indigo-600 bg-indigo-50' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'}`}>
                        <input
                          type="file"
                          className="hidden"
                          disabled={uploadState[accId]?.uploading}
                          {...{ webkitdirectory: '', directory: '' }}
                          onChange={(e) => {
                            if (e.target.files?.length) handleVideoUpload(accId, e.target.files);
                            e.target.value = '';
                          }}
                        />
                        {uploadState[accId]?.uploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </label>
                    )}

                    {/* Link R2 folder */}
                    {isAdmin && (
                      <button
                        onClick={() => handleLinkR2(accId)}
                        title={accData.account.r2Prefix
                          ? `Linked Storage: ${accData.account.r2Prefix}${accData.account.r2Prefix.endsWith('/') ? '' : '/'}`
                          : `Default Storage: https://content.thethousandways.com/${accData.account.username}/`}
                        className={`p-1.5 rounded-full transition-all ${accData.account.r2Prefix
                            ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                            : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
                          }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (confirm(`Delete account @${accData.account.username}?`)) {
                            fetch(`${API_BASE_URL}/accounts/${accId}`, { method: 'DELETE' })
                              .then(res => res.ok && setAccounts(prev => prev.filter(a => (a.account._id || a.account.id) !== accId)));
                          }
                        }} 
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-red-500 transition-all" 
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                {/* Upload section */}
                {(() => {
                  const us = uploadState[accId];
                  return (
                    <div className="mt-3 space-y-2">
                      {us?.uploading && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-stone-500">
                              {us.total > 1 ? `File ${us.current}/${us.total}` : 'Uploading...'}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-600">{us.progress}%</span>
                          </div>
                          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${us.progress}%` }}
                              className="h-full bg-indigo-500 rounded-full"
                            />
                          </div>
                        </>
                      )}
                      {us?.error && (
                        <p className="text-[10px] font-bold text-red-500 text-center">{us.error}</p>
                      )}
                      {us?.success && (
                        <p className="text-[10px] font-bold text-emerald-500 text-center">{us.success}</p>
                      )}
                    </div>
                  );
                })()}

                <div className="flex gap-2 mt-3">
                  {/* Post Next Video — two-step: Post opens video, Mark Done advances pointer */}
                  {(accData.account.videoCount || 0) > 0 && (
                    pendingDone[accId] ? (
                      // Step 2: Not Posted or Mark Done
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => handleNotPosted(accId)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all bg-stone-400 text-white hover:bg-stone-500 active:scale-95"
                        >
                          <X className="w-4 h-4" />
                          Not Posted
                        </button>
                        <button
                          onClick={() => handleMarkDone(accId)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100 active:scale-95 animate-pulse"
                        >
                          <CheckCheck className="w-4 h-4" />
                          Mark #{pendingDone[accId]} Done ✓
                        </button>
                      </div>
                    ) : (
                      // Step 1: Open / Share video
                      <button
                        onClick={() => handlePostNext(accId)}
                        disabled={(accData.account.videoIndex || 1) > (accData.account.videoCount || 0) || sharingAccId === accId}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                          (accData.account.videoIndex || 1) > (accData.account.videoCount || 0)
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            : sharingAccId === accId
                              ? 'bg-emerald-500 text-white cursor-wait'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 active:scale-95'
                        }`}
                      >
                        {sharingAccId === accId ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Post #{accData.account.videoIndex || 1}
                            <span className="text-[9px] opacity-70">({(accData.account.videoCount || 0) - (accData.account.videoIndex || 1) + 1} left)</span>
                          </>
                        )}
                      </button>
                    )
                  )}
                  {captionCopied[accId] && (
                    <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-bold">
                      <Check className="w-4 h-4" />
                      Caption copied!
                    </div>
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
