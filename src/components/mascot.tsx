export function Mascot() {
  return (
    <div className="relative h-28 w-28 animate-pulse rounded-full bg-gradient-to-b from-lilac to-purpleDeep shadow-2xl shadow-purple-900/50">
      <div className="absolute left-5 top-8 h-3 w-3 rounded-full bg-yellow-300" />
      <div className="absolute right-5 top-8 h-3 w-3 rounded-full bg-yellow-300" />
      <div className="absolute left-10 top-14 h-2 w-8 rounded-full bg-white/70" />
      <div className="absolute -left-2 -top-2 h-6 w-6 rounded-full bg-lavender/80" />
      <div className="absolute -right-1 top-0 h-4 w-4 rounded-full bg-lavender/60" />
    </div>
  );
}
