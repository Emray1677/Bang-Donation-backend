import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Donation from '../models/Donation';

interface AuthenticatedSocket {
  userId?: string;
  user?: any;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware for socket connections
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('JWT_SECRET not configured'));
      }
      const decoded = jwt.verify(token, secret) as { id: string };
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: any) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle donation creation
    socket.on('donation:create', async (data: any) => {
      try {
        const donation = await Donation.create({
          user_id: socket.userId,
          ...data,
          status: 'pending',
        });

        // Emit to the user who created the donation
        socket.emit('donation:created', {
          id: donation._id,
          amount: donation.amount,
          status: donation.status,
          created_at: donation.created_at,
        });

        // Broadcast to all admins
        io.to('admin').emit('donation:new', {
          id: donation._id,
          user_id: socket.userId,
          amount: donation.amount,
          created_at: donation.created_at,
        });

        // Update stats for all connected clients
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
        ]);

        io.emit('stats:update', {
          total_raised: stats[0]?.total_raised || 0,
          total_supporters: stats[0]?.unique_donors?.length || 0,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to create donation' });
      }
    });

    // Handle donation status updates (admin only)
    socket.on('donation:update-status', async (data: { donationId: string; status: string }) => {
      try {
        if (socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        const donation = await Donation.findByIdAndUpdate(
          data.donationId,
          { status: data.status },
          { new: true }
        );

        if (donation) {
          // Notify the user who made the donation
          io.to(`user:${donation.user_id}`).emit('donation:status-updated', {
            id: donation._id,
            status: donation.status,
          });

          // Broadcast stats update
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
                unique_donors: { $addToSet: '$user_id' },
              },
            },
          ]);

          io.emit('stats:update', {
            total_raised: stats[0]?.total_raised || 0,
            total_supporters: stats[0]?.unique_donors?.length || 0,
          });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to update donation status' });
      }
    });

    // Join admin room if user is admin
    if (socket.user.role === 'admin') {
      socket.join('admin');
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

