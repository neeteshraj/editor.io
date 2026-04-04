import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { transform } from "sucrase";
import JSZip from "jszip";
import fileDownload from "js-file-download";
import CodeEditor from "../Editor/Web/Editor";
import FileTreeNode from "./FileTree";
import { getFS, VirtualFS, FSNode } from "../../lib/virtual-fs";
import {
  Play, Square, Sun, Moon, TerminalSquare, Monitor,
  AlertCircle, Info, AlertTriangle, Trash2,
  Package, ChevronRight, X, FileCode2, FolderPlus, Plus,
  Download, RotateCcw, PanelLeftClose, PanelLeft, FileDown,
  Columns2, Rows2, Copy, Pencil, FileJson, Palette, FileText, File,
} from "lucide-react";
import { Link } from "react-router-dom";
import ContextMenu, { ContextMenuItem, getFileContextMenu } from "./ContextMenu";

interface ConsoleLine { type: "log" | "error" | "warn" | "info"; args: string[]; ts: number; }
interface InstalledPackage { name: string; version: string; url: string; }

const CONSOLE_SCRIPT = `<script>
(function(){
  var _p=function(t,a){try{parent.postMessage({__ld:true,type:t,args:[].slice.call(a).map(function(x){if(typeof x==='object')try{return JSON.stringify(x,null,2)}catch(e){return String(x)}return String(x)})},\"*\")}catch(e){}};
  var _l=console.log,_e=console.error,_w=console.warn,_i=console.info;
  console.log=function(){_p('log',arguments);_l.apply(console,arguments)};
  console.error=function(){_p('error',arguments);_e.apply(console,arguments)};
  console.warn=function(){_p('warn',arguments);_w.apply(console,arguments)};
  console.info=function(){_p('info',arguments);_i.apply(console,arguments)};
  window.onerror=function(m,u,l){_p('error',[m+(l?' (line '+l+')':'')])};
})();
<\/script>`;

