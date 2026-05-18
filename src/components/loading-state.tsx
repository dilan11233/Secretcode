interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="flex min-h-[240px] w-full items-center justify-center p-8 text-white">
      <div className="glass flex w-full max-w-sm flex-col items-center rounded-2xl p-8 text-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-lilac border-r-lilac" />
          <div className="absolute inset-4 rounded-full bg-lilac/20" />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.25em] text-lilac">{label}</p>
        <div className="mt-4 flex gap-2" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/80 [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
