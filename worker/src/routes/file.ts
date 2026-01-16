// File routes - File management (listing, upload, download)
import mime from 'mime';
import { Hono } from 'hono';
import { eq, like, desc, and } from 'drizzle-orm';
import { getDb, filesTable, type FileRecord } from '../db';
import { success, errors } from '../utils/response';
import type { Env } from '../types';

const file = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

/**
 * GET /file - List files
 */
file.get('/', async (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const type = c.req.query('type'); // image, video, doc, etc.
    const db = getDb(c.env);

    const offset = (page - 1) * limit;

    // Build query based on type filter
    let mimePrefix: string | null = null;
    if (type) {
        const t = type.toLowerCase();
        mimePrefix = t === 'doc' ? 'application/' : ['image', 'video', 'audio'].includes(t) ? `${t}/` : null;
    }

    let filesQuery = db.select().from(filesTable);
    if (mimePrefix) {
        filesQuery = filesQuery.where(like(filesTable.mime_type, `${mimePrefix}%`)) as typeof filesQuery;
    }

    const files = await filesQuery
        .orderBy(desc(filesTable.created_at))
        .limit(limit)
        .offset(offset);

    return success(c, files);
});

/**
 * GET /file/:file_id - Download file
 */
file.get('/:file_id', async (c) => {
    const fileId = c.req.param('file_id');
    const userId = c.get('userId');
    const db = getDb(c.env);

    // Get file metadata with ownership check
    const fileRecord = await db.select()
        .from(filesTable)
        .where(and(eq(filesTable.id, fileId), eq(filesTable.user_id, userId)))
        .get();

    if (!fileRecord) {
        return errors.notFound(c, 'File not found');
    }

    // Get file from R2
    const object = await c.env.R2.get(fileRecord.storage_key);

    if (!object) {
        return errors.notFound(c, 'File not found in storage');
    }

    // Return file stream
    const headers = new Headers();
    headers.set('Content-Type', fileRecord.mime_type || 'application/octet-stream');
    headers.set('Content-Length', fileRecord.size.toString());
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.file_name)}"`);

    return new Response(object.body, { headers });
});

/**
 * POST /file/check - Pre-upload check for instant upload (秒传)
 */
file.post('/check', async (c) => {
    const body = await c.req.json<FileRecord>();
    const db = getDb(c.env);

    if (!body.hash) {
        return errors.badRequest(c, 'Hash is required');
    }

    const existing = await db.select().from(filesTable).where(eq(filesTable.hash, body.hash)).get();

    return success(c, existing);
});

/**
 * POST /file - Upload file
 * Form Data:
 *   - file: (Binary) 文件
 *   - hash: (String) 文件 SHA-256 哈希
 */
file.post('/', async (c) => {
    const formData = await c.req.formData();
    const uploadFile = formData.get('file') as File | null;
    const hash = formData.get('hash') as string | null;
    const db = getDb(c.env);

    if (!uploadFile) {
        return errors.badRequest(c, 'File is required');
    }

    if (!hash) {
        return errors.badRequest(c, 'Hash is required for integrity check');
    }



    if (uploadFile.size > c.env.MAX_FILE_SIZE_BYTES) {
        return errors.payloadTooLarge(c, 'File size exceeds limit');
    }

    const mimeType = uploadFile.type || mime.getType(uploadFile.name) || 'application/octet-stream';

    // Generate file ID and storage key
    const fileId = crypto.randomUUID();
    const storageKey = `${fileId}/${uploadFile.name}`;

    // Upload to R2
    const arrayBuffer = await uploadFile.arrayBuffer();
    await c.env.R2.put(storageKey, arrayBuffer, {
        httpMetadata: {
            contentType: mimeType,
        },
    });

    // Save file metadata to D1
    const now = new Date().toISOString();
    const userId = c.get('userId');
    const fileRecord: FileRecord = {
        id: fileId,
        user_id: userId,
        hash,
        file_name: uploadFile.name,
        size: uploadFile.size,
        mime_type: mimeType,
        storage_key: storageKey,
        created_at: now,
    };
    await db.insert(filesTable).values(fileRecord);



    return success(c, fileRecord);
});

/**
 * DELETE /file/:file_id - Delete file
 */
file.delete('/:file_id', async (c) => {
    const fileId = c.req.param('file_id');
    const userId = c.get('userId');
    const db = getDb(c.env);

    // Get file metadata with ownership check
    const fileRecord = await db.select()
        .from(filesTable)
        .where(and(eq(filesTable.id, fileId), eq(filesTable.user_id, userId)))
        .get();

    if (!fileRecord) {
        return errors.notFound(c, 'File not found');
    }

    // Delete from R2
    await c.env.R2.delete(fileRecord.storage_key);

    // Delete from D1
    await db.delete(filesTable).where(eq(filesTable.id, fileId));

    return success(c, null);
});

export default file;
