import { useState } from "react";
import {
  ChevronRight, ChevronDown, FileCode2, FileText, FileJson,
  Palette, File, FolderOpen, Folder, Plus, FolderPlus,
  Trash2, Pencil,
} from "lucide-react";
import { FSNode } from "../../lib/virtual-fs";

interface Props {
  node: FSNode;
  path: string;
  activePath: string;
  onSelect: (path: string) => void;
  onCreateFile: (dirPath: string) => void;
  onCreateDir: (dirPath: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, path: string, isDir: boolean) => void;
  onDragStart?: (path: string) => void;
  depth?: number;
  isDark: boolean;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": case "tsx": return <FileCode2 size={13} className="text-blue-400" />;
    case "js": case "jsx": return <FileCode2 size={13} className="text-yellow-400" />;
    case "css": return <Palette size={13} className="text-purple-400" />;
    case "html": return <FileCode2 size={13} className="text-orange-400" />;
    case "json": return <FileJson size={13} className="text-yellow-300" />;
    case "md": return <FileText size={13} className="text-gray-400" />;
    default: return <File size={13} className="text-gray-500" />;
  }
}

export default function FileTreeNode({
  node, path, activePath, onSelect, onCreateFile, onCreateDir, onDelete, onRename,
  onContextMenu, onDragStart, depth = 0, isDark,
}: Props) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === "directory";
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const isActive = activePath === fullPath;
  const isRoot = depth === 0;

  const hoverBg = isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]";
  const activeBgClass = isDark ? "bg-white/[0.06]" : "bg-black/[0.06]";
  const textColor = isDark ? "text-gray-400" : "text-gray-600";
  const activeTextColor = isDark ? "text-white" : "text-gray-900";

  return (
    <div>
      {!isRoot && (
        <div
          className={`group flex items-center gap-1 py-[3px] pr-2 cursor-pointer transition-colors relative ${
            isActive ? activeBgClass : hoverBg
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          draggable={!isDir}
          onDragStart={(e) => {
            if (isDir) return;
            e.dataTransfer.setData("text/plain", fullPath);
            e.dataTransfer.effectAllowed = "move";
            onDragStart?.(fullPath);
          }}
          onClick={() => {
            if (isDir) setExpanded(!expanded);
            else onSelect(fullPath);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu?.(e, fullPath, isDir);
          }}
        >
          {isDir ? (
            expanded ? <ChevronDown size={12} className={textColor} /> : <ChevronRight size={12} className={textColor} />
          ) : (
            <span className="w-3" />
          )}

          {isDir ? (
            expanded ? <FolderOpen size={13} className="text-indigo-400" /> : <Folder size={13} className="text-indigo-400/60" />
          ) : (
            getFileIcon(node.name)
          )}

          <span className={`flex-1 text-[11px] font-mono truncate ${isActive ? activeTextColor : textColor}`}>
            {node.name}
          </span>

          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            {isDir && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateFile(fullPath); }}
                  className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.06]"} ${textColor}`}
                  title="New File"
                >
                  <Plus size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateDir(fullPath); }}
                  className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.06]"} ${textColor}`}
                  title="New Folder"
                >
                  <FolderPlus size={11} />
                </button>
              </>
            )}
            {!isRoot && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onRename(fullPath); }}
                  className={`w-5 h-5 flex items-center justify-center rounded ${isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.06]"} ${textColor}`}
                  title="Rename"
                >
                  <Pencil size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(fullPath); }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10 text-red-400/60 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isDir && (expanded || isRoot) && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              path={isRoot ? "" : fullPath}
              activePath={activePath}
              onSelect={onSelect}
              onCreateFile={onCreateFile}
              onCreateDir={onCreateDir}
              onDelete={onDelete}
              onRename={onRename}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              depth={isRoot ? 1 : depth + 1}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
