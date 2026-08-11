import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { getMyProfile } from "../services/profiles.service";
import type { Profile } from "../types";

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signUp: (email: string, password: string) => Promise<Session | null>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  async function applySession(nextSession: Session | null): Promise<Profile | null> {
    setSession(nextSession);
    const nextProfile = nextSession ? await getMyProfile(nextSession.user.id) : null;
    if (!mountedRef.current) return nextProfile;
    setProfile(nextProfile);
    setLoading(false);
    return nextProfile;
  }

  useEffect(() => {
    mountedRef.current = true;
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<Profile | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Wait for session + profile to actually land in state before returning,
    // so a caller that navigates right after this resolves doesn't race
    // RequireAuth (which would otherwise see profile still null and bounce
    // back to /login on the first attempt). Returned directly too, since the
    // caller's own `profile` closure is still the pre-login value at this point.
    setLoading(true);
    return applySession(data.session);
  }

  async function signUp(email: string, password: string): Promise<Session | null> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // data.session is null when email confirmation is required - nothing to
    // apply yet in that case, the caller has to handle it not being ready.
    if (data.session) {
      setLoading(true);
      await applySession(data.session);
    }
    return data.session;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value: AuthContextValue = { session, profile, loading, signIn, signUp, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
