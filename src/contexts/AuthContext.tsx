import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { Rep } from '@/hooks/useReps';

export interface AuthRep extends Rep {
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

  useEffect(() => {
    // Check for stored rep on mount
    const storedRep = localStorage.getItem('authenticated_rep');
    if (storedRep) {
      setRep(JSON.parse(storedRep));
    }
    setLoading(false);
  }, []);

  const signIn = async (password: string) => {
    try {
      const { data: reps, error } = await supabase
        .from('reps')
        .select('*')
        .eq('auth_token', password)
        .single();
      
      if (error || !reps) {
        return { error: { message: 'Falsches Passwort' } };
      }
      
      // Determine role based on name
      const role = reps.name === 'Patrick' ? 'admin' : 'rep';
      const authRep: AuthRep = { ...reps, role };
      
      setRep(authRep);
      localStorage.setItem('authenticated_rep', JSON.stringify(authRep));
      navigate('/');
      return { error: null };
    } catch (err) {
      return { error: { message: 'Fehler beim Login' } };
    }
  };

  const signOut = async () => {
    setRep(null);
    localStorage.removeItem('authenticated_rep');
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
