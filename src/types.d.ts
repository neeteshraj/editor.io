declare module 'react-codemirror2' {
  import { Component } from 'react'
  interface IControlledCodeMirror {
    value: string
    options?: Record<string, unknown>
    onBeforeChange: (editor: CodeMirror.Editor, data: CodeMirror.EditorChange, value: string) => void
    [key: string]: unknown
  }
  export class Controlled extends Component<IControlledCodeMirror> {}
  export class UnControlled extends Component<IControlledCodeMirror> {}
}

declare module 'react-autosize-textarea' {
  import { Component, TextareaHTMLAttributes } from 'react'
  interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    [key: string]: unknown
  }
  export default class TextareaAutosize extends Component<Props> {}
}

declare module 'remarkable' {
  export class Remarkable {
    constructor(options?: Record<string, unknown>)
    use(plugin: (md: Remarkable) => void): this
    render(md: string): string
  }
}

declare module 'remarkable/linkify' {
  import { Remarkable } from 'remarkable'
  export function linkify(md: Remarkable): void
}

declare module 'js-file-download' {
  export default function fileDownload(data: string | Blob, filename: string): void
}

declare module '@github/markdown-toolbar-element' {}

declare module 'jszip' {
  class JSZip {
    file(name: string, data: string | Blob | ArrayBuffer): this
    generateAsync(options: { type: string }): Promise<Blob>
  }
  export default JSZip
}

// Custom HTML elements (from @github/markdown-toolbar-element)
declare namespace JSX {
  interface IntrinsicElements {
    "markdown-toolbar": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { for: string }, HTMLElement>;
    "md-header": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { level?: string }, HTMLElement>;
    "md-bold": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-italic": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-strikethrough": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-quote": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-code": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-link": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-image": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-unordered-list": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-ordered-list": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    "md-task-list": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}

// CSS / asset imports
declare module '*.css' {}
declare module 'codemirror/lib/codemirror.css' {}
declare module 'codemirror/theme/material.css' {}
declare module 'codemirror/mode/*' {}
declare module 'codemirror/addon/*' {}
