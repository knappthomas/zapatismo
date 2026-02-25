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

/** Payload for update; partial of create. */
export type UpdateShoePayload = Partial<CreateShoePayload>;
