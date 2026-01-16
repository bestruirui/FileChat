import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

// ============ Types ============

/**
 * 系统配置响应
 */
export interface ConfigResponse {
    server_version: string;
    build_time: string;
    commit_id: string;
    github_repo: string;
    features: {
        r2_storage_enabled: boolean;
        max_file_size_bytes: number;
    };
}

// ============ Hooks ============

/**
 * 获取系统配置 Hook
 * 
 * @example
 * const { data: config, isLoading } = useConfig();
 * if (isLoading) return <Loading />;
 * console.log(config.server_version);
 */
export function useConfig() {
    return useQuery({
        queryKey: ['config'],
        queryFn: async () => {
            return apiClient.get<ConfigResponse>('/api/config');
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}
