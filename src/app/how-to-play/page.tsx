"use client";

import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass-card";

export default function HowToPlayPage() {
  const router = useRouter();

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 rounded-xl border border-white/40 px-3 py-2 text-white hover:bg-white/10"
      >
        ← Back
      </button>
      <GlassCard>
        <h1 className="text-3xl font-bold text-lilac">How to Play SECRETCODE</h1>
        <div className="mt-4 space-y-3 text-white/90">
          <p>Two teams compete: Team A and Team B. Each team picks one Manager.</p>
          <p>Managers see secret card roles and provide one-word clues with a number.</p>
          <p>Employees select cards based on clues. Correct team cards continue momentum.</p>
          <p>Turn ends if a neutral card or wrong-team card is selected, or if employees end turn.</p>
          <p>If a team picks the forbidden card, that team instantly loses.</p>
          <p>
            Learning goal: each selected term opens feedback with definition and related ISO concept.
            This helps reinforce software engineering testing knowledge.
          </p>
        </div>
      </GlassCard>
    </main>
  );
}
