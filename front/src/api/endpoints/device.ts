import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// ============ Types ============

/**
 * 设备信息
 */
export interface Device {
    id: string;
    user_id: string;
    device_name: string;
    device_emoji: string;
    last_active_at: string | null;
    created_at: string | null;
}

/**
 * 注册设备请求
 */
export interface RegisterDeviceRequest {
    device_id: string;
    device_name: string;
    device_emoji: string;
}

/**
 * 更新设备请求
 */
export interface UpdateDeviceRequest {
    device_name: string;
    device_emoji: string;
}

// ============ Hooks ============

/**
 * 获取设备列表 Hook
 * 
 * @example
 * const { data: devices, isLoading } = useDevices();
 */
export function useDevices() {
    return useQuery({
        queryKey: ['devices'],
        queryFn: async () => {
            return apiClient.get<Device[]>('/api/device');
        },
    });
}

/**
 * 注册设备 Hook
 * 
 * @example
 * const registerDevice = useRegisterDevice();
 * registerDevice.mutate({ device_id: 'xxx', device_name: 'My Phone', device_emoji: '📱' });
 */
export function useRegisterDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: RegisterDeviceRequest) => {
            return apiClient.post<null>('/api/device', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        },
        onError: (error) => {
            console.error('注册设备失败:', error);
        },
    });
}

/**
 * 更新设备 Hook
 * 
 * @example
 * const updateDevice = useUpdateDevice();
 * updateDevice.mutate({ deviceId: 'xxx', data: { device_name: 'New Name' } });
 */
export function useUpdateDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ deviceId, data }: { deviceId: string; data: UpdateDeviceRequest }) => {
            return apiClient.put<null>(`/api/device/${deviceId}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        },
        onError: (error) => {
            console.error('更新设备失败:', error);
        },
    });
}

/**
 * 删除设备 Hook
 * 
 * @example
 * const deleteDevice = useDeleteDevice();
 * deleteDevice.mutate('device-id');
 */
export function useDeleteDevice() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (deviceId: string) => {
            return apiClient.delete<null>(`/api/device/${deviceId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
        },
        onError: (error) => {
            console.error('删除设备失败:', error);
        },
    });
}
