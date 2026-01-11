import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Donation from '../models/Donation';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import DonationReason from '../models/DonationReason';
import CommunicationMethod from '../models/CommunicationMethod';
import PaymentMethod from '../models/PaymentMethod';
import { authenticate, AuthRequest, isAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// @route   GET /api/admin/stats
// @desc    Get comprehensive admin statistics
// @access  Private (Admin)
router.get('/stats', async (req: express.Request, res: Response) => {
  try {
    // Donation statistics
    const donationStats = await Donation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' },
        },
      },
    ]);

    // User statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // Recent activity
    const recentActivity = await ActivityLog.find()
      .populate('user_id', 'full_name email')
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    // Monthly donation trends
    const monthlyTrends = await Donation.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'completed'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
          },
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 },
      },
      {
        $limit: 12,
      },
    ]);

    res.json({
      donations: donationStats,
      users: userStats,
      recent_activity: recentActivity,
      monthly_trends: monthlyTrends,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error fetching admin stats' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Private (Admin)
router.get('/users', async (req: express.Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments();

    res.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   GET /api/admin/donations
// @desc    Get all donations with filters
// @access  Private (Admin)
router.get('/donations', async (req: express.Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { status, user_id } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (user_id) query.user_id = user_id;

    const donations = await Donation.find(query)
      .populate('user_id', 'full_name email')
      .populate('reason_id', 'title')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Donation.countDocuments(query);

    res.json({
      donations: donations.map((donation) => ({
        id: donation._id.toString(),
        user_id: donation.user_id,
        amount: donation.amount,
        status: donation.status,
        payment_method_id: donation.payment_method_id,
        reason_id: donation.reason_id,
        message: donation.message,
        is_anonymous: donation.is_anonymous,
        gift_card_code: donation.gift_card_code,
        receipt_image: donation.receipt_image,
        wallet_address: donation.wallet_address,
        paypal_email: donation.paypal_email,
        created_at: donation.created_at.toISOString(),
        confirmed_at: donation.confirmed_at?.toISOString(),
        completed_at: donation.completed_at?.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get admin donations error:', error);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
});

// @route   POST /api/admin/users
// @desc    Create a new admin user
// @access  Private (Admin)
router.post(
  '/users',
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
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Invalid role'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password, full_name, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create new user (default to admin if role not specified)
      const user = await User.create({
        email: email.toLowerCase(),
        password,
        full_name,
        role: role || 'admin',
        is_verified: true,
      });

      res.status(201).json({
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role: user.role,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Create admin user error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      res.status(500).json({ message: 'Server error creating admin user' });
    }
  }
);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update user role
// @access  Private (Admin)
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

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
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error updating user role' });
  }
});

// @route   PATCH /api/admin/donations/:id/status
// @desc    Update donation status (approve/decline)
// @access  Private (Admin)
router.patch(
  '/donations/:id/status',
  [
    body('status')
      .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { status } = req.body;
      const donation = await Donation.findById(req.params.id);

      if (!donation) {
        return res.status(404).json({ message: 'Donation not found' });
      }

      donation.status = status;
      if (status === 'confirmed' && !donation.confirmed_at) {
        donation.confirmed_at = new Date();
      }
      if (status === 'completed' && !donation.completed_at) {
        donation.completed_at = new Date();
      }

      await donation.save();

      const populatedDonation = await Donation.findById(donation._id)
        .populate('user_id', 'full_name email')
        .populate('reason_id', 'title')
        .lean();

      res.json({
        id: populatedDonation?._id.toString(),
        user_id: populatedDonation?.user_id,
        amount: populatedDonation?.amount,
        status: populatedDonation?.status,
        reason_id: populatedDonation?.reason_id,
        confirmed_at: populatedDonation?.confirmed_at?.toISOString(),
        completed_at: populatedDonation?.completed_at?.toISOString(),
        created_at: populatedDonation?.created_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Update donation status error:', error);
      res.status(500).json({ message: 'Server error updating donation status' });
    }
  }
);

// ========== Donation Reasons Management ==========

// @route   GET /api/admin/reasons
// @desc    Get all donation reasons
// @access  Private (Admin)
router.get('/reasons', async (req: express.Request, res: Response) => {
  try {
    const reasons = await DonationReason.find()
      .sort({ created_at: -1 })
      .lean();

    res.json(reasons.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      description: r.description,
      is_active: r.is_active,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    })));
  } catch (error: any) {
    console.error('Get reasons error:', error);
    res.status(500).json({ message: 'Server error fetching reasons' });
  }
});

// @route   POST /api/admin/reasons
// @desc    Create a new donation reason
// @access  Private (Admin)
router.post(
  '/reasons',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { title, description } = req.body;
      const reason = await DonationReason.create({ title, description });

      res.status(201).json({
        id: reason._id.toString(),
        title: reason.title,
        description: reason.description,
        is_active: reason.is_active,
        created_at: reason.created_at.toISOString(),
        updated_at: reason.updated_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Create reason error:', error);
      res.status(500).json({ message: 'Server error creating reason' });
    }
  }
);

// @route   PATCH /api/admin/reasons/:id
// @desc    Update a donation reason
// @access  Private (Admin)
router.patch(
  '/reasons/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('is_active').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { title, description, is_active } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;

      const reason = await DonationReason.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!reason) {
        return res.status(404).json({ message: 'Reason not found' });
      }

      res.json({
        id: reason._id.toString(),
        title: reason.title,
        description: reason.description,
        is_active: reason.is_active,
        created_at: reason.created_at.toISOString(),
        updated_at: reason.updated_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Update reason error:', error);
      res.status(500).json({ message: 'Server error updating reason' });
    }
  }
);

// @route   DELETE /api/admin/reasons/:id
// @desc    Delete a donation reason
// @access  Private (Admin)
router.delete('/reasons/:id', async (req: AuthRequest, res: Response) => {
  try {
    const reason = await DonationReason.findByIdAndDelete(req.params.id);

    if (!reason) {
      return res.status(404).json({ message: 'Reason not found' });
    }

    res.json({ message: 'Reason deleted successfully' });
  } catch (error: any) {
    console.error('Delete reason error:', error);
    res.status(500).json({ message: 'Server error deleting reason' });
  }
});

// ========== Communication Methods Management ==========

// @route   GET /api/admin/communication-methods
// @desc    Get all communication methods
// @access  Private (Admin)
router.get('/communication-methods', async (req: express.Request, res: Response) => {
  try {
    const methods = await CommunicationMethod.find()
      .sort({ order: 1, created_at: -1 })
      .lean();

    res.json(methods.map((m) => ({
      id: m._id.toString(),
      name: m.name,
      type: m.type,
      value: m.value,
      icon: m.icon,
      is_active: m.is_active,
      order: m.order,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString(),
    })));
  } catch (error: any) {
    console.error('Get communication methods error:', error);
    res.status(500).json({ message: 'Server error fetching communication methods' });
  }
});

// @route   POST /api/admin/communication-methods
// @desc    Create a new communication method
// @access  Private (Admin)
router.post(
  '/communication-methods',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('type')
      .isIn(['email', 'telegram', 'whatsapp', 'phone', 'other'])
      .withMessage('Invalid type'),
    body('value').trim().notEmpty().withMessage('Value is required'),
    body('icon').optional().trim(),
    body('order').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { name, type, value, icon, order } = req.body;
      const method = await CommunicationMethod.create({
        name,
        type,
        value,
        icon,
        order: order || 0,
      });

      res.status(201).json({
        id: method._id.toString(),
        name: method.name,
        type: method.type,
        value: method.value,
        icon: method.icon,
        is_active: method.is_active,
        order: method.order,
        created_at: method.created_at.toISOString(),
        updated_at: method.updated_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Create communication method error:', error);
      res.status(500).json({ message: 'Server error creating communication method' });
    }
  }
);

// @route   PATCH /api/admin/communication-methods/:id
// @desc    Update a communication method
// @access  Private (Admin)
router.patch(
  '/communication-methods/:id',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('type').optional().isIn(['email', 'telegram', 'whatsapp', 'phone', 'other']),
    body('value').optional().trim().notEmpty().withMessage('Value cannot be empty'),
    body('icon').optional().trim(),
    body('is_active').optional().isBoolean(),
    body('order').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { name, type, value, icon, is_active, order } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (type !== undefined) updateData.type = type;
      if (value !== undefined) updateData.value = value;
      if (icon !== undefined) updateData.icon = icon;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (order !== undefined) updateData.order = order;

      const method = await CommunicationMethod.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!method) {
        return res.status(404).json({ message: 'Communication method not found' });
      }

      res.json({
        id: method._id.toString(),
        name: method.name,
        type: method.type,
        value: method.value,
        icon: method.icon,
        is_active: method.is_active,
        order: method.order,
        created_at: method.created_at.toISOString(),
        updated_at: method.updated_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Update communication method error:', error);
      res.status(500).json({ message: 'Server error updating communication method' });
    }
  }
);

// @route   DELETE /api/admin/communication-methods/:id
// @desc    Delete a communication method
// @access  Private (Admin)
router.delete('/communication-methods/:id', async (req: AuthRequest, res: Response) => {
  try {
    const method = await CommunicationMethod.findByIdAndDelete(req.params.id);

    if (!method) {
      return res.status(404).json({ message: 'Communication method not found' });
    }

    res.json({ message: 'Communication method deleted successfully' });
  } catch (error: any) {
    console.error('Delete communication method error:', error);
    res.status(500).json({ message: 'Server error deleting communication method' });
  }
});

// Payment Methods Management
// @route   GET /api/admin/payment-methods
// @desc    Get all payment methods
// @access  Private (Admin)
router.get('/payment-methods', async (req: express.Request, res: Response) => {
  try {
    const methods = await PaymentMethod.find()
      .sort({ order: 1, created_at: -1 })
      .lean();

    const formattedMethods = methods.map(method => ({
      id: method._id.toString(),
      name: method.name,
      type: method.type,
      label: method.label,
      requires_code: method.requires_code,
      requires_receipt: method.requires_receipt,
      requires_address: method.requires_address,
      requires_email: method.requires_email,
      icon: method.icon,
      description: method.description,
      caution_note: method.caution_note,
      is_active: method.is_active,
      order: method.order,
      created_at: method.created_at.toISOString(),
      updated_at: method.updated_at.toISOString(),
    }));

    res.json(formattedMethods);
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error fetching payment methods' });
  }
});

// @route   POST /api/admin/payment-methods
// @desc    Create a new payment method
// @access  Private (Admin)
router.post('/payment-methods', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type').isIn(['gift_card', 'bitcoin', 'paypal', 'other']).withMessage('Invalid payment type'),
  body('label').trim().notEmpty().withMessage('Label is required'),
  body('requires_code').isBoolean().withMessage('Requires code must be boolean'),
  body('requires_receipt').isBoolean().withMessage('Requires receipt must be boolean'),
  body('requires_address').isBoolean().withMessage('Requires address must be boolean'),
  body('requires_email').isBoolean().withMessage('Requires email must be boolean'),
  body('icon').optional().isString(),
  body('description').optional().isLength({ max: 500 }),
  body('caution_note').optional().isLength({ max: 1000 }),
  body('order').optional().isInt({ min: 0 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { 
      name, 
      type, 
      label, 
      requires_code, 
      requires_receipt, 
      requires_address, 
      requires_email,
      icon,
      description,
      caution_note,
      order
    } = req.body;

    const method = await PaymentMethod.create({
      name,
      type,
      label,
      requires_code,
      requires_receipt,
      requires_address,
      requires_email,
      icon,
      description,
      caution_note,
      order: order || 0,
    });

    // Log activity
    await ActivityLog.create({
      user_id: req.user!._id,
      action: 'CREATE_PAYMENT_METHOD',
      details: `Created payment method: ${name}`,
      ip_address: req.ip,
    });

    res.status(201).json({
      id: method._id.toString(),
      name: method.name,
      type: method.type,
      label: method.label,
      requires_code: method.requires_code,
      requires_receipt: method.requires_receipt,
      requires_address: method.requires_address,
      requires_email: method.requires_email,
      icon: method.icon,
      description: method.description,
      caution_note: method.caution_note,
      is_active: method.is_active,
      order: method.order,
      created_at: method.created_at.toISOString(),
      updated_at: method.updated_at.toISOString(),
    });
  } catch (error: any) {
    console.error('Create payment method error:', error);
    res.status(500).json({ message: 'Server error creating payment method' });
  }
});

// @route   PATCH /api/admin/payment-methods/:id
// @desc    Update a payment method
// @access  Private (Admin)
router.patch('/payment-methods/:id', [
  body('name').optional().trim().notEmpty().withMessage('Name is required'),
  body('type').optional().isIn(['gift_card', 'bitcoin', 'paypal', 'other']).withMessage('Invalid payment type'),
  body('label').optional().trim().notEmpty().withMessage('Label is required'),
  body('requires_code').optional().isBoolean().withMessage('Requires code must be boolean'),
  body('requires_receipt').optional().isBoolean().withMessage('Requires receipt must be boolean'),
  body('requires_address').optional().isBoolean().withMessage('Requires address must be boolean'),
  body('requires_email').optional().isBoolean().withMessage('Requires email must be boolean'),
  body('icon').optional().isString(),
  body('description').optional().isLength({ max: 500 }),
  body('caution_note').optional().isLength({ max: 1000 }),
  body('order').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.params;
    
    const { 
      name, 
      type, 
      label, 
      requires_code, 
      requires_receipt, 
      requires_address, 
      requires_email,
      icon,
      description,
      caution_note,
      order,
      is_active
    } = req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (label !== undefined) updateData.label = label;
    if (requires_code !== undefined) updateData.requires_code = requires_code;
    if (requires_receipt !== undefined) updateData.requires_receipt = requires_receipt;
    if (requires_address !== undefined) updateData.requires_address = requires_address;
    if (requires_email !== undefined) updateData.requires_email = requires_email;
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (caution_note !== undefined) updateData.caution_note = caution_note;
    if (order !== undefined) updateData.order = order;
    if (is_active !== undefined) updateData.is_active = is_active;

    const method = await PaymentMethod.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!method) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // Log activity
    await ActivityLog.create({
      user_id: req.user!._id,
      action: 'UPDATE_PAYMENT_METHOD',
      details: `Updated payment method: ${method.name}`,
      ip_address: req.ip,
    });

    res.json({
      id: method._id.toString(),
      name: method.name,
      type: method.type,
      label: method.label,
      requires_code: method.requires_code,
      requires_receipt: method.requires_receipt,
      requires_address: method.requires_address,
      requires_email: method.requires_email,
      icon: method.icon,
      description: method.description,
      caution_note: method.caution_note,
      is_active: method.is_active,
      order: method.order,
      created_at: method.created_at.toISOString(),
      updated_at: method.updated_at.toISOString(),
    });
  } catch (error: any) {
    console.error('Update payment method error:', error);
    res.status(500).json({ message: 'Server error updating payment method' });
  }
});

// @route   DELETE /api/admin/payment-methods/:id
// @desc    Delete a payment method
// @access  Private (Admin)
router.delete('/payment-methods/:id', async (req: AuthRequest, res: Response) => {
  try {
    const method = await PaymentMethod.findByIdAndDelete(req.params.id);

    if (!method) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    // Log activity
    await ActivityLog.create({
      user_id: req.user!._id,
      action: 'DELETE_PAYMENT_METHOD',
      details: `Deleted payment method: ${method.name}`,
      ip_address: req.ip,
    });

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error: any) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Server error deleting payment method' });
  }
});

export default router;

