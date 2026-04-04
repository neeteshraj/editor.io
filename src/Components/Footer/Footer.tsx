import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <div className="fixed bottom-0 w-full h-9 flex items-center justify-center bg-[#0d0d16] border-t border-white/[0.06] text-[11px] text-white/20 z-10">
      © {new Date().getFullYear()} LiveDraft — Made with{" "}
      <Heart size={10} className="mx-1 text-indigo-400" fill="currentColor" />{" "}
      <a
        href="https://github.com/neeteshraj"
        target="_blank"
        rel="noopener noreferrer"
        className="text-white/30 hover:text-white/50 transition-colors ml-0.5"
      >
        Nitesh Raj Khanal
      </a>
    </div>
  );
}
