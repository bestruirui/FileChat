import type { Env, DeviceMeta } from '../types';

const HEARTBEAT_TIMEOUT_MS = 90000; // 90秒无响应则断开连接
const ALARM_INTERVAL_MS = 30000; // 30秒检测一次

// 消息类型枚举
enum MESSAGE_TYPE {
    DEVICE_LIST = 'device_list',
    DEVICE_ONLINE = 'device_online',
    DEVICE_OFFLINE = 'device_offline',
    DEVICE_UPDATE = 'device_update',
    SEND_TEXT = 'send_text',
    SEND_FILE = 'send_file',
    // WebRTC 信令消息
    RTC_OFFER = 'rtc_offer',
    RTC_ANSWER = 'rtc_answer',
    RTC_ICE_CANDIDATE = 'rtc_ice_candidate',
    // 心跳
    PING = 'ping',
    PONG = 'pong',
}


// WebSocket 附加数据（跨休眠持久）
interface WsAttachment {
    deviceMeta: DeviceMeta;
    lastPing: number;
}

// 通用可转发消息接口
interface ForwardableMessage {
    receiver_id: string;
    sender_id?: string;
    [key: string]: unknown;
}
interface TextMessage {
    receiver_id: string;
    sender_id?: string;
    content: string;
}
interface FileMessage {
    receiver_id: string;
    sender_id?: string;
    // 总大小
    total_byte: number;
    // 已传输
    transferred_byte: number;
    // 文件名
    file_name: string;
    mime_type: string;
    storage_key?: string;
}

// WebSocket 消息结构
interface WsMessage {
    type: MESSAGE_TYPE;
    data: unknown;
}

