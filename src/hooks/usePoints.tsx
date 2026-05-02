import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { levelFromPoints } from "@/lib/rewards";

export function usePoints() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [penaltiesEnabled, setPenaltiesEnabled] = useState(false);
  const [relapsePenalty, setRelapsePenalty] = useState(25);
  const [abortPenalty, setAbortPenalty] = useState(10);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("total_points, penalties_enabled, relapse_penalty, abort_penalty")
      .eq("id", user.id)
      .maybeSingle();
    setPoints(data?.total_points ?? 0);
    setPenaltiesEnabled(!!data?.penalties_enabled);
    setRelapsePenalty(data?.relapse_penalty ?? 25);
    setAbortPenalty(data?.abort_penalty ?? 10);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`points-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "point_events", filter: `user_id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, refresh]);

  return {
    points,
    penaltiesEnabled,
    relapsePenalty,
    abortPenalty,
    loading,
    refresh,
    ...levelFromPoints(points),
  };
}
