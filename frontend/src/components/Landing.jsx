import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Copy, Check } from 'lucide-react';
import Dialog from './Dialog';
import AdBanner from './AdBanner';
import { API_BASE_URL } from '../services/api';

const repository = 'https://github.com/parthpatil1234p-svg/Dakly';
const faqs = [
  ['What do I need to get started?', 'A Dakly account, a Gmail account with 2-Step Verification, and a Google App Password. Create a project in the console to connect your sender and get an API key. Some Google accounts do not support App Passwords.'],
  ['How many emails can I send?', 'Sending is subject to your Gmail account’s limits. Dakly tracks each connected sender’s daily quota; warm-up can lower that quota initially. Check Senders in the console for your current allowance.'],
  ['Is Dakly free?', 'Dakly is open source under the MIT license. You bring your Gmail account. If you host the service yourself, infrastructure costs and your provider’s limits still apply.'],
  ['Can I use my own email address?', 'Yes, if it is already verified as a “Send mail as” alias in the connected Gmail account. Add that alias to your project, then specify it when sending.'],
  ['What happens when delivery fails?', 'Inspect the response and delivery log for the failure reason. Dakly supports backup senders, bounce suppression, and signed webhooks. A successful SMTP send does not guarantee placement in the recipient’s inbox.'],
];

export function Brand() {
  return <a className="brand" href="/" aria-label="Dakly home"><svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><rect width="34" height="34" rx="7" fill="currentColor"/><path d="M8 11h18v13H8V11Zm0 0 9 7 9-7" stroke="var(--paper)" strokeWidth="1.6" strokeLinejoin="round"/><path d="M5 8h10M5 5h6" stroke="var(--paper)" strokeWidth="1.3"/></svg><span>dakly<span className="brand-period">.</span></span></a>;
}

