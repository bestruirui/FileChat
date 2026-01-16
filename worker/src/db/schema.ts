// Drizzle ORM Schema Definition
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============ Users Table ============
export const usersTable = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    settings: text('settings').default('{}'),
    created_at: text('created_at').default(sql`(datetime('now'))`),
});

// ============ Devices Table ============
export const devicesTable = sqliteTable('devices', {
    id: text('id').primaryKey(),
    user_id: text('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
    device_name: text('device_name').notNull(),
    device_emoji: text('device_emoji').notNull(),
    active_at: text('active_at').default(sql`(datetime('now'))`),
    created_at: text('created_at').default(sql`(datetime('now'))`),
});

// ============ Files Table ============
export const filesTable = sqliteTable('files', {
    id: text('id').primaryKey(),
    user_id: text('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
    hash: text('hash').notNull(),
    file_name: text('file_name').notNull(),
    size: integer('size').notNull(),
    mime_type: text('mime_type'),
    storage_key: text('storage_key').notNull(),
    created_at: text('created_at').default(sql`(datetime('now'))`),
});

// ============ Transfers Table ============
export const transfersTable = sqliteTable('transfers', {
    id: text('id').primaryKey(),
    send_user_id: text('send_user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
    send_device_id: text('send_device_id').notNull().references(() => devicesTable.id, { onDelete: 'cascade' }),
    receive_device_id: text('receive_device_id').notNull().references(() => devicesTable.id, { onDelete: 'cascade' }),
    content_text: text('content_text'),
    file_id: text('file_id').references(() => filesTable.id, { onDelete: 'set null' }),
    created_at: text('created_at').default(sql`(datetime('now'))`),
});

// ============ Invitation Codes Table ============
export const invitationCodesTable = sqliteTable('invitation_codes', {
    code: text('code').primaryKey(),
    max_uses: integer('max_uses').default(1),
    use_count: integer('use_count').default(0),
    created_at: text('created_at').default(sql`(datetime('now'))`),
});

// ============ Type Exports ============
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Device = typeof devicesTable.$inferSelect;
export type NewDevice = typeof devicesTable.$inferInsert;

export type FileRecord = typeof filesTable.$inferSelect;
export type NewFileRecord = typeof filesTable.$inferInsert;

export type Transfer = typeof transfersTable.$inferSelect;
export type NewTransfer = typeof transfersTable.$inferInsert;

export type InvitationCode = typeof invitationCodesTable.$inferSelect;
export type NewInvitationCode = typeof invitationCodesTable.$inferInsert;
