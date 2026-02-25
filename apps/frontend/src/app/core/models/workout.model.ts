/** Workout type enum aligned with backend/Prisma WorkoutType. */
export type WorkoutType = 'RUNNING' | 'WALKING';

/** Minimal shoe info in workout response; aligned with backend WorkoutShoeSummaryDto. */
export interface WorkoutShoeSummary {
  id: number;
  brandName: string;
  shoeName: string;
}

/** Aligned with backend WorkoutResponseDto. */
export interface Workout {
  id: number;
  userId: number;
  type: WorkoutType;
  startTime: string; // ISO date string from API
  endTime: string;
  steps: number;
  distanceKm: number;
  location: string;
  shoeId?: number | null;
  shoe?: WorkoutShoeSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create; aligned with backend CreateWorkoutDto. */
export interface CreateWorkoutPayload {
  type: WorkoutType;
  startTime: string; // ISO date string
  endTime: string;
  steps: number;
  distanceKm: number;
  location: string;
  shoeId?: number;
}

/** Payload for update; partial of create. */
export type UpdateWorkoutPayload = Partial<CreateWorkoutPayload>;
