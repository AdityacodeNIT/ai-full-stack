import express from 'express';
import { requireAuth, getAuth, clerkClient } from '@clerk/express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { DashBoardStatistics, getAllUsers, getAnalytics, getUserInfo, getViolations, updateUserRole } from '../controllers/admin.js';

const router = express.Router();


// Get dashboard statistics
router.get('/stats', requireAuth(), requireAdmin,DashBoardStatistics);

// Get all users with their interview stats
router.get('/users', requireAuth(), requireAdmin,getAllUsers);

// Update user role (syncs to both Clerk and MongoDB)
router.patch('/users/:clerkUserId/role', requireAuth(), requireAdmin,updateUserRole);

// Get detailed user info with all interviews
router.get('/users/:clerkUserId', requireAuth(), requireAdmin,getUserInfo);

// Get all interviews with violations
router.get('/violations', requireAuth(),requireAdmin,getViolations);

// Get performance analytics
router.get('/analytics', requireAuth(),requireAdmin,getAnalytics);

export default router;
