export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: 'ACTIVE' | 'DISABLED';
  createdAt: Date;
}

export interface UserCredentials extends User {
  passwordHash: string | null;
}
