/**
 * Dakly Email Template Engine & Pre-built Catalog
 * High-conversion, mobile-responsive transactional email templates with dynamic variable interpolation.
 * Compatible with Gmail, Apple Mail, Outlook, and all modern email clients.
 */

/**
 * Escapes HTML characters to prevent XSS / broken layouts
 * @param {any} val
 * @returns {string}
 */
function escapeHtml(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates the unified header with 1:1 brand logo or project badge
 */
function renderHeader(project) {
  const projectName = escapeHtml(project?.name || 'Dakly Service');
  const hasLogo = project?.brandLogo && project.brandLogo.data;

  if (hasLogo) {
    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; width: 100%;">
        <tr>
          <td style="vertical-align: middle; width: 48px;">
            <img src="${project.brandLogo.data}" width="44" height="44" alt="${projectName} Logo" style="width: 44px; height: 44px; border-radius: 10px; object-fit: cover; display: block; border: 1px solid #e2e8f0;" />
          </td>
          <td style="vertical-align: middle; padding-left: 14px;">
            <div style="font-size: 19px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; line-height: 1.2;">${projectName}</div>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
      <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">${projectName}</span>
    </div>
  `;
}

/**
 * Generates the unified email footer
 */
function renderFooter(project) {
  const projectName = escapeHtml(project?.name || 'Dakly Service');
  const year = new Date().getFullYear();

  return `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 6px;">Sent securely via <strong>${projectName}</strong></p>
      <p style="margin: 0;">&copy; ${year} ${projectName}. All rights reserved. Do not reply to this automated email.</p>
    </div>
  `;
}

/**
 * Wraps content in the global email shell
 */
function wrapShell(bodyContent, project) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project?.name || 'Email')}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td>
              ${renderHeader(project)}
              ${bodyContent}
              ${renderFooter(project)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. OTP / Verification Code Template
 */
function renderOtp(vars, project) {
  const code = escapeHtml(vars.code || vars.otp || '123456');
  const name = escapeHtml(vars.name ? `Hi ${vars.name},` : 'Hello,');
  const validMinutes = parseInt(vars.validMinutes, 10) || 10;
  const actionName = escapeHtml(vars.actionName || 'complete your verification');
  const projectName = escapeHtml(project?.name || 'your account');

  const html = wrapShell(`
    <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Verification Code</h1>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.5;">
      ${name} please use the one-time verification code below to ${actionName} for <strong>${projectName}</strong>:
    </p>

    <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 24px 0;">
      <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #1e40af; font-family: 'Courier New', Courier, monospace; margin-left: 10px;">${code}</div>
      <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">One-Time Security Code</div>
    </div>

    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.4;">
        ⏱️ <strong>Valid for ${validMinutes} minutes.</strong> Never share this code with anyone, including staff.
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      If you did not request this verification code, please ignore this email or review your account security.
    </p>
  `, project);

  const text = `${name}\n\nYour one-time verification code for ${projectName} is: ${code}\n\nThis code expires in ${validMinutes} minutes.\nIf you did not request this, please ignore this email.`;

  const rawProjectName = project?.name || 'Account';
  const rawCode = vars.code || vars.otp || '123456';

  return {
    html,
    text,
    defaultSubject: `${rawCode} is your ${rawProjectName} verification code`,
  };
}

/**
 * 2. Welcome / Onboarding Template
 */
function renderWelcome(vars, project) {
  const name = escapeHtml(vars.name || 'there');
  const projectName = escapeHtml(project?.name || 'Dakly');
  const actionUrl = vars.actionUrl ? escapeHtml(vars.actionUrl) : '#';
  const actionText = escapeHtml(vars.actionText || 'Go to Dashboard');
  const introMessage = escapeHtml(
    vars.introMessage || `We are excited to welcome you to ${projectName}! Your account has been created and is ready to explore.`
  );

  let featuresHtml = '';
  if (Array.isArray(vars.features) && vars.features.length > 0) {
    featuresHtml = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
        <div style="font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">What you can do next:</div>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          ${vars.features
            .map(
              (f) => `
              <tr>
                <td style="vertical-align: top; padding-bottom: 8px; width: 22px; font-size: 14px;">✅</td>
                <td style="vertical-align: top; padding-bottom: 8px; font-size: 14px; color: #475569; line-height: 1.4;">${escapeHtml(
                  typeof f === 'string' ? f : f.text || ''
                )}</td>
              </tr>
            `
            )
            .join('')}
        </table>
      </div>
    `;
  }

  const html = wrapShell(`
    <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">Welcome aboard, ${name}! 🎉</h1>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.6;">
      ${introMessage}
    </p>

    ${featuresHtml}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionUrl}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
        ${actionText} &rarr;
      </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
      Need assistance? Reply directly or check our documentation anytime.
    </p>
  `, project);

  const text = `Welcome aboard, ${name}!\n\n${introMessage}\n\nGet started here: ${actionUrl}\n\nWelcome to ${projectName}!`;

  return {
    html,
    text,
    defaultSubject: `Welcome to ${projectName}! 🎉`,
  };
}

/**
 * 3. Password Reset Template
 */
function renderPasswordReset(vars, project) {
  const name = escapeHtml(vars.name || 'there');
  const projectName = escapeHtml(project?.name || 'Dakly');
  const resetUrl = vars.resetUrl ? escapeHtml(vars.resetUrl) : '#';
  const validMinutes = parseInt(vars.validMinutes, 10) || 15;
  const ipAddress = vars.ipAddress ? escapeHtml(vars.ipAddress) : null;
  const deviceInfo = vars.deviceInfo ? escapeHtml(vars.deviceInfo) : null;

  let requestMetaHtml = '';
  if (ipAddress || deviceInfo) {
    requestMetaHtml = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #64748b; line-height: 1.6;">
        <strong>Request details:</strong><br/>
        ${ipAddress ? `IP Address: ${ipAddress}<br/>` : ''}
        ${deviceInfo ? `Device / Browser: ${deviceInfo}` : ''}
      </div>
    `;
  }

  const html = wrapShell(`
    <div style="display: inline-block; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 16px;">
      🔒 SECURITY ALERT
    </div>
    <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">Reset Your Password</h1>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.5;">
      Hi ${name}, we received a request to reset the password for your <strong>${projectName}</strong> account. Click the button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" target="_blank" style="display: inline-block; background: #dc2626; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.25);">
        Reset Password &rarr;
      </a>
    </div>

    ${requestMetaHtml}

    <p style="margin: 0 0 14px; font-size: 13px; color: #64748b; line-height: 1.4;">
      ⏱️ This link is only valid for <strong>${validMinutes} minutes</strong>. If the button above does not work, copy and paste this link into your browser:
    </p>
    <div style="background: #f1f5f9; padding: 10px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 24px;">
      ${resetUrl}
    </div>

    <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      If you did not request a password reset, please ignore this email. Your password will remain unchanged.
    </p>
  `, project);

  const text = `Hi ${name},\n\nWe received a request to reset your password for ${projectName}.\n\nReset your password here:\n${resetUrl}\n\nThis link is valid for ${validMinutes} minutes.\nIf you did not request this, please ignore this email.`;

  return {
    html,
    text,
    defaultSubject: `Reset your ${projectName} password`,
  };
}

/**
 * 4. College Notes / PDF Attachment Delivery Template
 */
function renderNotesDelivery(vars, project) {
  const studentName = escapeHtml(vars.studentName || vars.name || 'Student');
  const projectName = escapeHtml(project?.name || 'Notes Portal');
  const subjectName = escapeHtml(vars.subject || vars.course || 'Academic Resource');
  const notesTitle = escapeHtml(vars.notesTitle || 'Study Notes & Materials');
  const semester = vars.semester ? escapeHtml(vars.semester) : null;
  const description = vars.description ? escapeHtml(vars.description) : null;
  const downloadUrl = vars.downloadUrl ? escapeHtml(vars.downloadUrl) : null;
  const hasAttachment = vars.hasAttachment !== false;

  const html = wrapShell(`
    <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #059669; margin-bottom: 16px;">
      📚 STUDY MATERIAL DISPATCH
    </div>
    <h1 style="margin: 0 0 10px; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">Your Study Notes Are Here! 🎓</h1>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.5;">
      Hello ${studentName}, here is the study material requested from <strong>${projectName}</strong>:
    </p>

    <!-- Notes Card -->
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 14px; padding: 22px 20px; margin: 24px 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">${subjectName}</span>
        ${semester ? `<span style="font-size: 11px; background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${semester}</span>` : ''}
      </div>
      <h2 style="margin: 4px 0 8px; font-size: 18px; font-weight: 700; color: #064e3b;">${notesTitle}</h2>
      ${description ? `<p style="margin: 8px 0 0; font-size: 14px; color: #065f46; line-height: 1.5;">${description}</p>` : ''}
    </div>

    ${
      hasAttachment
        ? `
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; display: flex; align-items: center;">
        <span style="font-size: 22px; margin-right: 12px;">📎</span>
        <div style="font-size: 13px; color: #334155; line-height: 1.4;">
          <strong>PDF / Notes Attached:</strong> You can download or view the attached study files directly at the bottom of this email.
        </div>
      </div>
    `
        : ''
    }

    ${
      downloadUrl
        ? `
      <div style="text-align: center; margin: 26px 0;">
        <a href="${downloadUrl}" target="_blank" style="display: inline-block; background: #059669; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.25);">
          Download Notes PDF &rarr;
        </a>
      </div>
    `
        : ''
    }

    <p style="margin: 0; font-size: 13px; color: #94a3b8; text-align: center;">
      Good luck with your exam preparations! &bull; Happy Learning! 🚀
    </p>
  `, project);

  const text = `Hello ${studentName},\n\nYour study notes for ${subjectName} are ready!\nTitle: ${notesTitle}\n${description ? `Description: ${description}\n` : ''}${downloadUrl ? `Download: ${downloadUrl}\n` : ''}\nStudy hard and all the best!`;

  const rawTitle = vars.notesTitle || vars.subject || 'Study Notes';
  const rawProject = project?.name || 'Notes Portal';

  return {
    html,
    text,
    defaultSubject: `📚 ${rawTitle} - ${rawProject}`,
  };
}

/**
 * 5. Invoice / Payment Receipt Template
 */
function renderReceipt(vars, project) {
  const customerName = escapeHtml(vars.customerName || vars.name || 'Valued Customer');
  const projectName = escapeHtml(project?.name || 'Dakly Billing');
  const invoiceNumber = escapeHtml(vars.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
  const amount = escapeHtml(vars.amount || '₹0.00');
  const date = escapeHtml(vars.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
  const paymentMethod = escapeHtml(vars.paymentMethod || 'Online / Card');
  const planName = escapeHtml(vars.planName || vars.itemName || 'Service Subscription');
  const receiptUrl = vars.receiptUrl ? escapeHtml(vars.receiptUrl) : null;

  let itemsHtml = '';
  if (Array.isArray(vars.items) && vars.items.length > 0) {
    itemsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        ${vars.items
          .map(
            (it) => `
          <tr>
            <td style="padding: 12px 0; font-size: 14px; color: #334155;">${escapeHtml(it.description || it.name || 'Item')}</td>
            <td style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${escapeHtml(it.amount || '')}</td>
          </tr>
        `
          )
          .join('')}
      </table>
    `;
  } else {
    itemsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 0; font-size: 14px; color: #334155;">${planName}</td>
          <td style="padding: 12px 0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">${amount}</td>
        </tr>
      </table>
    `;
  }

  const html = wrapShell(`
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <span style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #16a34a;">
        PAID IN FULL ✅
      </span>
      <span style="font-size: 13px; font-weight: 600; color: #64748b;">Invoice #${invoiceNumber}</span>
    </div>

    <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">Payment Receipt</h1>
    <p style="margin: 0 0 20px; font-size: 15px; color: #475569; line-height: 1.5;">
      Hi ${customerName}, thank you for your payment. Here are the details of your transaction:
    </p>

    <!-- Amount Hero Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Amount Charged</div>
      <div style="font-size: 32px; font-weight: 800; color: #0f172a; margin-top: 4px;">${amount}</div>
    </div>

    <!-- Details Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; padding-bottom: 6px;">Date Paid:</td>
        <td style="color: #0f172a; font-weight: 600; text-align: right; padding-bottom: 6px;">${date}</td>
      </tr>
      <tr>
        <td style="color: #64748b; padding-bottom: 6px;">Payment Method:</td>
        <td style="color: #0f172a; font-weight: 600; text-align: right; padding-bottom: 6px;">${paymentMethod}</td>
      </tr>
      <tr>
        <td style="color: #64748b; padding-bottom: 6px;">Billed To:</td>
        <td style="color: #0f172a; font-weight: 600; text-align: right; padding-bottom: 6px;">${customerName}</td>
      </tr>
    </table>

    ${itemsHtml}

    ${
      receiptUrl
        ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${receiptUrl}" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Download Tax Invoice (PDF) &rarr;
        </a>
      </div>
    `
        : ''
    }

    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
      If you have questions regarding this charge, contact support citing invoice #${invoiceNumber}.
    </p>
  `, project);

  const text = `Payment Receipt from ${projectName}\n\nInvoice: #${invoiceNumber}\nAmount: ${amount}\nDate: ${date}\nPayment Method: ${paymentMethod}\nCustomer: ${customerName}\nItem: ${planName}\n\nStatus: PAID IN FULL\nThank you for your business!`;

  const rawInv = vars.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const rawProject = project?.name || 'Dakly Billing';

  return {
    html,
    text,
    defaultSubject: `Receipt #${rawInv} from ${rawProject}`,
  };
}

/**
 * Catalog metadata for developers & dashboard inspection
 */
const TEMPLATE_CATALOG = [
  {
    id: 'otp',
    aliases: ['auth_code', 'verification'],
    name: 'Modern OTP & Auth Code',
    badge: 'Security',
    description: 'Crisp one-time verification code card with security alerts, expiry time, and brand logo.',
    sampleVars: {
      name: 'Rahul',
      code: '849201',
      validMinutes: 10,
      actionName: 'sign in to your dashboard',
    },
    render: renderOtp,
  },
  {
    id: 'welcome',
    aliases: ['onboarding', 'signup'],
    name: 'Welcome & Onboarding',
    badge: 'Marketing',
    description: 'High-energy welcome letter with feature highlights list and primary CTA button.',
    sampleVars: {
      name: 'Aman',
      actionUrl: 'https://dakly.vercel.app/dashboard',
      actionText: 'Get Started Now',
      introMessage: 'We are thrilled to welcome you! Your account is active and ready to roll.',
      features: [
        'Instant zero-cost email delivery',
        'Automatic 1,000/day multi-account failover',
        'Real-time delivery audit logs and tracking',
      ],
    },
    render: renderWelcome,
  },
  {
    id: 'password_reset',
    aliases: ['reset_password', 'forgot_password'],
    name: 'Secure Password Reset',
    badge: 'Auth',
    description: 'Security-first password recovery with prominent action button, raw link fallback, and IP notice.',
    sampleVars: {
      name: 'Priya',
      resetUrl: 'https://dakly.vercel.app/reset-password?token=sec_984129',
      validMinutes: 15,
      ipAddress: '103.21.144.92',
      deviceInfo: 'Chrome on macOS',
    },
    render: renderPasswordReset,
  },
  {
    id: 'notes_delivery',
    aliases: ['study_notes', 'pdf_delivery', 'resource'],
    name: 'College Notes & Study Material',
    badge: 'Education',
    description: 'Academic resource card with course details, semester pill, and PDF attachment badge.',
    sampleVars: {
      studentName: 'Sneha',
      subject: 'Data Structures & Algorithms',
      notesTitle: 'Unit 3: Trees, Binary Search & Graph Algorithms',
      semester: 'Semester 4',
      description: 'Comprehensive handwritten revision notes with solved university question papers.',
      downloadUrl: 'https://dakly.vercel.app',
      hasAttachment: true,
    },
    render: renderNotesDelivery,
  },
  {
    id: 'receipt',
    aliases: ['invoice', 'payment_success', 'bill'],
    name: 'Invoice & Payment Receipt',
    badge: 'Billing',
    description: 'Clean financial receipt with itemized line items, amount charged card, and paid badge.',
    sampleVars: {
      customerName: 'Vikram Sharma',
      invoiceNumber: 'INV-2026-941',
      amount: '₹1,499.00',
      date: '19 Oct 2026',
      paymentMethod: 'UPI / Card',
      planName: 'Dakly Pro Developer Pass',
      items: [
        { description: 'Dakly Pro Subscription (1 Year)', amount: '₹1,270.00' },
        { description: 'GST (18%)', amount: '₹229.00' },
      ],
      receiptUrl: 'https://dakly.vercel.app',
    },
    render: renderReceipt,
  },
];

/**
 * Resolves a template ID or alias to its definition
 */
function resolveTemplate(identifier = '') {
  const cleanId = String(identifier).trim().toLowerCase();
  return TEMPLATE_CATALOG.find((t) => t.id === cleanId || t.aliases.includes(cleanId));
}

/**
 * Compiles a template into final HTML, plain text, and subject
 * @param {Object} options
 * @param {string} options.template - Template ID or alias
 * @param {Object} [options.vars] - Dynamic variables
 * @param {Object} [options.project] - Project document
 * @returns {{ html: string, text: string, defaultSubject: string, templateId: string }}
 */
function compileTemplate({ template, vars = {}, project = {} }) {
  const tpl = resolveTemplate(template);
  if (!tpl) {
    const valid = TEMPLATE_CATALOG.map((t) => t.id).join(', ');
    throw new Error(`Unknown template "${template}". Supported templates: ${valid}`);
  }

  const rendered = tpl.render(vars || {}, project || {});
  return {
    ...rendered,
    templateId: tpl.id,
  };
}

function getCatalogList() {
  return TEMPLATE_CATALOG.map((t) => ({
    id: t.id,
    aliases: t.aliases,
    name: t.name,
    badge: t.badge,
    description: t.description,
    sampleVars: t.sampleVars,
  }));
}

module.exports = {
  TEMPLATE_CATALOG,
  getCatalogList,
  resolveTemplate,
  compileTemplate,
};