export default function Landing({ authMode, setAuthMode, authForm, setAuthForm, authError, setAuthError, authLoading, onAuthSubmit, onPrivacy, onTerms, children }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [example, setExample] = useState('otp');
  const [language, setLanguage] = useState('node');
  const [copyState, setCopyState] = useState('');
  const openAuth = mode => { setAuthMode(mode); setAuthError(''); setAuthOpen(true); };
  const snippets = {
    node: `import { Dakly } from 'dakly';\n\nconst mail = new Dakly({\n  apiKey: process.env.DAKLY_API_KEY,\n  baseUrl: '${API_BASE_URL}'\n});\n\nawait mail.sendOtp({\n  to: 'recipient@example.com',\n  code: '849201',\n  appName: 'Your app'\n});`,
    python: `from dakly import Dakly\nimport os\n\nclient = Dakly(api_key=os.environ["DAKLY_API_KEY"])\n\nresponse = client.send_otp(\n    to="recipient@example.com",\n    code="849201",\n    app_name="Your app"\n)\nprint(response["status"])`,
    curl: `curl '${API_BASE_URL}/api/send' \\\n  -H "x-api-key: $DAKLY_API_KEY" \\\n  -H 'Content-Type: application/json' \\\n  -d '{\n    "to": "recipient@example.com",\n    "subject": "Your verification code",\n    "otp": "849201"\n  }'`,
  };
  async function copyCode() {
    try { await navigator.clipboard.writeText(snippets[language]); setCopyState('Copied'); }
    catch { setCopyState('Copy unavailable. Select the code to copy it.'); }
  }
  return (
    <div className="landing">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header page-width">
        <Brand />
        <nav aria-label="Main navigation" className="site-nav">
          <a href="#how-it-works">How it works</a><a href="#api-example">API example</a><a href={repository} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14} aria-hidden="true" /></a>
        </nav>
        <button className="button button-outline" onClick={() => openAuth('login')}>Sign in</button>
      </header>

      <main id="main">
        <section className="hero-section page-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="small-rule" /> Transactional email, from your Gmail.</p>
            <h1 id="hero-title">Your app.<br />Your Gmail.<br />Mail, handled.</h1>
            <p className="hero-description">Send verification codes, receipts, and account updates through the Gmail you already have. One API. Your own sender.</p>
            <button className="button button-primary hero-action" onClick={() => openAuth('register')}>Create your account <ArrowRight size={18} aria-hidden="true" /></button>
            <p className="hero-footnote">Open source. Bring your Gmail account.</p>
          </div>

          <div className="mail-workbench" aria-label="Example email preview">
            <div className="workbench-heading"><span className="mono">A small request. A real use case.</span><span className="preview-label">Preview</span></div>
            <div className="mail-routing"><span>Your app</span><span className="route-line" aria-hidden="true" /><span>Dakly</span><span className="route-line" aria-hidden="true" /><span>Gmail</span></div>
            <div className="mail-sheet">
              <div className="mail-sheet-top">
                <span className="mail-category">Transactional / {example === 'otp' ? 'Authentication' : 'Billing'}</span>
                <div className="transport-badge mono" aria-label="Transport method">
                  <span className="status-pip" aria-hidden="true" />
                  <span>SMTP :587 STARTTLS</span>
                </div>
              </div>
              <div className="mail-address"><span>From</span><strong>Your app &lt;you@gmail.com&gt;</strong></div>
              <div className="mail-address"><span>To</span><span>recipient@example.com</span></div>
              <div className="mail-content" aria-live="polite">
                <p className="mail-subject">{example === 'otp' ? 'A little code. You’re in.' : 'Payment received. Thank you.'}</p>
                <p>{example === 'otp' ? 'Use this code to finish signing in to your account.' : 'Here’s a copy of the receipt for your records.'}</p>
                {example === 'otp' ? <><div className="verification-code">849 201</div><p className="mail-small">This code expires in 10 minutes.<br />Didn’t request it? You can ignore this email.</p></> : <><div className="receipt-line"><span>Example order #1042</span><strong>₹499.00</strong></div><p className="mail-small">Your receipt is attached to this email.<br />Questions? Reply to the sender.</p></>}
              </div>
              <div className="mail-sheet-bottom"><span className="mono">Sent with your sender identity</span><span aria-hidden="true">✓</span></div>
            </div>
            <div className="preview-switch" role="group" aria-label="Choose an email preview">
              <button aria-pressed={example === 'otp'} onClick={() => setExample('otp')}>Verification code</button><button aria-pressed={example === 'receipt'} onClick={() => setExample('receipt')}>Receipt</button>
            </div>
            <p className="preview-disclaimer">Illustrative email. No message is sent from this preview.</p>
          </div>
        </section>

        <div className="capability-strip page-width" aria-label="Supported email content"><span>Built for the mail your app needs to send.</span><div><span>Verification codes</span><span>Password resets</span><span>Receipts & attachments</span></div></div>

        <section id="how-it-works" className="setup-section page-width" aria-labelledby="setup-title">
          <div className="setup-copy"><p className="eyebrow">From account to first email</p><h2 id="setup-title">A short path<br />to your first send.</h2>
            <ol className="setup-steps">
              <li><span className="step-number">01</span><div><h3>Connect your Gmail</h3><p>Create a project with your Gmail address and a Google App Password. Your regular Google password stays with Google.</p></div></li>
              <li><span className="step-number">02</span><div><h3>Keep one key on your server</h3><p>Copy your project’s API key into an environment variable. Use the Node.js SDK or a plain HTTP request.</p></div></li>
              <li><span className="step-number">03</span><div><h3>Send. Then check the log.</h3><p>Send a test to your own inbox. Inspect the response and delivery log before wiring it into your app.</p></div></li>
            </ol>
          </div>
          <div id="api-example" className="api-example">
            <div className="code-heading"><span>One request to get going.</span><a className="code-ref-link" href={`${repository}/blob/main/docs/API_REFERENCE.md`} target="_blank" rel="noreferrer">API Reference <ArrowUpRight size={14} aria-hidden="true" /></a></div>
            <div className="code-toolbar"><div role="group" aria-label="Code language">{['node', 'python', 'curl'].map(lang => <button key={lang} aria-pressed={language === lang} onClick={() => { setLanguage(lang); setCopyState(''); }}>{lang === 'node' ? 'Node.js' : lang === 'python' ? 'Python' : 'cURL'}</button>)}</div><button aria-label="Copy code example" onClick={copyCode}>{copyState === 'Copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copyState === 'Copied' ? 'Copied' : 'Copy'}</button></div>
            <div className="install-line mono">{language === 'node' ? '$ npm install dakly' : language === 'python' ? '$ pip install dakly' : '# Run from your terminal'}</div>
            <pre tabIndex={0} aria-label={`${language === 'node' ? 'Node.js' : language === 'python' ? 'Python' : 'cURL'} code example`}><code>{snippets[language].split('\n').map((line, index) => <span className="code-line" key={index}><span className="line-number" aria-hidden="true">{index + 1}</span><span>{line || ' '}</span></span>)}</code></pre>
            <div className="code-note">Server-side only. Replace the example recipient with your own address.</div>
            <p className="copy-status" role="status">{copyState && copyState !== 'Copied' ? copyState : ''}</p>
          </div>
        </section>

        <section className="limits-section page-width" aria-labelledby="limits-title"><div><p className="eyebrow">Know the boundaries</p><h2 id="limits-title">Your Gmail.<br />Google’s limits.</h2></div><div><p>Dakly handles the API, templates, and delivery logs. Gmail still controls sending limits and delivery. Use it for your app’s transactional mail, and check your quota before sending.</p><a className="text-link" href={`${repository}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer">Read how delivery works <ArrowUpRight size={16} aria-hidden="true" /></a></div></section>
        <section className="faq-section page-width" aria-labelledby="faq-title"><div><p className="eyebrow">Before you connect</p><h2 id="faq-title">A few useful details.</h2></div><div>{faqs.map(([q, a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      </main>
      <div className="page-width"><AdBanner /></div>
      <footer className="site-footer page-width"><span>Dakly / Mail with your own return address.</span><nav aria-label="Legal"><a href="mailto:daklysupport@disheera.site">Support</a><button onClick={onPrivacy}>Privacy</button><button onClick={onTerms}>Terms</button><a href={`${repository}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT license <ArrowUpRight size={13} aria-hidden="true" /></a></nav></footer>
      {authOpen && <Dialog title={authMode === 'register' ? 'Create Dakly account' : 'Sign in to Console'} onClose={() => setAuthOpen(false)} busy={authLoading}>
        <p className="dialog-intro">{authMode === 'register' ? 'Register your account to manage projects, generate API keys, and connect Gmail.' : 'Sign in with your Dakly account to access projects, senders, and delivery logs.'}</p>
        <form onSubmit={onAuthSubmit} aria-busy={authLoading} className="auth-form">
          {authError && <div className="notice notice-error" role="alert">{authError}</div>}
          <fieldset disabled={authLoading}>
            {authMode === 'register' && (
              <>
                <label htmlFor="auth-name">Your name<input id="auth-name" name="name" autoComplete="name" required value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} /></label>
                <label htmlFor="auth-phone">
                  Mobile number (mandatory)
                  <input
                    id="auth-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={authForm.phone || ''}
                    onChange={e => setAuthForm({ ...authForm, phone: e.target.value })}
                  />
                  <span className="field-help" style={{ fontSize: '11px', display: 'block', marginTop: '2px', opacity: 0.8 }}>
                    1 user can only add 1 mobile number (mandatory for account security).
                  </span>
                </label>
              </>
            )}
            <label htmlFor="auth-email">Email address<input id="auth-email" name="email" type="email" autoComplete="email" required value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} /></label>
            <div className="password-group"><label htmlFor="auth-password">Password</label><div className="password-field"><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} required minLength={authMode === 'register' ? 8 : undefined} aria-describedby={authMode === 'register' ? 'password-help' : undefined} value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
            {authMode === 'register' && <p id="password-help" className="field-help">At least 8 characters (letters & numbers). Use a password unique to Dakly.</p>}
            <button className="button button-primary" type="submit" disabled={authLoading}>{authLoading ? (authMode === 'register' ? 'Creating account…' : 'Signing in…') : (authMode === 'register' ? 'Create account' : 'Sign in')}<ArrowRight size={16} aria-hidden="true" /></button>
          </fieldset>
          <p className="auth-switch">{authMode === 'register' ? 'Already have an account?' : 'New to Dakly?'} <button type="button" disabled={authLoading} onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setAuthError(''); }}>{authMode === 'register' ? 'Sign in' : 'Create an account'}</button></p>
        </form>
      </Dialog>}
      {children}
    </div>
  );
}
