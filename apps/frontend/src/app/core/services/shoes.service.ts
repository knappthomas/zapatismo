import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { CreateShoeRequest, Shoe } from '../models/shoe.model';

@Injectable({ providedIn: 'root' })
export class ShoesService {
  private readonly baseUrl = `${environment.apiUrl}/shoes`;

  constructor(private readonly http: HttpClient) {}

  getAll() {
    return this.http.get<Shoe[]>(this.baseUrl);
  }

  create(payload: CreateShoeRequest) {
    return this.http.post<Shoe>(this.baseUrl, payload);
  }
}
