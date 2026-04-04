import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Remarkable } from "remarkable";
import { linkify } from "remarkable/linkify";
import { useLocalStorage } from "../../../Hooks/LocalStorage";
import { InitialVal } from "../../../Constants/constants";
import Toolbar from "./Toolbar";
import fileDownload from "js-file-download";
import { Link } from "react-router-dom";
import {
  FileText, Eye, Download, Type, Hash, Sun, Moon,
  Copy, Check, AlignLeft, Clock, Maximize, Minimize,
  Search, X, Replace, Undo2, Redo2, FileDown, Printer,
  WrapText, ChevronsUpDown,
} from "lucide-react";

// ─── Undo/Redo stack ───
interface HistoryEntry { text: string; cursor: number; }

function useUndoRedo(initial: string) {
  const [stack, setStack] = useState<HistoryEntry[]>([{ text: initial, cursor: initial.length }]);
  const [index, setIndex] = useState(0);

  const push = useCallback((text: string, cursor: number) => {
    setStack(prev => {
      const trimmed = prev.slice(0, index + 1);
      // Don't push if identical to current
      if (trimmed[trimmed.length - 1]?.text === text) return trimmed;
      const next = [...trimmed, { text, cursor }];
      // Cap at 100 entries
      if (next.length > 100) next.shift();
      return next;
    });
    setIndex(prev => Math.min(prev + 1, 100));
  }, [index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(i => i - 1);
      return stack[index - 1];
    }
    return null;
  }, [index, stack]);

  const redo = useCallback(() => {
    if (index < stack.length - 1) {
      setIndex(i => i + 1);
      return stack[index + 1];
    }
    return null;
  }, [index, stack]);

  return { push, undo, redo, canUndo: index > 0, canRedo: index < stack.length - 1 };
}