export default function TypeScriptEditor() {
  const fs = useMemo(() => getFS(), []);
  const [, forceUpdate] = useState(0);
  const [activePath, setActivePath] = useState("src/index.ts");
  const [openTabs, setOpenTabs] = useState<string[]>(["src/index.ts"]);
  const [splitX, setSplitX] = useState(20); // sidebar width %
  const [splitY, setSplitY] = useState(55);
  const [draggingX, setDraggingX] = useState(false);
  const [draggingY, setDraggingY] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [outputTab, setOutputTab] = useState<"preview" | "console" | "terminal">("console");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLine[]>([]);
  const [packages, setPackages] = useState<InstalledPackage[]>([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [compiledJs, setCompiledJs] = useState("");
  const [compileError, setCompileError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [promptInput, setPromptInput] = useState<{ type: "file" | "dir" | "rename"; path: string } | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  // Split editors: secondary pane (null = no split)
  const [splitEditor, setSplitEditor] = useState<{ path: string; direction: "right" | "down" } | null>(null);
  const [splitEditorRatio, setSplitEditorRatio] = useState(50);
  const [draggingSplit, setDraggingSplit] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === "dark";

  // Subscribe to FS changes
  useEffect(() => {
    const unsub = fs.subscribe(() => forceUpdate((n) => n + 1));
    return unsub;
  }, [fs]);

  // Active file content
  const activeContent = fs.readFile(activePath) ?? "";
  const activeNode = fs.resolve(activePath);
  const activeLanguage = activeNode?.language || "text";

  // Compile all TS files into a single bundle
  useEffect(() => {
    if (!isLive) return;
    const t = setTimeout(() => {
      try {
        // Get entry file
        const entryContent = fs.readFile("src/index.ts") || fs.readFile("src/index.js") || activeContent;

        // Simple: compile the active file if it's TS/JS
        const code = activeLanguage === "typescript" || activeLanguage === "javascript" ? activeContent : entryContent;
        if (!code.trim()) { setCompiledJs(""); setCompileError(""); return; }

        // Strip import statements for local files (they won't resolve in iframe)
        // Keep imports for npm packages
        const lines = code.split("\n");
        const processedLines = lines.map((line) => {
          // Keep npm package imports
          if (line.match(/^\s*import\s+.*from\s+["'][^./]/)) return line;
          // Comment out local imports
          if (line.match(/^\s*import\s+/)) return `// ${line} // (local import)`;
          if (line.match(/^\s*export\s+default\s+function\s/)) return line.replace(/export\s+default\s+/, "");
          if (line.match(/^\s*export\s+default\s+class\s/)) return line.replace(/export\s+default\s+/, "");
          if (line.match(/^\s*export\s+default\s+/)) return line.replace(/export\s+default\s+/, "const _default = ");
          if (line.match(/^\s*export\s+/)) return line.replace(/^(\s*)export\s+/, "$1");
          return line;
        });

        const result = transform(processedLines.join("\n"), {
          transforms: ["typescript", "jsx"],
          production: true,
        });
        setCompiledJs(result.code);
        setCompileError("");
      } catch (e: unknown) {
        setCompileError(e instanceof Error ? e.message : "Compilation error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [activeContent, isLive, activeLanguage]);

  // Console messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.__ld) {
        setConsoleLogs((prev) => {
          const next = [...prev, { type: e.data.type, args: e.data.args, ts: Date.now() }];
          return next.length > 500 ? next.slice(-500) : next;
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => { consoleEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [consoleLogs]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [terminalHistory]);

  // srcDoc
  const [srcDoc, setSrcDoc] = useState("");
  useEffect(() => {
    if (!isLive || !compiledJs) { setSrcDoc(""); return; }
    const importMap = packages.length > 0
      ? `<script type="importmap">{"imports":{${packages.map((p) => `"${p.name}":"${p.url}"`).join(",")}}}<\/script>`
      : "";
    const cssContent = fs.readFile("styles/main.css") || "";
    setSrcDoc(`<!DOCTYPE html><html><head>${importMap}<style>${cssContent}</style>${CONSOLE_SCRIPT}</head><body><div id="root"></div><div id="app"></div><script type="module">${compiledJs}<\/script></body></html>`);
  }, [compiledJs, isLive, packages]);

  // ── File operations ──
  const openFile = (path: string) => {
    const node = fs.resolve(path);
    if (!node || node.type !== "file") return;
    setActivePath(path);
    if (!openTabs.includes(path)) setOpenTabs([...openTabs, path]);
  };

  const closeTab = (path: string) => {
    const newTabs = openTabs.filter((t) => t !== path);
    setOpenTabs(newTabs);
    if (activePath === path) setActivePath(newTabs[newTabs.length - 1] || "");
  };

  const handleEditorChange = useCallback((val: string) => {
    fs.writeFile(activePath, val);
  }, [activePath, fs]);

  // ── Prompt for new file/dir/rename ──
  const handlePromptSubmit = () => {
    if (!promptInput || !promptValue.trim()) { setPromptInput(null); return; }
    const val = promptValue.trim();
    if (promptInput.type === "file") {
      fs.createFile(`${promptInput.path}/${val}`);
      openFile(`${promptInput.path}/${val}`);
    } else if (promptInput.type === "dir") {
      fs.createDirectory(`${promptInput.path}/${val}`);
    } else if (promptInput.type === "rename") {
      fs.rename(promptInput.path, val);
    }
    setPromptInput(null);
    setPromptValue("");
  };

  // ── Context menu ──
  const handleFileContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    if (isDir) {
      setContextMenu({
        x: e.clientX, y: e.clientY,
        items: [
          { label: "New File", icon: <Plus size={13} />, onClick: () => { setPromptInput({ type: "file", path }); setPromptValue(""); setTimeout(() => promptInputRef.current?.focus(), 50); } },
          { label: "New Folder", icon: <FolderPlus size={13} />, onClick: () => { setPromptInput({ type: "dir", path }); setPromptValue(""); setTimeout(() => promptInputRef.current?.focus(), 50); } },
          { label: "Rename", icon: <Pencil size={13} />, onClick: () => { setPromptInput({ type: "rename", path }); setPromptValue(path.split("/").pop() || ""); setTimeout(() => promptInputRef.current?.focus(), 50); }, divider: true },
          { label: "Delete", icon: <Trash2 size={13} />, onClick: () => { fs.delete(path); }, danger: true, divider: true },
        ],
      });
    } else {
      setContextMenu({
        x: e.clientX, y: e.clientY,
        items: getFileContextMenu(path, {
          onOpen: openFile,
          onSplitRight: (p) => { setSplitEditor({ path: p, direction: "right" }); },
          onSplitDown: (p) => { setSplitEditor({ path: p, direction: "down" }); },
          onCopyPath: (p) => { navigator.clipboard.writeText(p); },
          onRename: (p) => { setPromptInput({ type: "rename", path: p }); setPromptValue(p.split("/").pop() || ""); setTimeout(() => promptInputRef.current?.focus(), 50); },
          onDelete: (p) => { fs.delete(p); if (openTabs.includes(p)) closeTab(p); if (splitEditor?.path === p) setSplitEditor(null); },
        }),
      });
    }
  };

  // ── Tab context menu ──
  const handleTabContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: "Open to the Right", icon: <Columns2 size={13} />, onClick: () => setSplitEditor({ path, direction: "right" }) },
        { label: "Open Below", icon: <Rows2 size={13} />, onClick: () => setSplitEditor({ path, direction: "down" }) },
        { label: "Close", icon: <X size={13} />, onClick: () => closeTab(path), divider: true },
        { label: "Close Others", icon: <X size={13} />, onClick: () => { setOpenTabs([path]); setActivePath(path); } },
        { label: "Copy Path", icon: <Copy size={13} />, onClick: () => navigator.clipboard.writeText(path), divider: true },
      ],
    });
  };

  // ── Tab drag & drop ──
  const handleTabDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData("text/plain");
    if (!sourcePath) return;

    // If dragged from file tree — open it
    if (!openTabs.includes(sourcePath)) {
      openFile(sourcePath);
      return;
    }

    // Reorder tabs
    const sourceIdx = openTabs.indexOf(sourcePath);
    if (sourceIdx === targetIdx) return;
    const newTabs = [...openTabs];
    newTabs.splice(sourceIdx, 1);
    newTabs.splice(targetIdx, 0, sourcePath);
    setOpenTabs(newTabs);
  };

  // ── Split editor resize ──
  useEffect(() => {
    if (!draggingSplit) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (splitEditor?.direction === "right") {
        // Horizontal split within editor area — relative to editor pane
        const editorLeft = sidebarOpen ? (rect.width * splitX / 100) : 0;
        const editorWidth = rect.width - editorLeft;
        const rel = (e.clientX - rect.left - editorLeft) / editorWidth * 100;
        setSplitEditorRatio(Math.max(20, Math.min(80, rel)));
      } else {
        // Vertical split within editor area
        const editorTop = 44; // chrome height approx
        const editorHeight = rect.height * splitY / 100 - editorTop;
        const rel = (e.clientY - rect.top - editorTop) / editorHeight * 100;
        setSplitEditorRatio(Math.max(20, Math.min(80, rel)));
      }
    };
    const onUp = () => setDraggingSplit(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [draggingSplit, splitEditor?.direction, splitX, splitY, sidebarOpen]);

  // Helper for split editor content
  const splitContent = splitEditor ? (fs.readFile(splitEditor.path) ?? "") : "";
  const splitNode = splitEditor ? fs.resolve(splitEditor.path) : null;
  const splitLanguage = splitNode?.language || "text";

  // ── Terminal ──
  const runTerminal = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setTerminalHistory((prev) => [...prev, `$ ${trimmed}`]);

    if (trimmed === "clear") { setTerminalHistory([]); return; }
    if (trimmed === "help") {
      setTerminalHistory((prev) => [...prev,
        "Commands:",
        "  npm install <pkg>   Install package from npm (esm.sh)",
        "  npm i <pkg>         Shorthand",
        "  npm uninstall <pkg> Remove package",
        "  npm ls              List packages",
        "  ls [path]           List directory",
        "  cat <file>          Show file contents",
        "  touch <file>        Create empty file",
        "  mkdir <dir>         Create directory",
        "  rm <path>           Delete file or folder",
        "  tree                Show project tree",
        "  reset               Reset project to default",
        "  export              Download project as .zip",
        "  clear               Clear terminal",
      ]);
      return;
    }

    // ls
    if (trimmed === "ls" || trimmed.startsWith("ls ")) {
      const dir = trimmed.replace(/^ls\s*/, "").trim() || "";
      const items = fs.listDir(dir);
      if (items.length === 0) {
        setTerminalHistory((prev) => [...prev, dir ? `No such directory: ${dir}` : "(empty)"]);
      } else {
        setTerminalHistory((prev) => [...prev, ...items.map((i) => `  ${i.type === "directory" ? "📁" : "📄"} ${i.name}`)]);
      }
      return;
    }

    // tree
    if (trimmed === "tree") {
      setTerminalHistory((prev) => [...prev, ...fs.tree()]);
      return;
    }

    // cat
    if (trimmed.startsWith("cat ")) {
      const path = trimmed.slice(4).trim();
      const content = fs.readFile(path);
      setTerminalHistory((prev) => [...prev, content !== null ? content : `File not found: ${path}`]);
      return;
    }

    // touch
    if (trimmed.startsWith("touch ")) {
      const path = trimmed.slice(6).trim();
      fs.createFile(path, "");
      setTerminalHistory((prev) => [...prev, `Created: ${path}`]);
      return;
    }

    // mkdir
    if (trimmed.startsWith("mkdir ")) {
      const path = trimmed.slice(6).trim();
      fs.createDirectory(path);
      setTerminalHistory((prev) => [...prev, `Created directory: ${path}`]);
      return;
    }

    // rm
    if (trimmed.startsWith("rm ")) {
      const path = trimmed.slice(3).trim();
      fs.delete(path);
      if (openTabs.includes(path)) closeTab(path);
      setTerminalHistory((prev) => [...prev, `Deleted: ${path}`]);
      return;
    }

    // reset
    if (trimmed === "reset") {
      fs.resetToDefault();
      setOpenTabs(["src/index.ts"]);
      setActivePath("src/index.ts");
      setPackages([]);
      setTerminalHistory((prev) => [...prev, "Project reset to default."]);
      return;
    }

    // export
    if (trimmed === "export") {
      await exportProject();
      setTerminalHistory((prev) => [...prev, "Project exported as .zip"]);
      return;
    }

    // npm install
    const installMatch = trimmed.match(/^npm\s+(install|i|add)\s+(.+)$/);
    if (installMatch) {
      const pkgName = installMatch[2].trim().replace(/@[\d^~>=<.*]+$/, "");
      if (packages.find((p) => p.name === pkgName)) {
        setTerminalHistory((prev) => [...prev, `${pkgName} is already installed.`]);
        return;
      }
      setTerminalHistory((prev) => [...prev, `Installing ${pkgName}...`]);
      try {
        const res = await fetch(`https://esm.sh/${pkgName}`, { method: "HEAD" });
        if (!res.ok) throw new Error(`Package "${pkgName}" not found.`);
        const version = res.url.match(/@([\d.]+)/)?.[1] || "latest";
        setPackages((prev) => [...prev, { name: pkgName, version, url: `https://esm.sh/${pkgName}@${version}` }]);
        fs.addDependency(pkgName, version);
        setTerminalHistory((prev) => [...prev, `+ ${pkgName}@${version}`, `  import { ... } from "${pkgName}";`]);
      } catch (e: unknown) {
        setTerminalHistory((prev) => [...prev, `Error: ${e instanceof Error ? e.message : "Unknown error"}`]);
      }
      return;
    }

    // npm uninstall
    const uninstallMatch = trimmed.match(/^npm\s+(uninstall|remove|rm)\s+(.+)$/);
    if (uninstallMatch) {
      const pkgName = uninstallMatch[2].trim();
      if (packages.find((p) => p.name === pkgName)) {
        setPackages((prev) => prev.filter((p) => p.name !== pkgName));
        fs.removeDependency(pkgName);
        setTerminalHistory((prev) => [...prev, `- ${pkgName} removed.`]);
      } else {
        setTerminalHistory((prev) => [...prev, `Package "${pkgName}" not installed.`]);
      }
      return;
    }

    if (trimmed === "npm ls" || trimmed === "npm list") {
      if (packages.length === 0) setTerminalHistory((prev) => [...prev, "No packages installed."]);
      else setTerminalHistory((prev) => [...prev, ...packages.map((p) => `  ${p.name}@${p.version}`)]);
      return;
    }

    setTerminalHistory((prev) => [...prev, `Unknown command. Type "help" for available commands.`]);
  };

  // Export as ZIP
  const exportProject = async () => {
    const zip = new JSZip();
    const files = fs.getAllFiles();
    for (const { path, node } of files) {
      const cleanPath = path.replace(/^project\//, "");
      zip.file(cleanPath, node.content || "");
    }
    const blob = await zip.generateAsync({ type: "blob" });
    fileDownload(blob, "livedraft-project.zip");
  };

  // Resize handlers
  const onDragStartX = useCallback(() => setDraggingX(true), []);
  const onDragStartY = useCallback(() => setDraggingY(true), []);
  useEffect(() => {
    if (!draggingX && !draggingY) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (draggingX) setSplitX(Math.max(12, Math.min(35, ((e.clientX - rect.left) / rect.width) * 100)));
      if (draggingY) setSplitY(Math.max(25, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100)));
    };
    const onUp = () => { setDraggingX(false); setDraggingY(false); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [draggingX, draggingY]);

  // Theme
  const bg0 = isDark ? "bg-[#0d0d0d]" : "bg-[#f5f5f5]";
  const bg1 = isDark ? "bg-[#161616]" : "bg-white";
  const bg2 = isDark ? "bg-[#111111]" : "bg-gray-100";
  const border = isDark ? "border-white/[0.06]" : "border-black/[0.08]";
  const border2 = isDark ? "border-white/[0.04]" : "border-black/[0.06]";
  const textMuted = isDark ? "text-gray-500" : "text-gray-400";
  const textDim = isDark ? "text-white/40" : "text-gray-500";
  const textMain = isDark ? "text-white" : "text-gray-900";
  const hoverBg = isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.04]";
  const tabActiveBg = isDark ? "bg-white/[0.07]" : "bg-black/[0.06]";
  const dragBg = isDark ? "bg-[#1a1a1a]" : "bg-gray-200";
  const dragActive = isDark ? "bg-indigo-500/30" : "bg-indigo-500/20";
  const statusBg = isDark ? "bg-[#111111]" : "bg-gray-100";
  const statusText = isDark ? "text-gray-600" : "text-gray-400";
  const consoleBg = isDark ? "bg-[#0d0d0d]" : "bg-[#fafafa]";
  const consoleLineBorder = isDark ? "border-white/[0.03]" : "border-black/[0.04]";
  const sidebarBg = isDark ? "bg-[#111111]" : "bg-[#f8f8f8]";

  const errorCount = consoleLogs.filter((l) => l.type === "error").length;

  const outputTabs = [
    { key: "preview" as const, label: "Output", icon: Monitor },
    { key: "console" as const, label: "Console", icon: TerminalSquare },
    { key: "terminal" as const, label: "Terminal", icon: Package },
  ];

  return (
    <div ref={containerRef} className={`h-screen flex flex-col ${bg0} select-none transition-colors duration-200`}>
      {/* ═══ Top Chrome ═══ */}
      <div className={`flex items-center justify-between px-3 h-11 ${bg1} border-b ${border} shrink-0 transition-colors duration-200`}>
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="LiveDraft" className="w-5 h-5 rounded object-cover" />
            <img src="/logo_name.png" alt="LiveDraft" className={`h-3 object-contain hidden sm:inline ${isDark ? "" : "invert"}`} />
          </Link>
          <div className={`w-px h-4 ${border} mx-1`} />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`w-7 h-7 flex items-center justify-center rounded-md ${hoverBg} ${textMuted} cursor-pointer`} title="Toggle sidebar">
            {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
          </button>
        </div>

        {/* Open tabs — draggable */}
        <div className="flex items-center gap-px flex-1 mx-4 overflow-x-auto">
          {openTabs.map((tab, idx) => {
            const name = tab.split("/").pop() || tab;
            const ext = name.split(".").pop();
            const isActive = activePath === tab;
            const iconColor = ext === "ts" || ext === "tsx" ? "text-blue-400" : ext === "css" ? "text-purple-400" : ext === "json" ? "text-yellow-300" : ext === "md" ? "text-gray-400" : "text-orange-400";
            const IconComp = ext === "json" ? FileJson : ext === "css" ? Palette : ext === "md" ? FileText : FileCode2;
            return (
              <div key={tab}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", tab); e.dataTransfer.effectAllowed = "move"; setDraggedTab(tab); }}
                onDragEnd={() => setDraggedTab(null)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => handleTabDrop(e, idx)}
                onContextMenu={(e) => handleTabContextMenu(e, tab)}
                className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono cursor-pointer transition-all ${
                  isActive ? textMain : textMuted
                } ${draggedTab === tab ? "opacity-40" : ""}`}
                onClick={() => setActivePath(tab)}
              >
                <IconComp size={11} className={iconColor} />
                {name}
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab); }}
                  className={`ml-0.5 w-4 h-4 flex items-center justify-center rounded ${hoverBg} opacity-0 group-hover:opacity-100 ${isActive ? "opacity-60" : ""}`}>
                  <X size={9} />
                </button>
                {isActive && <motion.div layoutId="activeFileTab" className={`absolute inset-0 ${tabActiveBg} rounded-md -z-10`} transition={{ type: "spring", stiffness: 400, damping: 28 }} />}
              </div>
            );
          })}
          {/* Drop zone for dragging from file tree */}
          <div
            className={`flex-1 min-w-[40px] h-8 rounded-md transition-colors ${draggedTab && !openTabs.includes(draggedTab) ? (isDark ? "bg-indigo-500/10 border border-dashed border-indigo-500/30" : "bg-indigo-50 border border-dashed border-indigo-200") : ""}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => {
              e.preventDefault();
              const path = e.dataTransfer.getData("text/plain");
              if (path) openFile(path);
              setDraggedTab(null);
            }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {packages.length > 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"} text-[10px] font-semibold`}>
              <Package size={10} /> {packages.length}
            </div>
          )}
          <button onClick={() => setTheme(isDark ? "light" : "dark")} className={`w-7 h-7 flex items-center justify-center rounded-md ${hoverBg} ${textMuted} cursor-pointer`}>
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button onClick={exportProject} className={`w-7 h-7 flex items-center justify-center rounded-md ${hoverBg} ${textMuted} cursor-pointer`} title="Export as .zip">
            <FileDown size={13} />
          </button>
          <div className={`w-px h-4 ${border}`} />
          <button onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide cursor-pointer ${
              isLive ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
            {isLive ? <><motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />LIVE</> : <><Square size={9} fill="currentColor" />OFF</>}
          </button>
          {!isLive && <button onClick={() => setIsLive(true)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium cursor-pointer"><Play size={10} fill="currentColor" />Run</button>}
        </div>
      </div>

      {/* ═══ Compile Error ═══ */}
      <AnimatePresence>
        {compileError && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-red-500/10 border-b border-red-500/20">
            <div className="flex items-center gap-2 px-4 py-1.5 text-red-400 text-[11px] font-mono">
              <AlertCircle size={12} /><span className="flex-1 truncate">{compileError}</span>
              <button onClick={() => setCompileError("")} className="cursor-pointer"><X size={12} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Main Area ═══ */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            <div className={`flex flex-col ${sidebarBg} overflow-hidden shrink-0`} style={{ width: `${splitX}%` }}>
              {/* Sidebar header */}
              <div className={`flex items-center justify-between px-3 h-8 border-b ${border2} shrink-0`}>
                <span className={`text-[10px] font-semibold tracking-wider uppercase ${textMuted}`}>Explorer</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => { setPromptInput({ type: "file", path: "src" }); setPromptValue(""); setTimeout(() => promptInputRef.current?.focus(), 50); }}
                    className={`w-5 h-5 flex items-center justify-center rounded ${hoverBg} ${textMuted} cursor-pointer`} title="New File">
                    <Plus size={11} />
                  </button>
                  <button onClick={() => { setPromptInput({ type: "dir", path: "" }); setPromptValue(""); setTimeout(() => promptInputRef.current?.focus(), 50); }}
                    className={`w-5 h-5 flex items-center justify-center rounded ${hoverBg} ${textMuted} cursor-pointer`} title="New Folder">
                    <FolderPlus size={11} />
                  </button>
                </div>
              </div>

              {/* Prompt */}
              <AnimatePresence>
                {promptInput && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className={`overflow-hidden border-b ${border2}`}>
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <input ref={promptInputRef} type="text" value={promptValue} onChange={(e) => setPromptValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handlePromptSubmit(); if (e.key === "Escape") setPromptInput(null); }}
                        placeholder={promptInput.type === "rename" ? "New name" : promptInput.type === "file" ? "filename.ts" : "folder-name"}
                        className={`flex-1 text-[11px] px-2 py-1 rounded border outline-none font-mono ${isDark ? "bg-white/[0.04] text-white/80 border-white/[0.06]" : "bg-gray-50 text-gray-800 border-gray-200"}`}
                      />
                      <button onClick={() => setPromptInput(null)} className={`${textMuted} cursor-pointer`}><X size={12} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* File tree */}
              <div className="flex-1 overflow-auto py-1">
                <FileTreeNode
                  node={fs.getRoot()}
                  path=""
                  activePath={activePath}
                  onSelect={openFile}
                  onCreateFile={(dir) => { setPromptInput({ type: "file", path: dir }); setPromptValue(""); setTimeout(() => promptInputRef.current?.focus(), 50); }}
                  onCreateDir={(dir) => { setPromptInput({ type: "dir", path: dir }); setPromptValue(""); setTimeout(() => promptInputRef.current?.focus(), 50); }}
                  onDelete={(path) => { fs.delete(path); if (openTabs.includes(path)) closeTab(path); if (splitEditor?.path === path) setSplitEditor(null); }}
                  onRename={(path) => { setPromptInput({ type: "rename", path }); setPromptValue(path.split("/").pop() || ""); setTimeout(() => promptInputRef.current?.focus(), 50); }}
                  onContextMenu={handleFileContextMenu}
                  onDragStart={(p) => setDraggedTab(p)}
                  isDark={isDark}
                />
              </div>
            </div>

            {/* Sidebar drag */}
            <div onMouseDown={onDragStartX}
              className={`w-1 flex items-center justify-center cursor-col-resize shrink-0 transition-colors ${draggingX ? dragActive : `${bg0}`}`} />
          </>
        )}

        {/* Editor + Output */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Editor(s) — supports split view */}
          <div className={`flex-1 min-h-0 overflow-hidden flex ${splitEditor?.direction === "down" ? "flex-col" : "flex-row"}`} style={{ height: `${splitY}%` }}>
            {/* Primary editor */}
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col" style={splitEditor ? { [splitEditor.direction === "right" ? "width" : "height"]: `${splitEditorRatio}%`, flex: "none" } : {}}>
              {/* Active file label */}
              {splitEditor && (
                <div className={`flex items-center gap-1.5 px-3 h-7 shrink-0 ${bg2} border-b ${border2} text-[10px] font-mono ${textDim}`}>
                  <FileCode2 size={10} className={activeLanguage === "typescript" ? "text-blue-400" : "text-orange-400"} />
                  {activePath.split("/").pop()}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                {activePath && activeNode?.type === "file" ? (
                  <CodeEditor key={activePath} language={activeLanguage} value={activeContent} onChange={handleEditorChange} theme={theme} />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${textMuted} text-sm`}>Select a file to edit</div>
                )}
              </div>
            </div>

            {/* Split drag handle */}
            {splitEditor && (
              <div
                onMouseDown={() => setDraggingSplit(true)}
                className={`${splitEditor.direction === "right" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"} flex items-center justify-center group shrink-0 transition-colors ${draggingSplit ? dragActive : dragBg}`}
              >
                <div className={`flex ${splitEditor.direction === "right" ? "flex-col" : "flex-row"} gap-0.5`}>
                  {[0, 1, 2].map((i) => (<div key={i} className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-400" />))}
                </div>
              </div>
            )}

            {/* Secondary editor (split) */}
            {splitEditor && (
              <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
                <div className={`flex items-center justify-between px-3 h-7 shrink-0 ${bg2} border-b ${border2}`}>
                  <div className={`flex items-center gap-1.5 text-[10px] font-mono ${textDim}`}>
                    <FileCode2 size={10} className={splitLanguage === "typescript" ? "text-blue-400" : "text-orange-400"} />
                    {splitEditor.path.split("/").pop()}
                  </div>
                  <button onClick={() => setSplitEditor(null)} className={`w-5 h-5 flex items-center justify-center rounded ${hoverBg} ${textMuted} cursor-pointer`}>
                    <X size={10} />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    key={`split-${splitEditor.path}`}
                    language={splitLanguage}
                    value={splitContent}
                    onChange={(val: string) => fs.writeFile(splitEditor.path, val)}
                    theme={theme}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Horizontal drag */}
          <div onMouseDown={onDragStartY}
            className={`h-1.5 flex items-center justify-center cursor-row-resize group shrink-0 transition-colors ${draggingY ? dragActive : dragBg}`}>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (<div key={i} className="w-1 h-1 rounded-full bg-gray-500 group-hover:bg-gray-400" />))}
            </div>
          </div>

          {/* Output */}
          <div className={`flex-1 flex flex-col min-h-0 ${bg1}`}>
            <div className={`flex items-center justify-between px-2 h-8 border-b ${border2} shrink-0`}>
              <div className="flex items-center gap-0.5">
                {outputTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = outputTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setOutputTab(tab.key)}
                      className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all ${isActive ? textMain : textMuted}`}>
                      <Icon size={11} />
                      {tab.label}
                      {tab.key === "console" && consoleLogs.length > 0 && (
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${errorCount > 0 ? "bg-red-500/15 text-red-400" : "bg-white/[0.06] text-gray-400"}`}>{consoleLogs.length}</span>
                      )}
                      {isActive && <motion.div layoutId="tsOutputTab" className={`absolute inset-0 ${tabActiveBg} rounded-md -z-10`} transition={{ type: "spring", stiffness: 400, damping: 28 }} />}
                    </button>
                  );
                })}
              </div>
              {outputTab === "console" && consoleLogs.length > 0 && (
                <button onClick={() => setConsoleLogs([])} className={`flex items-center gap-1 px-2 py-1 rounded-md ${hoverBg} ${textMuted} text-[9px] cursor-pointer`}><Trash2 size={10} />Clear</button>
              )}
            </div>

            <div className="flex-1 relative overflow-hidden">
              {/* iframe always rendered so console capture works regardless of active tab */}
              {isLive && srcDoc && (
                <iframe
                  srcDoc={srcDoc}
                  className={`w-full h-full bg-white border-0 absolute inset-0 ${outputTab === "preview" ? "" : "invisible"}`}
                  title="output"
                  sandbox="allow-scripts allow-modals allow-same-origin"
                />
              )}
              {outputTab === "preview" && !isLive && (
                <div className={`w-full h-full flex items-center justify-center ${textMuted} text-sm`}>Preview off</div>
              )}

              {outputTab === "console" && (
                <div className={`w-full h-full overflow-auto ${consoleBg} font-mono text-[11px] leading-[1.6]`}>
                  {consoleLogs.length === 0 ? (
                    <div className={`flex items-center justify-center h-full ${textMuted} text-[11px]`}>Console output appears here</div>
                  ) : consoleLogs.map((log, i) => (
                    <div key={i} className={`flex items-start gap-2 px-3 py-1 border-b ${consoleLineBorder} ${log.type === "error" ? (isDark ? "bg-red-500/[0.04]" : "bg-red-50") : ""}`}>
                      <span className="shrink-0 mt-0.5">
                        {log.type === "error" ? <AlertCircle size={11} className="text-red-400" /> : log.type === "warn" ? <AlertTriangle size={11} className="text-yellow-400" /> : <span className={textMuted}>&gt;</span>}
                      </span>
                      <span className={`flex-1 break-all whitespace-pre-wrap ${log.type === "error" ? "text-red-400" : isDark ? "text-gray-300" : "text-gray-700"}`}>{log.args.join(" ")}</span>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              )}

              {outputTab === "terminal" && (
                <div className={`w-full h-full flex flex-col ${consoleBg}`} onClick={() => terminalInputRef.current?.focus()}>
                  <div className="flex-1 overflow-auto font-mono text-[11px] leading-[1.7] px-3 pt-2">
                    <div className={textMuted}><span className="text-emerald-400">LiveDraft IDE</span> — type <span className={isDark ? "text-white/60" : "text-gray-600"}>"help"</span></div>
                    {terminalHistory.map((line, i) => (
                      <div key={i} className={line.startsWith("$") ? "text-emerald-400" : line.startsWith("Error") ? "text-red-400" : line.startsWith("+") ? "text-emerald-400" : line.startsWith("-") ? "text-yellow-400" : (isDark ? "text-gray-400" : "text-gray-600")}>{line}</div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 border-t ${border2}`}>
                    <ChevronRight size={12} className="text-emerald-400 shrink-0" />
                    <input ref={terminalInputRef} type="text" value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { runTerminal(terminalInput); setTerminalInput(""); } }}
                      placeholder="npm install lodash"
                      className={`flex-1 bg-transparent border-0 outline-none font-mono text-[11px] ${isDark ? "text-white/80 placeholder-white/20" : "text-gray-800 placeholder-gray-400"}`}
                      spellCheck={false} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Status Bar ═══ */}
      <div className={`flex items-center justify-between px-3 h-5 ${statusBg} border-t ${border2} text-[9px] ${statusText} shrink-0`}>
        <div className="flex items-center gap-2.5">
          <span>{activePath || "No file"}</span>
          {splitEditor && <><span>•</span><span className="text-indigo-400">Split: {splitEditor.path.split("/").pop()}</span></>}
          {packages.length > 0 && <><span>•</span><span>{packages.length} pkg{packages.length > 1 ? "s" : ""}</span></>}
          {errorCount > 0 && <><span>•</span><span className="text-red-400">{errorCount} errors</span></>}
        </div>
        <div className="flex items-center gap-2.5">
          <span>TypeScript</span><span>•</span><span>{isLive ? "Live" : "Off"}</span><span>•</span><span>{isDark ? "Dark" : "Light"}</span>
        </div>
      </div>

      {/* ═══ Context Menu ═══ */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
