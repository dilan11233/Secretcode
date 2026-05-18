"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { LoadingState } from "@/components/loading-state";

// Next.js useSearchParams için içeriği ayrı bir componentte tutmamız şart
function JoinRoomContent() {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Linkteki ?code=... ve ?rt=... kısımlarını yakalar
    const codeFromUrl = searchParams.get("code");
    const tokenFromUrl = searchParams.get("rt");

    if (codeFromUrl) setRoomCode(codeFromUrl.toUpperCase());
    if (tokenFromUrl) setRoomToken(tokenFromUrl);
  }, [searchParams]);

  const joinRoom = async () => {
    setError(null);
    if (!nickname.trim()) {
      setError("Lütfen bir takma ad girin.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Lütfen bir oda kodu girin.");
      return;
    }

    let token = roomToken.trim();
    if (!token) {
      setLoading(true);
      try {
        const res = await fetch(`/api/room/token?roomCode=${encodeURIComponent(roomCode.trim().toUpperCase())}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data?.error ?? "Oda token'ı alınamadı.");
          return;
        }
        const data = (await res.json()) as { roomToken?: string; error?: string };
        if (!data.roomToken) {
          setError(data.error ?? "Oda token'ı alınamadı.");
          return;
        }
        token = data.roomToken;
        setRoomToken(token);
      } catch {
        setError("Oda token'ı alınırken bir hata oluştu.");
        return;
      } finally {
        setLoading(false);
      }
    }

    router.push(
      `/room/${roomCode.trim().toUpperCase()}?nick=${encodeURIComponent(nickname.trim())}&rt=${encodeURIComponent(token)}&join=1`
    );
  };

  return (
    <GlassCard className="w-full">
      <h1 className="text-2xl font-bold text-lilac">Join Room</h1>
      {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
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
        onChange={(e) => setRoomToken(e.target.value)}
        placeholder="Room Token (Paste if you have it)"
        className="mt-3 w-full rounded-xl border border-white/30 bg-white/10 p-3 text-white"
      />
      <button
        onClick={joinRoom}
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-lilac p-3 font-bold text-purpleNight hover:opacity-90 transition-all disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Joining..." : "Join Lobby"}
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
        <Suspense fallback={<LoadingState label="Loading join panel" />}>
          <JoinRoomContent />
        </Suspense>
      </div>
    </main>
  );
}
