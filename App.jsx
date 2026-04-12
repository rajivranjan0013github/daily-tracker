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
  Eye,
  Copy,
  Check,
  Facebook,
  Youtube,
  ExternalLink,
  Pencil,
  CloudUpload,
  Link2,
  FolderUp,
  Send,
  CheckCheck,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram, gradient: 'from-purple-500 via-pink-500 to-orange-400' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, gradient: 'from-blue-600 to-blue-400' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, gradient: 'from-red-600 to-red-400' },
  { value: 'tiktok', label: 'TikTok', icon: Layers, gradient: 'from-stone-900 via-cyan-500 to-pink-500' },
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

const API_BASE_URL = '/api';

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

function ProfileLinkButton({ username, platform }) {
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
      className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-stone-900 transition-all"
    >
      <ExternalLink className="w-4 h-4" />
    </a>
  );
}

function InstaTrackApp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  
  // Account Form State
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountOwnerName, setNewAccountOwnerName] = useState('');
  const [newAccountPlatform, setNewAccountPlatform] = useState('instagram');
  const [newAccountAssetsLink, setNewAccountAssetsLink] = useState('');
  const [newAccountDescription, setNewAccountDescription] = useState('');
  const [newAccountHandlerId, setNewAccountHandlerId] = useState('');
  
  // Handler Form State
  const [handlers, setHandlers] = useState([]);
  const [newHandlerName, setNewHandlerName] = useState('');
  const [newHandlerId, setNewHandlerId] = useState('');
  
  // UI State
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isAddingHandler, setIsAddingHandler] = useState(false);
  const [isHandlerDropdownOpen, setIsHandlerDropdownOpen] = useState(false);
  const [selectedFilterHandlerId, setSelectedFilterHandlerId] = useState('all');
  const [copiedAccountId, setCopiedAccountId] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });
  const [postModal, setPostModal] = useState({
    isOpen: false,
    accountId: '',
    date: '',
    index: 0,
    link: '',
    isEditing: false,
    assetsLink: '',
    videoIndex: 1,
  });
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    account: null,
  });
  const [historyTab, setHistoryTab] = useState('history');
  const [editModal, setEditModal] = useState({
    isOpen: false,
    account: null,
    username: '',
    name: '',
    ownerName: '',
    platform: 'instagram',
    handlerId: '',
    assetsLink: '',
    description: '',
  });
  
  const [uploadState, setUploadState] = useState({});
  const [sharingAccId, setSharingAccId] = useState(null);
  const [pendingDone, setPendingDone] = useState(() => {
    try {
      const saved = localStorage.getItem('pendingDone');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load pendingDone from localStorage", e);
      return {};
    }
  });

  // Sync pendingDone to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pendingDone', JSON.stringify(pendingDone));
  }, [pendingDone]);

  const fetchData = async () => {
    try {
      setError(null);
      const [projs, accs, psts, hndlrs] = await Promise.all([
        api.getProjects(),
        api.getAccounts(),
        api.getPosts(),
        api.getHandlers()
      ]);

      setProjects(Array.isArray(projs) ? projs : []);
      setAccounts(Array.isArray(accs) ? accs : []);
      setPosts(Array.isArray(psts) ? psts : []);
      setHandlers(Array.isArray(hndlrs) ? hndlrs : []);

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

  const addHandler = async (e) => {
    e.preventDefault();
    if (!newHandlerName.trim() || !newHandlerId.trim()) return;
    try {
      const newHndlr = await api.addHandler(newHandlerName.trim(), newHandlerId.trim());
      setHandlers([...handlers, newHndlr]);
      setNewHandlerName('');
      setNewHandlerId('');
      setIsAddingHandler(false);
    } catch (error) {
      handleAppError(error);
    }
  };

  const deleteHandler = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Handler',
      message: 'Are you sure? This will not delete their accounts, but they will be unassigned.',
      onConfirm: async () => {
        try {
          await api.deleteHandler(id);
          setHandlers(handlers.filter(h => (h.id || h._id) !== id));
          setAccounts(accounts.map(a => a.handlerId === id ? { ...a, handlerId: null } : a));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleAppError(error);
        }
      }
    });
  };

  const addAccount = async (e) => {
    e.preventDefault();
    if (!newAccountUsername.trim() || !newAccountOwnerName.trim() || !selectedProjectId || !newAccountHandlerId) return;
    try {
      const newAcc = await api.addAccount({
        username: newAccountUsername.trim().replace(/^@/, ''),
        name: newAccountName.trim(),
        ownerName: newAccountOwnerName.trim(),
        platform: newAccountPlatform,
        projectId: selectedProjectId,
        handlerId: newAccountHandlerId,
        assetsLink: newAccountAssetsLink.trim(),
        description: newAccountDescription.trim(),
      });
      setAccounts([...accounts, newAcc]);
      setNewAccountUsername('');
      setNewAccountName('');
      setNewAccountOwnerName('');
      setNewAccountPlatform('instagram');
      setNewAccountAssetsLink('');
      setNewAccountDescription('');
      setIsAddingAccount(false);
    } catch (error) {
      handleAppError(error);
    }
  };

  const openEditModal = (acc) => {
    setEditModal({
      isOpen: true,
      account: acc,
      username: acc.username || '',
      name: acc.name || '',
      ownerName: acc.ownerName || '',
      platform: acc.platform || 'instagram',
      handlerId: acc.handlerId || '',
      assetsLink: acc.assetsLink || '',
      description: acc.description || '',
    });
  };

  const submitEditAccount = async (e) => {
    e.preventDefault();
    if (!editModal.account) return;
    const accId = editModal.account.id || editModal.account._id;
    try {
      const updated = await api.updateAccount(accId, {
        username: editModal.username.trim().replace(/^@/, ''),
        name: editModal.name.trim(),
        ownerName: editModal.ownerName.trim(),
        platform: editModal.platform,
        handlerId: editModal.handlerId || undefined,
        assetsLink: editModal.assetsLink.trim(),
        description: editModal.description.trim(),
      });
      setAccounts(accounts.map(a => (a.id || a._id) === accId ? updated : a));
      setEditModal(prev => ({ ...prev, isOpen: false }));
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
    const acc = accounts.find(a => (a.id || a._id) === accId);
    setPostModal({
      isOpen: true,
      accountId: accId,
      date: date,
      index: index,
      link: existingPost?.link || '',
      isEditing: !!existingPost,
      assetsLink: acc?.assetsLink || '',
      videoIndex: acc?.videoIndex || 1,
    });
  };

  const handleDeletePost = async (accId, date, index) => {
    if (!confirm(`Are you sure you want to remove video post #${index}?`)) return;
    try {
      await api.deletePost(accId, date, index);
      setPosts(posts.filter(p => !(p.accountId === accId && p.date === date && p.index === index)));
      setPostModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      handleAppError(error);
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    try {
      const savedPost = await api.addPost({
        accountId: postModal.accountId,
        date: postModal.date,
        index: postModal.index,
        link: postModal.link,
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

      if (!postModal.isEditing) {
        const acc = accounts.find(a => (a.id || a._id) === postModal.accountId);
        if (acc && acc.assetsLink) {
          const updatedAcc = await api.updateAccount(acc.id || acc._id, {
            videoIndex: (acc.videoIndex || 1) + 1
          });
          setAccounts(prev => prev.map(a => (a.id || a._id) === (acc.id || acc._id) ? updatedAcc : a));
        }
      }
    } catch (error) {
      handleAppError(error);
    }
  };

  const handleLinkR2 = async (accId) => {
    const acc = accounts.find(a => (a.id || a._id) === accId);
    if (!acc) return;
    const currentPrefix = acc.r2Prefix || '';
    const input = prompt(
      `Link Cloudflare R2 folder to @${acc.username}\n\nEnter the FULL Cloudflare URL (e.g., https://content.thethousandways.com/folder_name):`,
      currentPrefix
    );
    if (input === null) return;
    const r2Prefix = input.trim();
    if (!r2Prefix || !r2Prefix.startsWith('https://')) {
      alert('A full Cloudflare URL starting with https:// is required');
      return;
    }

    const countInput = prompt(
      `How many videos are in the "${r2Prefix}" folder?\n\n(Leave blank to AUTO-DETECT from folder)`,
      ''
    );
    if (countInput === null) return;

    const body = { r2Prefix };
    if (countInput.trim() !== '') {
      const parsed = parseInt(countInput.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        body.videoCount = parsed;
      }
    }

    const indexInput = prompt(
      `Starting Video Index (which video to post next)?\n\n(Leave blank to keep current index: ${acc.videoIndex || 1})`,
      ''
    );
    if (indexInput === null) return;
    if (indexInput.trim() !== '') {
      const parsed = parseInt(indexInput.trim(), 10);
      if (!isNaN(parsed) && parsed >= 1) {
        body.videoIndex = parsed;
      }
    }

    try {
      const data = await api.linkR2(accId, body);
      if (data.warning) {
        alert(data.warning);
      }
      setAccounts(prev => prev.map(a => (a.id || a._id) === accId ? { ...a, ...data } : a));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVideoUpload = async (accId, files) => {
    if (!files || files.length === 0) return;
    const allFiles = Array.from(files);
    const videoFiles = allFiles
      .filter(f => f.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const captionMap = {};
    const txtFiles = allFiles.filter(f => /\.txt$/i.test(f.name));
    txtFiles.forEach(f => {
      const baseName = f.name.replace(/\.[^.]+$/, '');
      captionMap[baseName] = f;
    });

    if (videoFiles.length === 0 && txtFiles.length > 0) {
      setUploadState(prev => ({
        ...prev,
        [accId]: { progress: 0, uploading: true, error: '', success: '', current: 1, total: txtFiles.length }
      }));
      try {
        for (let i = 0; i < txtFiles.length; i++) {
          const tf = txtFiles[i];
          const videoNumber = tf.name.replace(/\.txt$/i, '');
          setUploadState(prev => ({
            ...prev,
            [accId]: { ...prev[accId], current: i + 1, progress: Math.round(((i) / txtFiles.length) * 100) }
          }));
          const { uploadUrl: capUploadUrl } = await api.getCaptionUploadUrl(accId, videoNumber);
          await fetch(capUploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: tf,
          });
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
        setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], current: fileNum, progress: 0 } }));
        const { uploadUrl, videoNumber } = await api.getUploadUrl(accId, file.name);

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
            else reject(new Error(`Upload failed: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error(`Network error`));
          xhr.send(file);
        });

        await api.confirmUpload(accId, videoNumber);

        const videoBaseName = file.name.replace(/\.[^.]+$/, '');
        const captionFile = captionMap[videoBaseName];
        if (captionFile) {
          try {
            const { uploadUrl: capUploadUrl } = await api.getCaptionUploadUrl(accId, videoNumber);
            await fetch(capUploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'text/plain' },
              body: captionFile,
            });
          } catch (capErr) {
            console.warn(`Caption upload failed:`, capErr);
          }
        }
        lastVideoNumber = videoNumber;
        setAccounts(prev => prev.map(a => (a.id || a._id) === accId ? { ...a, videoCount: videoNumber } : a));
      }
      const msg = total === 1 ? `Video #${lastVideoNumber} uploaded!` : `${total} videos uploaded! (#${lastVideoNumber - total + 1} → #${lastVideoNumber})`;
      setUploadState(prev => ({ ...prev, [accId]: { progress: 100, uploading: false, error: '', success: msg, current: total, total } }));
      setTimeout(() => setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], success: '' } })), 4000);
    } catch (err) {
      setUploadState(prev => ({ ...prev, [accId]: { ...prev[accId], uploading: false, error: err.message } }));
    }
  };

  const handlePostNext = async (accId) => {
    setSharingAccId(accId);
    try {
      const data = await api.getNextVideo(accId);
      const videoNumber = data.currentVideoNumber;

      try {
        const captionRes = await api.getCaption(accId, videoNumber);
        if (captionRes.caption) {
          await navigator.clipboard.writeText(captionRes.caption);
        }
      } catch (e) {
        console.warn('Could not copy caption:', e);
      }

      if (window.isSecureContext && navigator.share) {
        try {
          const videoRes = await fetch(`${API_BASE_URL}/accounts/${accId}/video/${videoNumber}`);
          if (videoRes.ok) {
            const blob = await videoRes.blob();
            const file = new File([blob], `video_${videoNumber}.mp4`, { type: 'video/mp4' });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title: `video_${videoNumber}.mp4` });
              setPendingDone(prev => ({ ...prev, [accId]: videoNumber }));
              setSharingAccId(null);
              return;
            }
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            setPendingDone(prev => ({ ...prev, [accId]: videoNumber }));
            setSharingAccId(null);
            return;
          }
        }
      }
      window.open(data.videoUrl, '_blank');
      setPendingDone(prev => ({ ...prev, [accId]: videoNumber }));
      setSharingAccId(null);
    } catch (err) {
      alert(err.message);
      setSharingAccId(null);
    }
  };

  const handleMarkDone = async (accId) => {
    try {
      const data = await api.markPostDone(accId, selectedDate);
      if (data.post) {
        setPosts(prev => {
          const exists = prev.findIndex(p => p.accountId === accId && p.date === selectedDate && p.index === data.post.index);
          if (exists > -1) {
            const next = [...prev];
            next[exists] = data.post;
            return next;
          }
          return [...prev, data.post];
        });
      }
      setAccounts(prev => prev.map(a => (a.id || a._id) === accId ? { ...a, videoIndex: data.nextVideoNumber } : a));
      setPendingDone(prev => {
        const next = { ...prev };
        delete next[accId];
        return next;
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const viewAccountHistory = (account) => {
    setHistoryTab('history');
    setHistoryModal({
      isOpen: true,
      account,
    });
  };

  const getPlatformId = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed.includes('.com')) return trimmed;
    const match = trimmed.match(/\/(reels?|p|video|shorts|share\/[rv])\/([^/?]+)/i);
    return match && match[2] ? match[2] : trimmed;
  };

  const getFullUrl = (id, platform) => {
    if (!id) return '#';
    const trimmed = id.trim();
    if (trimmed.startsWith('http')) return trimmed;
    if (platform === 'youtube') return `https://www.youtube.com/shorts/${trimmed}`;
    if (platform === 'facebook') return `https://www.facebook.com/share/r/${trimmed}/`;
    if (platform === 'tiktok') return `https://www.tiktok.com/@user/video/${trimmed}`;
    return `https://www.instagram.com/reels/${trimmed}/`;
  };

  const filteredAccounts = useMemo(() => {
    if (!selectedProjectId) return [];
    
    let accs = accounts;
    
    // If filtering by a specific handler, show all their accounts regardless of project
    // Otherwise, restrict to the selected project
    if (selectedFilterHandlerId === 'all' || selectedFilterHandlerId === 'unassigned') {
      accs = accs.filter(a => a.projectId === selectedProjectId);
    }
    
    if (selectedFilterHandlerId !== 'all') {
      if (selectedFilterHandlerId === 'unassigned') {
        accs = accs.filter(a => !a.handlerId);
      } else {
        accs = accs.filter(a => a.handlerId === selectedFilterHandlerId);
      }
    }
    
    return accs;
  }, [accounts, selectedProjectId, selectedFilterHandlerId]);

  const filteredHandlers = useMemo(() => {
    return handlers;
  }, [handlers]);

  const statsData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    }).map(d => format(d, 'yyyy-MM-dd'));

    return last7Days.map(date => {
      const dayPosts = posts.filter(p => p.date === date && (p.index || 0) <= 3 && filteredAccounts.some(a => (a.id || a._id) === p.accountId));
      const target = filteredAccounts.length * 3;
      return {
        date: format(new Date(date), 'MMM dd'),
        count: dayPosts.length,
        target: target
      };
    });
  }, [posts, filteredAccounts]);

  const todayStats = useMemo(() => {
    const todayPosts = posts.filter(p => p.date === selectedDate && (p.index || 0) <= 3 && filteredAccounts.some(a => (a.id || a._id) === p.accountId));
    const target = filteredAccounts.length * 3;
    const totalViews = todayPosts.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    return { count: todayPosts.length, target, totalViews };
  }, [posts, filteredAccounts, selectedDate]);

  const viewStats = useMemo(() => {
    const totalViews7d = filteredAccounts.reduce((sum, a) => sum + (a.viewsLast7Days || 0), 0);
    const lastSync = filteredAccounts.reduce((latest, a) => {
      if (!a.lastScrapedAt) return latest;
      const d = new Date(a.lastScrapedAt);
      return !latest || d > latest ? d : latest;
    }, null);
    return { totalViews7d, lastSync };
  }, [filteredAccounts]);

  const accountPosts = useMemo(() => {
    if (!historyModal.account) return [];
    const accId = historyModal.account.id || historyModal.account._id;
    return posts
      .filter(p => p.accountId === accId && (p.index || 0) <= 3)
      .sort((a, b) => b.date.localeCompare(a.date) || b.index - a.index);
  }, [posts, historyModal.account]);

  const accountScrapedPosts = useMemo(() => {
    if (!historyModal.account) return [];
    const accId = historyModal.account.id || historyModal.account._id;
    return posts
      .filter(p => p.accountId === accId && (p.index || 0) >= 100)
      .sort((a, b) => b.date.localeCompare(a.date));
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
                      const acc = accounts.find(a => (a.id || a._id) === postModal.accountId);
                      if (acc?.platform === 'instagram') return 'https://www.instagram.com/reels/create/';
                      if (acc?.platform === 'tiktok') return 'https://www.tiktok.com/upload';
                      if (acc?.platform === 'youtube') return 'https://studio.youtube.com/';
                      return '#';
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Open {accounts.find(a => (a.id || a._id) === postModal.accountId)?.platform || 'Platform'}
                  </a>
                </div>
              )}

              <form onSubmit={submitPost} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Paste Final Video Link</label>
                  <input autoFocus type="text" placeholder="https://instagram.com/p/..." value={postModal.link} onChange={(e) => setPostModal({ ...postModal, link: e.target.value })} className="w-full bg-stone-50 p-4 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm font-medium" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setPostModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-4 bg-stone-100 text-stone-400 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-colors uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-[2] px-4 py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm hover:bg-stone-800 shadow-xl transition-all uppercase tracking-widest">
                    {postModal.isEditing ? 'Update Tracking' : 'Confirm Tracked'}
                  </button>
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600 font-bold text-sm">@</div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-stone-900">@{historyModal.account?.username}</h3>
                    <p className="text-stone-400 text-xs font-bold uppercase tracking-widest leading-none mt-1">{historyModal.account?.ownerName}'s History</p>
                  </div>
                </div>
                <button onClick={() => setHistoryModal({ ...historyModal, isOpen: false })} className="p-2 hover:bg-stone-50 rounded-xl transition-colors"><Plus className="w-6 h-6 text-stone-400 rotate-45" /></button>
              </div>

              {/* Tab Toggle */}
              <div className="flex gap-1 p-1 bg-stone-100 rounded-2xl mb-6">
                <button
                  onClick={() => setHistoryTab('history')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${historyTab === 'history' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-700'}`}
                >
                  Post History
                </button>
                <button
                  onClick={() => setHistoryTab('analytics')}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${historyTab === 'analytics' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-700'}`}
                >
                  7-Day Analytics
                </button>
              </div>

              {historyTab === 'history' ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {accountScrapedPosts.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-stone-400 text-sm italic">No scraped data yet. Run the scraper with --sync.</p>
                      </div>
                    ) : (
                      accountScrapedPosts.map((post, idx) => (
                        <div key={idx} className="bg-stone-50 p-3 rounded-2xl border border-transparent hover:border-stone-200 hover:bg-stone-100 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{post.date}</span>
                                {post.isPinned && (
                                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">Pinned</span>
                                )}
                              </div>
                              {post.title && (
                                <p className="text-xs text-stone-600 line-clamp-1 mb-1" title={post.title}>{post.title}</p>
                              )}
                              {post.link || post.postId ? (
                                <a
                                  href={post.link || getFullUrl(post.postId, historyModal.account?.platform)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-stone-400 hover:text-stone-900 underline underline-offset-2 break-all"
                                >
                                  {post.link || post.postId}
                                </a>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="flex items-center gap-1 justify-end mb-1">
                                <Eye className="w-3 h-3 text-stone-400" />
                                <span className="text-sm font-bold text-stone-900">{(post.viewsCount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2 justify-end text-[10px] text-stone-400 font-medium">
                                <span>♥ {(post.likes || 0).toLocaleString()}</span>
                                <span>💬 {(post.comments || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {accountScrapedPosts.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-stone-100 grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="bg-stone-50 rounded-2xl p-3">
                        <p className="text-stone-400 font-bold uppercase tracking-widest mb-1">Views</p>
                        <p className="text-stone-900 font-bold text-base">{accountScrapedPosts.reduce((s, p) => s + (p.views || p.viewsCount || 0), 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-stone-50 rounded-2xl p-3">
                        <p className="text-stone-400 font-bold uppercase tracking-widest mb-1">Likes</p>
                        <p className="text-stone-900 font-bold text-base">{accountScrapedPosts.reduce((s, p) => s + (p.likes || 0), 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-stone-50 rounded-2xl p-3">
                        <p className="text-stone-400 font-bold uppercase tracking-widest mb-1">Comments</p>
                        <p className="text-stone-900 font-bold text-base">{accountScrapedPosts.reduce((s, p) => s + (p.comments || 0), 0).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 w-[200px]">
              <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center shadow-md">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block text-sm text-stone-400 font-medium tracking-tight">TW</div>
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
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-200 transition-all transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Updates Page
            </Link>
            <div className="hidden sm:block text-sm text-stone-400 font-medium tracking-tight">MERN Activity Tracker</div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {selectedProjectId ? (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-8"><h2 className="text-lg font-bold tracking-tight flex items-center gap-2"><BarChart3 className="w-5 h-5 text-stone-400" /> Weekly Performance</h2></div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a8a29e' }} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 100 0 / 0.1)' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.count >= entry.target && entry.target > 0 ? '#10b981' : '#1c1917'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-stone-900 text-white p-8 rounded-[32px] shadow-lg flex flex-col justify-between">
                <div>
                  <p className="text-stone-400 text-sm font-medium mb-1">Posts Remaining Today</p>
                  <h3 className="text-5xl font-bold tracking-tight mb-2">{Math.max(0, todayStats.target - todayStats.count).toLocaleString()}</h3>
                  <p className="text-stone-400 text-xs mt-4 mb-1 uppercase tracking-widest font-bold">Daily Progress</p>
                  <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden mb-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (todayStats.count / (todayStats.target || 1)) * 100)}%` }} className="h-full bg-emerald-500" />
                  </div>
                  <p className="text-xs text-stone-500">{todayStats.count} of {todayStats.target} completed</p>
                </div>
                <div className="pt-6 border-t border-stone-800 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1">Accounts</p>
                    <p className="text-2xl font-bold tracking-tight">{filteredAccounts.length}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-stone-700" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-8 rounded-[32px] shadow-sm border border-stone-200 flex flex-col justify-between">
                <div>
                  <p className="text-stone-400 text-sm font-medium mb-1">Views (Last 7 Days)</p>
                  <h3 className="text-5xl font-bold tracking-tight mb-2 text-stone-900">{viewStats.totalViews7d.toLocaleString()}</h3>
                  <p className="text-emerald-500 text-xs mt-4 mb-1 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Scraped Reels
                  </p>
                  <div className="mt-4 p-4 bg-stone-50 rounded-2xl">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Avg Views/Account</p>
                    <p className="text-lg font-bold text-stone-900">
                      {filteredAccounts.length > 0 ? Math.round(viewStats.totalViews7d / filteredAccounts.length).toLocaleString() : 0}
                    </p>
                  </div>
                </div>
                <div className="pt-6 border-t border-stone-100 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-1">Last Synced</p>
                    <p className="text-sm font-bold text-stone-900">
                      {viewStats.lastSync ? format(viewStats.lastSync, 'MMM dd, hh:mm a') : '—'}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                  </div>
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

              {/* Handler Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                <button
                  onClick={() => setSelectedFilterHandlerId('all')}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${selectedFilterHandlerId === 'all'
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
                    }`}
                >
                  All
                  {(() => {
                    const projAccounts = accounts.filter(a => a.projectId === selectedProjectId);
                    const projAccIds = projAccounts.map(a => a.id || a._id);
                    const completedCount = posts.filter(p => p.date === selectedDate && projAccIds.includes(p.accountId)).length;
                    const pendingCount = (projAccounts.length * 3) - completedCount;
                    if (pendingCount <= 0) return null;
                    return (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] bg-red-500 text-white animate-pulse ml-1.5`}>
                        {pendingCount}
                      </span>
                    );
                  })()}
                </button>
                {filteredHandlers.length > 0 && (
                  <div className="w-px h-6 bg-stone-200 mx-2 shrink-0 rounded-full" />
                )}
                {filteredHandlers.map(h => {
                  const id = h.id || h._id;
                  const isSelected = selectedFilterHandlerId === id;
                  const handlerAccounts = accounts.filter(a => a.projectId === selectedProjectId && a.handlerId === id);
                  const handlerAccIds = handlerAccounts.map(a => a.id || a._id);
                  const completedCount = posts.filter(p => p.date === selectedDate && handlerAccIds.includes(p.accountId)).length;
                  const pendingCount = (handlerAccounts.length * 3) - completedCount;

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedFilterHandlerId(id)}
                      className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 group ${isSelected
                          ? 'bg-stone-900 text-white shadow-md'
                          : 'bg-white text-stone-500 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'
                        }`}
                    >
                      {h.name}
                      <div className="flex items-center gap-1">
                        {pendingCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-red-500 text-white">
                            {pendingCount}
                          </span>
                        )}
                        {isSelected && (
                          <div className="flex items-center gap-0.5 ml-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${window.location.origin}/?h=${h.handleId}`;
                                navigator.clipboard.writeText(url).then(() => {
                                  alert(`Link copied for ${h.name}!`);
                                });
                              }}
                              className="p-1 hover:text-emerald-400 transition-colors text-white/40"
                              title="Copy handler link"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete handler "${h.name}"?`)) deleteHandler(id);
                              }}
                              className="p-1 hover:text-red-400 transition-colors text-white/40"
                              title="Delete handler"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Quick Add Handler Button */}
                <div className="flex items-center ml-2 border-l border-stone-200 pl-2">
                  <button onClick={() => setIsAddingHandler(true)} className="shrink-0 w-10 h-10 bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-all shadow-md group" title="Add Handler">
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAccounts.map((acc) => (
                  <motion.div key={acc.id || acc._id} layout className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 group">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Platform Icon with Edit overlay */}
                        <div className="cursor-pointer relative group/icon shrink-0" onClick={() => openEditModal(acc)} title="Edit account">
                          <PlatformIcon platform={acc.platform} />
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-200 opacity-0 group-hover/icon:opacity-100 transition-opacity">
                            <Pencil className="w-2.5 h-2.5 text-stone-500" />
                          </div>
                        </div>

                        {/* Account Info */}
                        <div className="flex flex-col min-w-0 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => viewAccountHistory(acc)}>
                          <span className="font-bold text-stone-900 tracking-tight truncate">{acc.name || `@${acc.username}`}</span>
                          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider truncate">
                            {(() => {
                              const hnd = acc.handlerId ? handlers.find(h => (h.id || h._id) === acc.handlerId) : null;
                              if (hnd && hnd.name.toLowerCase() === acc.ownerName.toLowerCase()) {
                                return hnd.name;
                              }
                              return `${acc.ownerName}${hnd ? ` • Handler: ${hnd.name}` : ''}`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Unified Action Cluster */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <ProfileLinkButton username={acc.username} platform={acc.platform} />
                        
                        {/* Folder Upload */}
                        <label className={`cursor-pointer p-1.5 rounded-full transition-all ${uploadState[acc.id || acc._id]?.uploading ? 'text-indigo-600 bg-indigo-50' : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'}`}>
                          <input
                            type="file"
                            className="hidden"
                            disabled={uploadState[acc.id || acc._id]?.uploading}
                            webkitdirectory="true"
                            directory="true"
                            onChange={(e) => {
                              if (e.target.files?.length) handleVideoUpload(acc.id || acc._id, e.target.files);
                              e.target.value = '';
                            }}
                          />
                          {uploadState[acc.id || acc._id]?.uploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </label>

                        {/* Link R2 folder */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLinkR2(acc.id || acc._id); }}
                          title="Link Cloudflare R2 folder"
                          className={`p-1.5 rounded-full transition-all ${
                            acc.r2Prefix
                              ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                              : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
                          }`}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>

                        <button onClick={() => deleteAccount(acc.id || acc._id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-300 hover:text-red-500 transition-all" title="Delete Account">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 7-Day Scraped Stats Badge */}
                    {(acc.viewsLast7Days > 0 || acc.lastScrapedAt) && (
                      <button
                        onClick={() => { setHistoryTab('analytics'); setHistoryModal({ isOpen: true, account: acc }); }}
                        className="w-full mb-4 flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-700">{(acc.viewsLast7Days || 0).toLocaleString()} views · 7d</span>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Details →</span>
                      </button>
                    )}

                    {/* Upload Progress Status (Progress bar) */}
                    <AnimatePresence>
                      {uploadState[acc.id || acc._id] && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                          <div className={`p-3 rounded-2xl border ${uploadState[acc.id || acc._id].error ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${uploadState[acc.id || acc._id].error ? 'text-red-600' : 'text-indigo-600'}`}>
                                {uploadState[acc.id || acc._id].error ? 'Upload Error' : uploadState[acc.id || acc._id].success ? 'Success!' : `Uploading ${uploadState[acc.id || acc._id].current}/${uploadState[acc.id || acc._id].total}`}
                              </span>
                              {!uploadState[acc.id || acc._id].uploading && (
                                <button onClick={() => setUploadState(prev => { const n = { ...prev }; delete n[acc.id || acc._id]; return n; })} className="text-stone-400 hover:text-stone-600"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                              )}
                            </div>
                            {uploadState[acc.id || acc._id].uploading && (
                              <div className="w-full bg-white/50 h-1.5 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-indigo-500" animate={{ width: `${uploadState[acc.id || acc._id].progress}%` }} />
                              </div>
                            )}
                            {(uploadState[acc.id || acc._id].error || uploadState[acc.id || acc._id].success) && (
                              <p className={`text-[10px] font-medium ${uploadState[acc.id || acc._id].error ? 'text-red-500' : 'text-emerald-600'}`}>
                                {uploadState[acc.id || acc._id].error || uploadState[acc.id || acc._id].success}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                      {[1, 2, 3].map((i) => {
                        const post = posts.find(p => p.accountId === (acc.id || acc._id) && p.date === selectedDate && p.index === i);
                        return (
                          <div key={i} className="flex flex-col items-center gap-1.5">
                            <button onClick={() => handleCheckboxClick(acc.id || acc._id, selectedDate, i, post)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${post ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-stone-50 text-stone-300 hover:bg-stone-100'}`}>
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

                    <div className="mt-4 flex flex-col gap-2">
                      {/* Description Display */}
                      {acc.description && (
                        <p className="text-[10px] text-stone-400 italic px-1 line-clamp-2 mb-2" title={acc.description}>
                          {acc.description}
                        </p>
                      )}

                      {/* Sequential Posting Flow UI */}
                      <div className="pt-4 border-t border-stone-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Post Flow</span>
                          {acc.r2Prefix && (
                            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">R2 Linked</span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {pendingDone[acc.id || acc._id] ? (
                            <button
                              onClick={() => handleMarkDone(acc.id || acc._id)}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all animate-pulse text-sm"
                            >
                              <CheckCheck className="w-4 h-4 " /> Confirm Done
                            </button>
                          ) : (
                            <button
                              disabled={sharingAccId === (acc.id || acc._id)}
                              onClick={() => handlePostNext(acc.id || acc._id)}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 text-sm"
                            >
                              {sharingAccId === (acc.id || acc._id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Post Next Video
                            </button>
                          )}
                          {pendingDone[acc.id || acc._id] && (
                            <button
                              onClick={() => handlePostNext(acc.id || acc._id)}
                              className="px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                              title="Retry Opening Video"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <button onClick={() => {
                  setIsAddingAccount(true);
                  if (selectedFilterHandlerId !== 'all' && selectedFilterHandlerId !== 'unassigned') {
                    setNewAccountHandlerId(selectedFilterHandlerId);
                    const hName = handlers.find(h => (h.id || h._id) === selectedFilterHandlerId)?.name || '';
                    setNewAccountOwnerName(hName);
                  } else {
                    setNewAccountHandlerId('');
                    setNewAccountOwnerName('');
                  }
                }} className="bg-stone-50 border-2 border-dashed border-stone-200 p-6 rounded-3xl flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-all">
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

      {/* Modals */}
      <AnimatePresence>
        {isAddingHandler && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingHandler(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200">
              <h3 className="text-2xl font-bold tracking-tight mb-2">New Handler</h3>
              <p className="text-stone-500 text-sm mb-6">Create a personalized handler to manage specific accounts.</p>
              <form onSubmit={addHandler} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Handler Name</label>
                  <input autoFocus type="text" value={newHandlerName} onChange={e => setNewHandlerName(e.target.value)} placeholder="e.g. John" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Handle ID (Unique Access Link)</label>
                  <input type="text" value={newHandlerId} onChange={e => setNewHandlerId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))} placeholder="e.g. john123" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm font-mono" />
                  <p className="text-[9px] text-stone-400 ml-1">Example: john-tracker</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingHandler(false)} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={!newHandlerName.trim() || !newHandlerId.trim()} className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-2xl font-medium text-sm hover:bg-stone-800 shadow-md transition-all disabled:opacity-50">Create Handler</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingAccount(false)} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200">
              <h3 className="text-2xl font-bold tracking-tight mb-6">Add Account</h3>
              <form onSubmit={addAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Platform</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setNewAccountPlatform(p.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${newAccountPlatform === p.value
                            ? 'border-stone-900 bg-stone-50'
                            : 'border-stone-100 hover:border-stone-200'
                          }`}
                      >
                        <PlatformIcon platform={p.value} size="w-8 h-8" />
                        <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Username</label>
                  <input autoFocus type="text" value={newAccountUsername} onChange={e => setNewAccountUsername(e.target.value)} placeholder="@username" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Account Name (Optional)</label>
                  <input type="text" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="e.g. My Personal Account" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>

                {/* Hide these when a specific handler is already selected in tabs */}
                {(selectedFilterHandlerId === 'all' || selectedFilterHandlerId === 'unassigned') && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Owner Name</label>
                      <input type="text" value={newAccountOwnerName} onChange={e => setNewAccountOwnerName(e.target.value)} placeholder="Full Name" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Assign Handler</label>
                      {filteredHandlers.length > 0 ? (
                        <select
                          value={newAccountHandlerId}
                          onChange={e => setNewAccountHandlerId(e.target.value)}
                          className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm appearance-none cursor-pointer"
                        >
                          <option value="" disabled>Select a handler...</option>
                          {filteredHandlers.map(h => (
                            <option key={h.id || h._id} value={h.id || h._id}>{h.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="bg-orange-50 text-orange-600 p-3 rounded-xl text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Please create a Handler first.
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Assets Link (Optional)</label>
                  <input type="url" value={newAccountAssetsLink} onChange={e => setNewAccountAssetsLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Description (Optional)</label>
                  <textarea value={newAccountDescription} onChange={e => setNewAccountDescription(e.target.value)} placeholder="Enter account description..." rows={3} className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm resize-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAddingAccount(false)} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={!newAccountHandlerId || !newAccountUsername || !newAccountOwnerName} className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-2xl font-medium text-sm hover:bg-stone-800 shadow-md transition-all disabled:opacity-50">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Account Modal */}
      <AnimatePresence>
        {editModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                  <Pencil className="w-6 h-6 text-stone-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Edit Account</h3>
                  <p className="text-stone-400 text-xs">@{editModal.account?.username}</p>
                </div>
              </div>
              <form onSubmit={submitEditAccount} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Platform</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditModal(prev => ({ ...prev, platform: p.value }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${editModal.platform === p.value
                            ? 'border-stone-900 bg-stone-50'
                            : 'border-stone-100 hover:border-stone-200'
                          }`}
                      >
                        <PlatformIcon platform={p.value} size="w-8 h-8" />
                        <span className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Username</label>
                  <input autoFocus type="text" value={editModal.username} onChange={e => setEditModal(prev => ({ ...prev, username: e.target.value }))} placeholder="@username" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Account Name (Optional)</label>
                  <input type="text" value={editModal.name} onChange={e => setEditModal(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. My Personal Account" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Owner Name</label>
                  <input type="text" value={editModal.ownerName} onChange={e => setEditModal(prev => ({ ...prev, ownerName: e.target.value }))} placeholder="Full Name" className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Assign Handler</label>
                  {handlers.length > 0 ? (
                    <select
                      value={editModal.handlerId}
                      onChange={e => setEditModal(prev => ({ ...prev, handlerId: e.target.value }))}
                      className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value="">No handler</option>
                      {handlers.map(h => (
                        <option key={h.id || h._id} value={h.id || h._id}>{h.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-stone-400 italic">No handlers available</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Assets Link (Optional)</label>
                  <input type="url" value={editModal.assetsLink} onChange={e => setEditModal(prev => ({ ...prev, assetsLink: e.target.value }))} placeholder="https://drive.google.com/..." className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Description (Optional)</label>
                  <textarea value={editModal.description} onChange={e => setEditModal(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter account description..." rows={3} className="w-full bg-stone-50 p-3 rounded-xl border-none focus:ring-2 focus:ring-stone-900 outline-none text-sm resize-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-3 bg-stone-100 text-stone-600 rounded-2xl font-medium text-sm hover:bg-stone-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={!editModal.username?.trim() || !editModal.ownerName?.trim()} className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-2xl font-medium text-sm hover:bg-stone-800 shadow-md transition-all disabled:opacity-50">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
