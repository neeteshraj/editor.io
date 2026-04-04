import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CodeEditor from "../Editor/Web/Editor";
import { useLocalStorage } from "../../Hooks/LocalStorage";
import { htmlDefault, cssDefault } from "../../Constants/constants";
import {
  FileCode2, Palette, Braces, Play, Square,
  Sun, Moon, TerminalSquare, Monitor,
  AlertCircle, Info, AlertTriangle, Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

const TABS = [
  { key: "html" as const, label: "index.html", icon: FileCode2, colorClass: "text-orange-400", bgClass: "bg-orange-500" },
  { key: "css" as const, label: "style.css", icon: Palette, colorClass: "text-blue-400", bgClass: "bg-blue-500" },
  { key: "js" as const, label: "script.js", icon: Braces, colorClass: "text-yellow-400", bgClass: "bg-yellow-500" },
];

const MODES: Record<string, string> = { html: "xml", css: "css", js: "javascript" };

interface ConsoleLine {
  type: "log" | "error" | "warn" | "info";
  args: string[];
  ts: number;
}

// Console interceptor injected into the iframe
const CONSOLE_SCRIPT = `<script>
(function(){
  var _p = function(t, a) {
    try {
      parent.postMessage({
        __ld: true, type: t,
        args: [].slice.call(a).map(function(x) {
          if (typeof x === 'object') try { return JSON.stringify(x,null,2); } catch(e) { return String(x); }
          return String(x);
        })
      }, '*');
    } catch(e) {}
  };
  var _l=console.log, _e=console.error, _w=console.warn, _i=console.info;
  console.log=function(){_p('log',arguments);_l.apply(console,arguments);};
  console.error=function(){_p('error',arguments);_e.apply(console,arguments);};
  console.warn=function(){_p('warn',arguments);_w.apply(console,arguments);};
  console.info=function(){_p('info',arguments);_i.apply(console,arguments);};
  window.onerror=function(m,u,l){_p('error',[m+(l?' (line '+l+')':'')]);};
})();
<\/script>`;

export default function WebEditor() {
  const [htmlVal, saveHtml] = useLocalStorage("html", htmlDefault);
  const [cssVal, saveCss] = useLocalStorage("css", cssDefault);
  const [jsVal, saveJs] = useLocalStorage("js", "");

  const [html, setHtml] = useState(htmlVal);
  const [css, setCss] = useState(cssVal);
  const [js, setJs] = useState(jsVal);
  const [activeTab, setActiveTab] = useState<"html" | "css" | "js">("html");
  const [splitY, setSplitY] = useState(55);
  const [dragging, setDragging] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [outputTab, setOutputTab] = useState<"preview" | "console">("preview");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

  // Debounced save to localStorage
  useEffect(() => {
    const t = setTimeout(() => { saveHtml(html); saveCss(css); saveJs(js); }, 300);
    return () => clearTimeout(t);
  }, [html, css, js]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.__ld) {
        setConsoleLogs((prev) => {
          // Cap at 500 to avoid memory issues
          const next = [...prev, { type: e.data.type, args: e.data.args, ts: Date.now() }];
          return next.length > 500 ? next.slice(-500) : next;
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  // Build srcDoc — debounced to avoid iframe reload on every keystroke
  const [srcDoc, setSrcDoc] = useState("");
  useEffect(() => {
    if (!isLive) { setSrcDoc(""); return; }
    const t = setTimeout(() => {
      setSrcDoc(`<!DOCTYPE html><html><head>
<style>${css}</style>
${CONSOLE_SCRIPT}
</head><body>
${html}
<script>${js}<\/script>
</body></html>`);
    }, 300);
    return () => clearTimeout(t);
  }, [html, css, js, isLive]);

  // Vertical resize
  const onDragStart = useCallback(() => setDragging(true), []);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitY(Math.max(25, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100)));
    };
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const values: Record<string, string> = { html, css, js };
  const setters: Record<string, (v: string) => void> = { html: setHtml, css: setCss, js: setJs };

  // Theme helpers
  const bg0 = isDark ? "bg-[#0d0d0d]" : "bg-[#f5f5f5]";
  const bg1 = isDark ? "bg-[#161616]" : "bg-white";
  const border = isDark ? "border-white/[0.06]" : "border-black/[0.08]";
  const border2 = isDark ? "border-white/[0.04]" : "border-black/[0.06]";
  const textMuted = isDark ? "text-gray-500" : "text-gray-400";
  const textDim = isDark ? "text-white/40" : "text-gray-500";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const hoverBg = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]";
  const tabActiveBg = isDark ? "bg-white/[0.07]" : "bg-black/[0.06]";
  const tabPillBg = isDark ? "bg-white/[0.03] border-white/[0.04]" : "bg-black/[0.03] border-black/[0.06]";
  const dragBg = isDark ? "bg-[#1a1a1a]" : "bg-gray-200";
  const dragActive = isDark ? "bg-indigo-500/30" : "bg-indigo-500/20";
  const statusBg = isDark ? "bg-[#111111]" : "bg-gray-100";
  const statusText = isDark ? "text-gray-600" : "text-gray-400";
  const consoleBg = isDark ? "bg-[#0d0d0d]" : "bg-[#fafafa]";
  const consoleLineBorder = isDark ? "border-white/[0.03]" : "border-black/[0.04]";

  const errorCount = consoleLogs.filter((l) => l.type === "error").length;
  const warnCount = consoleLogs.filter((l) => l.type === "warn").length;

  return (
    <div ref={containerRef} className={`h-screen flex flex-col ${bg0} select-none transition-colors duration-200`}>
      {/* ═══ Top Chrome ═══ */}
      <div className={`flex items-center justify-between px-4 h-12 ${bg1} border-b ${border} shrink-0 transition-colors duration-200`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="LiveDraft" className="w-6 h-6 rounded-md object-cover" />
            <img src="/logo_name.png" alt="LiveDraft" className={`h-3.5 object-contain hidden sm:inline ${isDark ? "" : "invert"}`} />
          </Link>
        </div>

        {/* Center: file tabs */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 border ${tabPillBg} transition-colors duration-200`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                  isActive ? textMain : textMuted
                }`}
              >
                <Icon size={13} className={isActive ? tab.colorClass : ""} />
                <span className="font-mono">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeEditorTab"
                    className={`absolute inset-0 ${tabActiveBg} rounded-md -z-10`}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`flex items-center justify-center w-8 h-8 rounded-lg ${hoverBg} transition-colors ${textMuted} cursor-pointer`}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className={`w-px h-5 ${border}`} />
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${
              isLive
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {isLive ? (
              <>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE
              </>
            ) : (
              <>
                <Square size={10} fill="currentColor" />
                OFF
              </>
            )}
          </button>
          {!isLive && (
            <button
              onClick={() => setIsLive(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors text-[11px] font-medium cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              Run
            </button>
          )}
        </div>
      </div>

      {/* ═══ Editor Panes ═══ */}
      <div className="flex min-h-0" style={{ height: `${splitY}%` }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <div
              key={tab.key}
              className={`flex flex-col border-r ${border2} last:border-r-0 transition-all duration-200 overflow-hidden ${
                isActive ? "flex-[2]" : "flex-1"
              }`}
            >
              <div
                className={`flex items-center gap-2 px-3 h-9 shrink-0 ${bg1} border-b ${border2} cursor-pointer transition-colors duration-200`}
                onClick={() => setActiveTab(tab.key)}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${tab.bgClass}`} />
                <Icon size={12} className={tab.colorClass} />
                <span className={`text-[11px] font-mono ${textDim}`}>{tab.label}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  language={MODES[tab.key]}
                  value={values[tab.key]}
                  onChange={(val: string) => setters[tab.key](val)}
                  theme={theme}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Drag Handle ═══ */}
      <div
        onMouseDown={onDragStart}
        className={`h-1.5 flex items-center justify-center cursor-row-resize group transition-colors shrink-0 ${
          dragging ? dragActive : dragBg
        }`}
      >
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-400 transition-colors" />
          ))}
        </div>
      </div>

      {/* ═══ Output Area ═══ */}
      <div className={`flex-1 flex flex-col min-h-0 ${bg1} transition-colors duration-200`}>
        {/* Output tabs */}
        <div className={`flex items-center justify-between px-2 h-9 border-b ${border2} shrink-0 transition-colors duration-200`}>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setOutputTab("preview")}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                outputTab === "preview" ? textMain : textMuted
              }`}
            >
              <Monitor size={12} />
              Output
              {outputTab === "preview" && (
                <motion.div layoutId="outputTabIndicator" className={`absolute inset-0 ${tabActiveBg} rounded-md -z-10`} transition={{ type: "spring", stiffness: 400, damping: 28 }} />
              )}
            </button>
            <button
              onClick={() => setOutputTab("console")}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-all ${
                outputTab === "console" ? textMain : textMuted
              }`}
            >
              <TerminalSquare size={12} />
              Console
              {consoleLogs.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  errorCount > 0 ? "bg-red-500/15 text-red-400" : warnCount > 0 ? "bg-yellow-500/15 text-yellow-400" : "bg-white/[0.06] text-gray-400"
                }`}>
                  {consoleLogs.length}
                </span>
              )}
              {outputTab === "console" && (
                <motion.div layoutId="outputTabIndicator" className={`absolute inset-0 ${tabActiveBg} rounded-md -z-10`} transition={{ type: "spring", stiffness: 400, damping: 28 }} />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1">
            {outputTab === "console" && consoleLogs.length > 0 && (
              <button
                onClick={() => setConsoleLogs([])}
                className={`flex items-center gap-1 px-2 py-1 rounded-md ${hoverBg} ${textMuted} text-[10px] font-medium cursor-pointer transition-colors`}
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {outputTab === "preview" ? (
            <AnimatePresence mode="wait">
              {isLive ? (
                <motion.iframe
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  srcDoc={srcDoc}
                  className="w-full h-full bg-white border-0 absolute inset-0"
                  title="output"
                  sandbox="allow-scripts allow-modals"
                />
              ) : (
                <motion.div
                  key="stopped"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`w-full h-full flex flex-col items-center justify-center gap-3 ${isDark ? "text-gray-600" : "text-gray-400"}`}
                >
                  <Play size={32} className="opacity-30" />
                  <p className="text-sm font-medium">Preview paused</p>
                  <button
                    onClick={() => setIsLive(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Play size={14} fill="currentColor" />
                    Resume
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className={`w-full h-full overflow-auto ${consoleBg} font-mono text-[12px] leading-[1.6]`}>
              {consoleLogs.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full gap-2 ${textMuted}`}>
                  <TerminalSquare size={24} className="opacity-30" />
                  <p className="text-[12px]">Console output will appear here</p>
                </div>
              ) : (
                consoleLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-4 py-1.5 border-b ${consoleLineBorder} ${
                      log.type === "error" ? (isDark ? "bg-red-500/[0.04]" : "bg-red-50")
                        : log.type === "warn" ? (isDark ? "bg-yellow-500/[0.04]" : "bg-yellow-50")
                        : ""
                    }`}
                  >
                    <span className="shrink-0 mt-0.5">
                      {log.type === "error" ? <AlertCircle size={12} className="text-red-400" />
                        : log.type === "warn" ? <AlertTriangle size={12} className="text-yellow-400" />
                        : log.type === "info" ? <Info size={12} className="text-blue-400" />
                        : <span className={`inline-block w-3 text-center ${textMuted}`}>&gt;</span>}
                    </span>
                    <span className={`flex-1 break-all whitespace-pre-wrap ${
                      log.type === "error" ? "text-red-400" : log.type === "warn" ? "text-yellow-400" : isDark ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {log.args.join(" ")}
                    </span>
                    <span className={`shrink-0 text-[9px] ${textMuted} tabular-nums`}>
                      {new Date(log.ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ═══ Status Bar ═══ */}
      <div className={`flex items-center justify-between px-4 h-6 ${statusBg} border-t ${border2} text-[10px] ${statusText} shrink-0 transition-colors duration-200`}>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>•</span>
          <span>{TABS.find((t) => t.key === activeTab)?.label}</span>
          {errorCount > 0 && (
            <>
              <span>•</span>
              <span className="text-red-400 flex items-center gap-1"><AlertCircle size={9} /> {errorCount}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Spaces: 2</span>
          <span>•</span>
          <span>{isLive ? "Live" : "Off"}</span>
          <span>•</span>
          <span>{isDark ? "Dark" : "Light"}</span>
        </div>
      </div>
    </div>
  );
}
