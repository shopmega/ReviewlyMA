// Global type declarations

declare module '@/contexts/auth-context' {
  import { ReactNode } from 'react';

  interface AuthUser {
    id: string;
    email: string | null;
    role?: string;
  }

  interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    isAuthenticated: boolean;
    role: string | null;
  }

  export function useAuth(): AuthContextType;
  export function AuthProvider({ children }: { children: ReactNode }): JSX.Element;
}

// Define vi for tests
declare const vi: any;