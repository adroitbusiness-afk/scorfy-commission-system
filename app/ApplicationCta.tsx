"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

export default function ApplicationCta() {
  const router = useRouter();
  const [hover, setHover] = useState(false);

  useEffect(() => {
    // no-op placeholder for future analytics
  }, []);

  return (
    <button
      onClick={() => router.push("/signup")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-transform hover:translate-y-[-1px]"
    >
      <FileText size={18} />
      {hover ? "Complete Application" : "Application Form"}
      <Sparkles size={16} className="opacity-80" />
    </button>
  );
}
