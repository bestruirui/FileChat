import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { FileRecord } from './file';

// ============ Types ============

/**
 * 传输记录
 */
export interface Transfer {
    id: string;
    sender_id: string;
    receiver_id: string;
    mime_type: string | null;
    text_content: string | null;
    file_id: string | null;
    created_at: string | null;
}

/**
 * 传输记录（含文件信息）
 */
export interface TransferWithFile {
    transfers: Transfer;
    files: FileRecord | null;
}

/**
 * 传输历史查询参数
 */
export interface HistoryParams {
    sender_id: string;
    receiver_id: string;
    page?: number;
    limit?: number;
}

// ============ Hooks ============

/**
 * 获取传输历史 Hook
 * 
 * @example
 * const { data: history, isLoading } = useHistory({
 *   sender_id: 'device-a',
 *   receiver_id: 'device-b',
 *   page: 1,
 *   limit: 50
 * });
 */
export function useHistory(params: HistoryParams) {
    return useQuery({
        queryKey: ['history', params],
        queryFn: async () => {
            return apiClient.post<TransferWithFile[]>('/api/history', params);
        },
        enabled: !!params.sender_id && !!params.receiver_id,
    });
}
