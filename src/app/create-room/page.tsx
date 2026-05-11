"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";

export default function CreateRoomPage() {
  const [nickname, setNickname] = useState("");
  const [hostRole, setHostRole] = useState<"manager" | "employee">("manager");
  const router = useRouter();

  const createRoom = () => {
    if (!nickname.trim()) return;
    const roomCode = nanoid(6).toUpperCase();
    const roomToken = nanoid(24);
    router.push(
      `/room/${roomCode}?nick=${encodeURIComponent(nickname.trim())}&host=1&rt=${encodeURIComponent(roomToken)}&hostRole=${hostRole}`
    );
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 rounded-xl border border-white/40 px-3 py-2 text-white hover:bg-white/10"
      >
        ← Back
      </button>
      <div className="flex items-center">
        <GlassCard className="w-full">
          <h1 className="text-2xl font-bold text-lilac">Create Room</h1>
          <p className="mt-3 text-sm text-white/80">
            Choose whether you want to be the Manager (clue giver) or an Employee (guesser) when the room opens.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setHostRole("manager")}
              className={`rounded-xl px-4 py-3 font-bold ${hostRole === "manager" ? "bg-lilac text-purpleNight" : "bg-white/10 text-white"}`}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => setHostRole("employee")}
              className={`rounded-xl px-4 py-3 font-bold ${hostRole === "employee" ? "bg-lilac text-purpleNight" : "bg-white/10 text-white"}`}
            >
              Employee
            </button>
          </div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname"
            className="mt-4 w-full rounded-xl border border-white/30 bg-white/10 p-3"
          />
          <button onClick={createRoom} className="mt-4 w-full rounded-xl bg-lilac p-3 font-bold text-purpleNight">
            Create and Go to Lobby
          </button>
        </GlassCard>
      </div>
    </main>
  );
}
