// API response types
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// User types
export interface IUser {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  roles?: IRole[];
}

export enum UserStatus {
  Active = 1,
  Inactive = 0,
}

// Role types
export interface IRole {
  id: number;
  name: string;
  description: string | null;
  sort: number;
  status: number;
  permissions?: IPermission[];
}

// Permission types
export interface IPermission {
  id: number;
  name: string;
  code: string;
  type: PermissionType;
  parentId: number | null;
  sort: number;
  status: number;
}

export enum PermissionType {
  Menu = 'menu',
  Api = 'api',
  Button = 'button',
}

// Auth types
export interface ILoginRequest {
  username: string;
  password: string;
}

export interface ILoginResponse {
  accessToken: string;
  user: IUser;
}

export interface ITokenPayload {
  sub: number;
  username: string;
}

// Menu types
export interface IMenu {
  id: number;
  name: string;
  path: string;
  icon: string | null;
  parentId: number | null;
  sort: number;
  type: MenuType;
  status: number;
  children?: IMenu[];
}

export enum MenuType {
  Directory = 0,
  Menu = 1,
  Link = 2,
}

// Content types (CMS)
export interface IContent {
  id: number;
  title: string;
  content: string;
  categoryId: number | null;
  authorId: number;
  cover: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum ContentStatus {
  Draft = 0,
  Published = 1,
}

// Category types
export interface ICategory {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
  type: string;
  status: number;
  children?: ICategory[];
}

// Media types
export interface IMedia {
  id: number;
  name: string;
  url: string;
  type: MediaType;
  size: number;
  uploaderId: number;
  createdAt: string;
}

export enum MediaType {
  Image = 'image',
  Video = 'video',
  File = 'file',
}
