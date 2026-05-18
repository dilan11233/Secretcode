export function Mascot() {
  return (
    <div className="mascot-float relative h-36 w-32">
      <div className="absolute left-1/2 top-0 h-5 w-1 -translate-x-1/2 rounded-full bg-slate-300/80" />
      <div className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.85)]" />

      <div className="absolute left-8 top-[84px] h-10 w-5 -rotate-12 rounded-full border border-slate-700/50 bg-slate-500" />
      <div className="mascot-wave absolute right-5 top-[78px] h-11 w-5 origin-bottom rotate-12 rounded-full border border-slate-700/50 bg-slate-400 shadow-lg shadow-purple-950/20">
        <div className="absolute -right-1 -top-3 h-6 w-6 rounded-full border border-slate-700/45 bg-slate-300" />
      </div>

      <div className="absolute left-3 right-3 top-4 h-[78px] rounded-[1.35rem] border-2 border-slate-800/60 bg-stone-100 shadow-2xl shadow-purple-950/45">
        <div className="absolute left-3 top-1 h-3 w-10 -skew-x-12 rounded-md bg-white/80" />
        <div className="absolute right-3 top-2 h-2 w-7 rounded-full bg-slate-300/80" />
        <div className="absolute -left-2 top-8 h-7 w-3 rounded-l-full border border-slate-800/45 bg-stone-200" />
        <div className="absolute -right-2 top-8 h-7 w-3 rounded-r-full border border-slate-800/45 bg-stone-200" />
        <div className="absolute -right-7 top-7 h-10 w-10 rounded-full border-4 border-slate-700 bg-stone-100">
          <div className="absolute inset-1 rounded-full border-4 border-pink-300/80 bg-stone-200" />
        </div>

        <div className="absolute left-3 right-3 top-5 rounded-xl border-2 border-slate-800/55 bg-blue-300/75 px-4 py-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="mascot-blink h-5 w-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
            <span className="mascot-blink h-5 w-3.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] [animation-delay:120ms]" />
          </div>
          <div className="mx-auto mt-3 h-2 w-6 rounded-b-full border-b-2 border-slate-800/70" />
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 h-11 w-[70px] -translate-x-1/2 rounded-xl border-2 border-slate-800/55 bg-stone-100 shadow-lg shadow-purple-950/30">
        <div className="absolute left-1/2 top-2 h-2 w-8 -translate-x-1/2 rounded-full bg-white/75" />
        <div className="absolute bottom-3 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-slate-300/80" />
      </div>

      <div className="absolute bottom-4 left-9 h-7 w-5 -rotate-6 rounded-b-lg rounded-t-md border border-slate-800/45 bg-slate-500" />
      <div className="absolute bottom-4 right-9 h-7 w-5 rotate-6 rounded-b-lg rounded-t-md border border-slate-800/45 bg-slate-500" />
      <div className="absolute bottom-1 left-[34px] h-4 w-7 -rotate-6 rounded-md border border-slate-800/45 bg-slate-300" />
      <div className="absolute bottom-1 right-[34px] h-4 w-7 rotate-6 rounded-md border border-slate-800/45 bg-slate-300" />

      <div className="absolute bottom-0 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
    </div>
  );
}
