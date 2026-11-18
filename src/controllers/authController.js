const User = require('../models/User');
const { generateToken } = require('../middleware/authJwt');

// Common weak passwords list to prevent trivial credential attacks (AUTH-04)
const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  '123456789',
  'admin',
  'admin123',
  'qwerty',
  'letmein',
  'abc123',
  'welcome',
  'testing',
  'test123',
]);

// Helper to sanitize plain text and completely strip HTML/script blocks
function sanitizePlainText(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>?/gm, '')
    .replace(/[<>'"`;]/g, '')
    .trim();
}

/**
 * Register a new developer / user
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password.',
      });
    }

    // AUTH-01: Sanitize user name to prevent Stored XSS payloads
    const cleanName = sanitizePlainText(name);

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid name (at least 2 characters, without HTML or script tags).',
      });
    }

    // AUTH-04: Enforce strong password complexity policy
    const trimmedPassword = String(password);
    if (trimmedPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
      });
    }

    if (COMMON_WEAK_PASSWORDS.has(trimmedPassword.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'This password is too easily guessed. Please choose a more secure password.',
      });
    }

    if (!/[a-zA-Z]/.test(trimmedPassword) || !/[0-9]/.test(trimmedPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least one letter and one number.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // AUTH-03: Mitigation for email enumeration
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in or reset password.',
      });
    }

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: trimmedPassword,
    });

    // Auto-link any pending team workspace invitations for this email
    const Project = require('../models/Project');
    Project.updateMany(
      { 'members.email': cleanEmail },
      { $set: { 'members.$[elem].user': user._id, 'members.$[elem].status': 'active' } },
      { arrayFilters: [{ 'elem.email': cleanEmail }] }
    ).exec().catch(() => {});

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Log in an existing user
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user with password and security lockout metadata
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // AUTH-02: Account lockout protection against targeted brute-force attacks
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      const waitMinutes = Math.max(1, Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000)));
      return res.status(423).json({
        success: false,
        error: `Account temporarily locked due to multiple failed login attempts. Please try again after ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      // Lock account for 15 minutes after 5 consecutive failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'This account has been deactivated.',
      });
    }

    // Reset failed login attempts and lockout upon successful authentication
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get currently authenticated user profile
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
};
