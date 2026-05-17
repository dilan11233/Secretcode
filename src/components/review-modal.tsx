import type { ReviewEntry } from "@/lib/types";

interface Props {
  review: ReviewEntry | null;
  onClose: () => void;
}

export function ReviewModal({ review, onClose }: Props) {
  if (!review) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="glass w-full max-w-xl rounded-2xl p-6">
        <h2 className="text-xl font-bold text-lilac">Learning Feedback</h2>
        <p className="mt-2 text-lg font-semibold">{review.term}</p>
        <p className="mt-2 text-sm text-white/90">{review.definition}</p>
        <p className="mt-2 text-sm text-lavender">Related ISO: {review.isoStandard}</p>
        <p className="mt-2 text-sm text-yellow-200">{review.reason}</p>
        <button
          onClick={onClose}
          className="mt-5 rounded-xl bg-lilac px-4 py-2 font-semibold text-purpleNight"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
