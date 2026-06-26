import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isUsingRealSupabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  isRealSupabase: boolean;
  login: (email: string) => Promise<{ success: boolean; error: string | null }>;
  signup: (email: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial Session Check
    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data?.session) {
          setSession(data.session);
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || 'studiolazin@gmail.com'
          });
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSession();

    // Listener for state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session) {
        setSession(session);
        setUser({
          id: session.user.id,
          email: session.user.email || 'studiolazin@gmail.com'
        });
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string): Promise<{ success: boolean; error: string | null }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'developer_password_bypass'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.session) {
        setSession(data.session);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || email
        });
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred during sign-in' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string): Promise<{ success: boolean; error: string | null }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'developer_password_bypass'
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.session) {
        setSession(data.session);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || email
        });
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred during registration' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isRealSupabase: isUsingRealSupabase,
      login,
      signup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
