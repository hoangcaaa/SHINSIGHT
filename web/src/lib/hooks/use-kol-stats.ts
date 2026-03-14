"use client";
/// Hook: fetch KOL stats from Supabase ordered by accuracy desc
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { KolStats } from "@/lib/types";

export function useKolStats() {
  const [stats, setStats] = useState<KolStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase
        .from("kol_stats")
        .select("*")
        .order("true_calls", { ascending: false });

      if (!error && data) {
        // Sort by accuracy (true_calls / total_calls) client-side for precision
        const sorted = (data as KolStats[]).sort((a, b) => {
          const accA = a.total_calls > 0 ? a.true_calls / a.total_calls : 0;
          const accB = b.total_calls > 0 ? b.true_calls / b.total_calls : 0;
          return accB - accA;
        });
        setStats(sorted);
      }
      setLoading(false);
    }

    fetchStats();
  }, []);

  return { stats, loading };
}
