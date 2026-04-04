import {
  Heading1, Heading2, Heading3, Bold, Italic, Strikethrough,
  Quote, Code, CodeSquare, Link as LinkIcon,
  Image, List, ListOrdered, ListChecks,
  Minus, Table, Download,
} from "lucide-react";
import "@github/markdown-toolbar-element";

interface Props {
  clickHandler: () => void;
  onInsert?: (text: string, wrap?: boolean) => void;
  theme?: "dark" | "light";
}

// Tools using @github/markdown-toolbar-element custom elements
const mdTools = [
  { el: "md-header", props: { level: "1" }, icon: Heading1, title: "Heading 1" },
  { el: "md-header", props: { level: "2" }, icon: Heading2, title: "Heading 2" },
  { el: "md-header", props: { level: "3" }, icon: Heading3, title: "Heading 3" },
  { el: "md-bold", icon: Bold, title: "Bold" },
  { el: "md-italic", icon: Italic, title: "Italic" },
  { el: "md-strikethrough", icon: Strikethrough, title: "Strikethrough" },
  { el: "md-quote", icon: Quote, title: "Blockquote" },
  { el: "md-code", icon: Code, title: "Inline Code" },
  { el: "md-link", icon: LinkIcon, title: "Link" },
  { el: "md-image", icon: Image, title: "Image" },
  { el: "md-unordered-list", icon: List, title: "Bullet List" },
  { el: "md-ordered-list", icon: ListOrdered, title: "Numbered List" },
  { el: "md-task-list", icon: ListChecks, title: "Task List" },
] as const;

// Custom insert buttons (not part of markdown-toolbar-element)
const insertTools = [
  {
    icon: Minus,
    title: "Horizontal Rule",
    text: "\n---\n",
  },
  {
    icon: CodeSquare,
    title: "Code Block",
    text: "\n```\n\n```\n",
  },
  {
    icon: Table,
    title: "Table",
    text: "\n| Header | Header | Header |\n| ------ | ------ | ------ |\n| Cell   | Cell   | Cell   |\n| Cell   | Cell   | Cell   |\n",
  },
];

export default function Toolbar({ clickHandler, onInsert, theme = "dark" }: Props) {
  const isDark = theme === "dark";
  const btn = `inline-flex items-center justify-center w-7 h-7 rounded-md bg-transparent transition-all cursor-pointer border-0 ${
    isDark
      ? "text-gray-500 hover:text-white/70 hover:bg-white/[0.06]"
      : "text-gray-400 hover:text-gray-700 hover:bg-black/[0.04]"
  }`;
  const divider = `w-px h-4 mx-1.5 ${isDark ? "bg-white/[0.06]" : "bg-black/[0.08]"}`;

  const handleInsert = (text: string) => {
    const textarea = document.getElementById("textarea_input") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const newVal = val.substring(0, start) + text + val.substring(end);
    // Trigger React's onChange via native setter
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, newVal);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // Set cursor position after insert
    setTimeout(() => {
      const cursorPos = start + text.indexOf("\n\n") + 1 || start + text.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
      textarea.focus();
    }, 0);
    onInsert?.(text);
  };

  return (
    <div className="flex items-center gap-px flex-wrap">
      <markdown-toolbar for="textarea_input" className="flex items-center gap-px flex-wrap">
        {mdTools.map((tool, i) => {
          const Icon = tool.icon;
          const Tag = tool.el as any;
          const props = "props" in tool ? tool.props : {};
          return (
            <span key={`${tool.title}-${i}`}>
              <Tag {...props}>
                <button className={btn} title={tool.title}>
                  <Icon size={14} />
                </button>
              </Tag>
              {/* Dividers after logical groups */}
              {(i === 2 || i === 5 || i === 7 || i === 9 || i === 12) && (
                <span className={divider} />
              )}
            </span>
          );
        })}

        {/* Custom insert buttons */}
        {insertTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.title}
              className={btn}
              title={tool.title}
              onClick={(e) => { e.preventDefault(); handleInsert(tool.text); }}
            >
              <Icon size={14} />
            </button>
          );
        })}

        <span className={divider} />

        <button
          className={`${btn} w-auto px-2 gap-1 text-indigo-400 hover:text-indigo-300`}
          onClick={clickHandler}
          title="Download README.md"
        >
          <Download size={12} />
          <span className="text-[10px] font-semibold tracking-wide">Export</span>
        </button>
      </markdown-toolbar>
    </div>
  );
}
