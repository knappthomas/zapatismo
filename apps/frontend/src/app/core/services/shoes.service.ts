import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import type { Shoe, CreateShoePayload, UpdateShoePayload } from '../models/shoe.model';

@Injectable({ providedIn: 'root' })
export class ShoesService {
  private readonly baseUrl = `${environment.apiUrl}/shoes`;

  constructor(private readonly http: HttpClient) {}

  getList() {
    return this.http.get<Shoe[]>(this.baseUrl);
  }

  getOne(id: number) {
    return this.http.get<Shoe>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateShoePayload) {
    return this.http.post<Shoe>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateShoePayload) {
    return this.http.patch<Shoe>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
