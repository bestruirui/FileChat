import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_BASE_URL } from '../client';

// ============ Types ============

/**
 * 文件信息
 */
export interface FileRecord {
    id: string;
    hash: string;
    filename: string;
    size: number;
    mime_type: string;
    storage_key: string;
    created_at: string;
}

/**
 * 文件列表查询参数
 */
export interface FileListParams {
    page?: number;
    limit?: number;
    type?: 'image' | 'video' | 'audio' | 'doc';
}

/**
 * 文件上传请求
 */
export interface UploadFileRequest {
    file: File;
    hash: string;
    sender_id: string;
    receiver_id: string;
}

/**
 * 秒传检查请求
 */
export interface CheckFileRequest {
    hash: string;
}

// ============ Hooks ============

/**
 * 获取文件列表 Hook
 * 
 * @example
 * const { data: files, isLoading } = useFiles({ page: 1, limit: 20, type: 'image' });
 */
export function useFiles(params?: FileListParams) {
    return useQuery({
        queryKey: ['files', params],
        queryFn: async () => {
            const queryParams: Record<string, string | number | boolean> = {};
            if (params?.page) queryParams.page = params.page;
            if (params?.limit) queryParams.limit = params.limit;
            if (params?.type) queryParams.type = params.type;
            return apiClient.get<FileRecord[]>('/api/file', queryParams);
        },
    });
}

/**
 * 秒传检查 Hook
 * 
 * @example
 * const checkFile = useCheckFile();
 * const existing = await checkFile.mutateAsync({ hash: 'xxx' });
 * if (existing) console.log('文件已存在，无需上传');
 */
export function useCheckFile() {
    return useMutation({
        mutationFn: async (data: CheckFileRequest) => {
            return apiClient.post<FileRecord | null>('/api/file/check', data);
        },
    });
}

/**
 * 上传文件 Hook
 * 
 * @example
 * const uploadFile = useUploadFile();
 * uploadFile.mutate({ file, hash: 'xxx', sender_id: 'a', receiver_id: 'b' });
 */
export function useUploadFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UploadFileRequest) => {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('hash', data.hash);
            formData.append('sender_id', data.sender_id);
            formData.append('receiver_id', data.receiver_id);

            // 需要使用原生 fetch，因为 FormData 不应该设置 Content-Type
            const response = await fetch(`${API_BASE_URL}/api/file`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw error;
            }

            const result = await response.json();
            return result.data as FileRecord;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['files'] });
        },
        onError: (error) => {
            console.error('上传文件失败:', error);
        },
    });
}

/**
 * 删除文件 Hook
 * 
 * @example
 * const deleteFile = useDeleteFile();
 * deleteFile.mutate('file-id');
 */
export function useDeleteFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fileId: string) => {
            return apiClient.delete<null>(`/api/file/${fileId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['files'] });
        },
        onError: (error) => {
            console.error('删除文件失败:', error);
        },
    });
}

/**
 * 获取文件下载 URL
 * 
 * @param fileId 文件 ID
 * @returns 下载 URL
 */
export function getFileDownloadUrl(fileId: string): string {
    return `${API_BASE_URL}/api/file/${fileId}`;
}
