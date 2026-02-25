import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import type {
  Workout,
  CreateWorkoutPayload,
  UpdateWorkoutPayload,
} from '../models/workout.model';

@Injectable({ providedIn: 'root' })
export class WorkoutsService {
  private readonly baseUrl = `${environment.apiUrl}/workouts`;

  constructor(private readonly http: HttpClient) {}

  getList() {
    return this.http.get<Workout[]>(this.baseUrl);
  }

  getOne(id: number) {
    return this.http.get<Workout>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateWorkoutPayload) {
    return this.http.post<Workout>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateWorkoutPayload) {
    return this.http.patch<Workout>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
