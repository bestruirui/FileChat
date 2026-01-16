import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, setAuthStoreGetter } from '../client';

// ============ Types ============

/**
 * 用户注册请求
 */
export interface UserRegisterRequest {
    username: string;
    password: string;
    invitation_code: string;
}

/**
 * 用户注册响应
 */
export interface UserRegisterResponse {
    id: string;
    username: string;
}

/**
 * 用户登录请求
 */
export interface UserLoginRequest {
    username: string;
    password: string;
}

/**
 * 用户登录响应
 */
export interface UserLoginResponse {
    user_id: string;
    token: string;
    expire_at: string; // ISO 8601 格式
}

/**
 * 用户设置
 */
export interface UserSettings {
    transfer_mode: number;
    save_history: boolean;
    language: string;
    theme: string;
}

/**
 * 邀请码
 */
export interface InvitationCode {
    code: string;
    max_uses: number;
    use_count: number;
    created_at: string;
}

/**
 * 创建邀请码请求
 */
export interface CreateInvitationRequest {
    max_uses?: number;
}

/**
 * 创建邀请码响应
 */
export interface CreateInvitationResponse {
    code: string;
    max_uses: number;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
}

/**
 * 修改用户名请求
 */
export interface ChangeUsernameRequest {
    new_username: string;
}

/**
 * 修改用户名响应
 */
export interface ChangeUsernameResponse {
    username: string;
}

// ============ Auth Store ============

/**
 * 认证状态 Store
 */
interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    token: string | null;
    expireAt: string | null;

    // Actions
    setAuth: (token: string, expireAt: string) => void;
    checkAuth: () => void;
    logout: () => void;
}

/**
 * 认证状态管理 Store（使用 zustand + persist）
 */
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            isAuthenticated: false,
            isLoading: true,
            token: null,
            expireAt: null,

            setAuth: (token: string, expireAt: string) => {
                set({
                    isAuthenticated: true,
                    token,
                    expireAt,
                    isLoading: false
                });
            },

            checkAuth: () => {
                const { token, expireAt } = get();

                if (!token) {
                    set({ isAuthenticated: false, isLoading: false });
                    return;
                }

                // 检查本地过期时间
                if (!expireAt || Date.now() >= new Date(expireAt).getTime()) {
                    get().logout();
                    return;
                }

                set({ isAuthenticated: true, isLoading: false });
            },

            logout: () => {
                set({
                    isAuthenticated: false,
                    token: null,
                    expireAt: null,
                    isLoading: false
                });
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                expireAt: state.expireAt,
            })
        }
    )
);

// 注册 auth store getter 到 apiClient
if (typeof window !== 'undefined') {
    setAuthStoreGetter(() => {
        const state = useAuthStore.getState();
        return {
            token: state.token,
            logout: state.logout
        };
    });
}

// ============ Hooks ============

/**
 * 用户注册 Hook
 * 
 * @example
 * const register = useRegister();
 * register.mutate({ username: 'newuser', password: '123456' });
 */
export function useRegister() {
    return useMutation({
        mutationFn: async (data: UserRegisterRequest) => {
            return apiClient.post<UserRegisterResponse>('/api/user/register', data);
        },
        onSuccess: (data) => {
            console.log('注册成功:', data.username);
        },
        onError: (error) => {
            console.error('注册失败:', error);
        },
    });
}

/**
 * 用户登录 Hook
 * 
 * @example
 * const login = useLogin();
 * login.mutate({ username: 'admin', password: '123456' });
 * 
 * if (login.isPending) return <Loading />;
 * if (login.isError) return <Error message={login.error.message} />;
 */
export function useLogin() {
    const { setAuth } = useAuthStore();

    return useMutation({
        mutationFn: async (data: UserLoginRequest) => {
            return apiClient.post<UserLoginResponse>('/api/user/login', data);
        },
        onSuccess: (data) => {
            // 保存到 zustand store
            setAuth(data.token, data.expire_at);
        },
        onError: (error) => {
            console.error('登录失败:', error);
        },
    });
}

/**
 * 修改密码 Hook
 * 
 * @example
 * const changePassword = useChangePassword();
 * changePassword.mutate({ oldPassword: '123', newPassword: '456' });
 */
export function useChangePassword() {
    return useMutation({
        mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
            const payload: ChangePasswordRequest = {
                old_password: data.oldPassword,
                new_password: data.newPassword,
            };
            return apiClient.put<null>('/api/user/password', payload);
        },
        onSuccess: () => {
            console.log('密码修改成功');
        },
        onError: (error) => {
            console.error('密码修改失败:', error);
        },
    });
}

/**
 * 修改用户名 Hook
 * 
 * @example
 * const changeUsername = useChangeUsername();
 * changeUsername.mutate({ newUsername: 'newname' });
 */
export function useChangeUsername() {
    return useMutation({
        mutationFn: async (data: { newUsername: string }) => {
            const payload: ChangeUsernameRequest = {
                new_username: data.newUsername,
            };
            return apiClient.put<ChangeUsernameResponse>('/api/user/username', payload);
        },
        onSuccess: (data) => {
            console.log('用户名修改成功:', data.username);
        },
        onError: (error) => {
            console.error('用户名修改失败:', error);
        },
    });
}

// ============ Settings Hooks ============

/**
 * 获取用户设置 Hook
 * 
 * @example
 * const { data: settings, isLoading } = useUserSettings();
 */
export function useUserSettings() {
    return useQuery({
        queryKey: ['user', 'settings'],
        queryFn: async () => {
            return apiClient.get<UserSettings>('/api/user/settings');
        },
    });
}

/**
 * 更新用户设置 Hook
 * 
 * @example
 * const updateSettings = useUpdateUserSettings();
 * updateSettings.mutate({ transfer_mode: 1, save_history: true, language: 'zh', theme: 'system' });
 */
export function useUpdateUserSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UserSettings) => {
            return apiClient.put<UserSettings>('/api/user/settings', data);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['user', 'settings'], data);
            console.log('设置更新成功');
        },
        onError: (error) => {
            console.error('设置更新失败:', error);
        },
    });
}

// ============ Invitation Code Hooks ============

/**
 * 获取邀请码列表 Hook (仅管理员)
 * 
 * @example
 * const { data: codes, isLoading } = useInvitationCodes();
 */
export function useInvitationCodes() {
    return useQuery({
        queryKey: ['invitation', 'codes'],
        queryFn: async () => {
            return apiClient.get<InvitationCode[]>('/api/user/invitation');
        },
    });
}

/**
 * 创建邀请码 Hook (仅管理员)
 * 
 * @example
 * const createInvitation = useCreateInvitationCode();
 * createInvitation.mutate({ max_uses: 5 });
 */
export function useCreateInvitationCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateInvitationRequest) => {
            return apiClient.post<CreateInvitationResponse>('/api/user/invitation', data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['invitation', 'codes'] });
            console.log('邀请码创建成功:', data.code);
        },
        onError: (error) => {
            console.error('邀请码创建失败:', error);
        },
    });
}
