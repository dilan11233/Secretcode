"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/glass-card";

// Next.js useSearchParams için içeriği ayrı bir componentte tutmamız şart
function JoinRoomContent() {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Linkteki ?code=... ve ?rt=... kısımlarını yakalar
    const codeFromUrl = searchParams.get("code");
    const tokenFromUrl = searchParams.get("rt");
    
    if (codeFromUrl) setRoomCode(codeFromUrl.toUpperCase());
    if (tokenFromUrl) setRoomToken(tokenFromUrl);
  }, [searchParams]);

  const joinRoom = () => {
    if (!nickname.trim() || !roomCode.trim() || !roomToken.trim()) return;
    
    router.push(
      `/room/${roomCode.trim().toUpperCase()}?nick=${encodeURIComponent(nickname.trim())}&rt=${encodeURIComponent(roomToken.trim())}`
    );
  };

  return (
    <GlassCard className="w-full">
      <h1 className="text-2xl font-bold text-lilac">Join Room</h1>
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Nickname"
        className="mt-4 w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
      />
      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
        placeholder="Room Code"
        className="mt-3 w-full rounded-xl border border-white/30 bg-white/10 p-3 uppercase text-white"
      />
      <input
        value={roomToken}
        readOnly
        placeholder="Room Token (Automated)"
        className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/40 cursor-not-allowed"
      />
      <button onClick={joinRoom} className="mt-4 w-full rounded-xl bg-lilac p-3 font-bold text-purpleNight hover:opacity-90 transition-all">
        Join Lobby
      </button>
    </GlassCard>
  );
}

export default function JoinRoomPage() {
  const router = useRouter();
  return (
    <main className="mx-auto min-h-screen max-w-xl p-6">
      <button onClick={() => router.back()} className="mb-4 rounded-xl border border-white/40 px-3 py-2 text-white hover:bg-white/10">
        ← Back
      </button>
      <div className="flex items-center">
        <Suspense fallback={<div className="text-white">Loading join panel...</div>}>
          <JoinRoomContent />
        </Suspense>
      </div>
    </main>
  );
}