declare module 'react-codemirror2' {
  import { Component } from 'react'
  interface IControlledCodeMirror {
    value: string
    options?: any
    onBeforeChange: (editor: any, data: any, value: string) => void
    [key: string]: any
  }
  export class Controlled extends Component<IControlledCodeMirror> {}
}

declare module 'react-autosize-textarea' {
  import { Component, TextareaHTMLAttributes } from 'react'
  interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    [key: string]: any
  }
  export default class TextareaAutosize extends Component<Props> {}
}

declare module 'remarkable' {
  export class Remarkable {
    constructor(options?: any)
    use(plugin: any): this
    render(md: string): string
  }
}

declare module 'remarkable/linkify' {
  export function linkify(md: any): void
}

declare module 'js-file-download' {
  export default function fileDownload(data: string, filename: string): void
}

declare module '@github/markdown-toolbar-element' {}

declare module 'jszip' {
  class JSZip {
    file(name: string, data: string | Blob | ArrayBuffer): this;
    generateAsync(options: { type: string }): Promise<Blob>;
  }
  export default JSZip;
}

// CSS imports
declare module '*.css' {}
declare module 'codemirror/lib/codemirror.css' {}
declare module 'codemirror/theme/material.css' {}
declare module 'codemirror/mode/*' {}
declare module 'codemirror/addon/*' {}
