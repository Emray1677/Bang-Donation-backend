import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// @route   GET /api/profiles/:id
// @desc    Get user profile
// @access  Public
router.get('/:id', async (req: express.Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// @route   PATCH /api/profiles/:id
// @desc    Update user profile
// @access  Private (own profile or admin)
router.patch(
  '/:id',
  authenticate,
  [
    body('full_name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters'),
    body('avatar_url')
      .optional()
      .isURL()
      .withMessage('Avatar URL must be a valid URL'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      // Check if user is updating their own profile or is admin
      if (
        req.user!._id.toString() !== req.params.id &&
        req.user!.role !== 'admin'
      ) {
        return res.status(403).json({ message: 'Not authorized to update this profile' });
      }

      const { full_name, avatar_url } = req.body;
      const updateData: any = {};

      if (full_name) updateData.full_name = full_name;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

      const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      res.json({
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error updating profile' });
    }
  }
);

export default router;

