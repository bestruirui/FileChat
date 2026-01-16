// User routes - Register, Login, Settings, Password and Username management
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { eq, and, ne, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../utils/password';
import { success, errors } from '../utils/response';
import { getDb, usersTable, invitationCodesTable } from '../db';
import type { Env, UserSettings, ChangePasswordRequest, ChangeUsernameRequest, DeviceMeta } from '../types';
import { getJwtSecret } from '../middleware/auth';

// Public routes (no auth required)
const publicRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /user/register - User registration
 */
publicRoutes.post('/register', async (c) => {
    const body = await c.req.json<{ username: string; password: string; invitation_code: string }>();

    if (!body.username || !body.password || !body.invitation_code) {
        return errors.badRequest(c, 'Username, password and invitation code are required');
    }

    if (body.username.length < 3 || body.username.length > 32) {
        return errors.badRequest(c, 'Username must be 3-32 characters');
    }

    if (body.password.length < 6) {
        return errors.badRequest(c, 'Password must be at least 6 characters');
    }

    const db = getDb(c.env);

    // Validate invitation code
    const inviteCode = await db.select()
        .from(invitationCodesTable)
        .where(eq(invitationCodesTable.code, body.invitation_code))
        .get();

    if (!inviteCode) {
        return errors.badRequest(c, 'Invalid invitation code');
    }

    if (inviteCode.use_count! >= inviteCode.max_uses!) {
        return errors.badRequest(c, 'Invitation code has reached maximum uses');
    }

    // Check if username already exists
    const existing = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, body.username))
        .get();

    if (existing) {
        return errors.conflict(c, 'Username already exists');
    }

    // Hash password and create user
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);

    await db.insert(usersTable).values({
        id,
        username: body.username,
        password_hash: passwordHash,
    });

    // Increment invitation code use count
    await db.update(invitationCodesTable)
        .set({ use_count: sql`use_count + 1` })
        .where(eq(invitationCodesTable.code, body.invitation_code));

    return success(c, {
        id,
        username: body.username,
    });
});

/**
 * POST /user/login - User login
 */
publicRoutes.post('/login', async (c) => {
    const body = await c.req.json<{ username: string; password: string }>();

    if (!body.username || !body.password) {
        return errors.badRequest(c, 'Username and password are required');
    }

    const db = getDb(c.env);

    // Find user
    const user = await db.select().from(usersTable).where(eq(usersTable.username, body.username)).get();

    if (!user) {
        return errors.unauthorized(c, 'Invalid username or password');
    }

    // Verify password
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
        return errors.unauthorized(c, 'Invalid username or password');
    }

    // Generate JWT token
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
    const expireAt = new Date(exp * 1000).toISOString(); // Convert to ISO 8601 format

    const token = await sign(
        {
            sub: user.id,
            username: user.username,
            exp,
        },
        getJwtSecret(c.env)
    );

    return success(c, {
        user_id: user.id,
        token,
        expire_at: expireAt,
    });
});

// Protected routes (auth required)
const protectedRoutes = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

/**
 * GET /user/settings - Get user settings
 */
protectedRoutes.get('/settings', async (c) => {
    const userId = c.get('userId');
    const db = getDb(c.env);

    const userRecord = await db.select({ settings: usersTable.settings })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .get();

    if (!userRecord) {
        return errors.notFound(c, 'User not found');
    }

    let settings: UserSettings;
    try {
        settings = JSON.parse(userRecord.settings || '{}');
    } catch {
        settings = {
            transfer_mode: 1,
            save_history: true,
            language: 'zh',
            theme: 'system',
        };
    }

    return success(c, settings);
});

/**
 * PUT /user/settings - Update user settings
 */
protectedRoutes.put('/settings', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<UserSettings>();
    const db = getDb(c.env);

    // Update settings
    await db.update(usersTable)
        .set({ settings: JSON.stringify(body) })
        .where(eq(usersTable.id, userId));

    return success(c, body);
});

/**
 * PUT /user/password - Change user password
 */
protectedRoutes.put('/password', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<ChangePasswordRequest>();
    const db = getDb(c.env);

    // Validate input
    if (!body.old_password || !body.new_password) {
        return errors.badRequest(c, 'Old password and new password are required');
    }

    if (body.new_password.length < 6) {
        return errors.badRequest(c, 'New password must be at least 6 characters');
    }

    // Get user
    const userRecord = await db.select({ password_hash: usersTable.password_hash })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .get();

    if (!userRecord) {
        return errors.notFound(c, 'User not found');
    }

    // Verify old password
    const valid = await verifyPassword(body.old_password, userRecord.password_hash);
    if (!valid) {
        return errors.unauthorized(c, 'Invalid old password');
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(body.new_password);
    await db.update(usersTable)
        .set({ password_hash: newPasswordHash })
        .where(eq(usersTable.id, userId));

    return success(c, null);
});

/**
 * PUT /user/username - Change username
 */
protectedRoutes.put('/username', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<ChangeUsernameRequest>();
    const db = getDb(c.env);

    // Validate input
    if (!body.new_username) {
        return errors.badRequest(c, 'New username is required');
    }

    if (body.new_username.length < 3 || body.new_username.length > 32) {
        return errors.badRequest(c, 'Username must be 3-32 characters');
    }

    // Check if new username already exists
    const existing = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(and(
            eq(usersTable.username, body.new_username),
            ne(usersTable.id, userId)
        ))
        .get();

    if (existing) {
        return errors.conflict(c, 'Username already exists');
    }

    // Update username
    await db.update(usersTable)
        .set({ username: body.new_username })
        .where(eq(usersTable.id, userId));

    return success(c, { username: body.new_username });
});

/**
 * POST /user/wstoken - Get WebSocket token
 */
protectedRoutes.post('/wstoken', async (c) => {
    const userId = c.req.query('userId');
    if (!userId) {
        return errors.badRequest(c, 'User ID is required');
    }
    const doId = c.env.DO.idFromName(userId);
    const stub = c.env.DO.get(doId);
    return stub.fetch(c.req.raw);
});

/**
 * POST /user/invitation - Create invitation code (admin only)
 */
protectedRoutes.post('/invitation', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<{ max_uses?: number }>();
    const db = getDb(c.env);

    if (userId !== c.env.ADMIN) {
        return errors.forbidden(c, 'Only admin can create invitation codes');
    }

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    let raw = '';
    for (let i = 0; i < 6; i++) {
        raw += chars[randomBytes[i] % chars.length];
    }
    const code = `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
    const maxUses = body.max_uses || 1;

    await db.insert(invitationCodesTable).values({
        code,
        max_uses: maxUses,
    });

    return success(c, { code, max_uses: maxUses });
});

/**
 * GET /user/invitation - List all invitation codes (admin only)
 */
protectedRoutes.get('/invitation', async (c) => {
    const userId = c.get('userId');
    const db = getDb(c.env);

    if (userId !== c.env.ADMIN) {
        return errors.forbidden(c, 'Only admin can view invitation codes');
    }

    const codes = await db.select().from(invitationCodesTable);

    return success(c, codes);
});

export { publicRoutes as userPublicRoutes, protectedRoutes as userProtectedRoutes };
