import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Generate JWT token
const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  // expiresIn accepts string values like '7d', '1h', etc. or numbers (seconds)
  // TypeScript's StringValue type from ms package - we cast to satisfy the type checker
  const expiresInValue = process.env.JWT_EXPIRES_IN || '7d';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ id }, secret, { expiresIn: expiresInValue } as any);
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post(
  '/signup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password, full_name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        full_name,
      });

      // Generate token
      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Server error during signup' });
    }
  }
);

router.post(
  '/login-debug',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      // Debug info
      console.log('Login attempt:', { 
        email: email, 
        emailLowercase: email.toLowerCase(),
        passwordLength: password.length 
      });

      // Find user and include password for comparison
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      console.log('User found:', !!user);
      if (user) {
        console.log('User email in DB:', user.email);
      }

      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid email or password',
          debug: { email, emailLowercase: email.toLowerCase() }
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      console.log('Password match:', isMatch);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = generateToken(user._id.toString());

      res.json({
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      // Find user and include password for comparison
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = generateToken(user._id.toString());

      res.json({
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if user exists for security
        return res.json({
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Set token and expiration (1 hour)
      user.reset_password_token = resetTokenHash;
      user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // In production, send email with reset link
      // For now, we'll return the token (only for development)
      // In production, remove this and send email instead
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      console.log('Password reset token generated:');
      console.log(`Reset URL: ${resetUrl}`);
      console.log('⚠️  In production, send this via email instead of logging!');

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Remove this in production - only for development
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Server error processing password reset request' });
    }
  }
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { token, password } = req.body;

      // Hash the token to compare with stored hash
      const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const user = await User.findOne({
        reset_password_token: resetTokenHash,
        reset_password_expires: { $gt: new Date() },
      }).select('+password');

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password
      user.password = password;
      user.reset_password_token = undefined;
      user.reset_password_expires = undefined;
      await user.save();

      res.json({
        message: 'Password has been reset successfully. You can now login with your new password.',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error resetting password' });
    }
  }
);

// @route   POST /api/auth/reset-admin-password
// @desc    Temporarily reset admin password (REMOVE IN PRODUCTION)
// @access  Public (TEMPORARY DEBUG)
router.post('/reset-admin-password', async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;
    
    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({ message: 'No admin user found' });
    }

    // Update password (will be automatically hashed by pre-save hook)
    adminUser.password = newPassword;
    await adminUser.save();

    // Generate new token
    const token = generateToken(adminUser._id.toString());

    res.json({
      message: 'Admin password reset successfully',
      token,
      user: {
        id: adminUser._id.toString(),
        email: adminUser.email,
        full_name: adminUser.full_name,
        role: adminUser.role,
      }
    });
  } catch (error: any) {
    console.error('Reset admin password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/debug-admins
// @desc    Debug endpoint to check admin users (TEMPORARY)
// @access  Public (REMOVE IN PRODUCTION)
router.get('/debug-admins', async (req: Request, res: Response) => {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email full_name role created_at');
    res.json({
      message: 'Admin users found',
      count: adminUsers.length,
      users: adminUsers.map(user => ({
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      }))
    });
  } catch (error: any) {
    console.error('Debug admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/create-first-admin
// @desc    Create the first admin user (only if no admin exists)
// @access  Public (but only works if no admin exists)
router.post(
  '/create-first-admin',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('full_name')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      // Check if any admin already exists
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return res.status(403).json({
          message: 'An admin user already exists. Please login or contact the system administrator.',
        });
      }

      const { email, password, full_name } = req.body;

      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create first admin user
      const user = await User.create({
        email: email.toLowerCase(),
        password,
        full_name,
        role: 'admin',
        is_verified: true,
      });

      // Generate token for automatic login
      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        message: 'First admin user created successfully!',
        user: {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Create first admin error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      res.status(500).json({ message: 'Server error creating first admin user' });
    }
  }
);

export default router;

