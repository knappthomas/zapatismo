import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { storage } from '../../shared/utils/storage.util';
import { JwtPayload, LoginRequest, LoginResponse } from './auth.models';

const TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenPayload = signal<JwtPayload | null>(this.loadStoredPayload());

  readonly currentUser = this.tokenPayload.asReadonly();
  readonly isAuthenticated = computed(() => {
    const payload = this.tokenPayload();
    if (!payload) return false;
    return payload.exp * 1000 > Date.now();
  });

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => {
        storage.set(TOKEN_KEY, res.accessToken);
        this.tokenPayload.set(this.decodeToken(res.accessToken));
      }),
    );
  }

  logout(): void {
    storage.remove(TOKEN_KEY);
    this.tokenPayload.set(null);
    this.router.navigateByUrl('/login');
  }

  getToken(): string | null {
    return storage.get<string>(TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  private loadStoredPayload(): JwtPayload | null {
    const token = storage.get<string>(TOKEN_KEY);
    if (!token) return null;
    const payload = this.decodeToken(token);
    if (payload && payload.exp * 1000 > Date.now()) return payload;
    storage.remove(TOKEN_KEY);
    return null;
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}
