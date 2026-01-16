// Config routes - System configuration
import { Hono } from 'hono';
import { success } from '../utils/response';
import type { Env } from '../types';
import { CONFIG } from '../config';

const config = new Hono<{ Bindings: Env }>();

/**
 * GET /config - Get system configuration
 */
config.get('/', async (c) => {
    // Check if R2 is available
    const r2Enabled = !!c.env.R2;

    const response = {
        server_version: CONFIG.VERSION,
        build_time: CONFIG.BUILD_TIME,
        commit_id: CONFIG.COMMIT_ID,
        github_repo: CONFIG.GITHUB_REPO,
        features: {
            r2_storage_enabled: r2Enabled,
            max_file_size_bytes: c.env.MAX_FILE_SIZE_BYTES,
        },
    };

    return success(c, response);
});

export default config;
