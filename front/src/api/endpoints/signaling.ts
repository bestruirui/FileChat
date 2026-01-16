import { useQuery } from '@tanstack/react-query';
import { apiClient, API_BASE_URL } from '../client';

// ============ Types ============

/**
 * 房间列表响应
 */
export interface RoomResponse {
    rooms: string[];
}

// ============ Hooks ============

/**
 * 获取 WebSocket 房间列表 Hook
 * 
 * - 已登录用户：返回 ["user:{user_id}", "ip:{client_ip}"]
 * - 游客：返回 ["ip:{client_ip}"]
 * 
 * @example
 * const { data: roomData, isLoading } = useRooms();
 * console.log(roomData.rooms); // ['user:xxx', 'ip:192.168.1.1']
 */
export function useRooms() {
    return useQuery({
        queryKey: ['signaling', 'rooms'],
        queryFn: async () => {
            return apiClient.get<RoomResponse>('/api/signaling/room');
        },
    });
}

/**
 * 获取 WebSocket 连接 URL
 * 
 * @param roomId 房间 ID
 * @returns WebSocket URL
 * 
 * @example
 * const wsUrl = getWebSocketUrl('ip:192.168.1.1');
 * const ws = new WebSocket(wsUrl);
 */
export function getWebSocketUrl(roomId: string): string {
    // 将 HTTP URL 转换为 WebSocket URL
    const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
    return `${baseUrl}/api/ws?room_id=${encodeURIComponent(roomId)}`;
}
