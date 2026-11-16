import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  PlayCircle,
  Paperclip,
  UploadCloud,
  FileCheck,
  X,
  RefreshCw,
  Terminal,
  Inbox,
  Mail,
  KeyRound,
  Sparkles,
  Activity,
  Radio,
  AlertCircle,
  ArrowRight,
  Image as ImageIcon,
  Trash2,
  MousePointerClick,
  Smartphone,
  Monitor,
  Flame,
  UserX,
  Ban,
  Users,
  UserPlus,
  ShieldAlert,
  Globe,
  Key,
  Bot,
  Wand2,
} from 'lucide-react';
import Landing from './components/Landing';
import ConsoleNavigation from './components/ConsoleNavigation';
import Overview from './components/Overview';
import Dialog from './components/Dialog';
import SpotlightCard from './components/SpotlightCard';


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
  deleteSender,
  addSenderAlias,
  deleteSenderAlias,
  pingApiKey,
  uploadProjectLogo,
  deleteProjectLogo,
  previewTemplate,
  fetchSuppressionList,
  addSuppressionEmail,
  removeSuppressionEmail,
  updateSenderWarmupMode,
  updateProjectSettings,
  generateWebhookSecret,
  testWebhook,
  rotateApiKey,
  fetchIpWhitelist,
  updateIpWhitelist,
  fetchProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  upgradeProjectToPro,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
} from './services/api';

const DEFAULT_TEMPLATES = [
  {
    id: 'otp',
    name: 'Modern OTP & Auth Code',
    badge: 'Security',
    badgeColor: 'border-brand-500/30 text-brand-600 bg-brand-500/10 dark:text-brand-400',
    description: 'Crisp one-time verification code card with security alerts, expiry time, and brand logo.',
    sampleVars: {
      name: 'Rahul',
      code: '849201',
      validMinutes: 10,
      actionName: 'sign in to your dashboard',
    },
    fields: [
      { key: 'name', label: 'User Name', placeholder: 'Rahul' },
      { key: 'code', label: 'OTP Code', placeholder: '849201' },
      { key: 'validMinutes', label: 'Expiry (Minutes)', placeholder: '10', type: 'number' },
      { key: 'actionName', label: 'Action Description', placeholder: 'sign in to your dashboard' },
    ],
  },
  {
    id: 'welcome',
    name: 'Welcome & Onboarding',
    badge: 'Marketing',
    badgeColor: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
    description: 'High-energy welcome letter with feature highlights list and primary CTA button.',
    sampleVars: {
      name: 'Aman',
      actionUrl: 'https://dakly.cc.cd/dashboard',
      actionText: 'Get Started Now',
      introMessage: 'We are thrilled to welcome you! Your account is active and ready to roll.',
    },
    fields: [
      { key: 'name', label: 'User Name', placeholder: 'Aman' },
      { key: 'actionUrl', label: 'CTA Button URL', placeholder: 'https://yourwebsite.com/dashboard' },
      { key: 'actionText', label: 'CTA Button Text', placeholder: 'Get Started Now' },
      { key: 'introMessage', label: 'Intro Greeting Message', placeholder: 'We are thrilled to welcome you...', isTextarea: true },
    ],
  },
  {
    id: 'password_reset',
    name: 'Secure Password Reset',
    badge: 'Auth',
    badgeColor: 'border-rose-500/30 text-rose-600 bg-rose-500/10 dark:text-rose-400',
    description: 'Security-first password recovery with prominent action button, raw link fallback, and IP notice.',
    sampleVars: {
      name: 'Priya',
      resetUrl: 'https://dakly.cc.cd/reset-password?token=sec_984129',
      validMinutes: 15,
      ipAddress: '103.21.144.92',
      deviceInfo: 'Chrome on macOS',
    },
    fields: [
      { key: 'name', label: 'User Name', placeholder: 'Priya' },
      { key: 'resetUrl', label: 'Reset Link URL', placeholder: 'https://yourwebsite.com/reset?token=...' },
      { key: 'validMinutes', label: 'Expiry (Minutes)', placeholder: '15', type: 'number' },
      { key: 'ipAddress', label: 'Requester IP (Optional)', placeholder: '103.21.144.92' },
      { key: 'deviceInfo', label: 'Device / Browser (Optional)', placeholder: 'Chrome on macOS' },
    ],
  },
  {
    id: 'notes_delivery',
    name: 'College Notes & Study Material',
    badge: 'Education',
    badgeColor: 'border-brand-500/30 text-brand-600 bg-brand-500/10 dark:text-brand-400',
    description: 'Academic resource card with course details, semester pill, and PDF attachment badge.',
    sampleVars: {
      studentName: 'Sneha',
      subject: 'Data Structures & Algorithms',
      notesTitle: 'Unit 3: Trees, Binary Search & Graph Algorithms',
      semester: 'Semester 4',
      description: 'Complete handwritten revision notes with solved university question papers.',
      downloadUrl: 'https://dakly.cc.cd',
    },
    fields: [
      { key: 'studentName', label: 'Student Name', placeholder: 'Sneha' },
      { key: 'subject', label: 'Subject / Course', placeholder: 'Data Structures & Algorithms' },
      { key: 'notesTitle', label: 'Notes Chapter / Title', placeholder: 'Unit 3: Trees & Graphs' },
      { key: 'semester', label: 'Semester / Class', placeholder: 'Semester 4' },
      { key: 'downloadUrl', label: 'Direct Download Link (Optional)', placeholder: 'https://...' },
      { key: 'description', label: 'Summary / Topic List', placeholder: 'Complete handwritten revision notes...', isTextarea: true },
    ],
  },
  {
    id: 'receipt',
    name: 'Invoice & Payment Receipt',
    badge: 'Billing',
    badgeColor: 'border-amber-500/30 text-amber-600 bg-amber-500/10 dark:text-amber-400',
    description: 'Clean financial receipt with itemized line items, amount charged card, and paid badge.',
    sampleVars: {
      customerName: 'Vikram Sharma',
      invoiceNumber: 'INV-2026-941',
      amount: '₹1,499.00',
      date: '19 Oct 2026',
      paymentMethod: 'UPI / Card',
      planName: 'Dakly Pro Developer Pass',
      receiptUrl: 'https://dakly.cc.cd',
    },
    fields: [
      { key: 'customerName', label: 'Customer Name', placeholder: 'Vikram Sharma' },
      { key: 'invoiceNumber', label: 'Invoice Number', placeholder: 'INV-2026-941' },
      { key: 'amount', label: 'Total Amount', placeholder: '₹1,499.00' },
      { key: 'date', label: 'Payment Date', placeholder: '19 Oct 2026' },
      { key: 'paymentMethod', label: 'Payment Method', placeholder: 'UPI / Card' },
      { key: 'planName', label: 'Item / Plan Name', placeholder: 'Dakly Pro Developer Pass' },
      { key: 'receiptUrl', label: 'Tax Invoice Link (Optional)', placeholder: 'https://...' },
    ],
  },
];

// Developer FAQ for SEO & Generative AI Indexing


// Helper to generate ready-to-run AI Integration Prompts (Cursor / Claude / ChatGPT / Copilot)
const generateAiSetupPrompt = (framework = 'nextjs', apiKey = '', apiUrl = API_BASE_URL) => {
  const effectiveKey = apiKey || 'gkey_live_your_project_api_key_here';

  if (framework === 'nextjs') {
    return `I want to integrate transactional emails (user welcome emails, OTP verification, and notifications) into my Next.js App Router project using Dakly (https://dakly.cc.cd), a zero-cost headless email microservice.

### My Credentials:
- Dakly API Key: ${effectiveKey}
- API Base URL: ${apiUrl}

### Requirements:
1. Install the official SDK:
   \`npm install @dakly/sdk\`
2. Add the environment variable to \`.env.local\`:
   \`DAKLY_API_KEY="${effectiveKey}"\`
3. Create a reusable client singleton at \`lib/email.ts\` (or \`lib/email.js\`):
   - Initialize \`new Dakly(process.env.DAKLY_API_KEY)\`.
   - Export \`sendOtpEmail({ to, otp })\` using \`dakly.sendOtp({ to, otp, expiresInMinutes: 10 })\`.
   - Export \`sendWelcomeEmail({ to, name })\` using \`dakly.sendWelcome({ to, name, appName: 'My App' })\`.
   - Catch and properly handle \`DaklySuppressedError\` (recipient hard-bounced) and \`DaklyRateLimitError\`.
4. Create an API route at \`app/api/auth/send-otp/route.ts\` demonstrating how to accept \`{ to }\`, generate a 6-digit OTP, send it via \`sendOtpEmail\`, and return \`{ success: true }\`.
5. Ensure type safety with TypeScript, clean error responses, and no external SMTP dependencies.`;
  }

  if (framework === 'node' || framework === 'express') {
    return `I want to integrate transactional email and OTP dispatch into my Node.js / Express backend using Dakly (https://dakly.cc.cd), a free zero-setup email microservice.

### My Credentials:
- Dakly API Key: ${effectiveKey}
- API Base URL: ${apiUrl}

### Requirements:
1. Install the official SDK:
   \`npm install @dakly/sdk\`
2. Add the environment variable to \`.env\`:
   \`DAKLY_API_KEY="${effectiveKey}"\`
3. Create a service module at \`services/emailService.js\`:
   - Initialize \`const { Dakly, DaklySuppressedError } = require('@dakly/sdk');\`
   - \`const dakly = new Dakly(process.env.DAKLY_API_KEY);\`
   - Export \`sendOtp(to, otp)\` and \`sendWelcome(to, name)\`.
   - Implement error guards for \`DaklySuppressedError\` so invalid emails fail gracefully without crashing.
4. Show an Express route handler \`POST /api/auth/request-otp\` using this service.
5. Provide clean error handling, logging, and zero Nodemailer boilerplate.`;
  }

  if (framework === 'python') {
    return `I want to integrate transactional email delivery and OTP verification into my Python project (FastAPI / Django / Flask) using Dakly (https://dakly.cc.cd), a free headless email microservice.

### My Credentials:
- Dakly API Key: ${effectiveKey}
- API Base URL: ${apiUrl}

### Requirements:
1. Install the official Python package:
   \`pip install dakly\`
2. Configure \`.env\`:
   \`DAKLY_API_KEY="${effectiveKey}"\`
3. Create \`services/email_service.py\`:
   - Initialize \`from dakly import Dakly, DaklySuppressedError\`
   - \`client = Dakly(api_key=os.getenv("DAKLY_API_KEY"))\`
   - Define \`send_otp_email(to: str, otp: str)\` using \`client.send_otp(to=to, otp=otp, expires_in_minutes=10)\`.
   - Define \`send_welcome_email(to: str, name: str)\` using \`client.send_welcome(to=to, name=name)\`.
   - Catch \`DaklySuppressedError\` to safely catch bounced email addresses.
4. Provide a sample FastAPI route endpoint demonstrating usage.`;
  }

  // Universal / Raw REST
  return `I want to integrate transactional emails and OTP dispatch into my application using the Dakly REST API (https://dakly.cc.cd).

### My Credentials:
- Dakly API Key: ${effectiveKey}
- API Endpoint: ${apiUrl}/api/send
- Health Ping: ${apiUrl}/api/ping

### Requirements:
1. Write a clean HTTP client helper that sends a POST request to \`${apiUrl}/api/send\` with headers:
   - \`Content-Type: application/json\`
   - \`x-api-key: ${effectiveKey}\`
2. Implement functions for:
   - Sending OTP: payload \`{ "to": "user@example.com", "otp": "839201" }\`
   - Sending Welcome: payload \`{ "to": "user@example.com", "template": "welcome", "templateVars": { "name": "Alex" } }\`
   - Sending Custom HTML: payload \`{ "to": "user@example.com", "subject": "Hello", "html": "<h1>Welcome</h1>" }\`
3. Handle responses:
   - Status 200: email sent successfully.
   - Status 400 with \`status: "BLOCKED_SUPPRESSED"\`: address is suppressed due to bounce.
   - Status 429: rate limit exceeded.`;
};

