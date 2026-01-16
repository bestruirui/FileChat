import type { User, FileRecord, Transfer } from './db/schema';

export interface UserSettings {
    transfer_mode: TransferMode;
    save_history: boolean;
    language: string;
    theme: string;
}

export enum TransferMode {
    OnlyP2P = 0,
    PreferP2P = 1,
    ForceServer = 2,
}

// Auth 
export type RegisterRequest = Pick<User, 'username'> & { password: string };
export type RegisterResponse = Pick<User, 'id' | 'username'>;
export interface LoginRequest { username: string; password: string }

export interface LoginResponse {
    token: string;
    user: Pick<User, 'id' | 'username' | 'settings'>;
}

export interface ChangePasswordRequest { old_password: string; new_password: string }
export interface ChangeUsernameRequest { new_username: string }

export interface UploadCheckResponse { exists: boolean }

export type HistoryItem = Transfer & { file: FileRecord | null };

export interface HistoryResponse {
    total: number;
    page: number;
    limit: number;
    data: HistoryItem[];
}


export interface Env {
    DB: D1Database;
    R2: R2Bucket;
    DO: DurableObjectNamespace;
    ADMIN: string;
    MAX_FILE_SIZE_BYTES: number;
    JWT_SECRET?: string;
}


export interface JWTPayload {
    sub: string; // user id
    username: string;
    exp: number;
}


export interface DeviceMeta {
    id: string;
    emoji: string;
    name: string;
}