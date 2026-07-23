export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  guardian_phone?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  guardian_phone?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  name: string;
  email: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}
