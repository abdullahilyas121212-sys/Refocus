import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { levelFromPoints } from "@/lib/rewards";

export function usePoints() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [penaltiesEnabled, setPenaltiesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("total_points, penalties_enabled")
      .eq("id", user.id)
      .maybeSingle();
    setPoints(data?.total_points ?? 0);
    setPenaltiesEnabled(!!data?.penalties_enabled);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime updates when ledger changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`points-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "point_events", filter: `user_id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  return { points, penaltiesEnabled, loading, refresh, ...levelFromPoints(points) };
}
