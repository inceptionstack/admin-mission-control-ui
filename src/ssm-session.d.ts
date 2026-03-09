declare module "ssm-session";
declare module "xterm-addon-webgl" {
  import { ITerminalAddon } from "xterm";
  export class WebglAddon implements ITerminalAddon {
    activate(terminal: any): void;
    dispose(): void;
    onContextLoss(callback: () => void): void;
  }
}
declare module "xterm-addon-unicode11" {
  import { ITerminalAddon } from "xterm";
  export class Unicode11Addon implements ITerminalAddon {
    activate(terminal: any): void;
    dispose(): void;
  }
}
declare module "xterm-addon-serialize" {
  import { ITerminalAddon } from "xterm";
  export class SerializeAddon implements ITerminalAddon {
    activate(terminal: any): void;
    dispose(): void;
    serialize(): string;
  }
}