// ============ Durable Object ============
export class fllo implements DurableObject {
    private state: DurableObjectState;
    private env: Env;
    private tokens: Map<string, DeviceMeta> = new Map();

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        switch (path) {
            case '/wstoken':
                return this.wsTokenHandler(request);
            case '/ws':
                return this.wsHandler(request);
            default:
                return new Response('Hello World!');
        }
    }

    async wsTokenHandler(request: Request) {
        const deviceMeta = await request.json<DeviceMeta>();
        const token = crypto.randomUUID();
        this.tokens.set(token, deviceMeta);

        return new Response(JSON.stringify({ token }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async wsHandler(request: Request) {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        if (!token) return new Response('Missing token', { status: 400 });

        const deviceMeta = this.tokens.get(token);
        if (!deviceMeta) {
            return new Response('Invalid token', { status: 401 });
        }
        this.tokens.delete(token);

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        this.state.acceptWebSocket(server, [deviceMeta.id]);
        server.serializeAttachment({ deviceMeta, lastPing: Date.now() } as WsAttachment);

        this.wsBroadcast(server, MESSAGE_TYPE.DEVICE_ONLINE, deviceMeta);
        const currentAlarm = await this.state.storage.getAlarm();
        if (!currentAlarm) {
            await this.state.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
        }

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        if (typeof message !== 'string') return;

        try {
            const { type, data } = JSON.parse(message) as WsMessage;

            switch (type) {
                case MESSAGE_TYPE.PING: {
                    const attachment = ws.deserializeAttachment() as WsAttachment;
                    attachment.lastPing = Date.now();
                    ws.serializeAttachment(attachment);
                    this.wsSend(ws, MESSAGE_TYPE.PONG, null);
                    break;
                }
                case MESSAGE_TYPE.DEVICE_LIST: {
                    const deviceList: DeviceMeta[] = [];
                    for (const client of this.state.getWebSockets()) {
                        if (client !== ws) {
                            const attachment = client.deserializeAttachment() as WsAttachment | null;
                            if (attachment?.deviceMeta) {
                                deviceList.push(attachment.deviceMeta);
                            }
                        }
                    }
                    this.wsSend(ws, MESSAGE_TYPE.DEVICE_LIST, deviceList);
                    break;
                }
                case MESSAGE_TYPE.DEVICE_UPDATE: {
                    const deviceMeta = data as DeviceMeta;
                    const attachment = ws.deserializeAttachment() as WsAttachment;
                    attachment.deviceMeta = deviceMeta;
                    ws.serializeAttachment(attachment);
                    this.wsBroadcast(ws, MESSAGE_TYPE.DEVICE_UPDATE, deviceMeta);
                    break;
                }
                case MESSAGE_TYPE.SEND_TEXT: {
                    const textMsg = data as TextMessage;
                    const senderDeviceId = this.state.getTags(ws)[0];
                    const userId = this.state.id.name!;

                    // 转发给接收者
                    const receiverWs = this.state.getWebSockets(textMsg.receiver_id);
                    if (receiverWs.length > 0) {
                        this.wsSend(receiverWs[0], MESSAGE_TYPE.SEND_TEXT, {
                            ...textMsg,
                            sender_id: senderDeviceId,
                        });
                    }

                    // 记录到数据库
                    await this.env.DB.prepare(
                        `INSERT INTO transfers (id, send_user_id, send_device_id, receive_device_id, content_text) VALUES (?, ?, ?, ?, ?)`
                    ).bind(
                        crypto.randomUUID(),
                        userId,
                        senderDeviceId,
                        textMsg.receiver_id,
                        textMsg.content
                    ).run();
                    break;
                }
                case MESSAGE_TYPE.SEND_FILE: {
                    const fileMsg = data as FileMessage;
                    const senderDeviceId = this.state.getTags(ws)[0];
                    const userId = this.state.id.name!;

                    // 转发给接收者
                    const receiverWs = this.state.getWebSockets(fileMsg.receiver_id);
                    if (receiverWs.length > 0) {
                        this.wsSend(receiverWs[0], MESSAGE_TYPE.SEND_FILE, {
                            ...fileMsg,
                            sender_id: senderDeviceId,
                        });
                    }

                    // 记录到数据库（仅当有 file_id 时）
                    if (fileMsg.storage_key) {
                        await this.env.DB.prepare(
                            `INSERT INTO transfers (id, send_user_id, send_device_id, receive_device_id, file_id) VALUES (?, ?, ?, ?, ?)`
                        ).bind(
                            crypto.randomUUID(),
                            userId,
                            senderDeviceId,
                            fileMsg.receiver_id,
                            fileMsg.storage_key
                        ).run();
                    }
                    break;
                }
                default: {
                    const msg = data as ForwardableMessage;
                    const receiverWs = this.state.getWebSockets(msg.receiver_id);
                    msg.sender_id = this.state.getTags(ws)[0];
                    if (receiverWs.length > 0) {
                        this.wsSend(receiverWs[0], type, msg);
                    }
                }
            }
        } catch {
            console.error('Invalid message');
        }
    }

    async webSocketClose(ws: WebSocket) {
        const deviceId = this.state.getTags(ws)[0];
        if (deviceId) {
            this.wsBroadcast(ws, MESSAGE_TYPE.DEVICE_OFFLINE, { deviceId });
        }
    }

    async webSocketError(ws: WebSocket, error: unknown) {
        console.error('WebSocket error:', error);
    }

    private wsSend(ws: WebSocket, type: MESSAGE_TYPE, data: unknown) {
        if (ws.readyState === WebSocket.READY_STATE_OPEN) {
            ws.send(JSON.stringify({ type, data }));
        }
    }

    private wsBroadcast(ws: WebSocket, type: MESSAGE_TYPE, data: unknown) {
        for (const client of this.state.getWebSockets()) {
            if (client !== ws) {
                this.wsSend(client, type, data);
            }
        }
    }

    async alarm() {
        const now = Date.now();

        for (const ws of this.state.getWebSockets()) {
            if (ws.readyState !== WebSocket.READY_STATE_OPEN) continue;

            const attachment = ws.deserializeAttachment() as WsAttachment | null;
            if (now - (attachment?.lastPing ?? 0) > HEARTBEAT_TIMEOUT_MS) {
                console.log(`Heartbeat timeout, closing connection`);
                ws.close(1000, 'Heartbeat timeout');
            }
        }

        if (this.state.getWebSockets().length > 0) {
            await this.state.storage.setAlarm(now + ALARM_INTERVAL_MS);
        }
    }
}

