import express, { Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import Donation from '../models/Donation';
import User from '../models/User';
import CommunicationMethod from '../models/CommunicationMethod';
import PaymentMethod from '../models/PaymentMethod';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// @route   POST /api/donations
// @desc    Create a new donation
// @access  Private
router.post(
  '/',
  authenticate,
  [
    body('amount')
      .isFloat({ min: 500 })
      .withMessage('Minimum donation amount is $500'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters'),
    body('is_anonymous')
      .optional()
      .isBoolean()
      .withMessage('is_anonymous must be a boolean'),
    body('reason_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid reason ID'),
    body('donation_method')
      .optional()
      .isString()
      .withMessage('Donation method must be a string'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { amount, message, is_anonymous, reason_id, payment_method_id, gift_card_code, receipt_image, wallet_address, paypal_email } = req.body;

      const donation = await Donation.create({
        user_id: req.user!._id,
        amount,
        message: message || undefined,
        is_anonymous: is_anonymous || false,
        reason_id: reason_id || undefined,
        payment_method_id: payment_method_id || undefined,
        gift_card_code: gift_card_code || undefined,
        receipt_image: receipt_image || undefined,
        wallet_address: wallet_address || undefined,
        paypal_email: paypal_email || undefined,
        status: 'pending',
      });

      // Get user info and reason for response
      const user = await User.findById(donation.user_id).select('full_name email avatar_url created_at updated_at').lean();
      const populatedDonation = await Donation.findById(donation._id)
        .populate('reason_id', 'title')
        .lean();

      res.status(201).json({
        id: donation._id.toString(),
        user_id: donation.user_id.toString(),
        amount: donation.amount,
        status: donation.status,
        payment_method_id: donation.payment_method_id?.toString(),
        reason_id: donation.reason_id?.toString(),
        message: donation.message,
        is_anonymous: donation.is_anonymous,
        gift_card_code: donation.gift_card_code,
        receipt_image: donation.receipt_image,
        wallet_address: donation.wallet_address,
        paypal_email: donation.paypal_email,
        created_at: donation.created_at.toISOString(),
        confirmed_at: donation.confirmed_at?.toISOString(),
        profiles: user ? {
          id: user._id.toString(),
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        } : undefined,
      });
    } catch (error: any) {
      console.error('Create donation error:', error);
      res.status(500).json({ message: 'Server error creating donation' });
    }
  }
);

// @route   GET /api/donations/payment-methods
// @desc    Get active payment methods for public view
// @access  Public
router.get('/payment-methods', async (req: express.Request, res: Response) => {
  try {
    const methods = await PaymentMethod.find({ is_active: true })
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
      receiving_account: method.receiving_account,
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

// @route   GET /api/donations/communication-methods
// @desc    Get active communication methods for public view
// @access  Public
router.get('/communication-methods', async (req: express.Request, res: Response) => {
  try {
    const methods = await CommunicationMethod.find({ is_active: true })
      .sort({ order: 1, created_at: -1 })
      .lean();

    const formattedMethods = methods.map(method => ({
      id: method._id.toString(),
      name: method.name,
      type: method.type,
      value: method.value,
      icon: method.icon,
      is_active: method.is_active,
      order: method.order,
      created_at: method.created_at.toISOString(),
      updated_at: method.updated_at.toISOString(),
    }));

    res.json(formattedMethods);
  } catch (error: any) {
    console.error('Get communication methods error:', error);
    res.status(500).json({ message: 'Server error fetching communication methods' });
  }
});

// @route   GET /api/donations/my-stats
// @desc    Get current user's donation statistics
// @access  Private
router.get('/my-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    
    // Get all user's donations
    const donations = await Donation.find({ user_id: userId }).lean();
    
    // Calculate stats by status
    const confirmed = donations.filter(d => d.status === 'confirmed' || d.status === 'completed');
    const pending = donations.filter(d => d.status === 'pending');
    const cancelled = donations.filter(d => d.status === 'cancelled');
    
    const totalContributed = confirmed.reduce((sum, d) => sum + d.amount, 0);
    const pendingAmount = pending.reduce((sum, d) => sum + d.amount, 0);
    
    res.json({
      total_contributed: totalContributed,
      pending_amount: pendingAmount,
      confirmed_count: confirmed.length,
      pending_count: pending.length,
      cancelled_count: cancelled.length,
      total_donations: donations.length,
    });
  } catch (error: any) {
    console.error('Get my donation stats error:', error);
    res.status(500).json({ message: 'Server error fetching donation stats' });
  }
});

// @route   GET /api/donations/my
// @desc    Get current user's donations
// @access  Private
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const donations = await Donation.find({ user_id: req.user!._id })
      .sort({ created_at: -1 })
      .lean();

    const formattedDonations = donations.map((donation) => ({
      id: donation._id.toString(),
      user_id: donation.user_id.toString(),
      amount: donation.amount,
      status: donation.status,
      payment_method_id: donation.payment_method_id?.toString(),
      reason_id: donation.reason_id?.toString(),
      message: donation.message,
      is_anonymous: donation.is_anonymous,
      gift_card_code: donation.gift_card_code,
      receipt_image: donation.receipt_image,
      wallet_address: donation.wallet_address,
      paypal_email: donation.paypal_email,
      created_at: donation.created_at.toISOString(),
      confirmed_at: donation.confirmed_at?.toISOString(),
    }));

    res.json(formattedDonations);
  } catch (error: any) {
    console.error('Get my donations error:', error);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
});

// @route   GET /api/donations/stats
// @desc    Get donation statistics
// @access  Public
router.get('/stats', async (req: express.Request, res: Response) => {
  try {
    const stats = await Donation.aggregate([
      {
        $match: {
          status: { $in: ['confirmed', 'completed'] },
        },
      },
      {
        $group: {
          _id: null,
          total_raised: { $sum: '$amount' },
          total_donations: { $sum: 1 },
          unique_donors: { $addToSet: '$user_id' },
        },
      },
      {
        $project: {
          _id: 0,
          total_raised: 1,
          total_donations: 1,
          total_supporters: { $size: '$unique_donors' },
        },
      },
    ]);

    const result = stats[0] || {
      total_raised: 0,
      total_donations: 0,
      total_supporters: 0,
    };

    res.json(result);
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// @route   GET /api/donations/top-supporters
// @desc    Get top supporters with pagination
// @access  Public
router.get(
  '/top-supporters',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  async (req: express.Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Aggregate top supporters
      const topSupportersRaw = await Donation.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'completed'] },
          },
        },
        {
          $group: {
            _id: '$user_id',
            total_amount: { $sum: '$amount' },
            is_anonymous: { $first: '$is_anonymous' },
          },
        },
        {
          $sort: { total_amount: -1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]);

      // Format the response
      const topSupporters = topSupportersRaw.map((item) => ({
        user_id: item._id.toString(),
        full_name: item.is_anonymous
          ? 'Anonymous'
          : item.user?.full_name || 'Anonymous',
        total_amount: item.total_amount,
        is_anonymous: item.is_anonymous,
      }));

      // Get total count for pagination
      const totalCount = await Donation.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'completed'] },
          },
        },
        {
          $group: {
            _id: '$user_id',
          },
        },
        {
          $count: 'total',
        },
      ]);

      const total = totalCount[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      res.json({
        supporters: topSupporters,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error: any) {
      console.error('Get top supporters error:', error);
      res.status(500).json({ message: 'Server error fetching top supporters' });
    }
  }
);

// @route   GET /api/donations
// @desc    Get all donations (admin only or with filters)
// @access  Private
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (status) {
      query.status = status;
    }

    // Non-admin users can only see their own donations
    if (req.user!.role !== 'admin') {
      query.user_id = req.user!._id;
    }

    const donations = await Donation.find(query)
      .populate('user_id', 'full_name email avatar_url')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Donation.countDocuments(query);

    res.json({
      donations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
});

// @route   PATCH /api/donations/:id/status
// @desc    Update donation status (admin only)
// @access  Private (Admin)
router.patch(
  '/:id/status',
  authenticate,
  [
    body('status')
      .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      // Check if user is admin
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

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

      res.json({
        id: donation._id,
        status: donation.status,
        confirmed_at: donation.confirmed_at,
        completed_at: donation.completed_at,
      });
    } catch (error: any) {
      console.error('Update donation status error:', error);
      res.status(500).json({ message: 'Server error updating donation' });
    }
  }
);

export default router;

