import { useState } from 'react';
import { ArrowUpRight, LayoutDashboard, Send, Mail, Server, FileText, Radio, ShieldCheck, Code, Menu, LogOut, Sun, Moon, Sparkles, Settings } from 'lucide-react';
import { Brand } from './Landing';

const pages = [
  ['overview', 'Overview', LayoutDashboard], ['playground', 'Send a test', Send],
  ['templates', 'Templates', Mail], ['senders', 'Projects & senders', Server],
  ['logs', 'Delivery logs', FileText], ['webhooks', 'Webhooks', Radio],
  ['security', 'Security & team', ShieldCheck], ['snippets', 'API & SDK', Code],
  ['settings', 'Account settings', Settings],
];

export default function ConsoleNavigation({ activeTab, onTab, projects, activeProject, onProject, user, onLogout, onNewProject, theme, onTheme, onPrompt, onPricing }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <header className="console-mobile-header"><Brand /><button className="button button-outline" aria-expanded={expanded} aria-controls="console-sidebar" onClick={() => setExpanded(!expanded)}><Menu size={18} aria-hidden="true" /> Menu</button></header>
    <aside id="console-sidebar" className={`console-sidebar ${expanded ? 'is-expanded' : ''}`}>
      <div className="desktop-brand"><Brand /></div>
      <div className="workspace-selector"><label htmlFor="project-select">Workspace project</label><select id="project-select" value={activeProject?.id || ''} onChange={e => onProject(e.target.value)} disabled={!projects.length}>{!projects.length && <option value="">No projects yet</option>}{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button className="text-link" onClick={onNewProject}>+ New project</button></div>
      <nav aria-label="Workspace navigation">{pages.map(([id, title, Icon]) => <button key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => { onTab(id); setExpanded(false); }}><Icon size={18} aria-hidden="true" /><span>{title}</span></button>)}</nav>
      <div className="sidebar-bottom">
        {onPricing && <button className="sidebar-link" onClick={onPricing}><Sparkles size={16} aria-hidden="true" /> Pricing &amp; Credits</button>}
        <button className="sidebar-link" onClick={onPrompt}>AI setup prompt <ArrowUpRight size={15} aria-hidden="true" /></button>
        <button className="sidebar-link" onClick={onTheme}>{theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />} {theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</button>
        <div className="sidebar-user">
          <button
            type="button"
            className="sidebar-user-action"
            onClick={() => { onTab('settings'); setExpanded(false); }}
            title="Account & User Settings"
            aria-label="Account Settings"
          >
            <span className="sidebar-user-name" title={user?.name}>{user?.name || 'Your account'}</span>
            <Settings size={14} aria-hidden="true" className="settings-icon opacity-70 hover:opacity-100" />
          </button>
          <button className="icon-button" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={17} aria-hidden="true" /></button>
        </div>
      </div>
    </aside>
  </>;
}
