import { useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { getAuthClient } from "@/lib/gallery";

export function useAuth() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const authClient = await getAuthClient();
      if (!active) return;
      setClient(authClient);

      const loadRole = async (userId: string | undefined) => {
        if (!userId) {
          if (active) setIsAdmin(false);
          return;
        }
        const { data } = await authClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (active) setIsAdmin(Boolean(data));
      };

      const { data: listener } = authClient.auth.onAuthStateChange(
        (_e, next) => {
          if (!active) return;
          setSession(next);
          setLoading(false);
          void loadRole(next?.user?.id);
        },
      );
      unsubscribe = () => listener.subscription.unsubscribe();

      const { data } = await authClient.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void loadRole(data.session?.user?.id);
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return { client, session, user: session?.user ?? null, isAdmin, loading };
}
