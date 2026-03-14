"use client";
/// Hook: fetch revealed/settled calls from Supabase with optional filters
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import type { Call } from "@/lib/types";

interface UseRevealedCallsParams {
  asset?: number | null;
  verdict?: string | null;
}

export function useRevealedCalls({ asset = null, verdict = null }: UseRevealedCallsParams = {}) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true);
      let query = supabase
        .from("public_calls")
        .select("*")
        .neq("status", "active")
        .order("created_at", { ascending: false });

      if (asset !== null) {
        query = query.eq("asset", asset);
      }

      if (verdict !== null) {
        const statusMap: Record<string, string> = {
          TRUE: "settled_true",
          FALSE: "settled_false",
          EXPIRED: "expired",
        };
        const mappedStatus = statusMap[verdict];
        if (mappedStatus) {
          query = query.eq("status", mappedStatus);
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        setCalls(data as Call[]);
      }
      setLoading(false);
    }

    fetchCalls();
  }, [asset, verdict]);

  return { calls, loading };
}
