/**
 * TypeScript definitions for Dakly SDK
 * @license MIT
 */

export interface DaklyClientOptions {
  /**
   * Your Dakly Project API Key (e.g. "gkey_live_...")
   * Defaults to process.env.DAKLY_API_KEY
   */
  apiKey?: string;
  /**
   * Custom Dakly API endpoint (default: "https://dakly-engin.vercel.app")
   */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds (default: 15000)
   */
  timeout?: number;
  /**
   * Whether to throw DaklySuppressedError when recipient is suppressed (default: true)
   */
  throwOnSuppressed?: boolean;
}

export interface Attachment {
  filename: string;
  path?: string;
  content?: string | Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  otp?: string | number;
  template?: 'otp' | 'welcome' | 'password_reset' | 'notes' | 'invoice' | string;
  vars?: Record<string, any>;
  attachments?: Attachment[];
}

export interface SendOtpOptions {
  to: string;
  code: string | number;
  appName?: string;
  validity?: string;
  expiresInMinutes?: number;
  subject?: string;
}

export interface SendTemplateOptions {
  to: string;
  template: 'otp' | 'welcome' | 'password_reset' | 'notes' | 'invoice' | string;
  vars?: Record<string, any>;
  subject?: string;
  attachments?: Attachment[];
}

export interface SendWelcomeOptions {
  to: string;
  name?: string;
  appName?: string;
  loginUrl?: string;
  supportEmail?: string;
  subject?: string;
}

export interface SendPasswordResetOptions {
  to: string;
  resetUrl: string;
  name?: string;
  validity?: string;
  expiresInMinutes?: number;
  subject?: string;
}

export interface SendNotesOptions {
  to: string;
  subjectName: string;
  notesTitle: string;
  downloadUrl?: string;
  studentName?: string;
  examNotice?: string;
  professorName?: string;
  attachments?: Attachment[];
  subject?: string;
}

export interface SendInvoiceOptions {
  to: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string;
  downloadUrl?: string;
  clientName?: string;
  itemsSummary?: string;
  attachments?: Attachment[];
  subject?: string;
}

export interface SendEmailResponse {
  success: boolean;
  status: 'DELIVERED' | 'QUEUED' | 'FAILED' | 'BLOCKED_SUPPRESSED';
  trackingId: string;
  messageId?: string;
  sender?: string;
  executionTimeMs?: number;
  suppressed?: boolean;
  reason?: string;
  error?: string;
}

export interface PingResponse {
  success: boolean;
  project: string;
  projectId: string;
  environment: string;
  capacity: {
    totalDailyQuota: number;
    totalSentToday: number;
    remainingToday: number;
    primaryDailyQuota: number;
    backupDailyQuota: number;
    totalSendersConfigured: number;
  };
  activeSenders: Array<{
    email: string;
    label: string;
    role: string;
    dailyLimit: number;
    sentToday: number;
    remaining: number;
    warmupEnabled?: boolean;
    warmupStage?: number;
  }>;
}

export interface TemplateCatalogItem {
  id: string;
  name: string;
  category: string;
  defaultSubject: string;
  description: string;
  supportedVars: string[];
  requiredVars: string[];
}

export interface TemplatesResponse {
  success: boolean;
  total: number;
  templates: TemplateCatalogItem[];
}

export interface EmailLogItem {
  _id: string;
  trackingId: string;
  to: string;
  subject: string;
  status: 'DELIVERED' | 'FAILED' | 'QUEUED' | 'BLOCKED_SUPPRESSED';
  template?: string;
  isSuppressed?: boolean;
  openCount?: number;
  clickCount?: number;
  executionTimeMs?: number;
  sentAt?: string;
  createdAt: string;
}

export interface GetLogsOptions {
  page?: number;
  limit?: number;
  status?: 'DELIVERED' | 'FAILED' | 'BLOCKED_SUPPRESSED';
  search?: string;
  template?: string;
}

export interface GetLogsResponse {
  success: boolean;
  logs: EmailLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatsResponse {
  success: boolean;
  project: {
    name: string;
    totalSenders: number;
  };
  capacity: {
    dailyQuota: number;
    sentToday: number;
    remainingToday: number;
  };
  metrics: {
    sentAllTime: number;
    deliveredAllTime: number;
    failedAllTime: number;
    blockedSuppressedAllTime: number;
    today: {
      sent: number;
      delivered: number;
      failed: number;
      successRate: string;
    };
    tracking: {
      totalOpened: number;
      totalClicked: number;
      openRate: string;
      clickRate: string;
      devices: {
        mobile: number;
        desktop: number;
        other: number;
        mobilePercent: string;
        desktopPercent: string;
        otherPercent: string;
      };
    };
  };
}

export interface StatusResponse {
  success: boolean;
  log: {
    trackingId: string;
    project: string;
    senderEmail: string;
    to: string;
    subject: string;
    status: string;
    error?: string;
    hasAttachments?: boolean;
    attachmentsCount?: number;
    executionTimeMs?: number;
    sentAt: string;
  };
}

export class DaklyError extends Error {
  statusCode: number;
  status: string;
  trackingId?: string | null;
  details?: any;
}

export class DaklyAuthenticationError extends DaklyError {}
export class DaklyRateLimitError extends DaklyError {}
export class DaklySuppressedError extends DaklyError {
  suppressed: boolean;
  reason: string;
}
export class DaklyValidationError extends DaklyError {}

export class Dakly {
  constructor(apiKeyOrOptions?: string | DaklyClientOptions);
  
  apiKey: string;
  baseUrl: string;
  timeout: number;
  throwOnSuppressed: boolean;

  send(options: SendEmailOptions): Promise<SendEmailResponse>;
  sendOtp(options: SendOtpOptions): Promise<SendEmailResponse>;
  sendOtp(to: string, code: string | number, appName?: string): Promise<SendEmailResponse>;
  sendTemplate(options: SendTemplateOptions): Promise<SendEmailResponse>;
  sendWelcome(options: SendWelcomeOptions): Promise<SendEmailResponse>;
  sendPasswordReset(options: SendPasswordResetOptions): Promise<SendEmailResponse>;
  sendNotes(options: SendNotesOptions): Promise<SendEmailResponse>;
  sendInvoice(options: SendInvoiceOptions): Promise<SendEmailResponse>;

  ping(): Promise<PingResponse>;
  getTemplates(): Promise<TemplatesResponse>;
  getLogs(options?: GetLogsOptions): Promise<GetLogsResponse>;
  getStats(): Promise<StatsResponse>;
  getStatus(trackingId: string): Promise<StatusResponse>;
}

export default Dakly;
