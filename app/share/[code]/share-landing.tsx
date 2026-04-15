"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Gift, Sparkles } from "lucide-react";

export default function ShareLanding({ code }: { code: string }) {
  const router = useRouter();
  const [tracking, setTracking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // log initial click/open
    track("click");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const track = async (event: "click" | "engagement") => {
    try {
      await fetch("/api/rewards/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, event }),
      });
    } catch (err) {
      console.error("track failed", err);
    }
  };

  const handleApply = async () => {
    setTracking(true);
    await track("engagement");
    setMessage("Rewards credited! Redirecting to application form...");
    setTimeout(() => router.push("/signup"), 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white shadow-2xl rounded-3xl p-8 border border-indigo-100 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_#eef2ff,transparent_35%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4 text-indigo-700 font-semibold">
            <Share2 size={20} />
            Share & Earn Rewards
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Complete your application</h1>
          <p className="text-slate-600 mb-6">
            You were invited by a recruiter. Every click and engagement helps them earn reward points while you get a
            fast-track application experience.
          </p>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <Gift className="text-indigo-600" />
            <div>
              <p className="font-semibold text-indigo-800">Bonus for engaging</p>
              <p className="text-sm text-indigo-700">Clicking and applying adds reward points for your recruiter.</p>
            </div>
          </div>

          <button
            onClick={handleApply}
            disabled={tracking}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Sparkles size={18} /> {tracking ? "Please wait..." : "Start Application"}
          </button>
          {message && <p className="text-center text-sm text-green-600 mt-3">{message}</p>}
        </div>
      </div>
    </div>
  );
}
