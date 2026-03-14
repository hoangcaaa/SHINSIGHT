"use client";
/// Hook: fetch calls from Supabase public_calls view + Realtime subscription
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { Call } from "@/lib/types";

export function useCalls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    async function fetchCalls() {
      const { data, error } = await supabase
        .from("public_calls")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCalls(data as Call[]);
      }
      setLoading(false);
    }

    fetchCalls();

    // Realtime subscription for new calls and status updates
    const channel = supabase
      .channel("calls-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => {
          // Re-fetch on any change (simpler than merging deltas)
          fetchCalls();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { calls, loading };
}
