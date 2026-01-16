/**
 * API 响应基础类型
 */
export interface ApiResponse<T = unknown> {
    code?: number;
    message?: string;
    data?: T;
}

/**
 * API 错误响应
 */
export interface ApiError {
    code: number;
    message: string;
}
