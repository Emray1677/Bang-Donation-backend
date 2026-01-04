import { Request, Response, NextFunction } from 'express';
import ActivityLog from '../models/ActivityLog';
import { AuthRequest } from './auth';

export const logActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to capture response
  res.json = function (body: any) {
    // Log activity after response is sent
    setImmediate(async () => {
      try {
        const action = `${req.method} ${req.path}`;
        const resourceType = req.path.split('/')[2] || 'unknown';
        
        await ActivityLog.create({
          user_id: req.user?._id,
          action,
          resource_type: resourceType,
          resource_id: body?.id || body?._id,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.get('user-agent'),
        });
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    });

    return originalJson(body);
  };

  next();
};

