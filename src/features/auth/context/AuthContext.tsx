import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const SESSION_KEY = 'crm_session_token';

export interface AuthRep {
  rep_id: number;
  name: string;
  auth_token: string | null;
  telegram_chat_id: string;
  telegram_username?: string;
  role: 'admin' | 'rep';
}

interface AuthContextType {
  rep: AuthRep | null;
  signIn: (password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [rep, setRep] = useState<AuthRep | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Session beim Start validieren
  useEffect(() => {
    const validateExistingSession = async () => {
      const token = localStorage.getItem(SESSION_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Prüfe ob auth_token noch gültig ist
        const { data, error } = await supabase
          .from('reps')
          .select('rep_id, name, telegram_chat_id, telegram_username, is_admin, auth_token')
          .eq('auth_token', token)
          .single();

        if (error || !data) {
          localStorage.removeItem(SESSION_KEY);
          setRep(null);
        } else {
          setRep({
            rep_id: data.rep_id,
            name: data.name,
            auth_token: data.auth_token,
            telegram_chat_id: data.telegram_chat_id,
            telegram_username: data.telegram_username,
            role: data.is_admin ? 'admin' : 'rep',
          });
        }
      } catch (err) {
        console.error('Session validation error:', err);
        localStorage.removeItem(SESSION_KEY);
        setRep(null);
      }

      setLoading(false);
    };

    validateExistingSession();
  }, []);

  const signIn = async (authToken: string) => {
    try {
      // Direkt mit auth_token aus reps Tabelle einloggen
      const { data, error } = await supabase
        .from('reps')
        .select('rep_id, name, telegram_chat_id, telegram_username, is_admin, auth_token')
        .eq('auth_token', authToken)
        .single();

      if (error || !data) {
        console.error('Auth error:', error);
        return { error: { message: 'Ungültiger Token' } };
      }

      // Auth token als session token verwenden
      localStorage.setItem(SESSION_KEY, authToken);

      setRep({
        rep_id: data.rep_id,
        name: data.name,
        auth_token: data.auth_token,
        telegram_chat_id: data.telegram_chat_id,
        telegram_username: data.telegram_username,
        role: data.is_admin ? 'admin' : 'rep',
      });

      navigate('/');
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: { message: 'Fehler beim Login' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setRep(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ rep, signIn, signOut, loading }}>
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
