"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/env";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export function createRoomClient(roomToken: string): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_SETUP_MESSAGE);
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-room-token": roomToken
      }
    }
  });
}
