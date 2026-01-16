import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { useAuthStore } from '../api/endpoints/user';

// ============ Types ============

/**
 * 传输模式枚举
 */
export enum TransferMode {
    OnlyP2P = 0,
    PreferP2P = 1,
    ForceServer = 2,
}

/**
 * 用户设置
 */
export interface UserSettings {
    transfer_mode: TransferMode;
    save_history: boolean;
    language: string;
    theme: string;
}

/**
 * 设置 Store 状态
 */
interface SettingState {
    // 当前设置
    settings: UserSettings;
    // 是否正在加载
    isLoading: boolean;
    // 是否已初始化（用于区分首次加载和后续更新）
    isInitialized: boolean;
    // 最后同步时间
    lastSyncedAt: number | null;

    // Actions
    /**
     * 初始化设置
     * - 登录用户：从远程获取并同步到本地
     * - 游客用户：使用本地缓存或默认值
     */
    initSettings: () => Promise<void>;

    /**
     * 更新设置
     * - 登录用户：同时更新本地和远程
     * - 游客用户：仅更新本地
     */
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;

    /**
     * 重置为默认设置
     */
    resetSettings: () => Promise<void>;

    /**
     * 强制同步远程设置（仅登录用户）
     */
    syncFromRemote: () => Promise<void>;
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: UserSettings = {
    transfer_mode: TransferMode.PreferP2P,
    save_history: true,
    language: 'zh',
    theme: 'system',
};

/**
 * 设置管理 Store
 * 
 * 使用 zustand + persist 实现本地持久化
 * - 登录用户：本地设置与远程保持一致
 * - 游客用户：仅保存本地
 * 
 * @example
 * // 在组件中使用
 * const { settings, updateSettings, isLoading } = useSettingStore();
 * 
 * // 初始化（通常在应用启动时调用）
 * useEffect(() => {
 *   useSettingStore.getState().initSettings();
 * }, []);
 * 
 * // 更新设置
 * await updateSettings({ theme: 'dark' });
 */
export const useSettingStore = create<SettingState>()(
    persist(
        (set, get) => ({
            settings: DEFAULT_SETTINGS,
            isLoading: false,
            isInitialized: false,
            lastSyncedAt: null,

            initSettings: async () => {
                const { isLoading, isInitialized } = get();

                // 避免重复初始化
                if (isLoading) return;

                set({ isLoading: true });

                try {
                    const authState = useAuthStore.getState();
                    if (authState.isAuthenticated && authState.token) {
                        // 登录用户：从远程获取设置
                        const remoteSettings = await apiClient.get<UserSettings>('/api/user/settings');
                        set({
                            settings: remoteSettings,
                            isInitialized: true,
                            lastSyncedAt: Date.now(),
                        });
                    } else {
                        // 游客用户：使用本地缓存（persist 会自动恢复）或默认值
                        if (!isInitialized) {
                            // 首次初始化，如果没有本地缓存则使用默认值
                            // （persist 会在 hydrate 时恢复缓存的值）
                            set({ isInitialized: true });
                        }
                    }
                } catch (error) {
                    console.error('初始化设置失败:', error);
                    // 出错时使用本地缓存或默认值
                    set({ isInitialized: true });
                } finally {
                    set({ isLoading: false });
                }
            },

            updateSettings: async (newSettings: Partial<UserSettings>) => {
                const { settings, isLoading } = get();

                if (isLoading) return;

                // 合并新设置
                const mergedSettings: UserSettings = {
                    ...settings,
                    ...newSettings,
                };

                set({ isLoading: true });

                try {
                    const authState = useAuthStore.getState();
                    if (authState.isAuthenticated && authState.token) {
                        // 登录用户：先更新远程，成功后更新本地
                        const updatedSettings = await apiClient.put<UserSettings>('/api/user/settings', mergedSettings);
                        set({
                            settings: updatedSettings,
                            lastSyncedAt: Date.now(),
                        });
                    } else {
                        // 游客用户：仅更新本地
                        set({ settings: mergedSettings });
                    }
                } catch (error) {
                    console.error('更新设置失败:', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            resetSettings: async () => {
                const { isLoading } = get();

                if (isLoading) return;

                set({ isLoading: true });

                try {
                    const authState = useAuthStore.getState();
                    if (authState.isAuthenticated && authState.token) {
                        // 登录用户：重置远程设置
                        const updatedSettings = await apiClient.put<UserSettings>('/api/user/settings', DEFAULT_SETTINGS);
                        set({
                            settings: updatedSettings,
                            lastSyncedAt: Date.now(),
                        });
                    } else {
                        // 游客用户：仅重置本地
                        set({ settings: DEFAULT_SETTINGS });
                    }
                } catch (error) {
                    console.error('重置设置失败:', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            syncFromRemote: async () => {
                const authState = useAuthStore.getState();
                if (!authState.isAuthenticated || !authState.token) {
                    console.warn('游客用户无法同步远程设置');
                    return;
                }

                const { isLoading } = get();
                if (isLoading) return;

                set({ isLoading: true });

                try {
                    const remoteSettings = await apiClient.get<UserSettings>('/api/user/settings');
                    set({
                        settings: remoteSettings,
                        lastSyncedAt: Date.now(),
                    });
                } catch (error) {
                    console.error('同步远程设置失败:', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'user-settings-storage',
            // 只持久化 settings，不持久化 loading 状态
            partialize: (state) => ({
                settings: state.settings,
                lastSyncedAt: state.lastSyncedAt,
            }),
            // 合并策略：deep merge
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<SettingState> | undefined;
                return {
                    ...currentState,
                    settings: {
                        ...DEFAULT_SETTINGS,
                        ...(persisted?.settings || {}),
                    },
                    lastSyncedAt: persisted?.lastSyncedAt ?? null,
                };
            },
        }
    )
);
