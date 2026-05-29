import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getUserData, type AppRole } from '@/api/auth';

interface AuthContextValue {
  user:     User    | null;
  session:  Session | null;
  role:     AppRole | null;
  profile:  any;
  loading:  boolean;
  signOut:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  session: null,
  role:    null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User    | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role,    setRole]    = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hydrateUser = async (userId: string) => {
    try {
      const { role: r, profile: p } = await getUserData(userId);
      setRole(r);
      setProfile(p);
    } catch (err) {
      console.error('[AuthContext] hydrateUser error:', err);
    }
  };

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) hydrateUser(s.user.id);
      setLoading(false);
    });

    // Live auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          // defer to avoid Supabase deadlock on the same tick
          setTimeout(() => hydrateUser(s.user.id), 0);
        } else {
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
