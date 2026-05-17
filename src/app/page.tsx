"use client";

import Link from "next/link";
import { useState } from "react";
import { GlassCard } from "@/components/glass-card";
import { Mascot } from "@/components/mascot";

export default function LandingPage() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 p-6">
      <Mascot />
      <div className="flex items-center gap-4">
        <h1 className="text-center text-5xl font-black tracking-wide text-lilac">SECRETCODE</h1>
        <button
          onClick={() => setShowInfo(true)}
          className="info-button"
          aria-label="Game information"
        >
          ?
        </button>
      </div>
      
      <GlassCard className="w-full max-w-3xl">
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/create-room" className="rounded-xl bg-lilac px-4 py-3 text-center font-bold text-purpleNight">
            Create Room
          </Link>
          <Link href="/join-room" className="rounded-xl bg-violetSoft px-4 py-3 text-center font-bold">
            Join Room
          </Link>
          <Link href="/how-to-play" className="rounded-xl border border-white/40 px-4 py-3 text-center font-bold">
            How to Play
          </Link>
        </div>
      </GlassCard>

      {showInfo && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowInfo(false)}
              className="modal-close"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-lilac mb-4 tracking-wider">ABOUT THE GAME</h2>
            <p className="text-white/90 leading-relaxed">
              A multiplayer educational card game inspired by Codenames for Software Engineering classes.
              Learn ISO testing terms while giving clues, guessing smart, and avoiding the forbidden card.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
