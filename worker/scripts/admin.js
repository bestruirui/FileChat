import { pbkdf2Sync, randomBytes, randomUUID } from 'crypto';
import { execSync } from 'child_process';

/**
 * Hash password using PBKDF2 (compatible with password.ts)
 */
function hashPassword(password) {
    const salt = randomBytes(16);
    const derivedKey = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const combined = Buffer.concat([salt, derivedKey]);
    return combined.toString('base64');
}

const adminUsername = process.env.ADMIN || "admin";
const databaseName = 'filechat';

if (adminUsername) {
    try {
        // 检查用户是否存在
        const checkResult = execSync(
            `npx wrangler d1 execute ${databaseName} --remote --command "SELECT id FROM users WHERE username = '${adminUsername}'" --json`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );

        const results = JSON.parse(checkResult);
        const userExists = results[0]?.results?.length > 0;

        if (!userExists) {
            // 创建管理员用户
            const userId = randomUUID();
            const passwordHash = hashPassword('admin');

            execSync(
                `npx wrangler d1 execute ${databaseName} --remote --command "INSERT INTO users (id, username, password_hash) VALUES ('${userId}', '${adminUsername}', '${passwordHash}')"`,
                { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
            );
            console.log(`✓ 创建管理员用户: ${adminUsername}`);
        } else {
            console.log(`✓ 管理员用户已存在: ${adminUsername}`);
        }
    } catch (e) {
        console.warn(`⚠ 无法检查/创建管理员用户: ${e.message}`);
    }
} else {
    console.log('⚠ 未设置 ADMIN 环境变量，跳过管理员用户创建');
}