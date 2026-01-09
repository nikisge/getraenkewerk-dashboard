import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

// Session-Daten von der authenticate_rep Funktion
interface AuthSession {
  sessionToken: string;
  repId: number;
  repName: string;
  isAdmin: boolean;
  telegramChatId: string;
  authToken: string | null; // Legacy, für Kompatibilität mit alten Hooks
  expiresAt: string;
}

// Kompatibilitäts-Interface (wie vorher)
export interface AuthRep {
  rep_id: number;
  name: string;
  auth_token: string | null;
  telegram_chat_id: string;
  telegram_username: string;
  role: 'admin' | 'rep';
}

interface AuthContextType {
  rep: AuthRep | null;
  session: AuthSession | null;
  signIn: (password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_KEY = 'session_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kompatibilitäts-Property: rep wird aus session abgeleitet
  const rep: AuthRep | null = session ? {
    rep_id: session.repId,
    name: session.repName,
    auth_token: session.authToken,
    telegram_chat_id: session.telegramChatId,
    telegram_username: '', // Nicht in Session gespeichert, aber selten gebraucht
    role: session.isAdmin ? 'admin' : 'rep',
  } : null;

  useEffect(() => {
    // Session aus localStorage validieren
    const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (storedToken) {
      validateSession(storedToken);
    } else {
      // Legacy-Migration: Alte authenticated_rep Daten migrieren
      const legacyRep = localStorage.getItem('authenticated_rep');
      if (legacyRep) {
        // Alte Daten löschen, User muss sich neu einloggen
        localStorage.removeItem('authenticated_rep');
      }
      setLoading(false);
    }
  }, []);

  const validateSession = async (token: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_session', { p_token: token });

      if (error || !data || data.length === 0) {
        // Session ungültig oder abgelaufen
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setLoading(false);
        return;
      }

      const sessionData = data[0];
      setSession({
        sessionToken: token,
        repId: sessionData.rep_id,
        repName: sessionData.rep_name,
        isAdmin: sessionData.is_admin,
        telegramChatId: sessionData.telegram_chat_id,
        authToken: sessionData.auth_token,
        expiresAt: sessionData.expires_at,
      });
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    setLoading(false);
  };

  const signIn = async (password: string) => {
    try {
      const { data, error } = await supabase
        .rpc('authenticate_rep', { p_password: password });

      if (error) {
        console.error('Auth error:', error);
        return { error: { message: 'Fehler beim Login' } };
      }

      if (!data || data.length === 0) {
        return { error: { message: 'Falsches Passwort' } };
      }

      const authData = data[0];
      const newSession: AuthSession = {
        sessionToken: authData.session_token,
        repId: authData.rep_id,
        repName: authData.rep_name,
        isAdmin: authData.is_admin,
        telegramChatId: authData.telegram_chat_id,
        authToken: null, // Wird bei validate_session nachgeladen
        expiresAt: authData.expires_at,
      };

      setSession(newSession);
      localStorage.setItem(SESSION_TOKEN_KEY, authData.session_token);

      // Auth-Token nachladen für Kompatibilität
      const { data: validatedData } = await supabase
        .rpc('validate_session', { p_token: authData.session_token });

      if (validatedData && validatedData.length > 0) {
        setSession(prev => prev ? {
          ...prev,
          authToken: validatedData[0].auth_token,
        } : null);
      }

      navigate('/');
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: { message: 'Fehler beim Login' } };
    }
  };

  const signOut = async () => {
    if (session) {
      // Session in Datenbank invalidieren
      try {
        await supabase.rpc('invalidate_session', { p_token: session.sessionToken });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setSession(null);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ rep, session, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
