import { useEffect, useRef } from "react";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import "codemirror/mode/xml/xml";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/css/css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/matchtags";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/matchbrackets";
import "../../../App.css";

interface Props {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: "dark" | "light";
}

export default function CodeEditor({ language, value, onChange, theme = "dark" }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirror.Editor | null>(null);
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Clear any previous editor DOM (handles StrictMode double-mount)
    wrapper.innerHTML = "";

    const cm = CodeMirror(wrapper, {
      value,
      mode: language,
      theme: "default",
      lineNumbers: true,
      scrollbarStyle: "null" as any,
      lineWrapping: false,
      autoCloseTags: true,
      matchTags: true as any,
      autoCloseBrackets: true,
      matchBrackets: true,
      styleActiveLine: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: {
        Tab: (editor: CodeMirror.Editor) => {
          if (editor.somethingSelected()) {
            editor.indentSelection("add");
          } else {
            editor.replaceSelection("  ", "end");
          }
        },
      },
    });

    cm.on("change", () => {
      callbackRef.current(cm.getValue());
    });

    editorRef.current = cm;
    setTimeout(() => cm.refresh(), 0);

    return () => {
      editorRef.current = null;
      wrapper.innerHTML = "";
    };
  }, []); // mount once

  // Sync language
  useEffect(() => {
    editorRef.current?.setOption("mode", language);
  }, [language]);

  // Sync external value changes only (not from typing)
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
