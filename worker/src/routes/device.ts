// Device routes - Device management for registered users
import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, devicesTable } from '../db';
import { success, errors } from '../utils/response';
import type { Env } from '../types';

const device = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

/**
 * GET /device - Get user's device list
 */
device.get('/', async (c) => {
    const userId = c.get('userId');
    const db = getDb(c.env);

    const devices = await db.select()
        .from(devicesTable)
        .where(eq(devicesTable.user_id, userId))
        .orderBy(desc(devicesTable.active_at));

    return success(c, devices);
});

/**
 * POST /device - Register a new device
 */
device.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<{ device_id: string; device_name: string; device_emoji: string }>();
    const db = getDb(c.env);

    if (!body.device_id || !body.device_emoji || !body.device_name) {
        return errors.badRequest(c, 'device_id, device_emoji and device_name are required');
    }

    // Insert directly, use onConflictDoNothing to handle duplicates
    const result = await db.insert(devicesTable)
        .values({
            id: body.device_id,
            user_id: userId,
            device_name: body.device_name,
            device_emoji: body.device_emoji,
        })
        .onConflictDoNothing();

    if (result.meta.changes === 0) {
        return errors.conflict(c, 'Device already exists');
    }

    return success(c, null);
});

/**
 * PUT /device/:device_id - Update device name
 */
device.put('/:device_id', async (c) => {
    const userId = c.get('userId');
    const deviceId = c.req.param('device_id');
    const body = await c.req.json<{ device_name: string; device_emoji: string }>();
    const db = getDb(c.env);

    if (!body.device_name && !body.device_emoji) {
        return errors.badRequest(c, 'device_name or device_emoji is required');
    }

    // Update device directly
    const result = await db.update(devicesTable)
        .set({
            device_name: body.device_name,
            device_emoji: body.device_emoji,
        })
        .where(and(eq(devicesTable.id, deviceId), eq(devicesTable.user_id, userId)));

    if (result.meta.changes === 0) {
        return errors.notFound(c, 'Device not found');
    }

    return success(c, null);
});

/**
 * DELETE /device/:device_id - Remove a device
 */
device.delete('/:device_id', async (c) => {
    const userId = c.get('userId');
    const deviceId = c.req.param('device_id');
    const db = getDb(c.env);

    // Delete device directly
    const result = await db.delete(devicesTable).where(and(eq(devicesTable.id, deviceId), eq(devicesTable.user_id, userId)));

    if (result.meta.changes === 0) {
        return errors.notFound(c, 'Device not found');
    }

    return success(c, null);
});

export default device;
