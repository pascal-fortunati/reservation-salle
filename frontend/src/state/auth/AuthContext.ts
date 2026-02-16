import { createContext } from 'react';

import type { AuthContextValue } from './types';

// Contexte React pour partager l'état d'auth (token, user, login/logout)
// à travers l'application.
export const AuthContext = createContext<AuthContextValue | null>(null);