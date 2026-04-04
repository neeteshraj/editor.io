// ─── Virtual File System ───
// In-memory file system for the TypeScript IDE

export interface FSNode {
  name: string;
  type: "file" | "directory";
  content?: string; // only for files
  children?: FSNode[]; // only for directories
  language?: string;
}

export type FSListener = () => void;

const STORAGE_KEY = "livedraft-project";

const DEFAULT_PROJECT: FSNode = {
  name: "project",
  type: "directory",
  children: [
    {
      name: "src",
      type: "directory",
      children: [
        {
          name: "index.ts",
          type: "file",
          language: "typescript",
          content: `import { greet } from "./utils";

interface User {
  name: string;
  role: string;
}

const user: User = {
  name: "LiveDraft",
  role: "Developer"
};

console.log(greet(user.name));
console.log("Role:", user.role);

// Try installing packages!
// Open Terminal → npm install lodash
`,
        },
        {
          name: "utils.ts",
          type: "file",
          language: "typescript",
          content: `export function greet(name: string): string {
  return \`Hello, \${name}! Welcome to LiveDraft IDE.\`;
}

export function sum(a: number, b: number): number {
  return a + b;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`,
        },
        {
          name: "types.ts",
          type: "file",
          language: "typescript",
          content: `export interface Config {
  theme: "dark" | "light";
  language: string;
  autoSave: boolean;
}

export type Status = "idle" | "running" | "error";
`,
        },
      ],
    },
    {
      name: "styles",
      type: "directory",
      children: [
        {
          name: "main.css",
          type: "file",
          language: "css",
          content: `body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 2rem;
  background: #fafafa;
  color: #333;
}

h1 {
  color: #6366f1;
}
`,
        },
      ],
    },
    {
      name: "index.html",
      type: "file",
      language: "xml",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LiveDraft Project</title>
  <link rel="stylesheet" href="./styles/main.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/index.ts"></script>
</body>
</html>
`,
    },
    {
      name: "package.json",
      type: "file",
      language: "json",
      content: JSON.stringify(
        {
          name: "livedraft-project",
          version: "1.0.0",
          type: "module",
          scripts: { dev: "livedraft dev", build: "livedraft build" },
          dependencies: {},
        },
        null,
        2
      ),
    },
    {
      name: "tsconfig.json",
      type: "file",
      language: "json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            jsx: "react-jsx",
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["src/**/*"],
        },
        null,
        2
      ),
    },
    {
      name: "README.md",
      type: "file",
      language: "markdown",
      content: `# LiveDraft Project

A TypeScript project created with LiveDraft IDE.

## Getting Started

Edit files in the sidebar and see live output below.
`,
    },
  ],
};

export class VirtualFS {
  private root: FSNode;
  private listeners: Set<FSListener> = new Set();

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.root = JSON.parse(saved);
      } catch {
        this.root = structuredClone(DEFAULT_PROJECT);
      }
    } else {
      this.root = structuredClone(DEFAULT_PROJECT);
    }
  }

  subscribe(listener: FSListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
    } catch {}
  }

  getRoot(): FSNode {
    return this.root;
  }

  // Resolve a path like "src/index.ts" to a node
  resolve(path: string): FSNode | null {
    const parts = path.split("/").filter(Boolean);
    let node = this.root;
    for (const part of parts) {
      if (node.type !== "directory" || !node.children) return null;
      const child = node.children.find((c) => c.name === part);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  // Get parent directory of a path
  private resolveParent(path: string): { parent: FSNode; name: string } | null {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const name = parts.pop()!;
    let node = this.root;
    for (const part of parts) {
      if (node.type !== "directory" || !node.children) return null;
      const child = node.children.find((c) => c.name === part);
      if (!child || child.type !== "directory") return null;
      node = child;
    }
    return { parent: node, name };
  }

  readFile(path: string): string | null {
    const node = this.resolve(path);
    return node?.type === "file" ? (node.content ?? "") : null;
  }

  writeFile(path: string, content: string) {
    const node = this.resolve(path);
    if (node && node.type === "file") {
      node.content = content;
      this.notify();
      return;
    }
    // Create file if doesn't exist
    const res = this.resolveParent(path);
    if (!res) return;
    const { parent, name } = res;
    if (parent.type !== "directory") return;
    if (!parent.children) parent.children = [];
    parent.children.push({
      name,
      type: "file",
      content,
      language: guessLanguage(name),
    });
    this.sortChildren(parent);
    this.notify();
  }

  createFile(path: string, content = "") {
    this.writeFile(path, content);
  }

  createDirectory(path: string) {
    const res = this.resolveParent(path);
    if (!res) return;
    const { parent, name } = res;
    if (parent.type !== "directory") return;
    if (!parent.children) parent.children = [];
    if (parent.children.find((c) => c.name === name)) return;
    parent.children.push({ name, type: "directory", children: [] });
    this.sortChildren(parent);
    this.notify();
  }

  delete(path: string) {
    const res = this.resolveParent(path);
    if (!res) return;
    const { parent, name } = res;
    if (!parent.children) return;
    parent.children = parent.children.filter((c) => c.name !== name);
    this.notify();
  }

  rename(path: string, newName: string) {
    const node = this.resolve(path);
    if (!node) return;
    node.name = newName;
    if (node.type === "file") {
      node.language = guessLanguage(newName);
    }
    // Re-sort parent
    const res = this.resolveParent(path);
    if (res) this.sortChildren(res.parent);
    this.notify();
  }

  listDir(path: string): FSNode[] {
    const node = path ? this.resolve(path) : this.root;
    if (!node || node.type !== "directory") return [];
    return node.children || [];
  }

  // Get all files recursively with their paths
  getAllFiles(node?: FSNode, prefix = ""): { path: string; node: FSNode }[] {
    const n = node || this.root;
    const results: { path: string; node: FSNode }[] = [];
    if (n.type === "file") {
      results.push({ path: prefix + n.name, node: n });
    } else if (n.children) {
      for (const child of n.children) {
        results.push(...this.getAllFiles(child, prefix + n.name + "/"));
      }
    }
    return results;
  }

  // Flatten tree to paths
  tree(node?: FSNode, prefix = "", depth = 0): string[] {
    const n = node || this.root;
    const lines: string[] = [];
    if (depth > 0) {
      const indent = "  ".repeat(depth - 1);
      lines.push(`${indent}${n.type === "directory" ? "📁 " : "📄 "}${n.name}`);
    }
    if (n.type === "directory" && n.children) {
      for (const child of n.children) {
        lines.push(...this.tree(child, prefix + n.name + "/", depth + 1));
      }
    }
    return lines;
  }

  resetToDefault() {
    this.root = structuredClone(DEFAULT_PROJECT);
    this.notify();
  }

  // Update package.json dependencies
  addDependency(name: string, version: string) {
    const pkgNode = this.resolve("package.json");
    if (!pkgNode || pkgNode.type !== "file") return;
    try {
      const pkg = JSON.parse(pkgNode.content || "{}");
      if (!pkg.dependencies) pkg.dependencies = {};
      pkg.dependencies[name] = `^${version}`;
      pkgNode.content = JSON.stringify(pkg, null, 2);
      this.notify();
    } catch {}
  }

  removeDependency(name: string) {
    const pkgNode = this.resolve("package.json");
    if (!pkgNode || pkgNode.type !== "file") return;
    try {
      const pkg = JSON.parse(pkgNode.content || "{}");
      if (pkg.dependencies) {
        delete pkg.dependencies[name];
        pkgNode.content = JSON.stringify(pkg, null, 2);
        this.notify();
      }
    } catch {}
  }

  private sortChildren(node: FSNode) {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
}

function guessLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": case "tsx": return "typescript";
    case "js": case "jsx": return "javascript";
    case "css": return "css";
    case "html": return "xml";
    case "json": return "json";
    case "md": return "markdown";
    default: return "text";
  }
}

// Singleton
let _fs: VirtualFS | null = null;
export function getFS(): VirtualFS {
  if (!_fs) _fs = new VirtualFS();
  return _fs;
}
