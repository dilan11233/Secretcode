"use client";

import Link from "next/link";
import { useState } from "react";
import { Mascot } from "@/components/mascot";

const previewCards = [
  { term: "TEST PLAN", tone: "bg-blue-500/80 border-blue-200/80 text-white", delay: "0ms" },
  { term: "RISK", tone: "bg-white/10 border-white/20 text-white/80", delay: "80ms" },
  { term: "AUDIT", tone: "bg-emerald-500/80 border-emerald-200/80 text-white", delay: "160ms" },
  { term: "ISO", tone: "bg-white/10 border-white/20 text-white/80", delay: "240ms" },
  { term: "DEFECT", tone: "bg-red-900/80 border-red-400/80 text-white", delay: "320ms" },
  { term: "REVIEW", tone: "bg-white/10 border-white/20 text-white/80", delay: "120ms" },
  { term: "TRACE", tone: "bg-blue-500/80 border-blue-200/80 text-white", delay: "200ms" },
  { term: "SCOPE", tone: "bg-amber-500/80 border-amber-200/80 text-white", delay: "280ms" },
  { term: "CASE", tone: "bg-emerald-500/80 border-emerald-200/80 text-white", delay: "360ms" },
  { term: "COVER", tone: "bg-white/10 border-white/20 text-white/80", delay: "440ms" }
];

export default function LandingPage() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center overflow-hidden px-5 py-8 md:px-8">
      <div className="absolute left-6 top-6 opacity-80 md:left-8 md:top-8">
        <Mascot />
      </div>

      <section className="grid items-center gap-8 pt-28 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)] lg:pt-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.85)]" />
            Live team word game
          </div>

          <div className="flex items-start gap-3">
            <h1 className="text-5xl font-black leading-none text-lilac sm:text-6xl md:text-7xl">SECRETCODE</h1>
            <button onClick={() => setShowInfo(true)} className="info-button mt-2 shrink-0" aria-label="Game information">
              ?
            </button>
          </div>

          <p className="mt-5 max-w-xl text-base leading-7 text-white/78 md:text-lg">
            Managers give sharp clues. Employees decode the board. Every guess unlocks ISO testing concepts while
            teams race to avoid the forbidden card.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create-room"
              className="rounded-xl bg-lilac px-6 py-4 text-center text-base font-black text-purpleNight shadow-lg shadow-lilac/20 transition hover:-translate-y-0.5 hover:bg-white"
            >
              Create Room
            </Link>
            <Link
              href="/join-room"
              className="rounded-xl border border-white/30 bg-white/10 px-6 py-4 text-center text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              Join Room
            </Link>
            <Link
              href="/how-to-play"
              className="rounded-xl px-6 py-4 text-center text-base font-bold text-lavender transition hover:bg-white/10 hover:text-white"
            >
              How to Play
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <div className="border-l-2 border-blue-300/80 pl-3">
              <p className="font-black text-blue-100">Team A</p>
              <p className="text-white/55">9 terms</p>
            </div>
            <div className="border-l-2 border-emerald-300/80 pl-3">
              <p className="font-black text-emerald-100">Team B</p>
              <p className="text-white/55">8 terms</p>
            </div>
            <div className="border-l-2 border-red-300/80 pl-3">
              <p className="font-black text-red-100">Forbidden</p>
              <p className="text-white/55">instant loss</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] border border-white/10 bg-white/5 blur-sm" />
          <div className="relative rounded-2xl border border-white/20 bg-black/20 p-4 shadow-2xl shadow-purple-950/30 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-white/45">Board Preview</p>
                <p className="text-lg font-black text-white">Find your team terms</p>
              </div>
              <div className="rounded-lg border border-lilac/30 bg-lilac/15 px-3 py-2 text-right text-xs">
                <p className="font-bold uppercase text-white/50">Active clue</p>
                <p className="text-lilac">quality [3]</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {previewCards.map((card) => (
                <div
                  key={card.term}
                  className={`${card.tone} min-h-[88px] animate-pulse rounded-xl border p-3 text-center text-xs font-black shadow-lg shadow-black/15 transition hover:-translate-y-1 hover:scale-[1.02]`}
                  style={{ animationDelay: card.delay }}
                >
                  <div className="flex h-full items-center justify-center break-words">{card.term}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm font-bold">
              <div className="rounded-xl border border-blue-300/40 bg-blue-500/15 p-3 text-blue-100">Team A: 6 left</div>
              <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/15 p-3 text-emerald-100">
                Team B: 5 left
              </div>
            </div>
          </div>
        </div>
      </section>

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
