import { useEffect, useRef } from "react";
import {
  SplitSquareHorizontal, SplitSquareVertical,
  Columns2, Rows2, Trash2, Pencil, Copy, FileCode2,
} from "lucide-react";

export interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  divider?: boolean;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  isDark: boolean;
}

export default function ContextMenu({ x, y, items, onClose, isDark }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  // Clamp to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - items.length * 32 - 16),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 9999,
  };

  return (
    <div
      ref={ref}
      style={style}
      className={`w-52 rounded-lg border shadow-2xl py-1 text-[12px] ${
        isDark
          ? "bg-[#1e1e1e] border-white/[0.08] shadow-black/60"
          : "bg-white border-gray-200 shadow-gray-300/40"
      }`}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && (
            <div className={`my-1 h-px ${isDark ? "bg-white/[0.06]" : "bg-gray-100"}`} />
          )}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors cursor-pointer ${
              item.danger
                ? `${isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50"}`
                : `${isDark ? "text-gray-300 hover:bg-white/[0.06]" : "text-gray-700 hover:bg-gray-50"}`
            }`}
          >
            <span className={isDark ? "text-gray-500" : "text-gray-400"}>{item.icon}</span>
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper to build file context menu items
export function getFileContextMenu(
  path: string,
  options: {
    onOpen: (path: string) => void;
    onSplitRight: (path: string) => void;
    onSplitDown: (path: string) => void;
    onCopyPath: (path: string) => void;
    onRename: (path: string) => void;
    onDelete: (path: string) => void;
  }
): ContextMenuItem[] {
  return [
    { label: "Open", icon: <FileCode2 size={13} />, onClick: () => options.onOpen(path) },
    { label: "Open to the Right", icon: <Columns2 size={13} />, onClick: () => options.onSplitRight(path), divider: true },
    { label: "Open Below", icon: <Rows2 size={13} />, onClick: () => options.onSplitDown(path) },
    { label: "Copy Path", icon: <Copy size={13} />, onClick: () => options.onCopyPath(path), divider: true },
    { label: "Rename", icon: <Pencil size={13} />, onClick: () => options.onRename(path) },
    { label: "Delete", icon: <Trash2 size={13} />, onClick: () => options.onDelete(path), danger: true, divider: true },
  ];
}
