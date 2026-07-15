export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
  guardian_phone?: string;
}

export interface AuthUser {
  id: number;
  email: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}
