/**
 * 数据库类型定义
 */

// 用户角色枚举
export enum RoomRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    EDITOR = 'editor',
    MEMBER = 'member',
    VIEWER = 'viewer',
}

// ==================== Room Settings 类型定义 ====================

// 权限与访问控制
export interface PermissionSettings {
    defaultRole?: 'editor' | 'member' | 'viewer';
    allowAnonymous?: boolean;
    allowInvite?: boolean;
    showPrivateInList?: boolean;
}

// 画布相关配置
export interface CanvasSettings {
    defaultZoom?: number;
    gridEnabled?: boolean;
    snapToGrid?: boolean;
    backgroundColor?: string;
    maxZoom?: number;
    minZoom?: number;
    gridSize?: number;
    gridColor?: string;
}

// 协作功能
export interface CollaborationSettings {
    enableComments?: boolean;
    enableChat?: boolean;
    enableCursor?: boolean;
    enablePresence?: boolean;
    enableNotifications?: boolean;
    cursorColor?: 'auto' | string;
}

// 版本与历史
export interface VersioningSettings {
    autoSave?: boolean;
    saveInterval?: number;
    keepHistory?: boolean;
    maxHistoryDays?: number;
    maxHistoryCount?: number;
}

// 外观与主题
export interface AppearanceSettings {
    theme?: 'light' | 'dark' | 'auto';
    icon?: string;
    coverImage?: string;
    accentColor?: string;
    fontFamily?: string;
}

// 功能开关
export interface FeatureSettings {
    enableAI?: boolean;
    enableTemplates?: boolean;
    enableExport?: boolean;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    enablePlugins?: boolean;
}

// 通知设置
export interface NotificationSettings {
    mentionNotify?: boolean;
    editNotify?: boolean;
    commentNotify?: boolean;
    emailDigest?: boolean;
    digestFrequency?: 'daily' | 'weekly' | 'never';
}

// 自定义元数据
export interface MetadataSettings {
    tags?: string[];
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    archived?: boolean;
    customFields?: Record<string, any>;
}

// 房间配置总接口
export interface RoomSettings {
    permissions?: PermissionSettings;
    canvas?: CanvasSettings;
    collaboration?: CollaborationSettings;
    versioning?: VersioningSettings;
    appearance?: AppearanceSettings;
    features?: FeatureSettings;
    notifications?: NotificationSettings;
    metadata?: MetadataSettings;
}

// ==================== 数据库表类型 ====================

// 用户表
export interface User {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}

// 用户创建参数
export interface CreateUserParams {
    username: string;
    email: string;
    password_hash: string;
}

// 房间表
export interface Room {
    id: string;
    name: string;
    description?: string | null;
    is_private: boolean;
    password?: string | null;
    settings?: RoomSettings | null;
    owner_id: string;
    created_at: Date;
    updated_at: Date;
}

// 房间创建参数
export interface CreateRoomParams {
    name: string;
    description?: string | null;
    is_private?: boolean;
    password?: string | null;
    settings?: RoomSettings | null;
    owner_id: string;
}

// 房间成员表
export interface RoomMember {
    id: string;
    room_id: string;
    user_id: string;
    role: RoomRole;
    joined_at: Date;
}

// 房间成员创建参数
export interface CreateRoomMemberParams {
    room_id: string;
    user_id: string;
    role?: RoomRole;
}

// 刷新令牌表
export interface RefreshToken {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    revoked: boolean;
    created_at: Date;
}

// 刷新令牌创建参数
export interface CreateRefreshTokenParams {
    user_id: string;
    token: string;
    expires_at: Date;
}

// Yjs 文档表
export interface RoomDocument {
    id: string;
    room_id: string;
    doc_name: string;
    doc_data: Buffer;
    version: number;
    is_snapshot: boolean;
    created_at: Date;
    updated_at: Date;
}

// Yjs 文档创建参数
export interface CreateRoomDocumentParams {
    room_id: string;
    doc_name?: string;
    doc_data: Buffer;
    version?: number;
    is_snapshot?: boolean;
}

// 房间邀请表（可选）
export interface RoomInvitation {
    id: string;
    room_id: string;
    inviter_id: string;
    invitee_email: string;
    role: RoomRole;
    token: string;
    expires_at: Date;
    accepted: boolean;
    created_at: Date;
}

// 房间邀请创建参数
export interface CreateRoomInvitationParams {
    room_id: string;
    inviter_id: string;
    invitee_email: string;
    role?: RoomRole;
    token: string;
    expires_at: Date;
}

export type RoomAuditAction =
    | 'room_joined'
    | 'room_joined_by_invite'
    | 'room_join_password_failed'
    | 'room_member_invited'
    | 'room_invite_code_created'
    | 'room_member_role_updated'
    | 'room_member_removed'
    | 'room_ownership_transferred'
    | 'room_password_updated';

export interface RoomAuditLog {
    id: string;
    room_id: string;
    actor_user_id?: string | null;
    target_user_id?: string | null;
    action: RoomAuditAction;
    metadata?: Record<string, any> | null;
    created_at: Date;
}

export interface CreateRoomAuditLogParams {
    room_id: string;
    actor_user_id?: string | null;
    target_user_id?: string | null;
    action: RoomAuditAction;
    metadata?: Record<string, any> | null;
}