export default function App() {
  // Theme State: 'light' (white background) by default, or 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('dakly_theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('dakly_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [logsError, setLogsError] = useState('');
  const [projectError, setProjectError] = useState('');
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
  const [playSubject, setPlaySubject] = useState('Dakly test email');
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
  // Sender Aliases Modal & Form State
  const [isAddAliasModalOpen, setIsAddAliasModalOpen] = useState(false);
  const [aliasTargetSender, setAliasTargetSender] = useState(null);
  const [newAliasEmail, setNewAliasEmail] = useState('');
  const [newAliasDisplayName, setNewAliasDisplayName] = useState('');
  const [newAliasIsDefault, setNewAliasIsDefault] = useState(false);
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const [playFrom, setPlayFrom] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);


  // Templates Tab State
  const [selectedTemplateId, setSelectedTemplateId] = useState('otp');
  const [templateVars, setTemplateVars] = useState(() => ({ ...DEFAULT_TEMPLATES[0].sampleVars }));
  const [templateRecipient, setTemplateRecipient] = useState('');
  const [templateSubjectOverride, setTemplateSubjectOverride] = useState('');
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState('');
  const [templatePreviewSubject, setTemplatePreviewSubject] = useState('');
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [templateSendResult, setTemplateSendResult] = useState(null);
  const [templateCodeLang, setTemplateCodeLang] = useState('node'); // 'node' | 'python' | 'fetch' | 'curl'
  const [copiedTemplateCode, setCopiedTemplateCode] = useState(false);
  const [templateIframeHeight, setTemplateIframeHeight] = useState(720);
  const templateIframeRef = useRef(null);

  // Custom Templates & Pro Tier State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgradingPlan, setIsUpgradingPlan] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [showCustomTemplateModal, setShowCustomTemplateModal] = useState(false);
  const [isSavingCustomTemplate, setIsSavingCustomTemplate] = useState(false);
  const [customTemplateError, setCustomTemplateError] = useState('');
  const [customTemplateDraftTab, setCustomTemplateDraftTab] = useState('edit'); // 'edit' | 'preview'
  const [customTemplateDraftHtml, setCustomTemplateDraftHtml] = useState('');
  const [editingCustomTemplateId, setEditingCustomTemplateId] = useState(null);
  const [customTemplateForm, setCustomTemplateForm] = useState({
    templateId: '',
    name: '',
    badge: 'Custom',
    description: '',
    subject: 'Order #{{orderNumber}} has shipped, {{name}}!',
    html: '',
    sampleVarsJson: '{}',
  });

  // Landing Page Interactive Simulator

  // Modals
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [aiPromptFramework, setAiPromptFramework] = useState('nextjs'); // 'nextjs' | 'node' | 'python' | 'curl'
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [showAddSenderModal, setShowAddSenderModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoModalError, setLogoModalError] = useState('');
  const [newProjForm, setNewProjForm] = useState({ name: '', senderEmail: '', appPassword: '', senderDisplayName: '' });
  const [addSenderForm, setAddSenderForm] = useState({ email: '', appPassword: '', displayName: '' });
  const [modalLoading, setModalLoading] = useState(false);
  const [isDeletingSender, setIsDeletingSender] = useState(false);

  // Suppression & Bounce Protection State
  const [showSuppressionModal, setShowSuppressionModal] = useState(false);
  const [suppressions, setSuppressions] = useState([]);
  const [, setSuppressionTotal] = useState(0);
  const [suppressionSearch, setSuppressionSearch] = useState('');
  const [isLoadingSuppression, setIsLoadingSuppression] = useState(false);
  const [newSuppressionEmail, setNewSuppressionEmail] = useState('');
  const [newSuppressionReason, setNewSuppressionReason] = useState('MANUAL_BLOCK');
  const [isAddingSuppression, setIsAddingSuppression] = useState(false);
  const [suppressionActionMsg, setSuppressionActionMsg] = useState('');

  // Snippets & SDK Showcase
  const [snippetLang, setSnippetLang] = useState('node');
  const [copiedSnippetKey, setCopiedSnippetKey] = useState(null);

  const handleCopySnippet = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetKey(key);
    setTimeout(() => setCopiedSnippetKey(null), 2000);
  };

  // Webhooks Tab State
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [webhookEnabledInput, setWebhookEnabledInput] = useState(true);
  const [webhookEventsInput, setWebhookEventsInput] = useState([
    'email.delivered',
    'email.failed',
    'email.suppressed',
    'email.opened',
    'email.clicked',
  ]);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [webhookSaveMsg, setWebhookSaveMsg] = useState('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);
  const [webhookVerifyLang, setWebhookVerifyLang] = useState('node'); // 'node' | 'python' | 'nextjs'

  // Security, IP Whitelisting & Team Workspaces State
  const [showRotateKeyModal, setShowRotateKeyModal] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [rotateKeyMsg, setRotateKeyMsg] = useState('');
  const [ipWhitelistList, setIpWhitelistList] = useState([]);
  const [ipWhitelistEnabledInput, setIpWhitelistEnabledInput] = useState(false);
  const [detectedClientIp, setDetectedClientIp] = useState('');
  const [newIpInput, setNewIpInput] = useState('');
  const [isSavingIpWhitelist, setIsSavingIpWhitelist] = useState(false);
  const [ipWhitelistSaveMsg, setIpWhitelistSaveMsg] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [projectOwner, setProjectOwner] = useState(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [inviteMemberEmail, setInviteMemberEmail] = useState('');
  const [inviteMemberRole, setInviteMemberRole] = useState('admin');
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [memberActionMsg, setMemberActionMsg] = useState('');

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

  // When activeProject changes, reload stats, logs, and sync webhook/security settings
  useEffect(() => {
    if (activeProject) {
      loadStats(activeProject.apiKey);
      loadLogs(activeProject.apiKey, 1, logSearch, logStatus);
      setWebhookUrlInput(activeProject.webhookUrl || '');
      setWebhookSecretInput(activeProject.webhookSecret || '');
      setWebhookEnabledInput(activeProject.webhookEnabled !== false);
      setWebhookEventsInput(
        activeProject.webhookEvents && activeProject.webhookEvents.length > 0
          ? activeProject.webhookEvents
          : ['email.delivered', 'email.failed', 'email.suppressed', 'email.opened', 'email.clicked']
      );
      setWebhookTestResult(null);
      setWebhookSaveMsg('');
      setIpWhitelistList(activeProject.ipWhitelist || []);
      setIpWhitelistEnabledInput(Boolean(activeProject.ipWhitelistEnabled));
      loadSecurityAndTeamData(activeProject.id);
    }
  }, [activeProject]);

  const handleToggleWebhookEvent = (eventName) => {
    setWebhookEventsInput((prev) =>
      prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName]
    );
  };

  const handleSaveWebhookSettings = async (e) => {
    if (e) e.preventDefault();
    if (!activeProject) return;

    try {
      setIsSavingWebhook(true);
      setWebhookSaveMsg('');
      const res = await updateProjectSettings(
        activeProject.id,
        {
          webhookUrl: webhookUrlInput.trim(),
          webhookSecret: webhookSecretInput.trim(),
          webhookEnabled: webhookEnabledInput,
          webhookEvents: webhookEventsInput,
        },
        authToken
      );

      if (res.success) {
        setWebhookSaveMsg(' Webhook settings saved successfully!');
        setActiveProject((prev) => ({
          ...prev,
          webhookUrl: res.project.webhookUrl,
          webhookSecret: res.project.webhookSecret,
          webhookSecretConfigured: res.project.webhookSecretConfigured,
          webhookEnabled: res.project.webhookEnabled,
          webhookEvents: res.project.webhookEvents,
        }));
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id
              ? {
                  ...p,
                  webhookUrl: res.project.webhookUrl,
                  webhookSecret: res.project.webhookSecret,
                  webhookSecretConfigured: res.project.webhookSecretConfigured,
                  webhookEnabled: res.project.webhookEnabled,
                  webhookEvents: res.project.webhookEvents,
                }
              : p
          )
        );
      } else {
        setWebhookSaveMsg(` Error: ${res.error || 'Failed to save webhook settings.'}`);
      }
    } catch (err) {
      setWebhookSaveMsg(` Error: ${err.message}`);
    } finally {
      setIsSavingWebhook(false);
      setTimeout(() => setWebhookSaveMsg(''), 4000);
    }
  };

  const handleGenerateWebhookSecret = async () => {
    if (!activeProject) return;
    try {
      const res = await generateWebhookSecret(activeProject.id, authToken);
      if (res.success && res.webhookSecret) {
        setWebhookSecretInput(res.webhookSecret);
        setActiveProject((prev) => ({
          ...prev,
          webhookSecret: res.webhookSecret,
          webhookSecretConfigured: true,
        }));
        setWebhookSaveMsg(' New Webhook Secret generated! Remember to click Save.');
      } else {
        alert(res.error || 'Failed to generate secret.');
      }
    } catch (err) {
      alert(`Error generating secret: ${err.message}`);
    }
  };

  const handleTriggerTestWebhook = async () => {
    if (!activeProject) return;
    if (!webhookUrlInput.trim()) {
      alert('Please enter a Webhook URL before testing.');
      return;
    }

    try {
      setIsTestingWebhook(true);
      setWebhookTestResult(null);
      const res = await testWebhook(
        activeProject.id,
        {
          webhookUrl: webhookUrlInput.trim(),
          webhookSecret: webhookSecretInput.trim(),
        },
        authToken
      );
      setWebhookTestResult(res.result || res);
    } catch (err) {
      setWebhookTestResult({
        success: false,
        httpStatus: 0,
        latencyMs: 0,
        error: err.message,
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  async function loadSecurityAndTeamData(projId) {
    if (!projId) return;
    setIsLoadingMembers(true);
    try {
      const [ipRes, membersRes] = await Promise.all([
        fetchIpWhitelist(projId, authToken),
        fetchProjectMembers(projId, authToken),
      ]);
      if (ipRes && ipRes.success) {
        setDetectedClientIp(ipRes.clientIp || '');
        if (ipRes.ipWhitelist) setIpWhitelistList(ipRes.ipWhitelist);
        if (ipRes.ipWhitelistEnabled !== undefined) setIpWhitelistEnabledInput(Boolean(ipRes.ipWhitelistEnabled));
      }
      if (membersRes && membersRes.success) {
        setTeamMembers(membersRes.members || []);
        setProjectOwner(membersRes.owner || null);
      }
    } catch (err) {
      console.warn('Failed loading security/team data:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleRotateApiKey() {
    if (!activeProject) return;
    setIsRotatingKey(true);
    setRotateKeyMsg('');
    try {
      const res = await rotateApiKey(activeProject.id, authToken);
      if (res.success && res.apiKey) {
        activeProject.apiKey = res.apiKey;
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? { ...p, apiKey: res.apiKey } : p))
        );
        setRotateKeyMsg('API key successfully regenerated! The old key has been revoked.');
        
        setTimeout(() => setShowRotateKeyModal(false), 2000);
      } else {
        alert(res.error || 'Failed to rotate API key.');
      }
    } catch (err) {
      alert('Error rotating key: ' + err.message);
    } finally {
      setIsRotatingKey(false);
    }
  }

  function handleAddIpToWhitelist(ipToAdd) {
    const cleanIp = (ipToAdd || newIpInput).trim();
    if (!cleanIp) return;
    if (ipWhitelistList.includes(cleanIp)) {
      alert(`IP "${cleanIp}" is already in the whitelist.`);
      return;
    }
    setIpWhitelistList([...ipWhitelistList, cleanIp]);
    setNewIpInput('');
  }

  function handleRemoveIpFromWhitelist(ipToRemove) {
    setIpWhitelistList(ipWhitelistList.filter((ip) => ip !== ipToRemove));
  }

  async function handleSaveIpWhitelistSettings(e) {
    if (e) e.preventDefault();
    if (!activeProject) return;
    setIsSavingIpWhitelist(true);
    setIpWhitelistSaveMsg('');
    try {
      const res = await updateIpWhitelist(
        activeProject.id,
        {
          ipWhitelist: ipWhitelistList,
          ipWhitelistEnabled: ipWhitelistEnabledInput,
        },
        authToken
      );
      if (res.success) {
        activeProject.ipWhitelist = res.ipWhitelist;
        activeProject.ipWhitelistEnabled = res.ipWhitelistEnabled;
        setIpWhitelistSaveMsg(' IP Whitelist configuration saved successfully!');
        setTimeout(() => setIpWhitelistSaveMsg(''), 4000);
      } else {
        alert(res.error || 'Failed to update IP whitelist');
      }
    } catch (err) {
      alert('Error updating IP whitelist: ' + err.message);
    } finally {
      setIsSavingIpWhitelist(false);
    }
  }

  async function handleInviteMember(e) {
    if (e) e.preventDefault();
    if (!activeProject || !inviteMemberEmail.trim()) return;
    setIsInvitingMember(true);
    setMemberActionMsg('');
    try {
      const res = await addProjectMember(
        activeProject.id,
        { email: inviteMemberEmail.trim(), role: inviteMemberRole },
        authToken
      );
      if (res.success) {
        setTeamMembers(res.members || []);
        setInviteMemberEmail('');
        setMemberActionMsg(res.message || 'Teammate invited successfully!');
        
        setTimeout(() => setMemberActionMsg(''), 4000);
      } else {
        alert(res.error || 'Failed to invite team member');
      }
    } catch (err) {
      alert('Error inviting member: ' + err.message);
    } finally {
      setIsInvitingMember(false);
    }
  }

  async function handleUpdateMemberRole(memberId, newRole) {
    if (!activeProject || !memberId) return;
    try {
      const res = await updateProjectMember(activeProject.id, memberId, { role: newRole }, authToken);
      if (res.success) {
        setTeamMembers(res.members || []);
      } else {
        alert(res.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Error updating member role: ' + err.message);
    }
  }

  async function handleRemoveMember(memberId, memberEmail) {
    if (!activeProject || !memberId) return;
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this project?`)) return;
    try {
      const res = await removeProjectMember(activeProject.id, memberId, authToken);
      if (res.success) {
        setTeamMembers(res.members || []);
        setMemberActionMsg(res.message);
        setTimeout(() => setMemberActionMsg(''), 4000);
      } else {
        alert(res.error || 'Failed to remove member');
      }
    } catch (err) {
      alert('Error removing member: ' + err.message);
    }
  }

  // Auto-render template preview when selected template, vars, or active project changes
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsRenderingPreview(true);
        const res = await previewTemplate(selectedTemplateId, templateVars, activeProject?.apiKey);
        if (!isCancelled && res.success) {
          setTemplatePreviewHtml(res.html);
          setTemplatePreviewSubject(res.defaultSubject);
        }
      } catch (err) {
        console.error('Template preview error:', err);
      } finally {
        if (!isCancelled) setIsRenderingPreview(false);
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedTemplateId, templateVars, activeProject]);

  const syncIframeHeight = () => {
    try {
      const iframe = templateIframeRef.current;
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        if (doc.documentElement) {
          doc.documentElement.style.overflow = 'hidden';
        }
        if (doc.body) {
          doc.body.style.overflow = 'hidden';
          doc.body.style.margin = '0';
          doc.body.style.padding = '0';
        }
        const scrollH = Math.max(
          doc.body?.scrollHeight || 0,
          doc.documentElement?.scrollHeight || 0,
          doc.body?.offsetHeight || 0,
          doc.documentElement?.offsetHeight || 0
        );
        if (scrollH > 150) {
          setTemplateIframeHeight(scrollH + 32);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    syncIframeHeight();
    const t1 = setTimeout(syncIframeHeight, 80);
    const t2 = setTimeout(syncIframeHeight, 250);
    const t3 = setTimeout(syncIframeHeight, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [templatePreviewHtml, previewDevice, selectedTemplateId]);

  const preparedPreviewHtml = useMemo(() => {
    if (!templatePreviewHtml) return '';
    const injectStyle = `
      <style>
        html, body {
          overflow: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: #ffffff !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
      </style>
    `;
    if (templatePreviewHtml.includes('</head>')) {
      return templatePreviewHtml.replace('</head>', `${injectStyle}</head>`);
    }
    return `${injectStyle}${templatePreviewHtml}`;
  }, [templatePreviewHtml]);

  // Combined system and project-specific custom templates
  const allTemplates = useMemo(() => {
    const customList = (activeProject?.customTemplates || []).map((ct) => ({
      id: ct.templateId,
      name: ct.name,
      badge: ct.badge || 'Custom',
      badgeColor: 'border-brand-500/30 text-brand-600 bg-brand-500/10 dark:text-brand-400',
      description: ct.description || 'Custom brand template designed for your app.',
      sampleVars: ct.sampleVars || {},
      fields: ct.fields && ct.fields.length > 0 ? ct.fields : Object.keys(ct.sampleVars || {}).map((k) => ({
        key: k,
        label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        placeholder: String(ct.sampleVars[k] || ''),
        isTextarea: false,
      })),
      isCustom: true,
      rawHtml: ct.html,
      rawSubject: ct.subject,
    }));
    return [...DEFAULT_TEMPLATES, ...customList];
  }, [activeProject?.customTemplates]);

  // Pro Plan Upgrade Handler
  const handleUpgradeToPro = async () => {
    if (!activeProject) return;
    try {
      setIsUpgradingPlan(true);
      setUpgradeError('');
      const res = await upgradeProjectToPro(activeProject.id, 'pro', authToken);
      if (res.success) {
        setActiveProject((prev) => ({
          ...prev,
          plan: 'pro',
          isPro: true,
        }));
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id ? { ...p, plan: 'pro', isPro: true } : p
          )
        );
        setShowUpgradeModal(false);
        openNewCustomTemplateModal();
      } else {
        setUpgradeError(res.error || 'Failed to activate Pro pass.');
      }
    } catch (err) {
      setUpgradeError(err.message || 'Error activating Pro pass.');
    } finally {
      setIsUpgradingPlan(false);
    }
  };

  const openNewCustomTemplateModal = () => {
    setEditingCustomTemplateId(null);
    setCustomTemplateError('');
    setCustomTemplateDraftTab('edit');
    setCustomTemplateForm({
      templateId: '',
      name: '',
      badge: 'Custom',
      description: '',
      subject: 'Order #{{orderNumber}} has shipped, {{name}}!',
      html: `<h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">\n  Hi {{name}}, your order has shipped!\n</h1>\n<p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.5;">\n  We are happy to let you know that package <strong>#{{orderNumber}}</strong> is on its way to you via {{courier}}.\n</p>\n\n<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">\n  <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">Tracking Number</div>\n  <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace;">{{trackingNumber}}</div>\n</div>\n\n<div style="text-align: center; margin: 24px 0;">\n  <a href="{{trackingUrl}}" style="display: inline-block; background: #163d35; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none;">\n    Track Your Shipment &rarr;\n  </a>\n</div>\n\n<p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">\n  Expected delivery date: <strong>{{estimatedDate}}</strong>\n</p>`,
      sampleVarsJson: JSON.stringify(
        {
          name: 'Aarav',
          orderNumber: 'ORD-78291',
          courier: 'BlueDart',
          trackingNumber: 'BD-94182049',
          trackingUrl: 'https://carrier.com/track',
          estimatedDate: 'Friday, 24 Oct',
        },
        null,
        2
      ),
    });
    setShowCustomTemplateModal(true);
  };

  const openEditCustomTemplateModal = (ct) => {
    setEditingCustomTemplateId(ct.templateId || ct.id);
    setCustomTemplateError('');
    setCustomTemplateDraftTab('edit');
    setCustomTemplateForm({
      templateId: ct.templateId,
      name: ct.name,
      badge: ct.badge || 'Custom',
      description: ct.description || '',
      subject: ct.subject || '',
      html: ct.html,
      sampleVarsJson: JSON.stringify(ct.sampleVars || {}, null, 2),
    });
    setShowCustomTemplateModal(true);
  };

  const handleSaveCustomTemplate = async (e) => {
    if (e) e.preventDefault();
    if (!activeProject) return;

    let parsedVars = {};
    try {
      if (customTemplateForm.sampleVarsJson.trim()) {
        parsedVars = JSON.parse(customTemplateForm.sampleVarsJson);
      }
    } catch {
      setCustomTemplateError('Invalid JSON format in Sample Variables.');
      return;
    }

    try {
      setIsSavingCustomTemplate(true);
      setCustomTemplateError('');

      const payload = {
        templateId: customTemplateForm.templateId.trim().toLowerCase(),
        name: customTemplateForm.name.trim(),
        badge: customTemplateForm.badge.trim() || 'Custom',
        description: customTemplateForm.description.trim(),
        subject: customTemplateForm.subject.trim(),
        html: customTemplateForm.html,
        sampleVars: parsedVars,
      };

      let res;
      if (editingCustomTemplateId) {
        res = await updateCustomTemplate(activeProject.id, editingCustomTemplateId, payload, authToken);
      } else {
        res = await createCustomTemplate(activeProject.id, payload, authToken);
      }

      if (res.success) {
        const updatedTemplates = editingCustomTemplateId
          ? (activeProject.customTemplates || []).map((t) =>
              t.templateId === editingCustomTemplateId ? res.template : t
            )
          : [...(activeProject.customTemplates || []), res.template];

        setActiveProject((prev) => ({
          ...prev,
          customTemplates: updatedTemplates,
        }));
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id ? { ...p, customTemplates: updatedTemplates } : p
          )
        );

        setShowCustomTemplateModal(false);
        setSelectedTemplateId(res.template.templateId);
        setTemplateVars({ ...res.template.sampleVars });
      } else {
        if (res.code === 'PRO_REQUIRED') {
          setShowCustomTemplateModal(false);
          setShowUpgradeModal(true);
        } else {
          setCustomTemplateError(res.error || 'Failed to save custom template.');
        }
      }
    } catch (err) {
      setCustomTemplateError(err.message || 'Error saving custom template.');
    } finally {
      setIsSavingCustomTemplate(false);
    }
  };

  const handleDeleteCustomTemplate = async (templateId, e) => {
    if (e) e.stopPropagation();
    if (!activeProject) return;
    if (!window.confirm(`Are you sure you want to delete custom template "${templateId}"?`)) return;

    try {
      const res = await deleteCustomTemplate(activeProject.id, templateId, authToken);
      if (res.success) {
        const remaining = (activeProject.customTemplates || []).filter((t) => t.templateId !== templateId);
        setActiveProject((prev) => ({
          ...prev,
          customTemplates: remaining,
        }));
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id ? { ...p, customTemplates: remaining } : p
          )
        );
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId('otp');
          setTemplateVars({ ...DEFAULT_TEMPLATES[0].sampleVars });
        }
      } else {
        alert(res.error || 'Failed to delete custom template.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting custom template.');
    }
  };

  useEffect(() => {
    if (showCustomTemplateModal && customTemplateDraftTab === 'preview') {
      let vars = {};
      try {
        if (customTemplateForm.sampleVarsJson) {
          vars = JSON.parse(customTemplateForm.sampleVarsJson);
        }
      } catch (_) {}
      previewTemplate(null, vars, activeProject?.apiKey, customTemplateForm.html, customTemplateForm.subject)
        .then((res) => {
          if (res?.success && res.html) {
            setCustomTemplateDraftHtml(res.html);
          }
        })
        .catch(() => {});
    }
  }, [showCustomTemplateModal, customTemplateDraftTab, customTemplateForm.html, customTemplateForm.subject, customTemplateForm.sampleVarsJson, activeProject?.apiKey]);

  const handleSendTemplate = async (e) => {
    if (e) e.preventDefault();
    if (!templateRecipient.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }
    if (!activeProject?.apiKey) {
      alert('Please select or create a project with an active API key.');
      return;
    }

    try {
      setIsSendingTemplate(true);
      setTemplateSendResult(null);

      const payload = {
        to: templateRecipient.trim(),
        template: selectedTemplateId,
        vars: templateVars,
      };

      if (templateSubjectOverride.trim()) {
        payload.subject = templateSubjectOverride.trim();
      }

      const res = await sendEmail(activeProject.apiKey, payload);
      setTemplateSendResult(res);

      if (res.success) {
        
        loadStats(activeProject.apiKey);
        loadLogs(activeProject.apiKey, 1, logSearch, logStatus);
      }
    } catch (err) {
      setTemplateSendResult({ success: false, error: err.message });
    } finally {
      setIsSendingTemplate(false);
    }
  };

  const getTemplateSnippet = () => {
    const key = activeProject?.apiKey || 'gkey_live_...';
    const rec = templateRecipient || 'user@example.com';
    const subj = templateSubjectOverride.trim() ? `, "subject": "${templateSubjectOverride.trim()}"` : '';

    if (templateCodeLang === 'curl') {
      return `curl -X POST https://dakly-engin.vercel.app/api/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${key}" \\
  -d '{
    "to": "${rec}",
    "template": "${selectedTemplateId}"${subj},
    "vars": ${JSON.stringify(templateVars, null, 4).replace(/\n/g, '\n    ')}
  }'`;
    }

    if (templateCodeLang === 'fetch') {
      return `const response = await fetch('https://dakly-engin.vercel.app/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${key}',
  },
  body: JSON.stringify({
    to: '${rec}',
    template: '${selectedTemplateId}',${templateSubjectOverride.trim() ? `\n    subject: '${templateSubjectOverride.trim()}',` : ''}
    vars: ${JSON.stringify(templateVars, null, 4).replace(/\n/g, '\n    ')},
  }),
});

const data = await response.json();
console.log('Delivered:', data.trackingId);`;
    }

    if (templateCodeLang === 'python') {
      return `# pip install dakly
from dakly import Dakly

dakly = Dakly('${key}')

res = dakly.send_template(
    to='${rec}',
    template='${selectedTemplateId}',${templateSubjectOverride.trim() ? `\n    subject='${templateSubjectOverride.trim()}',` : ''}
    vars=${JSON.stringify(templateVars, null, 4).replace(/\n/g, '\n    ')}
)

print('Delivered! Tracking ID:', res['trackingId'])`;
    }

    // Default: 'node' (Official Node.js / TypeScript SDK - npm i dakly)
    return `// npm i dakly
import { Dakly } from 'dakly';

const dakly = new Dakly('${key}');

const result = await dakly.sendTemplate({
  to: '${rec}',
  template: '${selectedTemplateId}',${templateSubjectOverride.trim() ? `\n  subject: '${templateSubjectOverride.trim()}',` : ''}
  vars: ${JSON.stringify(templateVars, null, 2).replace(/\n/g, '\n  ')},
});

console.log('Delivered! Tracking ID:', result.trackingId);`;
  };

  async function loadProjects(token) {
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const data = await fetchProjects(token);
      if (!data.success || !Array.isArray(data.projects)) throw new Error(data.error || 'Projects unavailable.');
      setProjects(data.projects);
      const savedId = localStorage.getItem('dakly_dashboard_active_id');
      setActiveProject(data.projects.find(p => p.id === savedId) || data.projects[0] || null);
    } catch {
      setProjectsError('We couldn’t load your projects. Check your connection and try again.');
    } finally {
      setProjectsLoading(false);
    }
  }

  async function loadStats(apiKey) {
    setStatsLoading(true);
    setStatsError('');
    setStats(null);
    try {
      const data = await fetchStats(apiKey);
      if (!data.success) throw new Error(data.error || 'Sender data unavailable.');
      setStats(data);
    } catch {
      setStatsError('Sender activity couldn’t load. Try again to check quota and delivery.');
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadLogs(apiKey, page = 1, search = '', status = '') {
    setIsRefreshingLogs(true);
    setLogsError('');
    try {
      const data = await fetchLogs(apiKey, { page, limit: 10, search, status });
      if (!data.success) throw new Error(data.error || 'Delivery logs unavailable.');
      setLogs(data.logs || []);
      setLogsPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch {
      setLogsError('Delivery logs couldn’t load. Check your connection and refresh.');
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

  async function handlePingKey() {
    if (!activeProject?.apiKey) return;
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await pingApiKey(activeProject.apiKey);
      setPingResult(res);
      if (res.success) {
        
        if (authToken) loadProjects(authToken);
        loadStats(activeProject.apiKey);
      }
    } catch (err) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setIsPinging(false);
    }
  }

  async function loadSuppressions(projectId, search = '') {
    if (!projectId) return;
    setIsLoadingSuppression(true);
    try {
      const res = await fetchSuppressionList(projectId, { search, limit: 50 }, authToken);
      if (res.success) {
        setSuppressions(res.suppressions || []);
        setSuppressionTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load suppressions:', err);
    } finally {
      setIsLoadingSuppression(false);
    }
  }

  async function handleAddSuppressionSubmit(e) {
    if (e) e.preventDefault();
    if (!activeProject || !newSuppressionEmail) return;
    setIsAddingSuppression(true);
    setSuppressionActionMsg('');
    try {
      const projId = activeProject.id || activeProject._id;
      const res = await addSuppressionEmail(
        projId,
        {
          email: newSuppressionEmail,
          reason: newSuppressionReason,
        },
        authToken
      );
      if (res.success) {
        setNewSuppressionEmail('');
        setSuppressionActionMsg(' Email added to blocklist!');
        loadSuppressions(projId, suppressionSearch);
      } else {
        setSuppressionActionMsg(` ${res.error}`);
      }
    } catch (err) {
      setSuppressionActionMsg(` ${err.message}`);
    } finally {
      setIsAddingSuppression(false);
    }
  }

  async function handleRemoveSuppression(suppressionId) {
    if (!activeProject) return;
    const projId = activeProject.id || activeProject._id;
    try {
      const res = await removeSuppressionEmail(projId, suppressionId, authToken);
      if (res.success) {
        loadSuppressions(projId, suppressionSearch);
      }
    } catch (err) {
      console.error('Failed to remove suppression:', err);
    }
  }

  async function handleToggleWarmup(senderId, currentWarmupEnabled) {
    if (!activeProject) return;
    const projId = activeProject.id || activeProject._id;
    try {
      const res = await updateSenderWarmupMode(
        projId,
        senderId,
        { warmupEnabled: !currentWarmupEnabled, resetStartDate: !currentWarmupEnabled },
        authToken
      );
      if (res.success) {
        loadStats(activeProject.apiKey);
        if (authToken) loadProjects(authToken);
      }
    } catch (err) {
      console.error('Failed to toggle warmup mode:', err);
    }
  }

  async function handleDeleteSender(sender) {
    if (!activeProject) return;
    const senderEmail = sender.email;
    const isPrimary = sender.role === 'Primary';
    const totalSenders = stats?.capacity?.senders?.length || 1;

    let confirmMsg = `Are you sure you want to delete ${senderEmail} from this project?`;
    if (isPrimary && totalSenders > 1) {
      confirmMsg += '\n\nNote: The next backup sender will automatically become Primary.';
    } else if (totalSenders <= 1) {
      confirmMsg += "\n\nWarning: This is the ONLY sender in this project. Removing it means you won't be able to send emails until you add another Gmail sender.";
    }

    if (!window.confirm(confirmMsg)) return;

    const projId = activeProject.id || activeProject._id;
    const senderId = sender.id || sender._id || sender.email;

    try {
      setIsDeletingSender(true);
      const res = await deleteSender(projId, senderId, authToken);
      if (res.success) {
        if (activeProject.apiKey) {
          await loadStats(activeProject.apiKey);
        }
        if (authToken) {
          await loadProjects(authToken);
        }
      } else {
        alert(res.error || 'Failed to remove sender.');
      }
    } catch (err) {
      console.error('Failed to delete sender:', err);
      alert(err.message || 'Error occurred while deleting sender.');
    } finally {
      setIsDeletingSender(false);
    }
  }

  async function handleDeleteSenderFromProject(project, sender) {
    const senderEmail = sender.email;
    const isPrimary = sender.priority === 0 || project.senderEmail === sender.email;
    const totalSenders = project.senders?.length || 1;

    let confirmMsg = `Are you sure you want to delete ${senderEmail} from "${project.name}"?`;
    if (isPrimary && totalSenders > 1) {
      confirmMsg += '\n\nNote: The next backup sender will automatically become Primary.';
    } else if (totalSenders <= 1) {
      confirmMsg += '\n\nWarning: This is the ONLY sender in this project.';
    }

    if (!window.confirm(confirmMsg)) return;

    const projId = project.id || project._id;
    const senderId = sender.id || sender._id || sender.email;

    try {
      setIsDeletingSender(true);
      const res = await deleteSender(projId, senderId, authToken);
      if (res.success) {
        if (authToken) {
          await loadProjects(authToken);
        }
        if (activeProject && (activeProject.id === projId || activeProject._id === projId) && activeProject.apiKey) {
          await loadStats(activeProject.apiKey);
        }
      } else {
        alert(res.error || 'Failed to remove sender.');
      }
    } catch (err) {
      console.error('Failed to delete sender:', err);
      alert(err.message || 'Error occurred while deleting sender.');
    } finally {
      setIsDeletingSender(false);
    }
  }

  function openAddAliasModal(sender) {
    setAliasTargetSender(sender);
    setNewAliasEmail('');
    setNewAliasDisplayName(sender.displayName || '');
    setNewAliasIsDefault(false);
    setIsAddAliasModalOpen(true);
  }

  async function handleAddAliasSubmit(e) {
    e.preventDefault();
    if (!newAliasEmail.trim()) {
      alert('Please enter an alias email.');
      return;
    }
    if (!activeProject || !aliasTargetSender) return;

    const projId = activeProject.id || activeProject._id;
    const senderId = aliasTargetSender.id || aliasTargetSender._id || aliasTargetSender.email;

    try {
      setIsSavingAlias(true);
      const res = await addSenderAlias(
        projId,
        senderId,
        {
          email: newAliasEmail.trim(),
          displayName: newAliasDisplayName.trim(),
          isDefault: newAliasIsDefault,
        },
        authToken
      );

      if (res.success) {
        setIsAddAliasModalOpen(false);
        if (authToken) await loadProjects(authToken);
        if (activeProject.apiKey) await loadStats(activeProject.apiKey);
      } else {
        alert(res.error || 'Failed to add sender alias.');
      }
    } catch (err) {
      console.error('Failed to add sender alias:', err);
      alert(err.message || 'Error occurred while adding alias.');
    } finally {
      setIsSavingAlias(false);
    }
  }

  async function handleDeleteAlias(sender, alias) {
    if (!window.confirm(`Are you sure you want to delete alias "${alias.email}" from ${sender.email}?`)) {
      return;
    }
    if (!activeProject) return;

    const projId = activeProject.id || activeProject._id;
    const senderId = sender.id || sender._id || sender.email;

    try {
      const res = await deleteSenderAlias(projId, senderId, alias.email, authToken);
      if (res.success) {
        if (authToken) await loadProjects(authToken);
        if (activeProject.apiKey) await loadStats(activeProject.apiKey);
      } else {
        alert(res.error || 'Failed to delete alias.');
      }
    } catch (err) {
      console.error('Failed to delete alias:', err);
      alert(err.message || 'Error occurred while deleting alias.');
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
    if (playFrom.trim()) {
      payload.from = playFrom.trim();
    }

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
    setProjectError('');
    const password = newProjForm.appPassword.replace(/\s/g, '');
    if (password.length !== 16) {
      setProjectError('Enter the 16-character App Password from Google. Spaces are removed automatically.');
      return;
    }
    setModalLoading(true);
    try {
      const data = await createProject({ ...newProjForm, name: newProjForm.name.trim(), senderEmail: newProjForm.senderEmail.trim(), appPassword: password }, authToken);
      if (!data.success) throw new Error(data.error || 'Google could not connect this sender. Check the address and App Password.');
      setShowNewProjModal(false);
      setNewProjForm({ name: '', senderEmail: '', appPassword: '', senderDisplayName: '' });
      setActiveTab('playground');
      await loadProjects(authToken);
    } catch (err) {
      setProjectError(err.message === 'Failed to fetch' ? 'We couldn’t reach Dakly. Check your connection, then try again.' : err.message);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleAddSenderSubmit(e) {
    e.preventDefault();
    if (!activeProject) return;
    setModalLoading(true);
    try {
      const projId = activeProject.id || activeProject._id;
      const data = await addSender(projId, addSenderForm, authToken);
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
  // BRAND LOGO HANDLERS (1:1 Square Only, 1 Image Limit, Anti-Piracy Guard)
  // ==============================================================
  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoModalError('');

    // Anti-Piracy Check: 1.5MB Maximum Size Limit
    if (file.size > 1.5 * 1024 * 1024) {
      setLogoModalError('File size exceeds 1.5 MB limit. Please select a genuine logo image under 1.5MB.');
      setLogoFile(null);
      return;
    }

    // Anti-Piracy Check: Disallow executable, torrent, or archive extensions
    const forbiddenExts = ['.exe', '.dll', '.bat', '.sh', '.torrent', '.zip', '.rar', '.7z', '.mp4', '.mkv'];
    const lowerName = file.name.toLowerCase();
    if (forbiddenExts.some((ext) => lowerName.endsWith(ext))) {
      setLogoModalError('Security Violation: Disallowed or pirated file format detected. Only clean 1:1 image files are permitted.');
      setLogoFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target.result;
      const img = new window.Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const ratio = width / height;
        const isSquare = ratio >= 0.93 && ratio <= 1.07;

        if (!isSquare) {
          setLogoModalError(`Banner rejected! Logo MUST be 1:1 square (width = height, e.g. 256×256 or 512×512). Your image is ${width}×${height} (ratio ${ratio.toFixed(2)}:1).`);
          setLogoFile({
            dataUri,
            width,
            height,
            sizeFormatted: (file.size / 1024).toFixed(1) + ' KB',
            isSquare: false,
          });
        } else {
          setLogoModalError('');
          setLogoFile({
            dataUri,
            width,
            height,
            sizeFormatted: (file.size / 1024).toFixed(1) + ' KB',
            isSquare: true,
          });
        }
      };
      img.onerror = () => {
        setLogoModalError('Invalid or corrupted image file.');
        setLogoFile(null);
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUploadSubmit = async () => {
    if (!logoFile || !logoFile.isSquare || !activeProject) return;
    setIsUploadingLogo(true);
    setLogoModalError('');

    try {
      const res = await uploadProjectLogo(activeProject.id, logoFile.dataUri, authToken);
      if (res.success) {
        
        await loadProjects(authToken);
        setShowLogoModal(false);
        setLogoFile(null);
      } else {
        setLogoModalError(res.error || 'Failed to upload logo.');
      }
    } catch (err) {
      setLogoModalError(err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!activeProject || !confirm('Are you sure you want to remove the brand logo from this project?')) return;
    try {
      const res = await deleteProjectLogo(activeProject.id, authToken);
      if (res.success) {
        await loadProjects(authToken);
        setShowLogoModal(false);
        setLogoFile(null);
      } else {
        alert(res.error || 'Failed to remove logo.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ==============================================================
  // HELPER: RENDER PRIVACY & TERMS MODALS (AdSense & Legal Requirement)
  // ==============================================================
  const renderSenderPool = () => (
<SpotlightCard
                  
                  className="p-6 sm:p-7 rounded-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/10">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                        <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        <span>Active Gmail Senders & Failover Pool</span>
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                        Multi-Gmail failover with Smart Warm-up protection and automatic switch on quota limit.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2.5 self-start sm:self-auto flex-wrap gap-2">
                      <button
                        onClick={() => {
                          loadSuppressions(activeProject?.id || activeProject?._id);
                          setShowSuppressionModal(true);
                        }}
                        className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 text-xs sm:text-sm font-semibold transition active:scale-[0.98]"
                        title="View auto-blocked bounce recipients"
                      >
                        <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Bounce Guard & Suppression</span>
                      </button>
                      <button
                        onClick={() => setShowAddSenderModal(true)}
                        className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-semibold transition active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{stats?.capacity?.senders?.length > 0 ? 'Connect another Gmail' : '+ Connect Gmail Sender'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {(!stats?.capacity?.senders || stats?.capacity?.senders?.length === 0) ? (
                      <div className="py-12 px-6 text-center rounded-lg bg-slate-50/50 dark:bg-[var(--surface)]/60 border border-dashed border-amber-500/30 dark:border-amber-500/20 space-y-4">
                        <div className="w-14 h-14 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                          <Mail className="w-7 h-7" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1.5">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            <span>No Active Gmail Senders</span>
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            You currently have 0 senders configured for this project. Connect a Gmail sender account with a Google App Password to enable transactional OTPs and email deliveries.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddSenderModal(true)}
                          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-bold transition active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Connect Gmail Sender</span>
                        </button>
                      </div>
                    ) : (
                      stats.capacity.senders.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200/80 dark:border-white/5 space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center space-x-3.5">
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                                s.role === 'Primary'
                                  ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30'
                                  : 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30'
                              }`}
                            >
                              {s.role}
                            </span>
                            <div>
                              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{s.email}</div>
                              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{s.displayName || 'Sender Account'}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end text-sm font-mono">
                            <div className="text-right">
                              <div className="text-slate-800 dark:text-slate-200 font-bold">
                                {s.emailsSentToday} / {s.effectiveQuota || s.dailyQuota} sent
                              </div>
                              <div className="text-xs text-slate-500">{s.remainingToday} remaining today</div>
                            </div>
                            <span
                              className={`inline-flex h-3 w-3 rounded-full ${
                                s.isExhaustedToday ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              title={s.isExhaustedToday ? 'Quota Reached' : 'Active'}
                            ></span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSender(s)}
                              disabled={isDeletingSender}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 border border-transparent hover:border-rose-500/20 transition active:scale-95 disabled:opacity-50"
                              title={`Delete ${s.role} sender (${s.email})`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Sender Aliases Section (Gmail "Send mail as") */}
                        <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                                <span>Sender Aliases</span>
                                <span className="text-xs text-slate-400 font-normal">("Send mail as")</span>
                              </span>
                              {s.aliases && s.aliases.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                  {s.aliases.length}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openAddAliasModal(s)}
                              className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium flex items-center space-x-1 hover:underline transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Alias</span>
                            </button>
                          </div>

                          {s.aliases && s.aliases.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {s.aliases.map((alias, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10"
                                >
                                  <span className="font-mono text-slate-800 dark:text-slate-200">
                                    {alias.displayName ? `${alias.displayName} <${alias.email}>` : alias.email}
                                  </span>
                                  {alias.isDefault && (
                                    <span className="px-1.5 py-0.2 rounded text-xs font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      Default
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAlias(s, alias)}
                                    className="text-slate-400 hover:text-rose-500 transition p-0.5"
                                    title={`Delete alias ${alias.email}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                              No aliases configured. By default, emails send from <span className="font-mono">{s.email}</span>. Click "Add Alias" to route alternate "Send mail as" addresses.
                            </p>
                          )}
                        </div>

                        {/* Smart Warm-up Banner & Action */}
                        <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
                          <div className="flex items-center space-x-2.5">
                            {s.warmupEnabled ? (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono">
                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                                <span>Warm-up: Day {s.warmup?.day || 1}/6 (Cap: {s.warmup?.effectiveQuota || 25}/day)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Full Speed ({s.dailyQuota || 500}/day)</span>
                              </span>
                            )}
                            {s.warmupEnabled && (
                              <span className="text-xs text-slate-500 font-mono">
                                • {s.warmup?.progressPercent || 20}% ramped
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-auto">
                            {s.warmupEnabled && (s.warmup?.isComplete || s.effectiveQuota >= (s.dailyQuota || 500)) ? (
                              <span className="text-emerald-500 font-mono text-xs font-semibold"> Fully Ramped</span>
                            ) : s.warmupEnabled ? (
                              <button
                                type="button"
                                onClick={() => handleToggleWarmup(s.id || s.email, s.warmupEnabled)}
                                className="text-xs sm:text-sm text-brand-600 dark:text-brand-400 hover:underline font-mono font-semibold transition"
                              >
                                 Skip to 500/day
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleWarmup(s.id || s.email, s.warmupEnabled)}
                                className="text-xs sm:text-sm text-brand-600 dark:text-brand-400 hover:underline font-mono font-semibold transition"
                              >
                                 Enable Warm-up
                              </button>
                            )}

                            <span className="text-slate-300 dark:text-slate-700">•</span>

                            <button
                              type="button"
                              onClick={() => handleDeleteSender(s)}
                              disabled={isDeletingSender}
                              className="text-xs sm:text-sm text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline font-mono font-semibold transition flex items-center space-x-1"
                              title={`Delete ${s.role} sender`}
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                              <span>Delete {s.role}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </SpotlightCard>
  );

  const renderLegalModals = () => {
    return (
      <>
        {/* MODAL: PRIVACY POLICY */}
        {showPrivacyModal && (
          <Dialog title="Privacy policy" onClose={() => setShowPrivacyModal(false)} className="dialog-wide">
            <div className="legacy-dialog-content">
              
              
              <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>Last Updated: November 2026</strong>
                </p>
                <p>
                  Dakly ("we", "our", or "service") is dedicated to protecting your privacy. This Privacy Policy details how we collect, use, and protect your information when using the Dakly transactional email microservice and dashboard.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">1. Information We Collect & Encryption</h4>
                <p>
                  We collect your account email, display name, and necessary SMTP credentials (such as Google App Passwords) strictly to deliver transactional emails on your behalf.
                  All Google App Passwords and secret credentials are encrypted using <strong>AES-256-GCM authenticated encryption</strong> and are never viewable or stored in plain text.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">2. Google AdSense & Advertising Cookies</h4>
                <p>
                  This website uses <strong>Google AdSense</strong>, an advertising service provided by Google LLC. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites on the Internet.
                </p>
                <p>
                  Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to our site and/or other sites on the Internet.
                  You may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 underline font-semibold">Google Ads Settings</a> or <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 underline font-semibold">AboutAds.info</a>.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">3. Email Analytics & Telemetry</h4>
                <p>
                  Dakly provides optional open rate and click tracking via secure reverse-proxy redirect endpoints and transparent 1x1 tracking beacons. This telemetry is only accessible by authorized members of your project workspace.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">4. Contact Us</h4>
                <p>
                  If you have questions regarding this Privacy Policy or your data, you can reach out via our GitHub repository or contact the platform maintainers.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs"
                >
                  Understood & Close
                </button>
              </div>
            </div>
          </Dialog>
        )}

        {/* MODAL: TERMS OF SERVICE */}
        {showTermsModal && (
          <Dialog title="Terms of service" onClose={() => setShowTermsModal(false)} className="dialog-wide">
            <div className="legacy-dialog-content">
              
              
              <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  <strong>Last Updated: November 2026</strong>
                </p>
                <p>
                  By accessing or using Dakly, you agree to be bound by these Terms of Service.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">1. Acceptable Use & Anti-Spam Policy</h4>
                <p>
                  Dakly is designed strictly for legitimate transactional emails (such as authentication OTPs, receipts, password resets, and account notifications). 
                  You agree NOT to use Dakly for sending unsolicited bulk marketing emails (spam), phishing attempts, malware distribution, or illegal content. Violations will result in immediate API key revocation.
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">2. Quota & Google SMTP Compliance</h4>
                <p>
                  Dakly operates by relaying emails through user-connected Gmail accounts over secure STARTTLS on Port 587. Users agree to abide by Google's Terms of Service and daily sending limits (500 dispatches/day per Gmail account).
                </p>

                <h4 className="font-bold text-slate-900 dark:text-white pt-2">3. Disclaimer & Limitation of Liability</h4>
                <p>
                  Dakly is provided "as is" without warranty of any kind. Under no circumstances shall the creators be liable for any downtime, delivery failure, or data loss arising from third-party provider policies.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs"
                >
                  Accept & Close
                </button>
              </div>
            </div>
          </Dialog>
        )}
      </>
    );
  };

  // ==============================================================
  // MODAL: WHAT DAKLY CAN DO (POPUP MODAL ON VISIT)
  // ==============================================================
  const renderAiPromptModal = () => {
    if (!showAiPromptModal) return null;
    const currentPrompt = generateAiSetupPrompt(aiPromptFramework, activeProject?.apiKey, API_BASE_URL);

    return (
      <Dialog title="AI setup prompt" onClose={() => setShowAiPromptModal(false)} className="dialog-wide">
        <div className="legacy-dialog-content">
          
          {/* Header */}
          

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            
            {/* Framework Selectors */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Framework / Environment:
              </span>
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                {[
                  { id: 'nextjs', label: 'Next.js App Router' },
                  { id: 'node', label: 'Express.js / Node' },
                  { id: 'python', label: 'Python (FastAPI / Django)' },
                  { id: 'curl', label: 'Raw HTTP / REST' },
                ].map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setAiPromptFramework(fw.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      aiPromptFramework === fw.id
                        ? 'bg-brand-600 text-white font-semibold '
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {fw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Preview Code Box */}
            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 text-slate-100 font-mono text-xs">
              <div className="px-4 py-2 bg-slate-950/80 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-brand-400" />
                  <span>Prompt for Cursor Composer, Claude, Copilot, or ChatGPT</span>
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {currentPrompt.length} chars
                </span>
              </div>
              <pre tabIndex={0} className="p-4 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-xs text-slate-200">
                {currentPrompt}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {activeProject?.apiKey ? " Injected your real project API Key into the prompt!" : " Create a free account or project to auto-fill your real API key."}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentPrompt);
                  setCopiedSnippetKey('modal_ai_prompt');
                  
                  setTimeout(() => setCopiedSnippetKey(null), 2500);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                {copiedSnippetKey === 'modal_ai_prompt' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied Prompt to Clipboard! </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Detailed AI Setup Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    );
  };

  // ==============================================================
  // VIEW: AUTH SCREEN (If Not Logged In)
  // ==============================================================
  if (!authToken) {
    return (
      <Landing
        authMode={authMode} setAuthMode={setAuthMode}
        authForm={authForm} setAuthForm={setAuthForm}
        authError={authError} setAuthError={setAuthError}
        authLoading={authLoading} onAuthSubmit={handleAuthSubmit}
        onPrivacy={() => setShowPrivacyModal(true)}
        onTerms={() => setShowTermsModal(true)}
      >{renderLegalModals()}</Landing>
    );
  }

  return (
    <div className="console-app">
      {renderAiPromptModal()}
      <ConsoleNavigation activeTab={activeTab} onTab={setActiveTab}
        projects={projects} activeProject={activeProject} onProject={handleSelectProject}
        user={currentUser} onLogout={handleLogout} onNewProject={() => setShowNewProjModal(true)}
        theme={theme} onTheme={toggleTheme} onPrompt={() => setShowAiPromptModal(true)} />
      {/* Main Container */}
      <main id="workspace" className="console-main">

        {/* If no project created yet */}
        {projectsLoading ? (
          <div className="workspace-empty" role="status"><h1>Opening your workspace…</h1><p>Loading projects and connected senders.</p></div>
        ) : projectsError ? (
          <div className="workspace-empty"><h1>Projects couldn’t load.</h1><p role="alert">{projectsError}</p><button className="button button-primary" onClick={() => loadProjects(authToken)}>Try again</button></div>
        ) : projects.length === 0 ? (
          <div className="workspace-empty"><p className="eyebrow">Your first project</p><h1>Give your app a sender.</h1><p>A project keeps your Gmail connection, API key, and delivery logs together.</p><ol><li>Have your Gmail address ready.</li><li>Turn on Google 2-Step Verification.</li><li>Create a Google App Password for Dakly.</li></ol><button className="button button-primary" onClick={() => setShowNewProjModal(true)}>Connect Gmail & create project <ArrowRight size={16} aria-hidden="true" /></button></div>
        ) : (
          <>
            <div className="project-key-strip">
              <span className="mono">Project API key</span>
              <code>{isKeyVisible ? activeProject?.apiKey : 'gkey_••••••••••••'}</code>
              <button type="button" className="icon-button" aria-label={isKeyVisible ? 'Hide API key' : 'Show API key'} onClick={() => setIsKeyVisible(!isKeyVisible)}>{isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button aria-label="Copy API key" className="text-link" onClick={handleCopyApiKey}>{copiedKey ? 'Copied' : 'Copy key'}</button>
              <button className="text-link" onClick={handlePingKey} disabled={isPinging}>{isPinging ? 'Checking…' : 'Check connection'}</button>
              <button className="text-link" onClick={() => setActiveTab('security')}>Key settings</button>
            </div>
            {pingResult && <div className={pingResult.success ? 'notice' : 'notice notice-error'} role="status">{pingResult.success ? 'API key accepted.' : pingResult.error || 'Connection check failed. Try again.'}{Number.isFinite(pingResult.latencyMs) ? ` Response time: ${pingResult.latencyMs} ms.` : ''}</div>}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Overview project={activeProject} stats={stats} loading={statsLoading} error={statsError}
                  onRetry={() => loadStats(activeProject.apiKey)}
                  onSend={() => setActiveTab('playground')} onLogs={() => setActiveTab('logs')}
                  onTemplates={() => setActiveTab('templates')} onSenders={() => setActiveTab('senders')} />
                
              </div>
            )}

            {/* TAB: PRE-BUILT EMAIL TEMPLATES & STUDIO */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/10">
                  <div>
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                        <Mail className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        <span>Email Templates &amp; Custom Template Studio</span>
                      </h2>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60">
                        {allTemplates.length} templates
                      </span>
                      {activeProject?.plan === 'pro' ? (
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Pro Plan Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowUpgradeModal(true)}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center space-x-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Unlock Custom Templates (Pro)</span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                      Zero HTML coding needed. Select built-in system templates or author custom brand templates for paid Pro projects.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeProject?.plan !== 'pro') {
                          setShowUpgradeModal(true);
                        } else {
                          openNewCustomTemplateModal();
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-semibold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Custom Template</span>
                      {activeProject?.plan !== 'pro' && (
                        <span className="text-[10px] uppercase font-mono px-1 py-0.5 bg-amber-400 text-slate-900 rounded font-bold">
                          PRO
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = allTemplates.find((t) => t.id === selectedTemplateId);
                        if (cur) setTemplateVars({ ...cur.sampleVars });
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[var(--surface)] text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                    >
                      Reset Variables
                    </button>
                  </div>
                </div>

                {/* Template Selector Cards & Custom Template Creator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {allTemplates.map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTemplateId(t.id);
                            setTemplateVars({ ...t.sampleVars });
                            setTemplateSendResult(null);
                          }
                        }}
                        onClick={() => {
                          setSelectedTemplateId(t.id);
                          setTemplateVars({ ...t.sampleVars });
                          setTemplateSendResult(null);
                        }}
                        className={`cursor-pointer rounded-lg p-4 sm:p-5 border transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-brand-50/70 dark:bg-brand-950/30 border-brand-500 ring-2 ring-brand-500'
                            : 'bg-white dark:bg-[var(--surface)] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${t.badgeColor}`}>
                              {t.badge}
                            </span>
                            {isSelected && <span className="text-xs text-brand-600 dark:text-brand-400 font-bold">● Active</span>}
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1.5 flex items-center space-x-1.5">
                            <span>{t.name}</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </div>
                        </div>

                        {t.isCustom && (
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-brand-600 dark:text-brand-400">
                              PRO TEMPLATE
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                title="Edit template markup"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditCustomTemplateModal(t);
                                }}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                title="Delete custom template"
                                onClick={(e) => handleDeleteCustomTemplate(t.id, e)}
                                className="text-xs text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* + Add Custom Template Card */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeProject?.plan !== 'pro') {
                        setShowUpgradeModal(true);
                      } else {
                        openNewCustomTemplateModal();
                      }
                    }}
                    className="rounded-lg p-5 border-2 border-dashed border-slate-200 dark:border-white/15 hover:border-brand-500 dark:hover:border-brand-400 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col items-center justify-center text-center group transition min-h-[140px]"
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <span>Add Custom Template</span>
                      <span className="text-[10px] font-mono px-1 py-0.5 bg-amber-400 text-slate-900 rounded font-bold">
                        PRO
                      </span>
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {activeProject?.plan === 'pro' ? 'Design HTML & dynamic vars' : 'Unlock on Dakly Pro'}
                    </span>
                  </button>
                </div>

                {/* Split Studio: Form / Controls (Left) & Real Device Preview (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Variable Editor & Send Test Form */}
                  <SpotlightCard
                    
                    className="lg:col-span-6 p-6 sm:p-7 space-y-6 rounded-lg"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>Dynamic Variables Editor</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                          Edit variables below — the preview on the right updates instantly in real time.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                        template: "{selectedTemplateId}"
                      </span>
                    </div>

                    <form onSubmit={handleSendTemplate} className="space-y-4">
                      {/* Recipient */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Recipient Email ("to") <span className="text-rose-500">*</span>
                          </label>
                          {currentUser?.email && (
                            <button
                              type="button"
                              onClick={() => setTemplateRecipient(currentUser.email)}
                              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              Fill my email ({currentUser.email})
                            </button>
                          )}
                        </div>
                        <input aria-label={"Recipient Email (\"to\")"}
                          type="email"
                          required
                          value={templateRecipient}
                          onChange={(e) => setTemplateRecipient(e.target.value)}
                          placeholder="e.g. user@gmail.com"
                          className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                        />
                      </div>

                      {/* Custom Subject Override (Optional) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Custom Subject Override <span className="text-slate-400 font-normal">(Optional — defaults to smart template subject)</span>
                        </label>
                        <input aria-label={"Custom Subject Override (Optional — defaults to smart template subject)"}
                          type="text"
                          value={templateSubjectOverride}
                          onChange={(e) => setTemplateSubjectOverride(e.target.value)}
                          placeholder={`Default: ${templatePreviewSubject || 'Smart Subject'}`}
                          className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      {/* Template Specific Dynamic Fields */}
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                          Template Variables (`vars`)
                        </div>

                        {(
                          allTemplates.find((t) => t.id === selectedTemplateId)?.fields?.length
                            ? allTemplates.find((t) => t.id === selectedTemplateId).fields
                            : Object.keys(templateVars).map((k) => ({
                                key: k,
                                label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
                                placeholder: `Enter ${k}`,
                                isTextarea: false,
                              }))
                        ).map((f) => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              {f.label} <span className="text-slate-400 font-mono text-xs">(`vars.{f.key}`)</span>
                            </label>
                            {f.isTextarea ? (
                              <textarea aria-label={f.label}
                                rows={2}
                                value={templateVars[f.key] || ''}
                                onChange={(e) =>
                                  setTemplateVars((prev) => ({
                                    ...prev,
                                    [f.key]: e.target.value,
                                  }))
                                }
                                placeholder={f.placeholder}
                                className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed"
                              />
                            ) : (
                              <input aria-label={f.label}
                                type={f.type || 'text'}
                                value={templateVars[f.key] || ''}
                                onChange={(e) =>
                                  setTemplateVars((prev) => ({
                                    ...prev,
                                    [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                                  }))
                                }
                                placeholder={f.placeholder}
                                className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Send Test Button */}
                      <button
                        type="submit"
                        disabled={isSendingTemplate || !activeProject}
                        className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-2 active:scale-[0.98]"
                      >
                        {isSendingTemplate ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Delivering Template Email...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send Live Test Template Email</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Dispatch Response Alert */}
                    {templateSendResult && (
                      <div
                        className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                          templateSendResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{templateSendResult.success ? ' Email Delivered Successfully' : ' Dispatch Failed'}</span>
                          {templateSendResult.executionTimeMs && (
                            <span className="font-mono text-xs">{templateSendResult.executionTimeMs}ms</span>
                          )}
                        </div>
                        {templateSendResult.trackingId && (
                          <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            Tracking ID: <span className="font-semibold">{templateSendResult.trackingId}</span>
                          </div>
                        )}
                        {templateSendResult.sender && (
                          <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            Sent From: {templateSendResult.sender}
                          </div>
                        )}
                        {templateSendResult.error && (
                          <div className="text-xs">{templateSendResult.error}</div>
                        )}
                      </div>
                    )}

                    {/* Code Snippet Box */}
                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          {['node', 'python', 'fetch', 'curl'].map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setTemplateCodeLang(lang)}
                              className={`px-2.5 py-1 text-xs font-mono rounded-md transition ${
                                templateCodeLang === lang
                                  ? 'bg-brand-600 text-white font-semibold'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                              }`}
                            >
                              {lang === 'node' ? 'Node SDK' : lang === 'python' ? 'Python SDK' : lang === 'fetch' ? 'Fetch API' : 'cURL'}
                            </button>
                          ))}
                        </div>
                        <button aria-label="Copy project API key"
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(getTemplateSnippet());
                            setCopiedTemplateCode(true);
                            setTimeout(() => setCopiedTemplateCode(false), 2000);
                          }}
                          className="inline-flex items-center space-x-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-mono"
                        >
                          {copiedTemplateCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedTemplateCode ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                      </div>

                      <pre tabIndex={0} className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-44 leading-relaxed">
                        {getTemplateSnippet()}
                      </pre>
                    </div>
                  </SpotlightCard>

                  {/* Right Column: Live Responsive Email Preview Device */}
                  <SpotlightCard
                    
                    className="lg:col-span-6 p-5 sm:p-6 space-y-4"
                  >
                    {/* Device Bar & Header Info */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <Eye className="w-4 h-4 text-emerald-500" />
                          <span>Live In-Memory Device Preview</span>
                          {isRenderingPreview && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">
                          Subject: <span className="font-medium text-slate-700 dark:text-slate-300">{templateSubjectOverride || templatePreviewSubject || 'Verification Code'}</span>
                        </div>
                      </div>

                      {/* Device Switcher */}
                      <div className="flex items-center space-x-1 bg-slate-100 dark:bg-[var(--surface)] p-1 rounded-lg border border-slate-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('desktop')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                            previewDevice === 'desktop'
                              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white  font-semibold'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                           Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice('mobile')}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                            previewDevice === 'mobile'
                              ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white  font-semibold'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                           Mobile
                        </button>
                      </div>
                    </div>

                    {/* From Meta Bar */}
                    <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-100/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-mono">
                      <div className="flex items-center space-x-2 truncate">
                        <span>From:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          "{activeProject?.senderDisplayName || activeProject?.name || 'Dakly Service'}" &lt;{activeProject?.senderEmail || 'sender@gmail.com'}&gt;
                        </span>
                      </div>
                      {activeProject?.brandLogo?.data && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                          1:1 Logo Active
                        </span>
                      )}
                    </div>

                    {/* Sandboxed Iframe Container */}
                    <div className="flex justify-center bg-slate-100 dark:bg-[var(--surface-soft)] p-3 sm:p-4 rounded-lg border border-slate-200 dark:border-white/10 transition-all">
                      <iframe
                        ref={templateIframeRef}
                        title="Template Live Preview"
                        srcDoc={preparedPreviewHtml || '<div style="padding: 40px; text-align: center; color: #64748b; font-family: sans-serif;">Rendering preview...</div>'}
                        onLoad={syncIframeHeight}
                        style={{
                          width: previewDevice === 'mobile' ? '375px' : '100%',
                          height: `${templateIframeHeight}px`,
                          minHeight: '480px',
                          border: 'none',
                          borderRadius: '8px',
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                          transition: 'width 0.2s ease, height 0.2s ease',
                        }}
                      />
                    </div>

                    <div className="text-xs text-slate-500 text-center font-mono">
                       Email preview · Check rendering in your recipients’ mail clients
                    </div>
                  </SpotlightCard>

                </div>
              </div>
            )}

            {/* TAB 2: PLAYGROUND */}
            {activeTab === 'playground' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <SpotlightCard as="form" aria-busy={isSending} onSubmit={e => { e.preventDefault(); handleDispatchEmail(); }}
                  
                  className="lg:col-span-7 p-6 space-y-5"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                        <PlayCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        <span>Send a test email</span>
                      </h2>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Send to your own inbox and inspect the server response.</p>
                    </div>
                    <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Uses your connected Gmail
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                        From Address / Sender Alias (Optional)
                      </label>
                      <span className="text-xs text-slate-400 font-mono">Dynamic 'From' Selection</span>
                    </div>
                    {stats?.capacity?.allAliases && stats.capacity.allAliases.length > 0 ? (
                      <select aria-label={"From Address / Sender Alias (Optional)"}
                        value={playFrom}
                        onChange={(e) => setPlayFrom(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 font-mono"
                      >
                        <option value="">Default (Primary Connected Sender Account)</option>
                        {stats.capacity.senders.map((s, idx) => (
                          <option key={`sender-${idx}`} value={s.email}>
                            {s.email} ({s.role} - {s.displayName || 'Default'})
                          </option>
                        ))}
                        {stats.capacity.allAliases.map((a, idx) => (
                          <option key={`alias-${idx}`} value={a.email}>
                             {a.email} {a.displayName ? `(${a.displayName})` : ''} — via {a.senderEmail}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input aria-label={"From Address / Sender Alias (Optional)"}
                        type="text"
                        value={playFrom}
                        onChange={(e) => setPlayFrom(e.target.value)}
                        placeholder="e.g. support@yourdomain.com (Leave blank for default sender)"
                        className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Choose which verified Gmail account or registered alias to send this email from.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Recipient Email ("to") <span className="text-rose-500 dark:text-rose-400">*</span>
                    </label>
                    <input required autoComplete="email" aria-label={"Recipient Email (\"to\")"}
                      type="email"
                      value={playTo}
                      onChange={(e) => setPlayTo(e.target.value)}
                      placeholder="e.g. your-email@gmail.com"
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Subject Line</label>
                    <input aria-label={"Subject Line"}
                      type="text"
                      value={playSubject}
                      onChange={(e) => setPlaySubject(e.target.value)}
                      placeholder="Subject..."
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Body Format</label>
                    <div className="grid grid-cols-3 gap-2.5 bg-slate-100 dark:bg-[var(--surface)] p-1.5 rounded-lg border border-slate-200 dark:border-white/10">
                      {['otp', 'html', 'text'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPlayMode(m)}
                          className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                            playMode === m ? 'bg-brand-600 text-white   font-bold' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          {m === 'otp' ? 'OTP Code' : m === 'html' ? 'Custom HTML' : 'Plain Text'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {playMode === 'otp' && (
                    <div className="space-y-2.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">6-Digit Verification Code</label>
                      <div className="flex items-center space-x-3.5">
                        <input required inputMode="numeric" pattern="[0-9]{6}" aria-label={"6-Digit Verification Code"}
                          type="text"
                          maxLength={6}
                          value={playOtp}
                          onChange={(e) => setPlayOtp(e.target.value)}
                          className="w-44 bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-2xl font-mono text-center tracking-widest text-brand-600 dark:text-brand-400 font-extrabold focus:outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => setPlayOtp(String(Math.floor(100000 + Math.random() * 900000)))}
                          className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent transition active:scale-[0.98]"
                        >
                          Generate Random
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">Dakly automatically wraps this code in a clean responsive email template.</p>
                    </div>
                  )}

                  {playMode === 'html' && (
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">HTML Code</label>
                      <textarea required aria-label={"HTML Code"}
                        rows={6}
                        value={playHtml}
                        onChange={(e) => setPlayHtml(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg p-3.5 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 leading-relaxed"
                      />
                    </div>
                  )}

                  {playMode === 'text' && (
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Plain Text Content</label>
                      <textarea required aria-label={"Plain Text Content"}
                        rows={4}
                        value={playText}
                        onChange={(e) => setPlayText(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg p-3.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <Paperclip className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <span>File or PDF Attachment (Optional - 15MB Limit)</span>
                      </label>
                      {selectedAttachment && (
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(null)}
                          className="text-xs text-rose-500 dark:text-rose-400 hover:underline font-semibold"
                        >
                          Remove File
                        </button>
                      )}
                    </div>

                    {!selectedAttachment ? (
                      <label className="block border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-brand-500/50 rounded-lg p-5 text-center transition cursor-pointer bg-slate-50/60 dark:bg-[var(--surface)]/50">
                        <input aria-label={"Click to select PDF or Image PDFs, images, and other files up to 15 MB"} type="file" onChange={handleFileUpload} className="file-input" />
                        <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                        <div className="text-sm text-slate-700 dark:text-slate-300 font-semibold">Click to select PDF or Image</div>
                        <div className="text-xs text-slate-500 mt-0.5">PDFs, images, and other files up to 15 MB</div>
                      </label>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 text-sm">
                          <FileCheck className="w-4.5 h-4.5" />
                          <span className="font-semibold font-mono">{selectedAttachment.filename}</span>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">({selectedAttachment.sizeFormatted})</span>
                        </div>
                      </div>
                    )}

                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Or remote file URL (S3 / Firebase):</div>
                    <input aria-label={"File or PDF Attachment (Optional - 15MB Limit)"}
                      type="url"
                      value={playRemoteUrl}
                      onChange={(e) => setPlayRemoteUrl(e.target.value)}
                      placeholder="https://example.com/files/lecture_notes.pdf"
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSending}
                      
                      className="w-full py-3.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-sm sm:text-base transition flex items-center justify-center space-x-2 active:scale-[0.98]"
                    >
                      <Zap className="w-4.5 h-4.5" />
                      <span>{isSending ? 'Sending test email…' : ' Send test email'}</span>
                    </button>
                  </div>

                </SpotlightCard>

                {/* Right Output Console with Spotlight Glow */}
                <SpotlightCard
                  
                  className="lg:col-span-5 p-6 flex flex-col"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5 font-mono">
                      <Terminal className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <span>Live Server Response</span>
                    </span>
                    {lastResponse && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
                          alert('Copied response JSON!');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center space-x-1 transition active:scale-[0.98]"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>

                  {!lastResponse ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-slate-500">
                      <Inbox className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">No email dispatched yet</div>
                      <div className="text-xs text-slate-500 max-w-xs mt-1">
                        Fill out the recipient and click "Send test email" to see the live delivery response here.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                            lastResponse.success
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {lastResponse.success ? ' DELIVERED' : ' FAILED'}
                        </span>
                        <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">
                          ⏱ {Number.isFinite(lastResponse.executionTimeMs) ? `${lastResponse.executionTimeMs} ms` : 'Timing unavailable'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 font-mono text-xs">
                        <div className="text-xs text-slate-500">Tracking ID</div>
                        <div className="text-brand-600 dark:text-brand-300 font-semibold break-all">{lastResponse.trackingId || 'N/A'}</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 font-mono text-xs">
                        <div className="text-xs text-slate-500">Sender Account</div>
                        <div className="text-slate-800 dark:text-slate-300">{lastResponse.sender || activeProject?.senderEmail}</div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 mb-1">Payload JSON</div>
                        <pre tabIndex={0} className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                          {JSON.stringify(lastResponse, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </SpotlightCard>

              </div>
            )}

            {/* TAB 3: SENDERS & QUOTAS */}
            {activeTab === 'senders' && (
              <div className="space-y-6">
                {renderSenderPool()}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Projects & senders</h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">Projects created in your account. Fully isolated from other users.</p>
                  </div>
                  <button
                    onClick={() => setShowNewProjModal(true)}
                    className="inline-flex items-center space-x-2 px-4 sm:px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition active:scale-[0.98] self-start sm:self-auto"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Create Project</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((p) => (
                    <SpotlightCard
                      key={p.id}
                      
                      className="p-6 sm:p-7 space-y-5 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          {p.brandLogo?.data ? (
                            <img
                              src={p.brandLogo.data}
                              alt="Logo"
                              className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg object-cover border-2 border-slate-200 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs sm:text-sm font-bold font-mono text-slate-500">
                              1:1
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                              <span>{p.name}</span>
                              {p.brandLogo?.data && (
                                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                  1:1 Logo
                                </span>
                              )}
                            </h3>
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">{p.senderEmail}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                            {p.dailyQuota} Daily Limit
                          </span>
                          <button aria-label="Remove selected logo"
                            type="button"
                            onClick={() => {
                              setActiveProject(p);
                              setLogoFile(null);
                              setLogoModalError('');
                              setShowLogoModal(true);
                            }}
                            className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-semibold"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{p.brandLogo?.data ? 'Update 1:1 Logo' : 'Set 1:1 Logo'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 space-y-1.5">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">PROJECT API KEY</div>
                        <div className="flex items-center justify-between font-mono text-sm text-brand-600 dark:text-brand-300 font-bold">
                          <span className="truncate pr-2">{p.apiKey}</span>
                          <button aria-label="Copy project API key"
                            onClick={() => {
                              navigator.clipboard.writeText(p.apiKey);
                              alert('API Key copied!');
                            }}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold">
                          <span>Senders Pool ({p.senders ? p.senders.length : 1})</span>
                          <button
                            onClick={() => {
                              setActiveProject(p);
                              setShowAddSenderModal(true);
                            }}
                            className="text-brand-600 dark:text-brand-400 hover:underline text-xs font-bold"
                          >
                            + Add Backup
                          </button>
                        </div>
                        <div className="space-y-1.5 text-xs sm:text-sm font-mono">
                          {(p.senders || [{ email: p.senderEmail, dailyQuota: 500, emailsSentToday: 0 }]).map((s, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 flex items-center justify-between">
                              <span className="text-slate-800 dark:text-slate-300 font-medium">{s.email}</span>
                              <div className="flex items-center space-x-2.5">
                                <span className="text-xs text-slate-500 font-bold">
                                  {s.emailsSentToday || 0} / {s.dailyQuota || 500} sent
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSenderFromProject(p, s)}
                                  disabled={isDeletingSender}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                                  title={`Delete ${s.email}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </SpotlightCard>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                {logsError && <div className="notice notice-error" role="alert">{logsError}<button className="text-link" onClick={() => loadLogs(activeProject.apiKey, logsPagination.page, logSearch, logStatus)}>Try again</button></div>}
                {isRefreshingLogs && <p role="status">Refreshing delivery logs…</p>}

                
                <SpotlightCard
                  
                  className="p-5 sm:p-6 rounded-lg"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
                    <div className="relative flex-1">
                      <input aria-label={"Search delivery logs"}
                        type="text"
                        value={logSearch}
                        onChange={(e) => {
                          setLogSearch(e.target.value);
                          loadLogs(activeProject?.apiKey, 1, e.target.value, logStatus);
                        }}
                        placeholder="Search by recipient email, subject, or tracking ID..."
                        className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <select aria-label={"Filter delivery status"}
                        value={logStatus}
                        onChange={(e) => {
                          setLogStatus(e.target.value);
                          loadLogs(activeProject?.apiKey, 1, logSearch, e.target.value);
                        }}
                        className="bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs sm:text-sm font-semibold rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
                      >
                        <option value="">All Statuses</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="FAILED">Failed</option>
                        <option value="BLOCKED_SUPPRESSED">Blocked (Suppressed)</option>
                      </select>
                      <button
                        onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                        className={`inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition ${
                          autoRefreshLogs
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-50 dark:bg-[var(--surface)] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Auto-refresh logs every 5 seconds to catch live calls from your project"
                      >
                        <Radio className={`w-4 h-4 ${autoRefreshLogs ? ' text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`} />
                        <span>{autoRefreshLogs ? 'Live Stream: ON' : 'Live Stream'}</span>
                      </button>

                      <button
                        onClick={() => loadLogs(activeProject?.apiKey, logsPagination.page, logSearch, logStatus)}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition"
                        title="Manual Refresh"
                      >
                        <RefreshCw className={`w-4.5 h-4.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </SpotlightCard>

                <div className="glass-card rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-100/80 dark:bg-[var(--surface)]/80 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-mono text-xs font-bold">
                        <tr>
                          <th className="py-3.5 px-4 sm:px-5">Status</th>
                          <th className="py-3.5 px-4 sm:px-5">Template</th>
                          <th className="py-3.5 px-4 sm:px-5">Recipient</th>
                          <th className="py-3.5 px-4 sm:px-5">Subject</th>
                          <th className="py-3.5 px-4 sm:px-5">Engagement</th>
                          <th className="py-3.5 px-4 sm:px-5">Sender</th>
                          <th className="py-3.5 px-4 sm:px-5">Attachment</th>
                          <th className="py-3.5 px-4 sm:px-5">Speed</th>
                          <th className="py-3.5 px-4 sm:px-5 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-10 text-slate-500 text-sm">
                              No logs found for this project.
                            </td>
                          </tr>
                        ) : (
                          logs.map((l, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                              <td className="py-3.5 px-4 sm:px-5 font-mono">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono inline-flex items-center space-x-1 ${
                                    l.status === 'DELIVERED'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : l.status === 'BLOCKED_SUPPRESSED'
                                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  }`}
                                  title={l.error || l.status}
                                >
                                  {l.status === 'BLOCKED_SUPPRESSED' && <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />}
                                  <span>{l.status === 'BLOCKED_SUPPRESSED' ? 'BLOCKED' : l.status}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 font-mono text-xs">
                                {l.template ? (
                                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40">
                                     {l.template}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600 text-xs">custom</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 font-mono font-semibold text-slate-900 dark:text-slate-200 text-sm">{l.to}</td>
                              <td className="py-3.5 px-4 sm:px-5 text-slate-700 dark:text-slate-300 max-w-xs truncate text-sm">{l.subject}</td>
                              <td className="py-3.5 px-4 sm:px-5">
                                <div className="flex flex-col space-y-1">
                                  {l.openedAt ? (
                                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                                      <span
                                        className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono flex items-center space-x-1"
                                        title={`Opened at ${new Date(l.openedAt).toLocaleString()}`}
                                      >
                                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Opened{l.opensCount > 1 ? ` (${l.opensCount}x)` : ''}</span>
                                      </span>
                                      {l.deviceType && (
                                        <span className="text-xs font-mono text-slate-500 flex items-center space-x-0.5">
                                          {l.deviceType === 'MOBILE' ? (
                                            <Smartphone className="w-3 h-3 text-brand-500" />
                                          ) : (
                                            <Monitor className="w-3 h-3 text-sky-500" />
                                          )}
                                          <span>{l.deviceType === 'MOBILE' ? 'Mobile' : l.deviceType === 'DESKTOP' ? 'Desktop' : 'Proxy'}</span>
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-600 text-xs font-mono">
                                      {l.status === 'DELIVERED' ? '⏳ Unopened' : '—'}
                                    </span>
                                  )}
                                  {l.clicksCount > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <span
                                        className="px-2 py-0.5 rounded text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-mono flex items-center space-x-1"
                                        title={`Last click at ${l.clickedAt ? new Date(l.clickedAt).toLocaleString() : ''}`}
                                      >
                                        <MousePointerClick className="w-3 h-3 text-brand-500" />
                                        <span>{l.clicksCount} click{l.clicksCount > 1 ? 's' : ''}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 font-mono text-xs sm:text-sm">
                                {l.isAlias && l.fromEmail ? (
                                  <div>
                                    <span className="text-slate-900 dark:text-slate-200 font-bold block">{l.fromEmail}</span>
                                    <span className="text-xs text-brand-500 font-mono block">via {l.senderEmail}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 dark:text-slate-400">{l.senderEmail || 'Primary'}</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 text-xs sm:text-sm">
                                {l.hasAttachments ? (
                                  <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-mono font-semibold">
                                     {l.attachmentsCount || 1} file
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 font-mono text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-semibold">
                                {l.executionTimeMs ? `${l.executionTimeMs}ms` : '< 1s'}
                              </td>
                              <td className="py-3.5 px-4 sm:px-5 font-mono text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-right">
                                {new Date(l.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[var(--surface)]/40 flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    <div>Total: <span className="font-bold text-slate-900 dark:text-white font-mono">{logsPagination.total}</span> dispatches</div>
                    <div className="flex items-center space-x-2.5">
                      <button
                        disabled={logsPagination.page <= 1}
                        onClick={() => loadLogs(activeProject?.apiKey, logsPagination.page - 1, logSearch, logStatus)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent disabled:opacity-40 font-semibold"
                      >
                        Previous
                      </button>
                      <span className="font-mono text-slate-900 dark:text-white font-bold px-2">{logsPagination.page}</span>
                      <button
                        disabled={logsPagination.page >= logsPagination.totalPages}
                        onClick={() => loadLogs(activeProject?.apiKey, logsPagination.page + 1, logSearch, logStatus)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent disabled:opacity-40 font-semibold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: WEBHOOKS & INSTANT ALERTS */}
            {activeTab === 'webhooks' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                         Real-Time Telemetry
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        HMAC-SHA256 Signed
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">Webhooks & Instant Delivery Alerts</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Stream delivery confirmations, bounces, opens, and link clicks directly into your backend server in real time.
                    </p>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="flex items-center space-x-2.5 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${activeProject?.webhookUrl ? (activeProject?.webhookEnabled !== false ? 'bg-emerald-500   ' : 'bg-amber-500') : 'bg-slate-400'}`}></span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-white text-xs">
                        {activeProject?.webhookUrl
                          ? activeProject?.webhookEnabled !== false
                            ? 'Webhook Active & Listening'
                            : 'Webhooks Paused'
                          : 'No Webhook Configured'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]">
                        {activeProject?.webhookUrl || 'Enter your receiver URL below'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Webhook Configuration Form */}
                <SpotlightCard
                  
                  className="p-6 space-y-6"
                >
                  <form onSubmit={handleSaveWebhookSettings} className="space-y-5">
                    {/* Destination URL & Enabled Toggle */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Destination Webhook URL (HTTPS Required in Production) *
                        </label>
                        <div className="relative">
                          <input aria-label={"Destination Webhook URL (HTTPS Required in Production)"}
                            type="url"
                            required
                            value={webhookUrlInput}
                            onChange={(e) => setWebhookUrlInput(e.target.value)}
                            placeholder="https://api.yourdomain.com/api/webhooks/dakly"
                            className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                          />
                          {webhookUrlInput && (
                            <button aria-label="Clear webhook URL"
                              type="button"
                              onClick={() => setWebhookUrlInput('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                            >×</button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Delivery Status
                        </label>
                        <button
                          type="button"
                          onClick={() => setWebhookEnabledInput(!webhookEnabledInput)}
                          className={`w-full py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                            webhookEnabledInput
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                              : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${webhookEnabledInput ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          <span>{webhookEnabledInput ? 'Enabled (Active)' : 'Paused (Disabled)'}</span>
                        </button>
                      </div>
                    </div>

                    {/* HMAC-SHA256 Signing Secret */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                          HMAC-SHA256 Signing Secret (Payload Authentication)
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateWebhookSecret}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Generate New Secret</span>
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <input aria-label={"HMAC-SHA256 Signing Secret (Payload Authentication)"}
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={webhookSecretInput}
                          onChange={(e) => setWebhookSecretInput(e.target.value)}
                          placeholder="e.g. daksec_9841ab7c... (Click Generate to auto-create)"
                          className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 pr-20 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                        />
                        <div className="absolute right-2 flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title={showWebhookSecret ? 'Hide secret' : 'Show secret'}
                          >
                            {showWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {webhookSecretInput && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(webhookSecretInput);
                                alert('Webhook Secret copied to clipboard!');
                              }}
                              className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                              title="Copy Secret"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dakly signs outgoing requests by adding header <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs">x-dakly-signature: sha256=&lt;hex&gt;</code>. Use this secret to verify authenticity.
                      </p>
                    </div>

                    {/* Subscribed Events Selector */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/5">
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Event Subscriptions (Select which events trigger webhooks)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {[
                          { id: 'email.delivered', label: 'email.delivered', desc: 'Dispatched when Gmail accepts the message (250 OK)' },
                          { id: 'email.failed', label: 'email.failed', desc: 'Dispatched when SMTP dispatch fails or times out' },
                          { id: 'email.suppressed', label: 'email.suppressed', desc: 'Dispatched when recipient is blocked by Bounce Guard' },
                          { id: 'email.opened', label: 'email.opened', desc: 'Dispatched when tracking pixel is loaded by recipient' },
                          { id: 'email.clicked', label: 'email.clicked', desc: 'Dispatched when a recipient clicks a tracked link' },
                        ].map((evt) => {
                          const isChecked = webhookEventsInput.includes(evt.id);
                          return (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={() => handleToggleWebhookEvent(evt.id)}
                              className={`p-3 rounded-lg border text-left transition flex items-start space-x-2.5 ${
                                isChecked
                                  ? 'bg-brand-50/50 border-brand-400 dark:bg-brand-500/10 dark:border-brand-500/50 '
                                  : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                isChecked
                                  ? 'bg-brand-600 border-brand-600 text-white'
                                  : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[var(--surface)]'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                                  {evt.label}
                                </span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                  {evt.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-4 border-t border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <button
                          type="submit"
                          disabled={isSavingWebhook}
                          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          {isSavingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          <span>{isSavingWebhook ? 'Saving...' : 'Save Webhook Configuration'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTriggerTestWebhook}
                          disabled={isTestingWebhook || !webhookUrlInput}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          {isTestingWebhook ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          <span>{isTestingWebhook ? 'Sending Test...' : 'Send Test Webhook'}</span>
                        </button>
                      </div>

                      {webhookSaveMsg && (
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {webhookSaveMsg}
                        </span>
                      )}
                    </div>
                  </form>
                </SpotlightCard>

                {/* Test Result Live Banner */}
                {webhookTestResult && (
                  <SpotlightCard
                    spotlightColor={webhookTestResult.success ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)'}
                    borderColor={webhookTestResult.success ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}
                    className="p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${webhookTestResult.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {webhookTestResult.success ? ' Webhook Test Succeeded!' : ' Webhook Test Failed'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          HTTP {webhookTestResult.httpStatus || 0}
                        </span>
                        {webhookTestResult.latencyMs !== undefined && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                             {webhookTestResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setWebhookTestResult(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      >
                        Dismiss
                      </button>
                    </div>

                    {webhookTestResult.error && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-200 dark:border-rose-500/20">
                        {webhookTestResult.error}
                      </p>
                    )}

                    {webhookTestResult.responseText && (
                      <div>
                        <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Receiver Server Response Body:</span>
                        <pre tabIndex={0} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
                          <code>{webhookTestResult.responseText}</code>
                        </pre>
                      </div>
                    )}
                  </SpotlightCard>
                )}

                {/* Telemetry & Last Dispatch Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Last Dispatched</span>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      {activeProject?.lastWebhookDispatchedAt
                        ? new Date(activeProject.lastWebhookDispatchedAt).toLocaleTimeString()
                        : 'No Dispatches Yet'}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Last Status</span>
                    <span className={`block text-sm font-bold ${
                      activeProject?.lastWebhookStatus === 'SUCCESS' ? 'text-emerald-500' : activeProject?.lastWebhookStatus === 'FAILED' ? 'text-rose-500' : 'text-slate-500'
                    }`}>
                      {activeProject?.lastWebhookStatus || 'Idle'}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Last Response Code</span>
                    <span className="block text-sm font-mono font-bold text-slate-900 dark:text-white">
                      {activeProject?.lastWebhookResponseCode ? `HTTP ${activeProject.lastWebhookResponseCode}` : '—'}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Last Latency</span>
                    <span className="block text-sm font-mono font-bold text-slate-900 dark:text-white">
                      {activeProject?.lastWebhookLatencyMs !== undefined && activeProject?.lastWebhookLatencyMs !== null
                        ? `${activeProject.lastWebhookLatencyMs} ms`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Receiver Server Verification Guide */}
                <SpotlightCard
                  
                  className="p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white"> How to Verify HMAC Signatures in Your Server</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">1-Line Verification</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg">
                      {[
                        { id: 'node', label: 'Node / Express' },
                        { id: 'nextjs', label: 'Next.js App Router' },
                        { id: 'python', label: 'Python (FastAPI)' },
                      ].map((lang) => (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setWebhookVerifyLang(lang.id)}
                          className={`px-2.5 py-1 text-xs rounded-md transition ${
                            webhookVerifyLang === lang.id
                              ? 'bg-brand-600 text-white font-semibold '
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <pre tabIndex={0} className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    <code>
{webhookVerifyLang === 'node' && `// Express.js Route Handler
const express = require('express');
const { Dakly } = require('dakly');

const app = express();
app.use(express.json());

app.post('/api/webhooks/dakly', (req, res) => {
  const signature = req.headers['x-dakly-signature'];
  const isValid = Dakly.verifyWebhookSignature({
    payload: req.body,
    signature,
    secret: process.env.DAKLY_WEBHOOK_SECRET, // '${webhookSecretInput || 'daksec_...'}'
  });

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  const { event, trackingId, recipient, status } = req.body;
  console.log(\`Received event \${event} for \${recipient} (Tracking: \${trackingId})\`);

  if (event === 'email.delivered') {
    // Update your database: e.g. user.emailVerified = true
  } else if (event === 'email.suppressed') {
    // Mark email as bounced / uncontactable
  }

  res.status(200).json({ received: true });
});`}
{webhookVerifyLang === 'nextjs' && `// app/api/webhooks/dakly/route.ts
import { NextResponse } from 'next/server';
import { Dakly } from 'dakly';

export async function POST(req: Request) {
  const body = await req.json();
  const signature = req.headers.get('x-dakly-signature') || '';

  const isValid = Dakly.verifyWebhookSignature({
    payload: body,
    signature,
    secret: process.env.DAKLY_WEBHOOK_SECRET!,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
  }

  const { event, trackingId, recipient } = body;
  console.log(\`[Dakly Webhook] \${event} -> \${recipient}\`);

  // Handle event
  return NextResponse.json({ success: true });
}`}
{webhookVerifyLang === 'python' && `# FastAPI Webhook Receiver
from fastapi import FastAPI, Request, HTTPException
from dakly import Dakly
import os

app = FastAPI()

@app.post("/api/webhooks/dakly")
async def handle_dakly_webhook(request: Request):
    payload = await request.json()
    signature = request.headers.get("x-dakly-signature", "")
    secret = os.environ.get("DAKLY_WEBHOOK_SECRET", "${webhookSecretInput || 'daksec_...'}")

    is_valid = Dakly.verify_webhook_signature(
        payload=payload,
        signature=signature,
        secret=secret
    )

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    print(f"Received event: {payload.get('event')} for {payload.get('recipient')}")
    return {"status": "ok"}`}
                    </code>
                  </pre>
                </SpotlightCard>
              </div>
            )}

            {/* TAB: SECURITY, IP WHITELIST & TEAM WORKSPACES */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="pb-4 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                         Project access
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                         Multi-Seat Workspaces
                      </span>
                      {activeProject?.currentUserRole && (
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          Role: {activeProject.currentUserRole}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                      Security Guard & Team Collaboration
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Protect against leaked credentials with IP Whitelisting, rotate keys in 1 click, and invite team members to collaborate on this project.
                    </p>
                  </div>

                  {/* Summary Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${ipWhitelistEnabledInput ? 'bg-emerald-500   ' : 'bg-slate-400'}`}></span>
                      <span className="font-semibold text-slate-800 dark:text-white text-xs">
                        IP Guard: {ipWhitelistEnabledInput ? `Active (${ipWhitelistList.length} IPs)` : 'Open (Any IP)'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
                      <Users className="w-3.5 h-3.5 text-brand-500" />
                      <span className="font-semibold text-slate-800 dark:text-white text-xs">
                        Team Seats: {isLoadingMembers ? '…' : teamMembers.length + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 1:  API Key Management & 1-Click Key Rotation */}
                <SpotlightCard
                  
                  className="p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">API Key Credential & Rotation</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          If your API key was accidentally committed to git or leaked, immediately regenerate it here.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRotateKeyMsg('');
                        setShowRotateKeyModal(true);
                      }}
                      className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition active:scale-[0.98]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate API Key</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 space-y-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active API Key:</span>
                      <div className="flex items-center justify-between pt-1">
                        <code className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                          {isKeyVisible ? activeProject?.apiKey : `${activeProject?.apiKey?.slice(0, 12)}••••••••••••••••••••••••`}
                        </code>
                        <div className="flex items-center space-x-1.5">
                          <button aria-label="Toggle API key visibility"
                            type="button"
                            onClick={() => setIsKeyVisible(!isKeyVisible)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          >
                            {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button aria-label="Copy API key"
                            type="button"
                            onClick={handleCopyApiKey}
                            className="p-1 rounded text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
                          >
                            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 space-y-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Last Inbound Request:</span>
                      <div className="pt-1 flex items-center justify-between font-mono text-xs">
                        <span className="text-slate-800 dark:text-slate-200">
                          IP: <b className="text-brand-600 dark:text-brand-300">{activeProject?.lastClientIp || 'None yet'}</b>
                        </span>
                        <span className="text-slate-500 text-xs">
                          {activeProject?.lastApiCallAt ? new Date(activeProject.lastApiCallAt).toLocaleTimeString() : 'Awaiting first call'}
                        </span>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>

                {/* Section 2:  Server IP Whitelisting (Zero-Trust Guard) */}
                <SpotlightCard
                  
                  className="p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Server IP Whitelisting</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Bind your API key strictly to your backend server IPs. Unauthorized IP addresses will be blocked with HTTP 403.
                        </p>
                      </div>
                    </div>

                    {/* Enable / Disable Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setIpWhitelistEnabledInput(!ipWhitelistEnabledInput)}
                      className={`px-4 py-2 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition ${
                        ipWhitelistEnabledInput
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
                          : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${ipWhitelistEnabledInput ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      <span>{ipWhitelistEnabledInput ? 'IP Guard: ARMED' : 'IP Guard: DISABLED'}</span>
                    </button>
                  </div>

                  {/* Detected IP Helper Badge */}
                  {detectedClientIp && (
                    <div className="p-3 rounded-lg bg-brand-50/70 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2 text-brand-900 dark:text-brand-200">
                        <Globe className="w-4 h-4 text-brand-500" />
                        <span>
                          Your current detected caller IP is <code className="font-mono font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-500/20">{detectedClientIp}</code>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddIpToWhitelist(detectedClientIp)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add My Current IP</span>
                      </button>
                    </div>
                  )}

                  {/* Add New IP Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Add Allowed IP or Subnet Range:
                    </label>
                    <div className="flex gap-2">
                      <input aria-label={"Add Allowed IP or Subnet Range:"}
                        type="text"
                        value={newIpInput}
                        onChange={(e) => setNewIpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIpToWhitelist();
                          }
                        }}
                        placeholder="e.g. 203.0.113.195, 10.0.0.0/24, or 192.168.1.*"
                        className="flex-1 bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddIpToWhitelist()}
                        className="px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 active:scale-[0.98]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Supports exact IPv4/IPv6, CIDR blocks (e.g. <code className="font-mono">192.168.1.0/24</code>), and wildcards (e.g. <code className="font-mono">10.0.*.*</code>). Leave list empty to allow all IPs.
                    </span>
                  </div>

                  {/* Configured IP List Tags */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>Configured Whitelist ({ipWhitelistList.length} rules)</span>
                      {ipWhitelistList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIpWhitelistList([])}
                          className="text-xs text-rose-500 hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {ipWhitelistList.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
                        No IP restrictions configured. Requests from any IP address will be accepted.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {ipWhitelistList.map((ip) => {
                          const isCidr = ip.includes('/');
                          const isWildcard = ip.includes('*');
                          const isLocal = ip === '127.0.0.1' || ip === 'localhost' || ip === '::1';
                          return (
                            <div
                              key={ip}
                              className="inline-flex items-center space-x-2 pl-3 pr-2 py-1.5 rounded-lg bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-800 dark:text-slate-200"
                            >
                              <span>{ip}</span>
                              <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                {isLocal ? 'Localhost' : isCidr ? 'CIDR' : isWildcard ? 'Wildcard' : 'Exact IP'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveIpFromWhitelist(ip)}
                                className="text-slate-400 hover:text-rose-500 p-0.5"
                                title="Remove IP"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Save Whitelist Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 dark:border-white/5">
                    {ipWhitelistSaveMsg ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {ipWhitelistSaveMsg}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">
                        Changes apply immediately across all edge nodes.
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isSavingIpWhitelist}
                      onClick={handleSaveIpWhitelistSettings}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition active:scale-[0.98] flex items-center justify-center space-x-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSavingIpWhitelist ? 'Saving...' : 'Save IP Whitelist'}</span>
                    </button>
                  </div>
                </SpotlightCard>

                {/* Section 3:  Team Workspaces & Collaborator Seats (RBAC) */}
                <SpotlightCard
                  
                  className="p-6 space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team Workspaces & Collaborators</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Invite engineers and team members to manage this project without sharing developer passwords.
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                      Total Seats: {isLoadingMembers ? '…' : teamMembers.length + 1}
                    </span>
                  </div>

                  {/* Invite Teammate Form */}
                  <form onSubmit={handleInviteMember} className="p-4 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                      <UserPlus className="w-4 h-4 text-brand-500" />
                      <span>Invite a Teammate by Email</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <input aria-label={"Teammate email"}
                          type="email"
                          required
                          value={inviteMemberEmail}
                          onChange={(e) => setInviteMemberEmail(e.target.value)}
                          placeholder="teammate@company.com"
                          className="w-full bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <select aria-label={"Teammate role"}
                          value={inviteMemberRole}
                          onChange={(e) => setInviteMemberRole(e.target.value)}
                          className="w-full bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-brand-500"
                        >
                          <option value="admin">Admin (Full Control)</option>
                          <option value="viewer">Viewer (Read-Only)</option>
                        </select>
                      </div>

                      <div>
                        <button
                          type="submit"
                          disabled={isInvitingMember}
                          className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 active:scale-[0.98]"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>{isInvitingMember ? 'Inviting...' : 'Send Invite'}</span>
                        </button>
                      </div>
                    </div>

                    {memberActionMsg && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {memberActionMsg}
                      </div>
                    )}
                  </form>

                  {/* Team Members List Table */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Active Collaborator Seats
                    </div>

                    <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[var(--surface)]">
                      {/* Project Owner Row */}
                      <div className="p-3.5 flex items-center justify-between bg-brand-50/30 dark:bg-brand-950/10 text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center border border-amber-500/20 text-xs">
                            ⭐
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                              <span>{projectOwner?.name || activeProject?.senderDisplayName || 'Project Owner'}</span>
                              <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold">
                                OWNER
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {projectOwner?.email || activeProject?.senderEmail}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs text-slate-500 font-mono">
                          Full Privileges
                        </span>
                      </div>

                      {/* Teammates Rows */}
                      {teamMembers.map((member) => (
                        <div key={member.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center border border-brand-500/20 text-xs font-mono">
                              {member.email.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                                <span className="font-mono">{member.email}</span>
                                <span className={`text-xs font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                                  member.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                }`}>
                                  {member.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                Invited by {member.invitedBy || 'Owner'} • {new Date(member.invitedAt || Date.now()).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-auto">
                            {/* Role Switcher */}
                            {activeProject?.isOwner ? (
                              <select aria-label={"Member role"}
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                className="bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 text-xs rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium"
                              >
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                                {member.role}
                              </span>
                            )}

                            {/* Remove Member Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id, member.email)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                              title="Remove member from project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {teamMembers.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          No collaborators added yet. Use the form above to invite team members.
                        </div>
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            )}

            {/* TAB 5: SNIPPETS & SDK SHOWCASE */}
            {activeTab === 'snippets' && (
              <div className="space-y-6">
                {/* Header & Quick Install Banners */}
                <div className="pb-4 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                         Official Client Libraries
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        Zero Dependencies
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">Official Dakly SDK & Code Snippets</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Type-safe, production-ready client libraries for Node.js, Next.js, and Python with automatic retry and bounce suppression protection.
                    </p>
                  </div>

                  {/* Fast Install Cards */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs">
                      <Terminal className="w-3.5 h-3.5 text-brand-400" />
                      <span>npm i dakly</span>
                      <button
                        onClick={() => handleCopySnippet('install_npm', 'npm i dakly')}
                        className="ml-2 text-slate-400 hover:text-white transition p-1 hover:bg-white/10 rounded"
                        title="Copy NPM command"
                      >
                        {copiedSnippetKey === 'install_npm' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>pip install dakly</span>
                      <button
                        onClick={() => handleCopySnippet('install_pip', 'pip install dakly')}
                        className="ml-2 text-slate-400 hover:text-white transition p-1 hover:bg-white/10 rounded"
                        title="Copy Pip command"
                      >
                        {copiedSnippetKey === 'install_pip' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Language Switcher Tabs */}
                <div className="flex space-x-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto">
                  {[
                    { id: 'node', label: 'Node.js / TS (npm i dakly)', badge: 'Recommended ⭐' },
                    { id: 'python', label: 'Python (pip install dakly)' },
                    { id: 'nextjs', label: 'Next.js App Router' },
                    { id: 'express', label: 'Express.js Backend' },
                    { id: 'fetch', label: 'Raw JavaScript fetch' },
                    { id: 'curl', label: 'cURL CLI' },
                    { id: 'ai_prompt', label: ' AI Prompt (Cursor / Claude)', badge: '1-Click Prompt ' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSnippetLang(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 shrink-0 ${
                        snippetLang === tab.id
                          ? 'bg-brand-600 text-white  font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-amber-400 text-slate-950">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* If AI Prompt Tab Selected: Full Interactive AI Studio */}
                {snippetLang === 'ai_prompt' && (
                  <SpotlightCard
                    
                    className="p-6 border border-emerald-500/25 rounded-lg space-y-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Bot className="w-5 h-5 text-emerald-500" />
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Autonomous AI Coding Assistant Prompt (Zero-Manual Integration)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Paste this prompt into Cursor Composer (<kbd className="font-mono bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">Ctrl+I</kbd> / <kbd className="font-mono bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">Cmd+I</kbd>), Claude Code, Copilot, or ChatGPT to generate your email service in seconds.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const prompt = generateAiSetupPrompt(aiPromptFramework, activeProject?.apiKey, API_BASE_URL);
                          navigator.clipboard.writeText(prompt);
                          setCopiedSnippetKey('snippets_ai_prompt');
                          
                          setTimeout(() => setCopiedSnippetKey(null), 2500);
                        }}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-2 active:scale-[0.98] shrink-0"
                      >
                        {copiedSnippetKey === 'snippets_ai_prompt' ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Copied to Clipboard! </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy AI Setup Prompt</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Framework Tabs */}
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      {[
                        { id: 'nextjs', label: 'Next.js App Router (TypeScript)' },
                        { id: 'node', label: 'Node.js / Express' },
                        { id: 'python', label: 'Python (FastAPI / Django)' },
                        { id: 'curl', label: 'Universal REST / cURL' },
                      ].map((fw) => (
                        <button
                          key={fw.id}
                          type="button"
                          onClick={() => setAiPromptFramework(fw.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            aiPromptFramework === fw.id
                              ? 'bg-emerald-600 text-white  font-semibold'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                          }`}
                        >
                          {fw.label}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-[var(--surface)] text-slate-100 font-mono text-xs">
                      <div className="px-4 py-2 bg-slate-950/80 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center space-x-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ready-to-paste prompt with live API key injected</span>
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {generateAiSetupPrompt(aiPromptFramework, activeProject?.apiKey, API_BASE_URL).length} characters
                        </span>
                      </div>
                      <pre tabIndex={0} className="p-4 max-h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-xs text-slate-200">
                        {generateAiSetupPrompt(aiPromptFramework, activeProject?.apiKey, API_BASE_URL)}
                      </pre>
                    </div>
                  </SpotlightCard>
                )}

                {/* 1. Quick Setup & Ping */}
                <SpotlightCard
                  
                  className="p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white"> 1. Client Setup & Quota Diagnostics</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">Ping & Authenticate</span>
                    </div>
                    <button aria-label="Copy project API key"
                      onClick={() => {
                        const code = document.getElementById('snippetSetupCode').innerText;
                        handleCopySnippet('setup', code);
                      }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium"
                    >
                      {copiedSnippetKey === 'setup' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippetKey === 'setup' ? 'Copied!' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre tabIndex={0} className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    <code id="snippetSetupCode">
{snippetLang === 'node' && `// npm i dakly
import { Dakly } from 'dakly';

// Initialize with your Project API Key (or set process.env.DAKLY_API_KEY)
const dakly = new Dakly('${activeProject?.apiKey || 'gkey_live_...'}');

// Test connection and check remaining quota for today
const ping = await dakly.ping();
console.log('Connected to:', ping.project);
console.log('Remaining Today:', ping.capacity.remainingToday, '/', ping.capacity.totalDailyQuota);`}
{snippetLang === 'python' && `# pip install dakly
from dakly import Dakly

# Initialize client
dakly = Dakly("${activeProject?.apiKey || 'gkey_live_...'}")

# Test connection and check remaining quota
ping = dakly.ping()
print("Connected to:", ping["project"])
print("Remaining Today:", ping["capacity"]["remainingToday"], "/", ping["capacity"]["totalDailyQuota"])`}
{snippetLang === 'nextjs' && `// lib/dakly.ts
import { Dakly } from 'dakly';

// Re-usable singleton instance for Next.js Edge & Node.js runtimes
export const dakly = new Dakly(process.env.DAKLY_API_KEY || '${activeProject?.apiKey || 'gkey_live_...'}');`}
{snippetLang === 'express' && `// config/mailer.js
const { Dakly } = require('dakly');

const dakly = new Dakly(process.env.DAKLY_API_KEY || '${activeProject?.apiKey || 'gkey_live_...'}');

module.exports = { dakly };`}
{snippetLang === 'fetch' && `const response = await fetch('${API_BASE_URL}/api/ping', {
  headers: {
    'x-api-key': '${activeProject?.apiKey || 'gkey_live_...'}'
  }
});
const ping = await response.json();
console.log('Project:', ping.project, '| Remaining:', ping.capacity.remainingToday);`}
{snippetLang === 'curl' && `curl -H "x-api-key: ${activeProject?.apiKey || 'gkey_live_...'}" \\
  "${API_BASE_URL}/api/ping"`}
                    </code>
                  </pre>
                </SpotlightCard>

                {/* 2. One-Liner OTP Verification */}
                <SpotlightCard
                  
                  className="p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white"> 2. One-Liner OTP Verification Code</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Fast 1-Liner</span>
                    </div>
                    <button aria-label="Copy project API key"
                      onClick={() => {
                        const code = document.getElementById('snippetOtpCode').innerText;
                        handleCopySnippet('otp', code);
                      }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium"
                    >
                      {copiedSnippetKey === 'otp' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippetKey === 'otp' ? 'Copied!' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre tabIndex={0} className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    <code id="snippetOtpCode">
{snippetLang === 'node' && `// Sends pre-rendered security OTP email with zero HTML coding
const result = await dakly.sendOtp({
  to: 'student@example.com',
  code: '849201',
  appName: '${activeProject?.name || 'Dakly App'}',
  expiresInMinutes: 10
});

console.log('Delivered in:', result.executionTimeMs, 'ms | Tracking ID:', result.trackingId);`}
{snippetLang === 'python' && `# Sends pre-rendered security OTP email
res = dakly.send_otp(
    to="student@example.com",
    code="849201",
    app_name="${activeProject?.name || 'Dakly App'}",
    expires_in_minutes=10
)
print("Delivered in:", res.get("executionTimeMs"), "ms | Tracking ID:", res["trackingId"])`}
{snippetLang === 'nextjs' && `// app/api/auth/send-otp/route.ts
import { NextResponse } from 'next/server';
import { dakly } from '@/lib/dakly';

export async function POST(req: Request) {
  const { email } = await req.json();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const result = await dakly.sendOtp({
    to: email,
    code,
    appName: '${activeProject?.name || 'Dakly SaaS'}',
    expiresInMinutes: 10
  });

  return NextResponse.json({ success: true, trackingId: result.trackingId });
}`}
{snippetLang === 'express' && `// routes/auth.js
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await dakly.sendOtp({
      to: email,
      code,
      appName: '${activeProject?.name || 'Backend App'}',
    });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});`}
{snippetLang === 'fetch' && `const response = await fetch('${API_BASE_URL}/api/send', {
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
                    </code>
                  </pre>
                </SpotlightCard>

                {/* 3. Pre-Built Email Templates */}
                <SpotlightCard
                  
                  className="p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white"> 3. Pre-Built Responsive Templates (Welcome, Reset, Invoice)</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">Zero HTML Required</span>
                    </div>
                    <button aria-label="Copy project API key"
                      onClick={() => {
                        const code = document.getElementById('snippetTemplatesCode').innerText;
                        handleCopySnippet('templates', code);
                      }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium"
                    >
                      {copiedSnippetKey === 'templates' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippetKey === 'templates' ? 'Copied!' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre tabIndex={0} className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    <code id="snippetTemplatesCode">
{snippetLang === 'node' && `// 1. Welcome / Onboarding Email
await dakly.sendWelcome({
  to: 'founder@startup.com',
  name: 'Rahul Sharma',
  appName: '${activeProject?.name || 'CloudPortal'}',
  loginUrl: 'https://myapp.com/login'
});

// 2. Password Reset Link with Token
await dakly.sendPasswordReset({
  to: 'user@example.com',
  name: 'Priya',
  resetUrl: 'https://myapp.com/reset-password?token=sec_9841',
  expiresInMinutes: 15
});

// 3. Billing Invoice / Receipt
await dakly.sendInvoice({
  to: 'client@company.com',
  invoiceNumber: 'INV-2026-042',
  amount: '$149.00',
  dueDate: 'Oct 31, 2026',
  downloadUrl: 'https://myapp.com/invoices/042.pdf'
});`}
{snippetLang === 'python' && `# 1. Welcome / Onboarding Email
dakly.send_welcome(
    to="founder@startup.com",
    name="Rahul Sharma",
    app_name="${activeProject?.name || 'CloudPortal'}",
    login_url="https://myapp.com/login"
)

# 2. Password Reset Link
dakly.send_password_reset(
    to="user@example.com",
    name="Priya",
    reset_url="https://myapp.com/reset-password?token=sec_9841",
    expires_in_minutes=15
)

# 3. Invoice / Receipt
dakly.send_invoice(
    to="client@company.com",
    invoice_number="INV-2026-042",
    amount="$149.00",
    due_date="Oct 31, 2026"
)`}
{snippetLang === 'nextjs' && `// app/api/auth/welcome/route.ts
import { NextResponse } from 'next/server';
import { dakly } from '@/lib/dakly';

export async function POST(req: Request) {
  const { email, name } = await req.json();

  const result = await dakly.sendWelcome({
    to: email,
    name,
    appName: 'SaaS Platform',
    loginUrl: 'https://mysaas.com/dashboard'
  });

  return NextResponse.json(result);
}`}
{snippetLang === 'express' && `// Express Route for Welcome Email
app.post('/api/welcome', async (req, res) => {
  const result = await dakly.sendWelcome({
    to: req.body.email,
    name: req.body.name,
    appName: '${activeProject?.name || 'Our Service'}',
    loginUrl: 'https://myapp.com/login'
  });
  res.json(result);
});`}
{snippetLang === 'fetch' && `await fetch('${API_BASE_URL}/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': '${activeProject?.apiKey || 'gkey_live_...'}' },
  body: JSON.stringify({
    to: 'founder@startup.com',
    template: 'welcome',
    vars: { name: 'Rahul', appName: 'MySaaS', loginUrl: 'https://mysaas.com/login' }
  })
});`}
{snippetLang === 'curl' && `curl -X POST "${API_BASE_URL}/api/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeProject?.apiKey || 'gkey_live_...'}" \\
  -d '{
    "to": "founder@startup.com",
    "template": "welcome",
    "vars": {"name": "Rahul", "appName": "MySaaS", "loginUrl": "https://mysaas.com/login"}
  }'`}
                    </code>
                  </pre>
                </SpotlightCard>

                {/* 4. College Lecture Notes & PDF Attachments */}
                <SpotlightCard
                  
                  className="p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white"> 4. College Notes & PDF Attachment Delivery</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">15MB Max Support</span>
                    </div>
                    <button aria-label="Copy project API key"
                      onClick={() => {
                        const code = document.getElementById('snippetPdfCode').innerText;
                        handleCopySnippet('pdf', code);
                      }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium"
                    >
                      {copiedSnippetKey === 'pdf' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippetKey === 'pdf' ? 'Copied!' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre tabIndex={0} className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    <code id="snippetPdfCode">
{snippetLang === 'node' && `// College Notes Delivery with PDF attachment and dynamic variables
const result = await dakly.sendNotes({
  to: 'student@college.edu',
  studentName: 'Amit Verma',
  subjectName: 'Computer Networks',
  notesTitle: 'Unit 3: TCP Flow & Congestion Control',
  downloadUrl: 'https://college.edu/cdn/cn-unit3.pdf',
  attachments: [
    {
      filename: 'Computer_Networks_Unit3.pdf',
      path: 'https://college.edu/cdn/cn-unit3.pdf' // or local path / base64 content
    }
  ]
});

console.log('Delivered PDF Notes! Tracking ID:', result.trackingId);`}
{snippetLang === 'python' && `# College Notes delivery with PDF attachment
res = dakly.send_notes(
    to="student@college.edu",
    student_name="Amit Verma",
    subject_name="Computer Networks",
    notes_title="Unit 3: TCP Flow & Congestion Control",
    download_url="https://college.edu/cdn/cn-unit3.pdf",
    attachments=[
        {
            "filename": "Computer_Networks_Unit3.pdf",
            "path": "https://college.edu/cdn/cn-unit3.pdf"
        }
    ]
)
print("Delivered PDF Notes! Tracking ID:", res["trackingId"])`}
{snippetLang === 'nextjs' && `// app/api/send-notes/route.ts
import { NextResponse } from 'next/server';
import { dakly } from '@/lib/dakly';

export async function POST(req: Request) {
  const { studentEmail, subject, title, pdfUrl } = await req.json();

  const result = await dakly.sendNotes({
    to: studentEmail,
    subjectName: subject,
    notesTitle: title,
    downloadUrl: pdfUrl,
    attachments: [{ filename: \`\${title}.pdf\`, path: pdfUrl }]
  });

  return NextResponse.json(result);
}`}
{snippetLang === 'express' && `app.post('/api/notes/deliver', async (req, res) => {
  const { to, subjectName, notesTitle, pdfUrl } = req.body;
  const result = await dakly.sendNotes({
    to,
    subjectName,
    notesTitle,
    downloadUrl: pdfUrl,
    attachments: [{ filename: \`\${notesTitle}.pdf\`, path: pdfUrl }]
  });
  res.json(result);
});`}
{snippetLang === 'fetch' && `const response = await fetch('${API_BASE_URL}/api/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${activeProject?.apiKey || 'gkey_live_...'}'
  },
  body: JSON.stringify({
    to: 'student@example.com',
    subject: 'College Lecture Notes Unit 3',
    html: '<h3>Your requested notes are attached.</h3>',
    attachments: [
      {
        filename: 'College_Notes_Unit3.pdf',
        path: 'https://example.com/files/unit3.pdf'
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
    "attachments": [{"filename": "notes.pdf", "path": "https://example.com/notes.pdf"}]
  }'`}
                    </code>
                  </pre>
                </SpotlightCard>

                {/* 5. Bounce Protection & Error Handling */}
                <SpotlightCard
                  
                  className="p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white"> 5. Bounce Suppression & Exception Handling</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">Account Protection</span>
                    </div>
                    <button aria-label="Copy project API key"
                      onClick={() => {
                        const code = document.getElementById('snippetErrorsCode').innerText;
                        handleCopySnippet('errors', code);
                      }}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium"
                    >
                      {copiedSnippetKey === 'errors' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippetKey === 'errors' ? 'Copied!' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre tabIndex={0} className="p-4 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    <code id="snippetErrorsCode">
{snippetLang === 'node' && `import { 
  Dakly, 
  DaklySuppressedError, 
  DaklyRateLimitError, 
  DaklyAuthenticationError 
} from 'dakly';

const dakly = new Dakly();

try {
  await dakly.sendOtp({ to: 'bounced@invalid-domain.xyz', code: '123456' });
} catch (err) {
  if (err instanceof DaklySuppressedError) {
    // Dakly blocked sending to protect your Gmail reputation!
    console.warn('Blocked by Bounce Guard:', err.reason, err.trackingId);
  } else if (err instanceof DaklyRateLimitError) {
    console.error('All daily sender quotas reached (500/day limit)!');
  } else if (err instanceof DaklyAuthenticationError) {
    console.error('Invalid or revoked API Key!');
  } else {
    console.error('Delivery failure:', err.message);
  }
}`}
{snippetLang === 'python' && `from dakly import (
    Dakly, 
    DaklySuppressedError, 
    DaklyRateLimitError, 
    DaklyAuthenticationError
)

dakly = Dakly()

try:
    dakly.send_otp(to="bounced@invalid-domain.xyz", code="123456")
except DaklySuppressedError as err:
    # Dakly intercepted and blocked to protect your Gmail score!
    print(f"Blocked by Bounce Guard: {err.reason} ({err.tracking_id})")
except DaklyRateLimitError as err:
    print("Daily sender quota reached!")
except DaklyAuthenticationError as err:
    print("Invalid API Key!")
except Exception as err:
    print("Failed to dispatch:", str(err))`}
{snippetLang === 'nextjs' && `import { DaklySuppressedError } from 'dakly';
import { dakly } from '@/lib/dakly';

try {
  await dakly.sendOtp({ to: email, code });
} catch (err) {
  if (err instanceof DaklySuppressedError) {
    return NextResponse.json({ error: 'This email is unverified or hard bounced previously.' }, { status: 400 });
  }
  return NextResponse.json({ error: err.message }, { status: 500 });
}`}
{snippetLang === 'express' && `const { DaklySuppressedError } = require('dakly');

try {
  await dakly.sendOtp({ to: req.body.email, code: req.body.code });
} catch (err) {
  if (err instanceof DaklySuppressedError) {
    return res.status(400).json({ error: 'Recipient address is suppressed due to bounce.' });
  }
  res.status(500).json({ error: err.message });
}`}
{snippetLang === 'fetch' && `const res = await fetch('${API_BASE_URL}/api/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': '${activeProject?.apiKey || 'gkey_live_...'}' },
  body: JSON.stringify({ to: 'bounced@invalid.xyz', otp: '123456' })
});
const data = await res.json();
if (data.status === 'BLOCKED_SUPPRESSED') {
  console.warn('Blocked by suppression guard:', data.reason);
}`}
{snippetLang === 'curl' && `# If suppressed, Dakly returns status: "BLOCKED_SUPPRESSED" without reaching Google
curl -X POST "${API_BASE_URL}/api/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${activeProject?.apiKey || 'gkey_live_...'}" \\
  -d '{"to": "bounced@invalid.xyz", "otp": "123456"}'`}
                    </code>
                  </pre>
                </SpotlightCard>

              </div>
            )}
          </>
        )}

      </main>

      {/* Dashboard Monetized AdSense Banner (Display) */}
      

      {/* Multiplex / Matched Content AdSense Unit (Autorelaxed) */}
      

      <footer className="console-footer"><span>Dakly / Your email workspace</span><button onClick={() => setShowPrivacyModal(true)}>Privacy</button><button onClick={() => setShowTermsModal(true)}>Terms</button></footer>
      {/* Legal & Privacy Policy Modals for Dashboard View */}
      {renderLegalModals()}

      {/* MODAL: CREATE PROJECT */}
      {showNewProjModal && (
        <Dialog title="Connect a Gmail sender." busy={modalLoading} onClose={() => { setShowNewProjModal(false); setProjectError(''); }}>
          <p className="dialog-intro">A project gives your app its own API key and delivery log.</p>
          <form onSubmit={handleCreateProjectSubmit} className="project-form" aria-busy={modalLoading}>
            {projectError && <div role="alert" className="notice notice-error">{projectError}</div>}
            <label htmlFor="project-name">Project name<input id="project-name" required value={newProjForm.name} onChange={e => setNewProjForm({ ...newProjForm, name: e.target.value })} disabled={modalLoading} /></label>
            <label htmlFor="sender-email">Sender Gmail address<input id="sender-email" type="email" autoComplete="email" required value={newProjForm.senderEmail} onChange={e => setNewProjForm({ ...newProjForm, senderEmail: e.target.value })} disabled={modalLoading} /></label>
            <label htmlFor="app-password">Google App Password<input id="app-password" type="password" autoComplete="new-password" aria-describedby="app-password-help" required value={newProjForm.appPassword} onChange={e => setNewProjForm({ ...newProjForm, appPassword: e.target.value })} disabled={modalLoading} /></label>
            <p id="app-password-help" className="field-help">Use a 16-character App Password, not your Google password. Requires 2-Step Verification. <a className="text-link" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">Get an App Password ↗</a></p>
            <label htmlFor="sender-name">Sender display name <span className="field-help">(optional)</span><input id="sender-name" value={newProjForm.senderDisplayName} onChange={e => setNewProjForm({ ...newProjForm, senderDisplayName: e.target.value })} disabled={modalLoading} /></label>
            <div className="form-actions"><button className="button button-outline" type="button" onClick={() => setShowNewProjModal(false)} disabled={modalLoading}>Cancel</button><button type="submit" className="button button-primary" disabled={modalLoading}>{modalLoading ? 'Connecting Gmail…' : 'Connect & create project'}</button></div>
          </form>
        </Dialog>
      )}

      {/* MODAL: ADD SENDER ALIAS */}
      {isAddAliasModalOpen && aliasTargetSender && (
        <Dialog title="Add sender alias" onClose={() => setIsAddAliasModalOpen(false)} className="dialog-wide">
          <div className="legacy-dialog-content">
            
            <div className="p-3 rounded-lg bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/30 text-xs text-brand-800 dark:text-brand-300 space-y-1">
              <div className="font-semibold">Associated Account: <span className="font-mono">{aliasTargetSender.email}</span></div>
              <p className="text-xs leading-relaxed text-brand-700 dark:text-brand-400">
                Ensure this alias (or custom domain address) is already verified in this Gmail account under <strong>Gmail Settings  Accounts  "Send mail as"</strong>.
              </p>
            </div>
            <form onSubmit={handleAddAliasSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alias Email Address *
                </label>
                <input aria-label={"Alias Email Address"}
                  type="email"
                  required
                  value={newAliasEmail}
                  onChange={(e) => setNewAliasEmail(e.target.value)}
                  placeholder="e.g. support@yourdomain.com or team@brand.com"
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name (Optional)
                </label>
                <input aria-label={"Display Name (Optional)"}
                  type="text"
                  value={newAliasDisplayName}
                  onChange={(e) => setNewAliasDisplayName(e.target.value)}
                  placeholder="e.g. Acme Support Team"
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="aliasIsDefault"
                  checked={newAliasIsDefault}
                  onChange={(e) => setNewAliasIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="aliasIsDefault" className="text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Set as default 'From' address for dispatches
                </label>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddAliasModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAlias}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <span>{isSavingAlias ? 'Saving...' : 'Add Alias'}</span>
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: ADD BACKUP GMAIL */}
      {showAddSenderModal && (
        <Dialog title="Connect another Gmail" onClose={() => setShowAddSenderModal(false)} className="dialog-wide">
          <div className="legacy-dialog-content">
            
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {stats?.capacity?.senders?.length > 0
                ? 'Adds a secondary Gmail account to automatically double daily capacity to 1,000+ emails/day.'
                : 'Connect your Gmail account with a 16-character Google App Password to enable transactional email delivery.'}
            </p>
            <form onSubmit={handleAddSenderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {stats?.capacity?.senders?.length > 0 ? 'Backup Gmail Address *' : 'Gmail Sender Address *'}
                </label>
                <input aria-label={"Field"}
                  type="email"
                  required
                  value={addSenderForm.email}
                  onChange={(e) => setAddSenderForm({ ...addSenderForm, email: e.target.value })}
                  placeholder="e.g. backup.account@gmail.com"
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Google App Password (16 chars) *</label>
                <input aria-label={"Google App Password (16 chars)"}
                  type="password"
                  required
                  value={addSenderForm.appPassword}
                  onChange={(e) => setAddSenderForm({ ...addSenderForm, appPassword: e.target.value })}
                  placeholder="abcd efgh ijkl mnop"
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name (Optional)</label>
                <input aria-label={"Display Name (Optional)"}
                  type="text"
                  value={addSenderForm.displayName}
                  onChange={(e) => setAddSenderForm({ ...addSenderForm, displayName: e.target.value })}
                  placeholder="e.g. Backup Dispatcher"
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSenderModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold"
                >
                  {modalLoading ? 'Connecting...' : (stats?.capacity?.senders?.length > 0 ? 'Add Backup Account' : 'Connect Gmail Sender')}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* MODAL: BRAND LOGO (1:1 SQUARE ONLY, 1 IMAGE LIMIT, ANTI-PIRACY GUARD) */}
      {showLogoModal && (
        <Dialog title="Project logo" onClose={() => setShowLogoModal(false)} className="dialog-wide">
          <div className="legacy-dialog-content">
            
            {/* Header */}
            

            {/* Anti-Piracy & 1:1 Rules Notice */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex items-start space-x-2 text-amber-700 dark:text-amber-400 font-medium">
                <span className="text-sm"></span>
                <span>
                  <b>Strict 1:1 Square Only:</b> Only square logos are accepted (e.g. 200×200, 512×512). Banners and horizontal graphics will be rejected.
                </span>
              </div>
              <div className="flex items-start space-x-2 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                <span></span>
                <span>
                  <b>Anti-Piracy & Security Guard:</b> Binary magic-byte analysis rejects torrents, executables, scripts, or pirated media files. Max 1.5MB.
                </span>
              </div>
              <div className="flex items-start space-x-2 text-slate-600 dark:text-slate-400 text-xs">
                <span>1⃣</span>
                <span>
                  <b>1 Image Limit:</b> Uploading a new logo automatically replaces any existing logo.
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {logoModalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{logoModalError}</span>
              </div>
            )}

            {/* Drop Zone / File Picker */}
            <div>
              <label className="block border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-brand-500/60 rounded-lg p-5 text-center transition cursor-pointer bg-slate-50/60 dark:bg-[var(--surface)]/60">
                <input aria-label={"Click or drag to select your 1:1 Square Logo Supported: PNG, JPG, WebP, SVG • Max 1.5 MB • Exactly 1:1 Aspect Ratio"}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoFileSelect}
                  className="file-input"
                />
                <UploadCloud className="w-8 h-8 text-brand-500 dark:text-brand-400 mx-auto mb-2" />
                <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                  Click or drag to select your 1:1 Square Logo
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Supported: PNG, JPG, WebP, SVG • Max 1.5 MB • Exactly 1:1 Aspect Ratio
                </div>
              </label>
            </div>

            {/* Preview Section */}
            {(logoFile || activeProject?.brandLogo?.data) && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Logo Preview & Dimension Check</span>
                  {logoFile ? (
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        logoFile.isSquare
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {logoFile.isSquare ? ` 1:1 Square Verified (${logoFile.width}×${logoFile.height}px)` : ` Rejected (${logoFile.width}×${logoFile.height}px Banner)`}
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      Current Active Logo ({activeProject?.brandLogo?.width}×{activeProject?.brandLogo?.height}px)
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Square Box Preview */}
                  <div className="w-20 h-20 rounded-lg border-2 border-brand-500/40 p-1 bg-white dark:bg-[var(--surface)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={logoFile?.dataUri || activeProject?.brandLogo?.data}
                      alt="1:1 Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>

                  {/* Simulated Outgoing Email Header */}
                  <div className="flex-1 p-2.5 rounded-lg bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/5 text-xs space-y-1">
                    <div className="text-xs text-slate-400 font-mono">
                      Simulated Outgoing Email Header:
                    </div>
                    <div className="flex items-center space-x-2 pt-0.5">
                      <img
                        src={logoFile?.dataUri || activeProject?.brandLogo?.data}
                        alt="Email Logo"
                        className="w-6 h-6 rounded-md object-cover border border-slate-200 dark:border-white/10"
                      />
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {activeProject?.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Your Verification Code: <b>849201</b>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between">
              {activeProject?.brandLogo?.data ? (
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 text-xs font-semibold flex items-center space-x-1 transition"
                  title="Remove this brand logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoModal(false);
                    setLogoFile(null);
                    setLogoModalError('');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!logoFile || !logoFile.isSquare || isUploadingLogo}
                  onClick={handleLogoUploadSubmit}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-semibold text-xs active:scale-[0.98] transition flex items-center space-x-1.5"
                >
                  {isUploadingLogo ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving 1:1 Logo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save 1:1 Brand Logo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </Dialog>
      )}

      {/* MODAL: BOUNCE PROTECTION & SUPPRESSION LIST */}
      {showSuppressionModal && (
        <Dialog title="Blocked recipients" onClose={() => setShowSuppressionModal(false)} className="dialog-wide">
          <div className="legacy-dialog-content">
            
            {/* Header */}
            

            {/* Quick Add Form */}
            <form onSubmit={handleAddSuppressionSubmit} className="p-3.5 rounded-lg bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 space-y-2.5 text-xs">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono flex items-center space-x-1.5">
                <Ban className="w-3.5 h-3.5 text-rose-500" />
                <span>Manually Block An Email Address</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input aria-label={"Email to block"}
                  type="email"
                  required
                  value={newSuppressionEmail}
                  onChange={(e) => setNewSuppressionEmail(e.target.value)}
                  placeholder="Enter email to suppress (e.g. invalid@test.com)..."
                  className="flex-1 bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono text-xs"
                />
                <select aria-label={"Reason for blocking"}
                  value={newSuppressionReason}
                  onChange={(e) => setNewSuppressionReason(e.target.value)}
                  className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="MANUAL_BLOCK">Manual Block</option>
                  <option value="HARD_BOUNCE">Hard Bounce</option>
                  <option value="INVALID_RECIPIENT">Invalid Recipient</option>
                  <option value="SPAM_COMPLAINT">Spam Complaint</option>
                </select>
                <button
                  type="submit"
                  disabled={isAddingSuppression || !newSuppressionEmail}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs transition active:scale-[0.98] flex items-center justify-center space-x-1 flex-shrink-0"
                >
                  {isAddingSuppression ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>Block Email</span>
                </button>
              </div>
              {suppressionActionMsg && (
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  {suppressionActionMsg}
                </div>
              )}
            </form>

            {/* Search & List */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
              <div className="flex items-center justify-between text-xs">
                <input aria-label={"Search blocked recipients"}
                  type="text"
                  value={suppressionSearch}
                  onChange={(e) => {
                    setSuppressionSearch(e.target.value);
                    loadSuppressions(activeProject?.id || activeProject?._id, e.target.value);
                  }}
                  placeholder="Filter suppressed emails..."
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono text-xs"
                />
              </div>

              {isLoadingSuppression ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Activity className="w-6 h-6 animate-spin text-brand-500" />
                  <span className="text-xs">Loading suppression records...</span>
                </div>
              ) : suppressions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Zero Suppressed Addresses</div>
                  <div className="text-xs text-slate-500 max-w-sm">
                    Your suppression list is clean! Any recipient that triggers a hard bounce will automatically be safeguarded here.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                  {suppressions.map((item) => (
                    <div
                      key={item._id}
                      className="p-3 bg-white dark:bg-[var(--surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-medium text-slate-900 dark:text-slate-200">{item.email}</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {item.reason}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {item.bounceCode ? `SMTP: ${item.bounceCode.slice(0, 60)}` : item.details || 'Blocked by system'} • Prevented {item.blockedDispatchesCount || 0} dispatches
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveSuppression(item._id)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-mono transition flex items-center space-x-1"
                        title="Unblock this email address"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Unblock</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-xs text-slate-500">
                 Tip: Never unblock addresses that don't exist, as Google penalizes repeated bounces.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSuppressionModal(false);
                  setSuppressionActionMsg('');
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-medium text-xs transition"
              >
                Close
              </button>
            </div>

          </div>
        </Dialog>
      )}

      {/* MODAL: ROTATE API KEY CONFIRMATION */}
      {showRotateKeyModal && (
        <Dialog title="Rotate API key" onClose={() => setShowRotateKeyModal(false)} className="dialog-wide">
          <div className="legacy-dialog-content">
            

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
              <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Immediate Invalidation Warning:</span>
              </div>
              <p className="text-amber-900/80 dark:text-amber-200/80 leading-relaxed text-xs">
                Rotating your API key will <b>permanently and immediately invalidate</b> your current key. Any live applications, webhooks, or scheduled tasks using the previous key will instantly stop delivering emails until updated with the new key.
              </p>
            </div>

            {rotateKeyMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                {rotateKeyMsg}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setShowRotateKeyModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRotatingKey}
                onClick={handleRotateApiKey}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition active:scale-[0.98] flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRotatingKey ? 'animate-spin' : ''}`} />
                <span>{isRotatingKey ? 'Regenerating Key...' : 'Confirm & Rotate Key'}</span>
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: PRO PLAN UPGRADE */}
      {showUpgradeModal && (
        <Dialog
          title="Upgrade to Dakly Pro"
          busy={isUpgradingPlan}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeError('');
          }}
          className="dialog-wide"
        >
          <div className="legacy-dialog-content">
            <p className="dialog-intro">
              Custom Transactional Templates are an exclusive feature of the <strong>Dakly Pro Developer Pass</strong>.
            </p>

            {upgradeError && (
              <div role="alert" className="notice notice-error mb-4">
                {upgradeError}
              </div>
            )}

            <div className="space-y-4">
              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Custom HTML &amp; Dynamic Variables</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Design bespoke transactional emails with unlimited <code>&#123;&#123;tags&#125;&#125;</code> and real-time live preview.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Zero-Delay SDK &amp; API Execution</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Call your custom templates directly via Node.js, Python, Fetch, or cURL using <code>template: "my_slug"</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>1:1 Verified Brand Logo Integration</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Automatic header branding with anti-piracy verification across all outbound dispatches.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Multi-Account Automatic Failover</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Pool multiple backup Gmail inboxes to scale daily quota without hitting rate limits.
                  </p>
                </div>
              </div>

              {/* Pricing Offer Card */}
              <div className="p-4 rounded-xl border border-brand-500/30 bg-brand-50/50 dark:bg-brand-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">Dakly Pro Developer Pass</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-900">1 YEAR</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Active for project: <strong className="text-slate-700 dark:text-slate-300">{activeProject?.name}</strong>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">₹1,499<span className="text-xs font-normal text-slate-500">/year</span></div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Instant sandbox activation</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={isUpgradingPlan}
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleUpgradeToPro}
                  disabled={isUpgradingPlan}
                >
                  {isUpgradingPlan ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Activating Pro Pass…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Activate Dakly Pro Pass</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* MODAL: CUSTOM TEMPLATE STUDIO */}
      {showCustomTemplateModal && (
        <Dialog
          title={editingCustomTemplateId ? `Edit Custom Template: ${customTemplateForm.templateId}` : 'New Custom Template (Pro)'}
          busy={isSavingCustomTemplate}
          onClose={() => {
            setShowCustomTemplateModal(false);
            setCustomTemplateError('');
          }}
          className="dialog-wide"
        >
          <div className="legacy-dialog-content">
            {customTemplateError && (
              <div role="alert" className="notice notice-error mb-4">
                {customTemplateError}
              </div>
            )}

            {/* Tabs: Editor vs Live Draft Preview */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setCustomTemplateDraftTab('edit')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  customTemplateDraftTab === 'edit'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Template Markup &amp; Variables
              </button>
              <button
                type="button"
                onClick={() => setCustomTemplateDraftTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center space-x-1.5 ${
                  customTemplateDraftTab === 'preview'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Draft Preview</span>
              </button>
            </div>

            {customTemplateDraftTab === 'edit' ? (
              <form onSubmit={handleSaveCustomTemplate} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Template Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={customTemplateForm.name}
                      onChange={(e) =>
                        setCustomTemplateForm({ ...customTemplateForm, name: e.target.value })
                      }
                      placeholder="e.g. Order Shipment Alert"
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Template ID (Slug) <span className="text-rose-500">*</span> <span className="text-slate-400 font-mono text-xs">(Used in SDK `template: "..."`)</span>
                    </label>
                    <input
                      required
                      disabled={Boolean(editingCustomTemplateId)}
                      value={customTemplateForm.templateId}
                      onChange={(e) =>
                        setCustomTemplateForm({
                          ...customTemplateForm,
                          templateId: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                        })
                      }
                      placeholder="e.g. order_shipped"
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Subject Line <span className="text-slate-400 text-xs font-normal">(Supports dynamic &#123;&#123;tags&#125;&#125;)</span>
                    </label>
                    <input
                      value={customTemplateForm.subject}
                      onChange={(e) =>
                        setCustomTemplateForm({ ...customTemplateForm, subject: e.target.value })
                      }
                      placeholder="e.g. Order #{{orderNumber}} has shipped, {{name}}!"
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category Badge
                    </label>
                    <input
                      value={customTemplateForm.badge}
                      onChange={(e) =>
                        setCustomTemplateForm({ ...customTemplateForm, badge: e.target.value })
                      }
                      placeholder="e.g. E-Commerce"
                      className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      HTML Body Markup <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <span>Quick Insert:</span>
                      {['name', 'orderNumber', 'trackingUrl', 'amount'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setCustomTemplateForm((prev) => ({
                              ...prev,
                              html: prev.html + ` {{${tag}}}`,
                            }));
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px] text-brand-600 dark:text-brand-400 hover:bg-brand-500/10"
                        >
                          +&#123;&#123;{tag}&#125;&#125;
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    required
                    rows={8}
                    value={customTemplateForm.html}
                    onChange={(e) =>
                      setCustomTemplateForm({ ...customTemplateForm, html: e.target.value })
                    }
                    placeholder="<h2>Hello {{name}}</h2><p>Your message here</p>"
                    className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg p-3 text-xs sm:text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-500 leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dakly automatically wraps your custom template with your project's verified 1:1 brand logo, header, and clean footer shell.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sample Variables JSON <span className="text-slate-400 text-xs font-normal">(Used for test previews &amp; default fields)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={customTemplateForm.sampleVarsJson}
                    onChange={(e) =>
                      setCustomTemplateForm({
                        ...customTemplateForm,
                        sampleVarsJson: e.target.value,
                      })
                    }
                    placeholder='{ "name": "Aarav", "orderNumber": "1049" }'
                    className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-brand-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setShowCustomTemplateModal(false)}
                    disabled={isSavingCustomTemplate}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={isSavingCustomTemplate}
                  >
                    {isSavingCustomTemplate ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Template…</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>{editingCustomTemplateId ? 'Save Changes' : 'Create &amp; Deploy Template'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 flex justify-center min-h-[360px]">
                  <iframe
                    title="Draft Live Preview"
                    srcDoc={customTemplateDraftHtml || '<div style="padding: 40px; text-align: center; color: #64748b; font-family: sans-serif;">Rendering draft preview...</div>'}
                    style={{
                      width: '100%',
                      minHeight: '340px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#ffffff',
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setCustomTemplateDraftTab('edit')}
                  >
                    Back to Editor
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}

    </div>
  );
}
