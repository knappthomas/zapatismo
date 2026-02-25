import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  AuthorizeUrlResponse,
  StravaStatus,
  LastSyncResponse,
  SyncRequest,
  SyncResponse,
} from '../models/strava.model';

@Injectable({ providedIn: 'root' })
export class StravaService {
  private readonly baseUrl = `${environment.apiUrl}/strava`;

  constructor(private readonly http: HttpClient) {}

  getAuthorizeUrl(): Observable<AuthorizeUrlResponse> {
    return this.http.get<AuthorizeUrlResponse>(`${this.baseUrl}/authorize-url`);
  }

  getStatus(): Observable<StravaStatus> {
    return this.http.get<StravaStatus>(`${this.baseUrl}/status`);
  }

  getLastSync(): Observable<LastSyncResponse> {
    return this.http.get<LastSyncResponse>(`${this.baseUrl}/last-sync`);
  }

  disconnect(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/disconnect`, {});
  }

  sync(payload: SyncRequest): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(`${this.baseUrl}/sync`, payload);
  }
}
