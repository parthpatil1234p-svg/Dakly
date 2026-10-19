import React, { useState, useEffect } from 'react';
import {
  Send,
  ShieldCheck,
  Zap,
  CheckCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Layers,
  FileText,
  Code,
  LayoutDashboard,
  PlayCircle,
  Paperclip,
  UploadCloud,
  FileCheck,
  X,
  Server,
  RefreshCw,
  Terminal,
  Inbox,
  Lock,
  User,
  LogOut,
  Mail,
  KeyRound,
  Sparkles,
  Activity,
  Wifi,
  Radio,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  API_BASE_URL,
  loginUser,
  registerUser,
  fetchMe,
  fetchProjects,
  fetchStats,
  fetchLogs,
  sendEmail,
  createProject,
  addSender,
  pingApiKey,
} from './services/api';

export default function App() {
  // Auth State
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('dakly_auth_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dakly_auth_user'));
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // App State
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Stats & Logs
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [logSearch, setLogSearch] = useState('');
  const [logStatus, setLogStatus] = useState('');
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Playground Form State
  const [playTo, setPlayTo] = useState('');
  const [playSubject, setPlaySubject] = useState('🎉 Dakly Live Test');
  const [playMode, setPlayMode] = useState('otp'); // 'otp' | 'html' | 'text'
  const [playOtp, setPlayOtp] = useState('849201');
  const [playHtml, setPlayHtml] = useState(`<div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; margin: 0 auto; background: #fff;">
  <h2 style="color: #4f46e5; margin-top: 0;">Welcome to Dakly!</h2>
  <p style="color: #4b5563; line-height: 1.6;">Your high-speed transactional email engine is working flawlessly.</p>
  <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-weight: bold; text-align: center; margin: 20px 0;">
    Ready for Production Dispatches
  </div>
</div>`);
  const [playText, setPlayText] = useState('Hello from Dakly Email Engine!');
  const [playRemoteUrl, setPlayRemoteUrl] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  // Diagnostics & Inbound Pulse State
  const [pingResult, setPingResult] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  // Modals
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [showAddSenderModal, setShowAddSenderModal] = useState(false);
  const [newProjForm, setNewProjForm] = useState({ name: '', senderEmail: '', appPassword: '', senderDisplayName: '' });
  const [addSenderForm, setAddSenderForm] = useState({ email: '', appPassword: '', displayName: '' });
  const [modalLoading, setModalLoading] = useState(false);

  // Snippets
  const [snippetLang, setSnippetLang] = useState('node');

  // Verify Auth on Mount
  useEffect(() => {
    if (authToken) {
      fetchMe(authToken).then((res) => {
        if (res.success) {
          setCurrentUser(res.user);
          localStorage.setItem('dakly_auth_user', JSON.stringify(res.user));
          loadProjects(authToken);
        } else {
          handleLogout();
        }
      }).catch(() => handleLogout());
    }
  }, [authToken]);

  // When activeProject changes, reload stats and logs
  useEffect(() => {
    if (activeProject) {
      loadStats(activeProject.apiKey);
      loadLogs(activeProject.apiKey, 1, logSearch, logStatus);
    }
  }, [activeProject]);

  async function loadProjects(token) {
    try {
      const data = await fetchProjects(token);
      if (data.success && data.projects.length > 0) {
        setProjects(data.projects);
        const savedId = localStorage.getItem('dakly_dashboard_active_id');
        const found = data.projects.find((p) => p.id === savedId);
        setActiveProject(found || data.projects[0]);
      } else {
        setProjects([]);
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  async function loadStats(apiKey) {
    try {
      const data = await fetchStats(apiKey);
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadLogs(apiKey, page = 1, search = '', status = '') {
    setIsRefreshingLogs(true);
    try {
      const data = await fetchLogs(apiKey, { page, limit: 10, search, status });
      if (data.success) {
        setLogs(data.logs);
        setLogsPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setIsRefreshingLogs(false);
    }
  }

  // Handle Authentication Submit
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      let res;
      if (authMode === 'login') {
        res = await loginUser({ email: authForm.email, password: authForm.password });
      } else {
        res = await registerUser(authForm);
      }

      if (res.success) {
        setAuthToken(res.token);
        setCurrentUser(res.user);
        localStorage.setItem('dakly_auth_token', res.token);
        localStorage.setItem('dakly_auth_user', JSON.stringify(res.user));
        loadProjects(res.token);
      } else {
        setAuthError(res.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setAuthError('Connection error: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setAuthToken(null);
    setCurrentUser(null);
    setProjects([]);
    setActiveProject(null);
    localStorage.removeItem('dakly_auth_token');
    localStorage.removeItem('dakly_auth_user');
  }

  function handleSelectProject(projId) {
    const found = projects.find((p) => p.id === projId);
    if (found) {
      setActiveProject(found);
      localStorage.setItem('dakly_dashboard_active_id', found.id);
    }
  }

  function handleCopyApiKey() {
    if (!activeProject) return;
    navigator.clipboard.writeText(activeProject.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleCopyCurl() {
    if (!activeProject) return;
    const cmd = `curl -H "x-api-key: ${activeProject.apiKey}" ${API_BASE_URL}/api/ping`;
    navigator.clipboard.writeText(cmd);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  }

  async function handlePingKey() {
    if (!activeProject?.apiKey) return;
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingApiKey(activeProject.apiKey);
      setPingResult(res);
      if (res.success) {
        confetti({ particleCount: 35, spread: 65, origin: { y: 0.6 } });
        if (authToken) loadProjects(authToken);
        loadStats(activeProject.apiKey);
      }
    } catch (err) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setIsPinging(false);
    }
  }

  // Auto-refresh logs when enabled
  useEffect(() => {
    let interval;
    if (autoRefreshLogs && activeProject?.apiKey) {
      interval = setInterval(() => {
        loadLogs(activeProject.apiKey, logsPagination.page, logSearch, logStatus);
        loadStats(activeProject.apiKey);
        if (authToken) loadProjects(authToken);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefreshLogs, activeProject?.apiKey, logsPagination.page, logSearch, logStatus, authToken]);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Attachment exceeds the 15MB size limit.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        filename: file.name,
        content: reader.result,
        contentType: file.type || 'application/octet-stream',
        sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleDispatchEmail() {
    if (!activeProject) {
      alert('Please select or create a project first.');
      return;
    }
    if (!playTo.trim()) {
      alert('Please enter a recipient email.');
      return;
    }

    setIsSending(true);
    const payload = {
      to: playTo.trim(),
      subject: playSubject.trim(),
    };

    if (playMode === 'otp') {
      payload.otp = playOtp.trim();
    } else if (playMode === 'html') {
      payload.html = playHtml.trim();
    } else {
      payload.text = playText.trim();
    }

    const attachments = [];
    if (selectedAttachment) {
      attachments.push({
        filename: selectedAttachment.filename,
        content: selectedAttachment.content,
        contentType: selectedAttachment.contentType,
      });
    }
    if (playRemoteUrl.trim()) {
      attachments.push({ url: playRemoteUrl.trim() });
    }
    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    try {
      const res = await sendEmail(activeProject.apiKey, payload);
      setLastResponse(res);

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#38bdf8'],
        });
      }

      loadStats(activeProject.apiKey);
      loadLogs(activeProject.apiKey, 1, logSearch, logStatus);
    } catch (err) {
      setLastResponse({ success: false, status: 'FAILED', error: err.message });
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateProjectSubmit(e) {
    e.preventDefault();
    setModalLoading(true);
    try {
      const data = await createProject(newProjForm, authToken);
      if (data.success) {
        setShowNewProjModal(false);
        setNewProjForm({ name: '', senderEmail: '', appPassword: '', senderDisplayName: '' });
        await loadProjects(authToken);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleAddSenderSubmit(e) {
    e.preventDefault();
    if (!activeProject) return;
    setModalLoading(true);
    try {
      const data = await addSender(activeProject.id, addSenderForm, authToken);
      if (data.success) {
        setShowAddSenderModal(false);
        setAddSenderForm({ email: '', appPassword: '', displayName: '' });
        await loadProjects(authToken);
        await loadStats(activeProject.apiKey);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  }

  // ==============================================================
  // MODAL: WHAT DAKLY CAN DO (POPUP MODAL ON VISIT)
  // ==============================================================
  const renderWelcomeModal = () => {
    if (!showWelcomeModal) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="glass-card rounded-2xl border border-indigo-500/30 max-w-3xl w-full my-auto overflow-hidden shadow-2xl shadow-indigo-500/20 bg-[#0d1017]">
          
          {/* Header */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-br from-indigo-950/70 via-[#12151f] to-[#0d1017] border-b border-white/10">
            <button
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Dakly System Capabilities & Features</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>📮 Yeh System Aapke Project Ke Liye Kya Kar Sakta Hai?</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              Zero-cost, ultra-fast headless email engine jo aapke kisi bhi web/mobile app mein 100% plug & play ho jata hai.
            </p>
          </div>

          {/* Capabilities 8-Card Grid */}
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[58vh] overflow-y-auto">
            
            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>1. Sub-Second OTP & Verification (&lt; 1s)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                4-6 digit OTPs, magic links aur password resets 1 second ke andar deliver karta hai via persistent STARTTLS Port 587.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>2. 100% Custom HTML & Styling Freedom</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Koi fixed template nahi. Welcome cards, receipts, status updates aur alerts ko apne man-pasand HTML/CSS se design karein.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <Paperclip className="w-4 h-4 text-emerald-400" />
                <span>3. 15MB Multi-Format Attachments</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                PDFs (College Notes, Invoices), Images (QR Codes, Receipts), Excel/CSV sheets, aur ZIP files direct link ya base64 se bhejein.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>4. 1,000+ Free Emails/Day Failover</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Primary + Backup Gmail attach karein. Jab Primary 500 emails poore karega, Dakly auto-backup account par switch ho jayega.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>5. Anti-Spam Burst Pacing Queue</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Traffic spike hone par 200ms spacing queue lagata hai taaki Google aapke Gmail ko block na kare aur emails spam mein na jayein.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>6. Live Traffic Pulse & API Diagnostics</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dashboard se 1-click mein API Key test karein, real-time inbound traffic dekhein, aur live stream audit logs track karein.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <Lock className="w-4 h-4 text-violet-400" />
                <span>7. Military-Grade AES-256-GCM Security</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Google App Passwords kabhi plain text mein save nahi hote. Military-grade authenticated encryption se 100% secure rehte hain.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#12151c] border border-white/5 hover:border-indigo-500/30 transition space-y-1">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs sm:text-sm">
                <Terminal className="w-4 h-4 text-amber-300" />
                <span>8. Zero Packages / Drop-in Replacement</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Apne project mein Nodemailer install karne ki zaroorat nahi. Sirf ek native fetch() call se bina koi purana code tode chalega.
              </p>
            </div>

          </div>

          {/* Footer CTA */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#080a0f] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 text-center sm:text-left">
              <span>💡</span>
              <span>Kabhi bhi upar <b>"Capabilities"</b> button dabakar yeh list dobara dekh sakte hain.</span>
            </div>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2"
            >
              <span>Theek Hai, Aage Badhein!</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    );
  };

  // ==============================================================
  // VIEW: AUTH SCREEN (If Not Logged In)
  // ==============================================================
  if (!authToken) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
        
        {/* Welcome Capabilities Popup on Visit */}
        {renderWelcomeModal()}

        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-md w-full">
          
          {/* Logo Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl mb-3 shadow-lg shadow-indigo-500/10">
              📮
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Dakly Developer Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tenant transactional email engine for developers.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowWelcomeModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Dekhein Dakly Kya-Kya Kar Sakta Hai ✨</span>
              </button>
            </div>
          </div>

          {/* Auth Glass Card */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
            
            {/* Tab: Sign In vs Sign Up */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#12151c] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  authMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  authMode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notice */}
            {authError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
              
              {authMode === 'register' && (
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Your Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="Parth Patil"
                      className="w-full bg-[#12151c] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    placeholder="developer@example.com"
                    className="w-full bg-[#12151c] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#12151c] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 mt-2"
              >
                <span>{authLoading ? 'Verifying...' : authMode === 'login' ? 'Sign In to Console' : 'Register Developer Account'}</span>
              </button>

            </form>

            <div className="pt-2 border-t border-white/5 text-center text-[11px] text-slate-500">
              🔒 Military-grade AES-256-GCM encryption & isolated multi-tenant workspaces.
            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==============================================================
  // VIEW: AUTHENTICATED DASHBOARD
  // ==============================================================
  return (
    <div className="min-h-screen flex flex-col bg-[#080a0f] text-slate-100">
      
      {/* Welcome Capabilities Popup on Visit */}
      {renderWelcomeModal()}

      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080a0f]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Live Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl">📮</span>
              <span className="text-xl font-bold tracking-tight text-white flex items-center">
                Dakly<span className="text-indigo-400 font-extrabold text-xs ml-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">DASHBOARD</span>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-white/10 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Backend Live</span>
            </div>
          </div>

          {/* Project Selector, Capabilities, User Profile & Logout */}
          <div className="flex items-center space-x-3">
            
            {projects.length > 0 && (
              <select
                value={activeProject?.id || ''}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="bg-[#181b22] border border-white/10 text-white text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.senderEmail})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowWelcomeModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs sm:text-sm font-semibold transition"
              title="Dakly ke saare features aur capabilities dekhein"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Capabilities</span>
            </button>

            <button
              onClick={() => setShowNewProjModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition shadow-sm shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 pl-2 border-l border-white/10">
              <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#181b22] border border-white/10 text-xs">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-medium truncate max-w-[100px] sm:max-w-[140px]">{currentUser?.name || 'Developer'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-[#181b22] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-white/10 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Tab Sub-Nav */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-2 overflow-x-auto border-t border-white/5 py-1.5">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'playground', label: 'Live Playground', icon: PlayCircle },
            { id: 'senders', label: 'Senders & Quotas', icon: Server },
            { id: 'logs', label: 'Audit Logs', icon: FileText },
            { id: 'snippets', label: 'SDK & Snippets', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-2 transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* If no project created yet */}
        {projects.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 border border-white/10 text-center max-w-lg mx-auto my-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl flex items-center justify-center mx-auto text-indigo-400">
              🚀
            </div>
            <h2 className="text-xl font-bold text-white">Welcome to Dakly, {currentUser?.name}!</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              You don't have any transactional email projects registered in your workspace yet. Create your first project with your sender Gmail and Google App Password to get your live API Key.
            </p>
            <button
              onClick={() => setShowNewProjModal(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Project</span>
            </button>
          </div>
        ) : (
          <>
            {/* Active API Key Bar */}
            <div className="glass-card rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">
                    Active Project Key: <span className="text-white font-semibold">{activeProject?.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-mono text-xs sm:text-sm text-indigo-300 font-semibold tracking-wider">
                      {isKeyVisible ? activeProject?.apiKey : `${activeProject?.apiKey?.slice(0, 10)}••••••••••••••••••••••••••••••••`}
                    </span>
                    <button
                      onClick={() => setIsKeyVisible(!isKeyVisible)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Toggle visibility"
                    >
                      {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={handlePingKey}
                  disabled={isPinging}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-sm"
                  title="Verify API key connectivity & measure server response time"
                >
                  <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : 'text-emerald-300'}`} />
                  <span>{isPinging ? 'Pinging...' : '⚡ Test API Key'}</span>
                </button>
                <button
                  onClick={handleCopyApiKey}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied Key!' : 'Copy API Key'}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">

                {/* API Key Connection Diagnostics & Inbound Pulse Card */}
                <div className="glass-card rounded-xl p-5 border border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-[#0d1017] to-purple-950/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">API Connection Diagnostics & Inbound Traffic</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            <span>LIVE ENGINE</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Verify whether your external application or script is reaching the Dakly Email Engine in real-time.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handlePingKey}
                      disabled={isPinging}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition self-start md:self-auto shadow-md shadow-indigo-500/20"
                    >
                      <Activity className={`w-4 h-4 ${isPinging ? 'animate-spin' : ''}`} />
                      <span>{isPinging ? 'Testing Key...' : 'Run Live Diagnostic Ping'}</span>
                    </button>
                  </div>

                  {/* Diagnostic Columns Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    
                    {/* Left Column: Live Traffic Pulse */}
                    <div className="p-4 rounded-xl bg-[#080a0f] border border-white/5 space-y-3">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Inbound Request Pulse</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        {activeProject?.lastApiCallAt ? (
                          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>Active: Last request received from IP <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-[11px] text-white">{activeProject.lastClientIp || 'verified'}</code> at {new Date(activeProject.lastApiCallAt).toLocaleTimeString()}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-xs text-amber-400 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                            <span>Waiting for first API request from your external project...</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        {activeProject?.lastApiCallAt
                          ? "✅ Your external application has successfully connected to Dakly! Every email dispatch from your project is authenticated and logged."
                          : "👉 Paste your API Key in your project's .env file and trigger a signup or test call. As soon as a request hits Dakly, this indicator will turn green!"}
                      </div>

                      {pingResult && (
                        <div className={`p-3 rounded-lg border text-xs font-mono mt-2 space-y-1 ${pingResult.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                          <div className="font-semibold flex items-center space-x-1.5">
                            {pingResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                            <span>{pingResult.message || pingResult.error}</span>
                          </div>
                          {pingResult.latencyMs && (
                            <div className="text-[11px] text-slate-400 pl-5">
                              Latency: <span className="text-white font-bold">{pingResult.latencyMs}ms</span> • Engine: <span className="text-emerald-400">ONLINE</span> • Quota Left: <span className="text-indigo-300">{pingResult.project?.remainingToday ?? 500} emails</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column: 1-Click Terminal Verification Command */}
                    <div className="p-4 rounded-xl bg-[#080a0f] border border-white/5 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Test From Your Terminal / Script</span>
                          </div>
                          <span className="text-[10px] text-slate-500 lowercase font-mono">cURL / HTTP</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Run this command in any terminal or cmd to test your API key right now without sending an actual email:
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#12151c] border border-white/10 flex items-center justify-between font-mono text-[11px] text-indigo-300">
                        <span className="truncate pr-2">
                          curl -H "x-api-key: {activeProject?.apiKey}" {API_BASE_URL}/api/ping
                        </span>
                        <button
                          onClick={handleCopyCurl}
                          className="text-slate-400 hover:text-white p-1 ml-2 transition flex-shrink-0"
                          title="Copy command"
                        >
                          {curlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Returns instant JSON status & activates inbound pulse</span>
                        {curlCopied && <span className="text-emerald-400 font-medium">Copied command!</span>}
                      </div>
                    </div>

                  </div>
                </div>
                
                {/* 4 Top KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="glass-card p-5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>SENT TODAY</span>
                      <Send className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-white font-mono">{stats?.capacity?.sentToday ?? 0}</span>
                      <span className="text-xs text-slate-400">/ {stats?.capacity?.totalDailyQuota ?? 500} daily</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(((stats?.capacity?.sentToday || 0) / (stats?.capacity?.totalDailyQuota || 500)) * 100)
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>REMAINING QUOTA</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-emerald-400 font-mono">
                        {stats?.capacity?.remainingToday ?? 500}
                      </span>
                      <span className="text-xs text-slate-400">emails left</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Resets at 00:00 UTC daily</div>
                  </div>

                  <div className="glass-card p-5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>DELIVERY RATE</span>
                      <CheckCircle className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-white font-mono">
                        {stats?.metrics?.allTime?.successRate ?? '100%'}
                      </span>
                      <span className="text-xs text-emerald-400 font-medium">● High Delivery</span>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {stats?.metrics?.allTime?.totalDelivered ?? 0} delivered • {stats?.metrics?.allTime?.totalFailed ?? 0} failed
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>DISPATCH SPEED</span>
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="mt-2 flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-amber-400 font-mono">
                        {stats?.metrics?.performance?.avgExecutionTimeMs || 710}ms
                      </span>
                      <span className="text-xs text-slate-400">STARTTLS 587</span>
                    </div>
                    <div className="mt-3 text-xs text-emerald-400 font-medium">⚡ Ultra-Fast Serverless</div>
                  </div>

                </div>

                {/* Senders & Failover Status */}
                <div className="glass-card rounded-xl p-6 border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        <span>Active Gmail Senders & Failover Pool</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Multi-Gmail failover automatically switches to backup accounts when the primary 500 daily quota is reached.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddSenderModal(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>Add Backup Gmail (+500/day)</span>
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {stats?.capacity?.senders?.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-[#12151c] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                              s.role === 'Primary'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {s.role}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-white">{s.email}</div>
                            <div className="text-[11px] text-slate-400">{s.displayName || 'Sender Account'}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end text-xs font-mono">
                          <div className="text-right">
                            <div className="text-slate-200 font-semibold">
                              {s.emailsSentToday} / {s.dailyQuota} sent
                            </div>
                            <div className="text-[10px] text-slate-500">{s.remainingToday} remaining today</div>
                          </div>
                          <span
                            className={`inline-flex h-2.5 w-2.5 rounded-full ${
                              s.isExhaustedToday ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            title={s.isExhaustedToday ? 'Quota Reached' : 'Active'}
                          ></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: PLAYGROUND */}
            {activeTab === 'playground' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-7 glass-card rounded-xl p-6 border border-white/10 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                        <PlayCircle className="w-5 h-5 text-indigo-400" />
                        <span>Live Email Playground</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Test transactional dispatches in under 1 second without Postman.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      PORT 587 LIVE
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Recipient Email ("to") <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={playTo}
                      onChange={(e) => setPlayTo(e.target.value)}
                      placeholder="e.g. your-email@gmail.com"
                      className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={playSubject}
                      onChange={(e) => setPlaySubject(e.target.value)}
                      placeholder="Subject..."
                      className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Body Format</label>
                    <div className="grid grid-cols-3 gap-2 bg-[#12151c] p-1 rounded-lg border border-white/10">
                      {['otp', 'html', 'text'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPlayMode(m)}
                          className={`py-1.5 text-xs font-medium rounded-md transition ${
                            playMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {m === 'otp' ? 'OTP Code' : m === 'html' ? 'Custom HTML' : 'Plain Text'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {playMode === 'otp' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-300">6-Digit Verification Code</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          maxLength={8}
                          value={playOtp}
                          onChange={(e) => setPlayOtp(e.target.value)}
                          className="w-40 bg-[#12151c] border border-white/10 rounded-lg px-3 py-2.5 text-xl font-mono text-center tracking-widest text-indigo-400 font-bold focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setPlayOtp(String(Math.floor(100000 + Math.random() * 900000)))}
                          className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition"
                        >
                          Generate Random
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">Dakly automatically wraps this code in a clean responsive email template.</p>
                    </div>
                  )}

                  {playMode === 'html' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-300">HTML Code</label>
                      <textarea
                        rows={6}
                        value={playHtml}
                        onChange={(e) => setPlayHtml(e.target.value)}
                        className="w-full bg-[#12151c] border border-white/10 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>
                  )}

                  {playMode === 'text' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-300">Plain Text Content</label>
                      <textarea
                        rows={4}
                        value={playText}
                        onChange={(e) => setPlayText(e.target.value)}
                        className="w-full bg-[#12151c] border border-white/10 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                        <span>File or PDF Attachment (Optional - 15MB Limit)</span>
                      </label>
                      {selectedAttachment && (
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(null)}
                          className="text-[11px] text-rose-400 hover:underline"
                        >
                          Remove File
                        </button>
                      )}
                    </div>

                    {!selectedAttachment ? (
                      <label className="block border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-xl p-4 text-center transition cursor-pointer bg-[#12151c]/50">
                        <input type="file" onChange={handleFileUpload} className="hidden" />
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <div className="text-xs text-slate-300 font-medium">Click to select PDF or Image</div>
                        <div className="text-[10px] text-slate-500">Auto-converts to Base64 buffer with 15MB check</div>
                      </label>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-emerald-400 text-xs">
                          <FileCheck className="w-4 h-4" />
                          <span className="font-medium font-mono">{selectedAttachment.filename}</span>
                          <span className="text-slate-400 text-[10px]">({selectedAttachment.sizeFormatted})</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400">Or remote file URL (S3 / Firebase):</div>
                    <input
                      type="url"
                      value={playRemoteUrl}
                      onChange={(e) => setPlayRemoteUrl(e.target.value)}
                      placeholder="https://example.com/files/lecture_notes.pdf"
                      className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={handleDispatchEmail}
                      className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isSending ? 'Dispatching via STARTTLS 587...' : '⚡ Send Test Email Now'}</span>
                    </button>
                  </div>

                </div>

                {/* Right Output Console */}
                <div className="lg:col-span-5 glass-card rounded-xl p-6 border border-white/10 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-1.5">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span>Live Server Response</span>
                    </span>
                    {lastResponse && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
                          alert('Copied response JSON!');
                        }}
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>

                  {!lastResponse ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-slate-500">
                      <Inbox className="w-10 h-10 mb-2 opacity-50" />
                      <div className="text-xs font-medium text-slate-400">No email dispatched yet</div>
                      <div className="text-[11px] text-slate-600 max-w-xs mt-1">
                        Fill out the recipient and click "Send Test Email Now" to see the live delivery response here.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            lastResponse.success
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {lastResponse.success ? '🟢 DELIVERED' : '🔴 FAILED'}
                        </span>
                        <span className="text-xs font-mono text-amber-400 font-medium">
                          ⏱️ {lastResponse.executionTimeMs || 710}ms
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#080a0f] border border-white/5 font-mono text-xs">
                        <div className="text-[10px] text-slate-500 uppercase">Tracking ID</div>
                        <div className="text-indigo-300 font-semibold break-all">{lastResponse.trackingId || 'N/A'}</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#080a0f] border border-white/5 font-mono text-xs">
                        <div className="text-[10px] text-slate-500 uppercase">Sender Account</div>
                        <div className="text-slate-300">{lastResponse.sender || activeProject?.senderEmail}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase mb-1">Payload JSON</div>
                        <pre className="p-3 rounded-lg bg-[#080a0f] border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                          {JSON.stringify(lastResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: SENDERS & QUOTAS */}
            {activeTab === 'senders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h2 className="text-base font-semibold text-white">Your Workspace Projects</h2>
                    <p className="text-xs text-slate-400">Projects created in your account. Fully isolated from other users.</p>
                  </div>
                  <button
                    onClick={() => setShowNewProjModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Project</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((p) => (
                    <div key={p.id} className="glass-card rounded-xl p-5 border border-white/10 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white">{p.name}</h3>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{p.senderEmail}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {p.dailyQuota} Daily Limit
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-[#080a0f] border border-white/5 space-y-1">
                        <div className="text-[10px] text-slate-400 font-medium">PROJECT API KEY</div>
                        <div className="flex items-center justify-between font-mono text-xs text-indigo-300">
                          <span className="truncate pr-2">{p.apiKey}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(p.apiKey);
                              alert('API Key copied!');
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Senders Pool ({p.senders ? p.senders.length : 1})</span>
                          <button
                            onClick={() => {
                              setActiveProject(p);
                              setShowAddSenderModal(true);
                            }}
                            className="text-indigo-400 hover:underline text-[11px]"
                          >
                            + Add Backup
                          </button>
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          {(p.senders || [{ email: p.senderEmail, dailyQuota: 500, emailsSentToday: 0 }]).map((s, idx) => (
                            <div key={idx} className="p-2 rounded bg-[#12151c] border border-white/5 flex items-center justify-between">
                              <span className="text-slate-300">{s.email}</span>
                              <span className="text-[10px] text-slate-500">
                                {s.emailsSentToday || 0} / {s.dailyQuota || 500}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                
                <div className="glass-card rounded-xl p-4 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => {
                        setLogSearch(e.target.value);
                        loadLogs(activeProject?.apiKey, 1, e.target.value, logStatus);
                      }}
                      placeholder="Search by recipient email, subject, or tracking ID..."
                      className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={logStatus}
                      onChange={(e) => {
                        setLogStatus(e.target.value);
                        loadLogs(activeProject?.apiKey, 1, logSearch, e.target.value);
                      }}
                      className="bg-[#12151c] border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="FAILED">Failed</option>
                    </select>
                    <button
                      onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition ${autoRefreshLogs ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#12151c] text-slate-400 border-white/10 hover:text-white'}`}
                      title="Auto-refresh logs every 5 seconds to catch live calls from your project"
                    >
                      <Radio className={`w-3.5 h-3.5 ${autoRefreshLogs ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
                      <span>{autoRefreshLogs ? 'Live Stream: ON' : 'Live Stream'}</span>
                    </button>

                    <button
                      onClick={() => loadLogs(activeProject?.apiKey, logsPagination.page, logSearch, logStatus)}
                      className="p-2 rounded-lg bg-[#12151c] hover:bg-white/10 text-slate-300 border border-white/10 transition"
                      title="Manual Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#12151c]/80 border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono">
                        <tr>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Recipient</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Sender</th>
                          <th className="py-3 px-4">Attachment</th>
                          <th className="py-3 px-4">Speed</th>
                          <th className="py-3 px-4 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-sans">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-500">
                              No logs found for this project.
                            </td>
                          </tr>
                        ) : (
                          logs.map((l, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition">
                              <td className="py-3 px-4 font-mono">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    l.status === 'DELIVERED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {l.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-medium text-slate-200">{l.to}</td>
                              <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{l.subject}</td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{l.senderEmail || 'Primary'}</td>
                              <td className="py-3 px-4 text-[11px]">
                                {l.hasAttachments ? (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                                    📎 {l.attachmentsCount || 1} file
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-amber-400 text-[11px]">
                                {l.executionTimeMs ? `${l.executionTimeMs}ms` : '< 1s'}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-500 text-right">
                                {new Date(l.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 border-t border-white/10 bg-[#12151c]/40 flex items-center justify-between text-xs text-slate-400">
                    <div>Total: {logsPagination.total} dispatches</div>
                    <div className="flex items-center space-x-2">
                      <button
                        disabled={logsPagination.page <= 1}
                        onClick={() => loadLogs(activeProject?.apiKey, logsPagination.page - 1, logSearch, logStatus)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="font-mono text-white">{logsPagination.page}</span>
                      <button
                        disabled={logsPagination.page >= logsPagination.totalPages}
                        onClick={() => loadLogs(activeProject?.apiKey, logsPagination.page + 1, logSearch, logStatus)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: SNIPPETS */}
            {activeTab === 'snippets' && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-white/10">
                  <h2 className="text-base font-semibold text-white">Client Snippets (Pre-configured)</h2>
                  <p className="text-xs text-slate-400">Copy and paste these snippets into your College Notes or PDF app.</p>
                </div>

                <div className="flex space-x-2 border-b border-white/10 pb-2">
                  {['node', 'curl', 'python', 'nextjs'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSnippetLang(lang)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        snippetLang === lang ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'node' ? 'Node.js / Express' : lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : 'Next.js App Router'}
                    </button>
                  ))}
                </div>

                <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">🔐 Send OTP Verification Code</span>
                    <button
                      onClick={() => {
                        const code = document.getElementById('snippetOtpCode').innerText;
                        navigator.clipboard.writeText(code);
                        alert('Copied snippet!');
                      }}
                      className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#080a0f] border border-white/5 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                    <code id="snippetOtpCode">
{snippetLang === 'node' && `const response = await fetch('${API_BASE_URL}/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${activeProject?.apiKey || 'gkey_live_...'}'
  },
  body: JSON.stringify({
    to: 'student@example.com',
    otp: '849201'
  })
});
const result = await response.json();
console.log('Delivered in:', result.executionTimeMs, 'ms');`}
{snippetLang === 'curl' && `curl -X POST "${API_BASE_URL}/api/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeProject?.apiKey || 'gkey_live_...'}" \\
  -d '{"to": "student@example.com", "otp": "849201"}'`}
{snippetLang === 'python' && `import requests
res = requests.post(
    "${API_BASE_URL}/api/send",
    headers={"x-api-key": "${activeProject?.apiKey || 'gkey_live_...'}"},
    json={"to": "student@example.com", "otp": "849201"}
)
print(res.json())`}
{snippetLang === 'nextjs' && `// app/api/auth/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  const res = await fetch('${API_BASE_URL}/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.DAKLY_API_KEY! },
    body: JSON.stringify({ to: email, otp })
  });
  return NextResponse.json(await res.json());
}`}
                    </code>
                  </pre>
                </div>

                <div className="glass-card rounded-xl p-5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">📎 Send PDF Notes Attachment</span>
                    <button
                      onClick={() => {
                        const code = document.getElementById('snippetPdfCode').innerText;
                        navigator.clipboard.writeText(code);
                        alert('Copied snippet!');
                      }}
                      className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#080a0f] border border-white/5 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
                    <code id="snippetPdfCode">
{snippetLang === 'node' && `const response = await fetch('${API_BASE_URL}/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${activeProject?.apiKey || 'gkey_live_...'}'
  },
  body: JSON.stringify({
    to: 'student@example.com',
    subject: 'College Lecture Notes Unit 1',
    html: '<h3>Your requested notes are attached.</h3>',
    attachments: [
      {
        filename: 'College_Notes_Unit1.pdf',
        url: 'https://example.com/files/unit1.pdf'
      }
    ]
  })
});
const result = await response.json();
console.log('Result:', result.status, result.trackingId);`}
{snippetLang === 'curl' && `curl -X POST "${API_BASE_URL}/api/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeProject?.apiKey || 'gkey_live_...'}" \\
  -d '{
    "to": "student@example.com",
    "subject": "Semester 4 Notes",
    "html": "<p>Attached below</p>",
    "attachments": [{"filename": "notes.pdf", "url": "https://example.com/notes.pdf"}]
  }'`}
{snippetLang === 'python' && `import requests
res = requests.post(
    "${API_BASE_URL}/api/send",
    headers={"x-api-key": "${activeProject?.apiKey || 'gkey_live_...'}"},
    json={
        "to": "student@example.com",
        "subject": "Semester Notes",
        "html": "<p>PDF notes attached</p>",
        "attachments": [{"filename": "notes.pdf", "url": "https://example.com/notes.pdf"}]
    }
)
print(res.json())`}
{snippetLang === 'nextjs' && `// app/api/send-pdf/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, pdfUrl, title } = await req.json();
  const res = await fetch('${API_BASE_URL}/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.DAKLY_API_KEY! },
    body: JSON.stringify({
      to: email,
      subject: title,
      html: \`<p>Attached: <b>\${title}</b></p>\`,
      attachments: [{ filename: \`\${title}.pdf\`, url: pdfUrl }]
    })
  });
  return NextResponse.json(await res.json());
}`}
                    </code>
                  </pre>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* MODAL: CREATE PROJECT */}
      {showNewProjModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 border border-white/10 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>➕</span>
                <span>Register New Project</span>
              </h3>
              <button onClick={() => setShowNewProjModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProjectSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProjForm.name}
                  onChange={(e) => setNewProjForm({ ...newProjForm, name: e.target.value })}
                  placeholder="e.g. College Notes Portal"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Sender Gmail *</label>
                <input
                  type="email"
                  required
                  value={newProjForm.senderEmail}
                  onChange={(e) => setNewProjForm({ ...newProjForm, senderEmail: e.target.value })}
                  placeholder="e.g. student.notes@gmail.com"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Google App Password (16 chars) *</label>
                <input
                  type="password"
                  required
                  value={newProjForm.appPassword}
                  onChange={(e) => setNewProjForm({ ...newProjForm, appPassword: e.target.value })}
                  placeholder="abcd efgh ijkl mnop"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  value={newProjForm.senderDisplayName}
                  onChange={(e) => setNewProjForm({ ...newProjForm, senderDisplayName: e.target.value })}
                  placeholder="e.g. College Notes Bot"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {modalLoading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BACKUP GMAIL */}
      {showAddSenderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 border border-white/10 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>🛡️</span>
                <span>Add Backup Gmail Account</span>
              </h3>
              <button onClick={() => setShowAddSenderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Adds a secondary Gmail account to automatically double daily capacity to 1,000+ emails/day.
            </p>
            <form onSubmit={handleAddSenderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Backup Gmail Address *</label>
                <input
                  type="email"
                  required
                  value={addSenderForm.email}
                  onChange={(e) => setAddSenderForm({ ...addSenderForm, email: e.target.value })}
                  placeholder="e.g. backup.account@gmail.com"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Google App Password (16 chars) *</label>
                <input
                  type="password"
                  required
                  value={addSenderForm.appPassword}
                  onChange={(e) => setAddSenderForm({ ...addSenderForm, appPassword: e.target.value })}
                  placeholder="abcd efgh ijkl mnop"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  value={addSenderForm.displayName}
                  onChange={(e) => setAddSenderForm({ ...addSenderForm, displayName: e.target.value })}
                  placeholder="e.g. Backup Dispatcher"
                  className="w-full bg-[#12151c] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSenderModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {modalLoading ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
