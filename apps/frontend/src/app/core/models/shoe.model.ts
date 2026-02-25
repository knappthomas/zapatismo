export interface Shoe {
  id: number;
  name: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  notes: string | null;
  photoDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShoeRequest {
  name: string;
  brand?: string;
  model?: string;
  color?: string;
  notes?: string;
  photoDataUrl?: string;
}
