import { Hono } from 'hono';
import type { Env } from '../types';

const ws = new Hono<{ Bindings: Env }>();

ws.get('/ws', async (c) => {
    const userId = c.req.query('userId');
    const token = c.req.query('token');
    if (!userId || !token) {
        return c.json({ error: 'User ID and token are required' }, 400);
    }
    const doId = c.env.DO.idFromName(userId);
    const stub = c.env.DO.get(doId);
    return stub.fetch(c.req.raw);
});

export default ws;