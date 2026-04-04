import { useEffect, useRef } from "react";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import "codemirror/mode/xml/xml";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/css/css";
import "codemirror/mode/markdown/markdown";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/matchtags";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/selection/active-line";
import "../../../App.css";

interface Props {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: "dark" | "light";
}

type CMMode = string | { name: string; typescript?: boolean; json?: boolean };

function resolveMode(language: string): CMMode {
  if (language === "typescript") return { name: "javascript", typescript: true };
  if (language === "json") return { name: "javascript", json: true };
  if (language === "markdown") return "markdown";
  return language;
}

export default function CodeEditor({ language, value, onChange, theme = "dark" }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirror.Editor | null>(null);
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    wrapper.innerHTML = "";

    const config: CodeMirror.EditorConfiguration = {
      value,
      mode: resolveMode(language),
      theme: "default",
      lineNumbers: true,
      lineWrapping: false,
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: {
        Tab: (editor) => {
          if (editor.somethingSelected()) {
            editor.indentSelection("add");
          } else {
            editor.replaceSelection("  ", "end");
          }
        },
      },
    };

    // These are from addons — not in base EditorConfiguration type
    // but are valid runtime options once the addon JS is imported
    (config as Record<string, unknown>).scrollbarStyle = "null";
    (config as Record<string, unknown>).matchTags = true;
    (config as Record<string, unknown>).styleActiveLine = true;

    const cm = CodeMirror(wrapper, config);

    cm.on("change", () => {
      callbackRef.current(cm.getValue());
    });

    editorRef.current = cm;
    setTimeout(() => cm.refresh(), 0);

    return () => {
      editorRef.current = null;
      wrapper.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    editorRef.current?.setOption("mode", resolveMode(language));
  }, [language]);

  useEffect(() => {
    const cm = editorRef.current;
    if (cm && cm.getValue() !== value) {
      const pos = cm.getCursor();
      cm.setValue(value);
      cm.setCursor(pos);
    }
  }, [value]);

  return (
    <div
      ref={wrapperRef}
      className={`h-full ${theme === "dark" ? "cm-dark" : "cm-light"}`}
    />
  );
}