export default function MarkdownEditor() {
  const md = new Remarkable({ html: true, xhtmlOut: true, langPrefix: "language-", quotes: "\u201C\u201D\u2018\u2019", typographer: true });
  md.use(linkify);

  const [userInput, updateStorageInput] = useLocalStorage("mdEditor", InitialVal);
  const [userOut, setOut] = useState("");
  const [activePane, setActivePane] = useState<"input" | "preview">("input");
  const [splitX, setSplitX] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState<"html" | "md" | "rich" | false>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [searchCount, setSearchCount] = useState(0);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [scrollSync, setScrollSync] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === "dark";
  const history = useUndoRedo(userInput);

  useEffect(() => { setOut(md.render(userInput)); }, [userInput]);

  // Stats
  const wordCount = userInput.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = userInput.split("\n").length;
  const charCount = userInput.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Search count
  useEffect(() => {
    if (!searchTerm) { setSearchCount(0); return; }
    try {
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      setSearchCount((userInput.match(regex) || []).length);
    } catch { setSearchCount(0); }
  }, [searchTerm, userInput]);

  // ─── Input handler with undo history ───
  const handleInputChange = useCallback((newVal: string) => {
    updateStorageInput(newVal);
    const cursor = textareaRef.current?.selectionStart || 0;
    history.push(newVal, cursor);
  }, []);

  // ─── Undo / Redo ───
  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (entry) {
      updateStorageInput(entry.text);
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(entry.cursor, entry.cursor);
        textareaRef.current?.focus();
      }, 0);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (entry) {
      updateStorageInput(entry.text);
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(entry.cursor, entry.cursor);
        textareaRef.current?.focus();
      }, 0);
    }
  }, [history]);

  // ─── Search & Replace ───
  const findNext = useCallback(() => {
    if (!searchTerm || !textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.selectionEnd || 0;
    const idx = userInput.toLowerCase().indexOf(searchTerm.toLowerCase(), start);
    if (idx !== -1) {
      ta.setSelectionRange(idx, idx + searchTerm.length);
      ta.focus();
    } else {
      // Wrap to beginning
      const wrapIdx = userInput.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (wrapIdx !== -1) {
        ta.setSelectionRange(wrapIdx, wrapIdx + searchTerm.length);
        ta.focus();
      }
    }
  }, [searchTerm, userInput]);

  const replaceOne = useCallback(() => {
    if (!searchTerm || !textareaRef.current) return;
    const ta = textareaRef.current;
    const selText = userInput.substring(ta.selectionStart, ta.selectionEnd);
    if (selText.toLowerCase() === searchTerm.toLowerCase()) {
      const newVal = userInput.substring(0, ta.selectionStart) + replaceTerm + userInput.substring(ta.selectionEnd);
      handleInputChange(newVal);
      setTimeout(() => { ta.setSelectionRange(ta.selectionStart, ta.selectionStart + replaceTerm.length); ta.focus(); }, 0);
    } else {
      findNext();
    }
  }, [searchTerm, replaceTerm, userInput, findNext, handleInputChange]);

  const replaceAll = useCallback(() => {
    if (!searchTerm) return;
    try {
      const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      handleInputChange(userInput.replace(regex, replaceTerm));
    } catch {}
  }, [searchTerm, replaceTerm, userInput, handleInputChange]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "f") { e.preventDefault(); setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (mod && e.key === "z" && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (mod && e.key === "y") { e.preventDefault(); handleRedo(); }
      if (e.key === "Escape") { setShowSearch(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // ─── Scroll sync ───
  const handleInputScroll = useCallback(() => {
    if (!scrollSync || !textareaRef.current || !previewRef.current) return;
    const ta = textareaRef.current;
    const pct = ta.scrollTop / (ta.scrollHeight - ta.clientHeight || 1);
    const preview = previewRef.current;
    preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);
  }, [scrollSync]);

  // ─── Fullscreen ───
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Copy ───
  const copyToClipboard = async (text: string, type: "html" | "md") => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(type);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Copy Rich Text (formatted — pastes into Confluence, Notion, Google Docs) ───
  const copyRichText = async () => {
    try {
      const blob = new Blob([userOut], { type: "text/html" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": new Blob([userInput], { type: "text/plain" }),
        }),
      ]);
    } catch {
      // Fallback: use execCommand with a hidden contenteditable div
      const div = document.createElement("div");
      div.contentEditable = "true";
      div.innerHTML = userOut;
      div.style.position = "fixed";
      div.style.left = "-9999px";
      document.body.appendChild(div);
      const range = document.createRange();
      range.selectNodeContents(div);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.execCommand("copy");
      document.body.removeChild(div);
    }
    setCopied("rich");
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Export HTML file ───
  const exportHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>README</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #24292e; }
h1, h2 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid #dfe2e5; margin: 0; padding: 0 1em; color: #6a737d; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
th { background: #f6f8fa; font-weight: 600; }
img { max-width: 100%; }
a { color: #0366d6; }
hr { border: none; border-top: 1px solid #eaecef; margin: 24px 0; }
</style>
</head>
<body>
${userOut}
</body>
</html>`;
    fileDownload(fullHtml, "README.html");
  };

  // ─── Resize ───
  const onDragStart = useCallback(() => setDragging(true), []);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitX(Math.max(25, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // ─── Line numbers ───
  const lineNumbers = userInput.split("\n").map((_, i) => i + 1);

  // Theme
  const bg0 = isDark ? "bg-[#0d0d0d]" : "bg-[#f5f5f5]";
  const bg1 = isDark ? "bg-[#161616]" : "bg-white";
  const border = isDark ? "border-white/[0.06]" : "border-black/[0.08]";
  const border2 = isDark ? "border-white/[0.04]" : "border-black/[0.06]";
  const textMuted = isDark ? "text-gray-500" : "text-gray-400";
  const textDim = isDark ? "text-white/40" : "text-gray-500";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const hoverBg = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]";
  const tabPillBg = isDark ? "bg-white/[0.03] border-white/[0.04]" : "bg-black/[0.03] border-black/[0.06]";
  const tabActiveBg = isDark ? "bg-white/[0.07]" : "bg-black/[0.06]";
  const dragBg = isDark ? "bg-[#1a1a1a]" : "bg-gray-200";
  const dragActive = isDark ? "bg-indigo-500/30" : "bg-indigo-500/20";
  const statusBg = isDark ? "bg-[#111111]" : "bg-gray-100";
  const statusText = isDark ? "text-gray-600" : "text-gray-400";
  const inputBg = isDark ? "bg-[#0d0d0d] text-white/75 placeholder-white/15" : "bg-white text-gray-800 placeholder-gray-300";
  const previewBg = isDark ? "bg-gray-50" : "bg-white";
  const searchBg = isDark ? "bg-[#1a1a1a] border-white/[0.06]" : "bg-white border-black/[0.08]";
  const searchInput = isDark ? "bg-white/[0.04] text-white/80 border-white/[0.06] placeholder-white/20" : "bg-gray-50 text-gray-800 border-gray-200 placeholder-gray-400";

  return (
    <div className={`h-screen flex flex-col ${bg0} select-none transition-colors duration-200`}>
      {/* ═══ Top Chrome ═══ */}
      <div className={`flex items-center justify-between px-4 h-12 ${bg1} border-b ${border} shrink-0 transition-colors duration-200`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="LiveDraft" className="w-6 h-6 rounded-md object-cover" />
            <img src="/logo_name.png" alt="LiveDraft" className={`h-3.5 object-contain hidden sm:inline ${isDark ? "" : "invert"}`} />
          </Link>
        </div>

        {/* Center: tabs */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 border ${tabPillBg} transition-colors duration-200`}>
          {(["input", "preview"] as const).map((pane) => {
            const isActive = activePane === pane;
            const Icon = pane === "input" ? FileText : Eye;
            const color = pane === "input" ? "text-indigo-400" : "text-cyan-400";
            return (
              <button key={pane} onClick={() => setActivePane(pane)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${isActive ? textMain : textMuted}`}>
                <Icon size={13} className={isActive ? color : ""} />
                <span className="font-mono">{pane === "input" ? "README.md" : "Preview"}</span>
                {isActive && <motion.div layoutId="activeMdTab" className={`absolute inset-0 ${tabActiveBg} rounded-md -z-10`} transition={{ type: "spring", stiffness: 400, damping: 28 }} />}
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {/* Undo/Redo */}
          <button onClick={handleUndo} disabled={!history.canUndo} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors cursor-pointer ${history.canUndo ? textMuted : "text-gray-700 cursor-not-allowed"}`} title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button onClick={handleRedo} disabled={!history.canRedo} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors cursor-pointer ${history.canRedo ? textMuted : "text-gray-700 cursor-not-allowed"}`} title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={14} />
          </button>

          <div className={`w-px h-5 ${border}`} />

          {/* Search */}
          <button onClick={() => { setShowSearch(!showSearch); setTimeout(() => searchInputRef.current?.focus(), 50); }} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors cursor-pointer ${showSearch ? "text-indigo-400" : textMuted}`} title="Find & Replace (Ctrl+F)">
            <Search size={14} />
          </button>

          {/* Word wrap */}
          <button onClick={() => setWordWrap(!wordWrap)} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors cursor-pointer ${wordWrap ? "text-indigo-400" : textMuted}`} title={wordWrap ? "Disable word wrap" : "Enable word wrap"}>
            <WrapText size={14} />
          </button>

          {/* Line numbers */}
          <button onClick={() => setShowLineNumbers(!showLineNumbers)} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors cursor-pointer ${showLineNumbers ? "text-indigo-400" : textMuted}`} title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}>
            <Hash size={14} />
          </button>

          {/* Scroll sync */}
          <button onClick={() => setScrollSync(!scrollSync)} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors cursor-pointer ${scrollSync ? "text-indigo-400" : textMuted}`} title={scrollSync ? "Disable scroll sync" : "Enable scroll sync"}>
            <ChevronsUpDown size={14} />
          </button>

          <div className={`w-px h-5 ${border}`} />

          {/* Theme */}
          <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors ${textMuted} cursor-pointer`} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className={`flex items-center justify-center w-7 h-7 rounded-lg ${hoverBg} transition-colors ${textMuted} cursor-pointer`} title="Fullscreen">
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>

          <div className={`w-px h-5 ${border}`} />

          {/* Exports */}
          <button onClick={() => copyToClipboard(userInput, "md")}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg ${hoverBg} transition-colors text-[10px] font-semibold tracking-wide cursor-pointer ${copied === "md" ? "text-emerald-400" : textMuted}`}>
            {copied === "md" ? <Check size={11} /> : <Copy size={11} />}
            {copied === "md" ? "Copied!" : "Copy"}
          </button>
          <button onClick={exportHtml}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg ${hoverBg} transition-colors text-[10px] font-semibold tracking-wide cursor-pointer ${textMuted}`} title="Export as HTML file">
            <FileDown size={11} />
            .html
          </button>
          <button onClick={() => fileDownload(userInput, "README.md")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 hover:bg-indigo-500/20 transition-colors text-[10px] font-semibold tracking-wide cursor-pointer">
            <Download size={11} />
            .md
          </button>
        </div>
      </div>

      {/* ═══ Search Bar ═══ */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`overflow-hidden border-b ${border} ${searchBg}`}
          >
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex items-center gap-2 flex-1">
                <Search size={13} className={textMuted} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") findNext(); }}
                  placeholder="Find..."
                  className={`flex-1 text-[12px] px-2.5 py-1.5 rounded-md border outline-none ${searchInput}`}
                />
                {searchTerm && (
                  <span className={`text-[10px] font-mono ${textMuted}`}>{searchCount} found</span>
                )}
                <button onClick={findNext} className={`text-[10px] font-semibold px-2 py-1 rounded-md ${hoverBg} ${textMuted} cursor-pointer`}>Next</button>
              </div>

              <div className={`w-px h-5 ${border}`} />

              <div className="flex items-center gap-2 flex-1">
                <Replace size={13} className={textMuted} />
                <input
                  type="text"
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  placeholder="Replace..."
                  className={`flex-1 text-[12px] px-2.5 py-1.5 rounded-md border outline-none ${searchInput}`}
                />
                <button onClick={replaceOne} className={`text-[10px] font-semibold px-2 py-1 rounded-md ${hoverBg} ${textMuted} cursor-pointer`}>Replace</button>
                <button onClick={replaceAll} className={`text-[10px] font-semibold px-2 py-1 rounded-md ${hoverBg} ${textMuted} cursor-pointer`}>All</button>
              </div>

              <button onClick={() => setShowSearch(false)} className={`flex items-center justify-center w-6 h-6 rounded-md ${hoverBg} ${textMuted} cursor-pointer`}>
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Editor Area ═══ */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Input pane */}
        <div className="flex flex-col overflow-hidden" style={{ width: `${splitX}%` }}>
          <div className={`flex items-center gap-2 px-3 h-9 shrink-0 ${bg1} border-b ${border2} transition-colors duration-200`}>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <FileText size={12} className="text-indigo-400" />
            <span className={`text-[11px] font-mono ${textDim}`}>README.md</span>
            <span className="ml-auto text-[9px] font-semibold tracking-wider text-indigo-400/50 bg-indigo-500/10 px-1.5 py-0.5 rounded">MARKDOWN</span>
          </div>
          <div className={`px-3 py-2 ${isDark ? "bg-[#131313]" : "bg-gray-50"} border-b ${border2} shrink-0 transition-colors duration-200`}>
            <Toolbar clickHandler={() => fileDownload(userInput, "README.md")} theme={theme} />
          </div>
          <div className="flex-1 overflow-auto p-0 flex">
            {/* Line numbers gutter */}
            {showLineNumbers && (
              <div className={`shrink-0 pt-5 pr-0 pl-3 text-right font-mono text-[12px] leading-[1.9] select-none ${isDark ? "text-white/10 bg-[#0a0a0a]" : "text-gray-300 bg-gray-50"} border-r ${border2}`} style={{ minWidth: "3rem" }}>
                {lineNumbers.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              id="textarea_input"
              onChange={(e) => handleInputChange(e.target.value)}
              onScroll={handleInputScroll}
              value={userInput}
              spellCheck={false}
              className={`w-full h-full p-5 ${inputBg} font-mono text-[13px] leading-[1.9] resize-none outline-none border-0 transition-colors duration-200 ${wordWrap ? "" : "whitespace-pre overflow-x-auto"}`}
              placeholder="Start writing markdown..."
            />
          </div>
        </div>

        {/* Drag handle */}
        <div onMouseDown={onDragStart} className={`w-1.5 flex flex-col items-center justify-center cursor-col-resize group shrink-0 transition-colors ${dragging ? dragActive : dragBg}`}>
          <div className="flex flex-col gap-0.5">
            {[0, 1, 2].map((i) => (<div key={i} className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-400 transition-colors" />))}
          </div>
        </div>

        {/* Preview pane */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className={`flex items-center gap-2 px-3 h-9 shrink-0 ${bg1} border-b ${border2} transition-colors duration-200`}>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <Eye size={12} className="text-cyan-400" />
            <span className={`text-[11px] font-mono ${textDim}`}>Preview</span>
            <div className="ml-auto flex items-center gap-1">
              {/* Copy Rich Text — for pasting into Confluence, Notion, Google Docs */}
              <button onClick={copyRichText}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all text-[10px] font-semibold tracking-wide cursor-pointer ${copied === "rich" ? "bg-emerald-500/15 text-emerald-400" : `${hoverBg} ${textMuted}`}`}
                title="Copy as rich text (paste into Confluence, Notion, Google Docs)">
                {copied === "rich" ? <Check size={11} /> : <Copy size={11} />}
                {copied === "rich" ? "Copied!" : "Copy Rich Text"}
              </button>
              {/* Copy raw HTML source */}
              <button onClick={() => copyToClipboard(userOut, "html")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all text-[10px] font-semibold tracking-wide cursor-pointer ${copied === "html" ? "bg-emerald-500/15 text-emerald-400" : `${hoverBg} ${textMuted}`}`}
                title="Copy raw HTML source code">
                {copied === "html" ? <Check size={11} /> : <Copy size={11} />}
                {copied === "html" ? "Copied!" : "Copy HTML"}
              </button>
            </div>
          </div>
          <div ref={previewRef} className={`flex-1 overflow-auto ${previewBg} transition-colors duration-200`}>
            <div
              className="p-8 max-w-none prose prose-sm text-gray-800 font-sans leading-relaxed
                prose-headings:text-gray-900 prose-headings:font-semibold
                prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2 prose-h1:mb-4
                prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-1.5 prose-h2:mb-3
                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:font-mono prose-code:text-pink-600
                prose-pre:bg-gray-900 prose-pre:text-gray-200 prose-pre:rounded-lg prose-pre:border prose-pre:border-gray-800
                prose-blockquote:border-l-indigo-400 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-0.5 prose-blockquote:text-gray-600
                prose-img:rounded-lg prose-img:shadow-md
                prose-table:text-sm prose-th:bg-gray-50 prose-th:font-semibold
                prose-hr:border-gray-200
                prose-li:marker:text-gray-400"
              style={{ minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}
              dangerouslySetInnerHTML={{ __html: userOut }}
            />
          </div>
        </div>
      </div>

      {/* ═══ Status Bar ═══ */}
      <div className={`flex items-center justify-between px-4 h-6 ${statusBg} border-t ${border2} text-[10px] ${statusText} shrink-0 transition-colors duration-200`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Type size={9} /> {wordCount} words</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Hash size={9} /> {lineCount} lines</span>
          <span>•</span>
          <span className="flex items-center gap-1"><AlignLeft size={9} /> {charCount} chars</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock size={9} /> {readTime} min read</span>
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>•</span>
          <span>{wordWrap ? "Wrap" : "No Wrap"}</span>
          <span>•</span>
          <span>{scrollSync ? "Sync" : "Free"}</span>
          <span>•</span>
          <span>{isDark ? "Dark" : "Light"}</span>
        </div>
      </div>
    </div>
  );
}
