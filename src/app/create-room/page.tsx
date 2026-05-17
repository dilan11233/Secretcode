"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/env";
import type { Team } from "@/lib/types";

export default function CreateRoomPage() {
  const [nickname, setNickname] = useState("");
  const [hostTeam, setHostTeam] = useState<Team>("blue");
  const [hostRole, setHostRole] = useState<"manager" | "employee">("manager");
  const router = useRouter();

  const supabaseReady = isSupabaseConfigured();

  const createRoom = () => {
    if (!supabaseReady) return;
    if (!nickname.trim()) return;
    const roomCode = nanoid(6).toUpperCase();
    const roomToken = nanoid(24);
    router.push(
      `/room/${roomCode}?nick=${encodeURIComponent(nickname.trim())}&host=1&rt=${encodeURIComponent(roomToken)}&hostTeam=${hostTeam}&hostRole=${hostRole}`
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 rounded-xl border border-white/40 px-3 py-2 text-white hover:bg-white/10"
      >
        ← Back
      </button>
      <GlassCard className="w-full">
        <h1 className="text-2xl font-bold text-lilac">Create Room</h1>
        {!supabaseReady && (
          <p className="mt-3 rounded-xl border border-red-400/50 bg-red-500/15 p-3 text-sm text-red-100">
            {SUPABASE_SETUP_MESSAGE}
          </p>
        )}
        <p className="mt-3 text-sm text-white/80">
          Choose your team and role now. You can still change them in the lobby before the game starts.
        </p>
        <p className="mb-2 mt-4 text-sm font-bold uppercase text-white/70">Team</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setHostTeam("blue")}
            className={`rounded-xl px-4 py-3 font-bold ${hostTeam === "blue" ? "bg-blue-500 text-white ring-2 ring-blue-200" : "bg-white/10 text-white"}`}
          >
            Team A
          </button>
          <button
            type="button"
            onClick={() => setHostTeam("green")}
            className={`rounded-xl px-4 py-3 font-bold ${hostTeam === "green" ? "bg-emerald-500 text-white ring-2 ring-emerald-200" : "bg-white/10 text-white"}`}
          >
            Team B
          </button>
        </div>
        <p className="mb-2 mt-4 text-sm font-bold uppercase text-white/70">Role</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setHostRole("manager")}
            className={`rounded-xl px-4 py-3 font-bold ${hostRole === "manager" ? "bg-lilac text-purpleNight" : "bg-white/10 text-white"}`}
          >
            Clue Giver
          </button>
          <button
            type="button"
            onClick={() => setHostRole("employee")}
            className={`rounded-xl px-4 py-3 font-bold ${hostRole === "employee" ? "bg-lilac text-purpleNight" : "bg-white/10 text-white"}`}
          >
            Guesser
          </button>
        </div>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname"
          className="mt-4 w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
        />
        <button
          type="button"
          onClick={createRoom}
          disabled={!supabaseReady}
          className="mt-4 w-full rounded-xl bg-lilac p-3 font-bold text-purpleNight disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create and Go to Lobby
        </button>
      </GlassCard>
    </main>
  );
}
