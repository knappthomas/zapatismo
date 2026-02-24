export type Role = 'ADMIN' | 'USER';

export interface User {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}
