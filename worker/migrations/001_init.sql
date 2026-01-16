-- 用户表 (Users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    settings TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 设备表 (Devices)
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,    -- UUID
    user_id TEXT,
    device_name TEXT NOT NULL,
    device_emoji TEXT NOT NULL,
    active_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 文件元数据表 (Files)
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY, -- UUID
    user_id TEXT,
    hash TEXT NOT NULL,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT,
    storage_key TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 传输记录表 (Transfers)
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    send_user_id TEXT NOT NULL,
    send_device_id TEXT NOT NULL,
    receive_device_id TEXT NOT NULL,
    content_text TEXT,
    file_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (send_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (send_device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (receive_device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
);

-- 邀请码表 (Invitation Codes)
CREATE TABLE IF NOT EXISTS invitation_codes (
    code TEXT PRIMARY KEY,              -- 邀请码本身 (唯一主键)
    max_uses INTEGER DEFAULT 1,         -- 最大使用次数
    use_count INTEGER DEFAULT 0,        -- 已使用次数
    created_at TEXT DEFAULT (datetime('now'))
);

