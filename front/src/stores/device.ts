/**
 * 设备状态管理 Store
 *
 * 统一管理当前设备的所有信息：
 * - 设备 ID（UUID，持久化存储）
 * - 设备名称、Emoji（基于 User-Agent 自动检测）
 * - 编辑状态
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ============ Types ============

import type { DeviceInfo } from '@/type/device';

/**
 * Store 状态
 */
interface DeviceState {
    /** 设备信息 */
    device: DeviceInfo;
    /** 是否正在编辑设备名称 */
    isEditing: boolean;
    /** 是否已初始化 */
    isHydrated: boolean;

    // ============ Actions ============

    /** 更新设备名称 */
    setName: (name: string) => void;
    /** 更新设备 Emoji */
    setEmoji: (emoji: string) => void;
    /** 设置编辑状态 */
    setEditing: (editing: boolean) => void;
    /** 标记已完成 hydration */
    setHydrated: () => void;
}

// ============ Device Detection ============

/**
 * 设备配置
 */
interface DeviceConfig {
    name: string;
    emoji: string;
}

/**
 * UA 匹配规则
 */
const UA_RULES: { pattern: RegExp; config: DeviceConfig }[] = [
    { pattern: /iPhone/i, config: { name: 'iPhone', emoji: '📱' } },
    { pattern: /iPad/i, config: { name: 'iPad', emoji: '📱' } },
    { pattern: /Android/i, config: { name: 'Android', emoji: '📱' } },
    { pattern: /Macintosh|Mac OS/i, config: { name: 'Mac', emoji: '💻' } },
    { pattern: /Windows/i, config: { name: 'Windows', emoji: '💻' } },
    { pattern: /Linux/i, config: { name: 'Linux', emoji: '🐧' } },
];

const DEFAULT_CONFIG: DeviceConfig = { name: 'Device', emoji: '💻' };

/**
 * 从 User-Agent 检测设备信息
 */
function detectDeviceFromUA(): DeviceConfig {
    if (typeof navigator === 'undefined') return DEFAULT_CONFIG;

    const ua = navigator.userAgent;

    for (const rule of UA_RULES) {
        if (rule.pattern.test(ua)) {
            return rule.config;
        }
    }

    return DEFAULT_CONFIG;
}

/**
 * 创建默认设备信息
 */
function createDefaultDevice(): DeviceInfo {
    const config = detectDeviceFromUA();
    return {
        id: uuidv4(),
        name: config.name,
        emoji: config.emoji,
    };
}

// ============ Store ============

/**
 * 设备状态 Store
 *
 * 使用 zustand + persist 实现本地持久化
 *
 * @example
 * // 获取设备信息
 * const { device } = useDeviceStore();
 * console.log(device.id, device.name);
 *
 * // 更新设备名称
 * const { setName } = useDeviceStore();
 * setName('我的电脑');
 *
 * // 在组件外获取 deviceId
 * const deviceId = useDeviceStore.getState().device.id;
 */
export const useDeviceStore = create<DeviceState>()(
    persist(
        (set) => ({
            device: createDefaultDevice(),
            isEditing: false,
            isHydrated: false,

            setName: (name: string) => {
                set((state) => ({
                    device: { ...state.device, name },
                }));
            },

            setEmoji: (emoji: string) => {
                set((state) => ({
                    device: { ...state.device, emoji },
                }));
            },

            setEditing: (editing: boolean) => {
                set({ isEditing: editing });
            },

            setHydrated: () => {
                set({ isHydrated: true });
            },
        }),
        {
            name: 'filechat-device',
            storage: createJSONStorage(() => localStorage),
            // 仅持久化设备信息
            partialize: (state) => ({
                device: state.device,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
            // 合并策略：保留已存储的设备信息
            merge: (persistedState, currentState) => {
                const persisted = persistedState as { device?: Partial<DeviceInfo> } | undefined;
                const defaultDevice = createDefaultDevice();

                return {
                    ...currentState,
                    device: {
                        id: persisted?.device?.id ?? defaultDevice.id,
                        name: persisted?.device?.name ?? defaultDevice.name,
                        emoji: persisted?.device?.emoji ?? defaultDevice.emoji,
                    },
                    isHydrated: true,
                };
            },
        }
    )
);
