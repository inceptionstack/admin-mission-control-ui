declare module "xterm-addon-search" {
  import { Terminal, ITerminalAddon } from "xterm";
  export class SearchAddon implements ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    findNext(term: string, searchOptions?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean; incremental?: boolean }): boolean;
    findPrevious(term: string, searchOptions?: { caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean; incremental?: boolean }): boolean;
    clearDecorations(): void;
  }
}

declare module "xterm-addon-web-links" {
  import { Terminal, ITerminalAddon } from "xterm";
  export class WebLinksAddon implements ITerminalAddon {
    constructor(handler?: (event: MouseEvent, uri: string) => void, options?: object);
    activate(terminal: Terminal): void;
    dispose(): void;
  }
}
