/**
 * 数据库类型定义
 */

// 用户角色枚举
export enum RoomRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer',
}

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
    is_private: boolean;
    password?: string | null;
    settings?: object | null;
    owner_id: string;
    created_at: Date;
    updated_at: Date;
}

// 房间创建参数
export interface CreateRoomParams {
    name: string;
    is_private?: boolean;
    password?: string | null;
    settings?: object | null;
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
