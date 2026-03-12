import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { logActivity, setSessionRepId, clearSessionRepId } from '@/features/activity/services/activityLogger';
import { parseUserAgent } from '@/features/activity/services/parseUserAgent';

const SESSION_KEY = 'crm_session_token';
const INACTIVITY_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 Stunden
const INACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // Jede Minute prüfen

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
      const token = sessionStorage.getItem(SESSION_KEY);

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
          sessionStorage.removeItem(SESSION_KEY);
          setRep(null);
        } else {
          setSessionRepId(data.rep_id);
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
        sessionStorage.removeItem(SESSION_KEY);
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
      sessionStorage.setItem(SESSION_KEY, authToken);
      setSessionRepId(data.rep_id);

      setRep({
        rep_id: data.rep_id,
        name: data.name,
        auth_token: data.auth_token,
        telegram_chat_id: data.telegram_chat_id,
        telegram_username: data.telegram_username,
        role: data.is_admin ? 'admin' : 'rep',
      });

      logActivity({
        repId: data.rep_id,
        actionType: "login",
        details: parseUserAgent(navigator.userAgent),
      });

      navigate('/');
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: { message: 'Fehler beim Login' } };
    }
  };

  const signOut = async () => {
    if (rep) {
      logActivity({ repId: rep.rep_id, actionType: "logout" });
    }
    clearSessionRepId();
    sessionStorage.removeItem(SESSION_KEY);
    setRep(null);
    navigate('/auth');
  };

  // Inaktivitäts-Timeout: nach 4 Stunden ohne Aktivität automatisch ausloggen
  const lastActivityRef = useRef(Date.now());

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!rep) return;

    // Aktivität bei User-Interaktion zurücksetzen
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    events.forEach((event) => window.addEventListener(event, resetActivity));

    // Regelmäßig prüfen ob Timeout erreicht
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        logActivity({ repId: rep.rep_id, actionType: "session_timeout" });
        clearSessionRepId();
        sessionStorage.removeItem(SESSION_KEY);
        setRep(null);
        navigate('/auth');
      }
    }, INACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetActivity));
      clearInterval(interval);
    };
  }, [rep, navigate, resetActivity]);

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
