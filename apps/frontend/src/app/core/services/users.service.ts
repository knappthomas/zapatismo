import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { Role } from '../models/user.model';

export interface CreateUserDto {
  email: string;
  password: string;
  role?: Role;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly baseUrl = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  getAll() {
    return this.http.get<User[]>(this.baseUrl);
  }

  getById(id: number) {
    return this.http.get<User>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.baseUrl, dto);
  }
}
