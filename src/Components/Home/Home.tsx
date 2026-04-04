import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Sparkles, Code2, Zap, ArrowRight, FileText, Terminal, Layers, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  useEffect(() => {
    setParticles(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
      }))
    );
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left - rect.width / 2) / rect.width) * 20);
    mouseY.set(((e.clientY - rect.top - rect.height / 2) / rect.height) * 20);
  };

  const codeSnippet = `function createApp() {
  const editor = new LiveDraft({
    theme: 'midnight',
    language: 'typescript',
    features: ['live', 'collab']
  });

  editor.on('save', () => {
    console.log('✨ Shipped!');
  });

  return editor;
}`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-black overflow-hidden"
    >
      {/* ═══ 3D Perspective Grid ═══ */}
      <div className="absolute inset-0" style={{ perspective: "1000px" }}>
        <motion.div
          className="absolute inset-0"
          style={{
            rotateX: useTransform(mouseY, [-10, 10], [5, -5]),
            rotateY: useTransform(mouseX, [-10, 10], [-5, 5]),
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateX(60deg) scale(2)",
              transformOrigin: "center center",
            }}
          >
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="gridFade" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(99,102,241,0)" />
                  <stop offset="50%" stopColor="rgba(99,102,241,0.2)" />
                  <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <rect width="100%" height="100%" fill="url(#gridFade)" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* ═══ Particle Stars ═══ */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ═══ Glowing Orb ═══ */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 blur-[120px] opacity-30" />
      </motion.div>

      {/* ═══ Navigation ═══ */}
      <nav className="relative z-20 px-6 md:px-10 py-4 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LiveDraft" className="w-8 h-8 rounded-lg object-cover" />
            <img src="/logo_name.png" alt="LiveDraft" className="h-4 object-contain" />
          </Link>
          <div className="flex items-center gap-6">
            <a href="https://github.com/neeteshraj/editor.io" target="_blank" rel="noopener noreferrer" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">GitHub</a>
          </div>
        </div>
      </nav>

      {/* ═══ Hero Content ═══ */}
      <motion.div style={{ y, opacity }} className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-300 font-medium">Open-source code playground</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
            >
              Code at the
              <span className="block mt-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Speed of Thought
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-500 leading-relaxed max-w-lg"
            >
              A blazing-fast HTML, CSS, JavaScript & TypeScript editor with instant live
              preview. Install npm packages, run code, and build — all in your browser.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <Link to="/web">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow text-[14px] cursor-pointer"
                >
                  Start Coding
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link to="/typescript">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-7 py-3.5 bg-blue-600/10 text-white rounded-xl font-semibold border border-blue-500/20 hover:bg-blue-600/20 transition-colors flex items-center gap-2 text-[14px] cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-blue-400" />
                  TypeScript IDE
                </motion.button>
              </Link>
              <Link to="/markdown">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-7 py-3.5 bg-white/5 text-white rounded-xl font-semibold border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors flex items-center gap-2 text-[14px] cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Markdown
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center gap-8 pt-4"
            >
              <Stat icon={<Eye className="w-4 h-4 text-indigo-400" />} text="Live Preview" />
              <Stat icon={<Layers className="w-4 h-4 text-purple-400" />} text="Multi-Pane" />
              <Stat icon={<Zap className="w-4 h-4 text-cyan-400" />} text="Zero Config" />
            </motion.div>
          </div>

          {/* Right — Floating Code Editor */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              rotateX: useTransform(mouseY, [-10, 10], [2, -2]),
              rotateY: useTransform(mouseX, [-10, 10], [-2, 2]),
            }}
            className="relative hidden lg:block"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Editor window */}
              <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-gray-800/80 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="text-sm text-gray-500 font-mono">app.ts</span>
                  </div>
                </div>

                {/* Code */}
                <div className="p-6 font-mono text-sm">
                  <pre className="text-gray-300 leading-relaxed">
                    <code>
                      {codeSnippet.split("\n").map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                          className="hover:bg-indigo-500/5 px-2 -mx-2 rounded transition-colors"
                        >
                          <span className="text-gray-700 mr-4 select-none inline-block w-5 text-right">
                            {i + 1}
                          </span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: highlightSyntax(line),
                            }}
                          />
                        </motion.div>
                      ))}
                    </code>
                  </pre>
                </div>

                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-5 -right-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-3.5 shadow-xl shadow-indigo-500/40"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-5 -left-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-3.5 shadow-xl shadow-cyan-500/40"
              >
                <Terminal className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ Bottom fade ═══ */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />

      {/* ═══ Footer ═══ */}
      <footer className="relative z-20 py-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex items-center justify-between text-[12px] text-gray-700">
          <span>© {new Date().getFullYear()} LiveDraft</span>
          <a href="https://github.com/neeteshraj" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">
            Built by Nitesh Raj Khanal
          </a>
        </div>
      </footer>
    </div>
  );
}

function Stat({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-gray-500 text-sm">{text}</span>
    </div>
  );
}

function highlightSyntax(line: string): string {
  return line
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /\b(function|const|new|return)\b/g,
      '<span class="text-purple-400">$1</span>'
    )
    .replace(
      /\b(createApp|LiveDraft|editor|console)\b/g,
      '<span class="text-blue-400">$1</span>'
    )
    .replace(
      /'([^']*)'/g,
      '<span class="text-emerald-400">\'$1\'</span>'
    )
    .replace(
      /\b(on|log)\b/g,
      '<span class="text-amber-400">$1</span>'
    )
    .replace(
      /\/\/.*/g,
      '<span class="text-gray-600">$&</span>'
    );
}
