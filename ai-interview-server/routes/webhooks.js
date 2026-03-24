import express from 'express';
import { Webhook } from 'svix';
import User from '../models/user.model.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Clerk Webhook Handler
 * Automatically creates/updates users in MongoDB when they sign up via Clerk
 */
router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    logger.log("webhook")

    if (!WEBHOOK_SECRET) {
      throw new Error('CLERK_WEBHOOK_SECRET is not set');
    }

    // Get headers
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    // Verify webhook signature
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
      evt = wh.verify(req.body.toString(), {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
      logger.error(' Webhook verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    // Handle the event
    const { type, data } = evt;

    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      
      default:
        logger.log(`Unhandled webhook type: ${type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error(' Webhook error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleUserCreated(data) {
  try {
    // Count existing users to determine role
    const userCount = await User.countDocuments();
    const role = data.public_metadata?.role || (userCount === 0 ? 'admin' : 'user');

    const user = await User.create({
      clerkUserId: data.id,
      email: data.email_addresses[0].email_address,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      role,
    });

    logger.log(` User created in MongoDB: ${user.email} with role: ${role}`);
    
    // If this is the first user and Clerk doesn't have role set, update Clerk
    if (userCount === 0 && !data.public_metadata?.role) {
      const { Webhook } = await import('svix');
      // Note: We can't update Clerk from webhook without clerkClient
      // This will be handled by /me endpoint on first login
      logger.log('ℹ️ First user - role will be set to admin on first login');
    }
  } catch (err) {
    logger.error(' Failed to create user:', err);
  }
}

async function handleUserUpdated(data) {
  try {
    await User.findOneAndUpdate(
      { clerkUserId: data.id },
      {
        email: data.email_addresses[0].email_address,
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        role: data.public_metadata?.role || 'user',
      },
      { upsert: true, new: true }
    );

    logger.log(' User updated in MongoDB:', data.email_addresses[0].email_address);
  } catch (err) {
    logger.error(' Failed to update user:', err);
  }
}

async function handleUserDeleted(data) {
  try {
    await User.findOneAndDelete({ clerkUserId: data.id });
    logger.log(' User deleted from MongoDB:', data.id);
  } catch (err) {
    logger.error(' Failed to delete user:', err);
  }
}

export default router;
