import { postRequest } from '@/utils/mcp';

export const Api = {
  Register: '/auth/register',
  Login: '/auth/login',
  Refresh: '/auth/refresh',
};

export interface RefisterRequest {
  username: string;
  passwor: string;
  nickname: string;
}

export interface RegisterResponse {
  userId: string;
  nickname: string;
}

export const register = async (request: RefisterRequest) => {
  return await postRequest<RegisterResponse>(Api.Register, request);
};
export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  nickname: string;
  accessToken: string;
  refreshToken: string;
}

export const login = async (request: LoginRequest) => {
  return await postRequest<AuthResponse>(Api.Login, request);
};

export interface RefreshTokenRequest {
  refreshToken: string;
}

export const refresh = async (request: RefreshTokenRequest) => {
  return await postRequest<AuthResponse>(Api.Refresh, request);
};
