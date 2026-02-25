/** Aligned with backend ShoeResponseDto. */
export interface Shoe {
  id: number;
  userId: number;
  photoUrl: string;
  brandName: string;
  shoeName: string;
  buyingDate: string; // ISO date string from API
  buyingLocation?: string | null;
  kilometerTarget: number;
  /** Total steps from all workouts linked to this shoe. */
  totalSteps: number;
  /** Total distance (km) from all workouts linked to this shoe. */
  totalDistanceKm: number;
  /** Whether this shoe is the user's default for Strava sync (at most one per user). */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create; aligned with backend CreateShoeDto. */
export interface CreateShoePayload {
  photoUrl: string;
  brandName: string;
  shoeName: string;
  buyingDate: string; // ISO date string e.g. YYYY-MM-DD
  buyingLocation?: string;
  kilometerTarget: number;
}

/** Payload for update; partial of create plus optional isDefault. */
export type UpdateShoePayload = Partial<CreateShoePayload> & { isDefault?: boolean };
