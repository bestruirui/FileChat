// History routes - Transfer history
import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import { getDb, transfersTable, filesTable } from '../db';
import { success, errors } from '../utils/response';
import type { Env } from '../types';

const history = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

/**
 * POST /history - Get transfer history
 * Body params:
 *   - send_device_id: sender device ID (required)
 *   - receive_device_id: receiver device ID (required)
 *   - page: page number (default 1)
 *   - limit: items per page (default 50, max 100)
 */
history.post('/', async (c) => {
    const userId = c.get('userId');
    const body = await c.req.json<{
        send_device_id: string;
        receive_device_id: string;
        page?: number;
        limit?: number;
    }>();

    if (!body.send_device_id || !body.receive_device_id) {
        return errors.badRequest(c, 'send_device_id and receive_device_id are required');
    }

    const page = body.page || 1;
    const limit = Math.min(body.limit || 50, 100);
    const db = getDb(c.env);

    const offset = (page - 1) * limit;

    // Query transfers for the current user with specific device pair
    const condition = and(
        eq(transfersTable.send_user_id, userId),
        eq(transfersTable.send_device_id, body.send_device_id),
        eq(transfersTable.receive_device_id, body.receive_device_id)
    );

    // Get transfers with file info using left join
    const transfers = await db.select()
        .from(transfersTable)
        .leftJoin(filesTable, eq(transfersTable.file_id, filesTable.id))
        .where(condition)
        .orderBy(desc(transfersTable.created_at))
        .limit(limit)
        .offset(offset);

    return success(c, transfers);
});

export default history;
