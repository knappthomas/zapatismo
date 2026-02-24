export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: 'ADMIN' | 'USER';
  exp: number;
  iat: number;
}
