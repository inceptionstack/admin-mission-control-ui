import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal, type ITheme } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import { WebglAddon } from "xterm-addon-webgl";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { SerializeAddon } from "xterm-addon-serialize";
import "xterm/css/xterm.css";
import { ssm } from "ssm-session";
import { useSsmSessions } from "../context/SsmSessionContext";
import { api } from "../api/client";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface SsmTerminalPaneProps {
  accountId: string;
  accountName: string;
  instanceId: string;
  streamUrl: string;
  tokenValue: string;
  visible: boolean;
}

interface ThemeDef {
  id: string;
  name: string;
  mode: "dark" | "light";
  theme: ITheme;
  bg: string; // wrapper bg to match
}

// ═══════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 28;
const THEME_STORAGE_KEY = "ssm-terminal-theme";
const FONT_STORAGE_KEY = "ssm-terminal-font-size";

// ═══════════════════════════════════════════════
// Themes — 3 dark + 3 light
// ═══════════════════════════════════════════════

const THEMES: ThemeDef[] = [
  {
    id: "midnight", name: "Midnight", mode: "dark", bg: "#09090b",
    theme: {
      background: "#09090b", foreground: "#d4d4d8", cursor: "#a78bfa", cursorAccent: "#09090b",
      selectionBackground: "#a78bfa40", selectionForeground: "#fafafa",
      black: "#18181b", brightBlack: "#3f3f46", red: "#ef4444", brightRed: "#f87171",
      green: "#22c55e", brightGreen: "#4ade80", yellow: "#eab308", brightYellow: "#facc15",
      blue: "#3b82f6", brightBlue: "#60a5fa", magenta: "#a855f7", brightMagenta: "#c084fc",
      cyan: "#06b6d4", brightCyan: "#22d3ee", white: "#d4d4d8", brightWhite: "#fafafa",
    },
  },
  {
    id: "dracula", name: "Dracula", mode: "dark", bg: "#282a36",
    theme: {
      background: "#282a36", foreground: "#f8f8f2", cursor: "#f8f8f2", cursorAccent: "#282a36",
      selectionBackground: "#44475a", selectionForeground: "#f8f8f2",
      black: "#21222c", brightBlack: "#6272a4", red: "#ff5555", brightRed: "#ff6e6e",
      green: "#50fa7b", brightGreen: "#69ff94", yellow: "#f1fa8c", brightYellow: "#ffffa5",
      blue: "#bd93f9", brightBlue: "#d6acff", magenta: "#ff79c6", brightMagenta: "#ff92df",
      cyan: "#8be9fd", brightCyan: "#a4ffff", white: "#f8f8f2", brightWhite: "#ffffff",
    },
  },
  {
    id: "monokai", name: "Monokai Pro", mode: "dark", bg: "#2d2a2e",
    theme: {
      background: "#2d2a2e", foreground: "#fcfcfa", cursor: "#fcfcfa", cursorAccent: "#2d2a2e",
      selectionBackground: "#403e41", selectionForeground: "#fcfcfa",
      black: "#403e41", brightBlack: "#727072", red: "#ff6188", brightRed: "#ff6188",
      green: "#a9dc76", brightGreen: "#a9dc76", yellow: "#ffd866", brightYellow: "#ffd866",
      blue: "#fc9867", brightBlue: "#fc9867", magenta: "#ab9df2", brightMagenta: "#ab9df2",
      cyan: "#78dce8", brightCyan: "#78dce8", white: "#fcfcfa", brightWhite: "#fcfcfa",
    },
  },
  {
    id: "github-light", name: "GitHub Light", mode: "light", bg: "#ffffff",
    theme: {
      background: "#ffffff", foreground: "#24292e", cursor: "#044289", cursorAccent: "#ffffff",
      selectionBackground: "#0366d625", selectionForeground: "#24292e",
      black: "#24292e", brightBlack: "#586069", red: "#d73a49", brightRed: "#cb2431",
      green: "#22863a", brightGreen: "#28a745", yellow: "#b08800", brightYellow: "#dbab09",
      blue: "#0366d6", brightBlue: "#2188ff", magenta: "#6f42c1", brightMagenta: "#8a63d2",
      cyan: "#1b7c83", brightCyan: "#3192aa", white: "#6a737d", brightWhite: "#959da5",
    },
  },
  {
    id: "solarized-light", name: "Solarized Light", mode: "light", bg: "#fdf6e3",
    theme: {
      background: "#fdf6e3", foreground: "#657b83", cursor: "#586e75", cursorAccent: "#fdf6e3",
      selectionBackground: "#eee8d5", selectionForeground: "#657b83",
      black: "#073642", brightBlack: "#002b36", red: "#dc322f", brightRed: "#cb4b16",
      green: "#859900", brightGreen: "#586e75", yellow: "#b58900", brightYellow: "#657b83",
      blue: "#268bd2", brightBlue: "#839496", magenta: "#d33682", brightMagenta: "#6c71c4",
      cyan: "#2aa198", brightCyan: "#93a1a1", white: "#eee8d5", brightWhite: "#fdf6e3",
    },
  },
  {
    id: "paper", name: "Paper", mode: "light", bg: "#f5f5f0",
    theme: {
      background: "#f5f5f0", foreground: "#3c3836", cursor: "#3c3836", cursorAccent: "#f5f5f0",
      selectionBackground: "#d5c4a1", selectionForeground: "#3c3836",
      black: "#3c3836", brightBlack: "#7c6f64", red: "#cc241d", brightRed: "#9d0006",
      green: "#98971a", brightGreen: "#79740e", yellow: "#d79921", brightYellow: "#b57614",
      blue: "#458588", brightBlue: "#076678", magenta: "#b16286", brightMagenta: "#8f3f71",
      cyan: "#689d6a", brightCyan: "#427b58", white: "#d5c4a1", brightWhite: "#fbf1c7",
    },
  },
];

// ═══════════════════════════════════════════════
// Keyboard shortcuts definition
// ═══════════════════════════════════════════════

const SHORTCUTS = [
  { keys: "Ctrl + F", action: "Search terminal" },
  { keys: "Ctrl + Shift + C", action: "Copy selection" },
  { keys: "Ctrl + Shift + V", action: "Paste from clipboard" },
  { keys: "Ctrl + +", action: "Zoom in" },
  { keys: "Ctrl + -", action: "Zoom out" },
  { keys: "Ctrl + 0", action: "Reset zoom" },
  { keys: "Ctrl + Shift + T", action: "Switch theme" },
  { keys: "Ctrl + /", action: "Toggle shortcuts" },
  { keys: "F11", action: "Toggle fullscreen" },
  { keys: "Right-click", action: "Paste from clipboard" },
  { keys: "Select text", action: "Auto-copy to clipboard" },
  { keys: "Double-click", action: "Select word" },
  { keys: "Triple-click", action: "Select line" },
  { keys: "Esc", action: "Close search / overlays" },
];

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

export function SsmTerminalPane({
  accountId, accountName, instanceId, streamUrl, tokenValue, visible,
}: SsmTerminalPaneProps) {
  const { updateSessionStatus, markActivity } = useSsmSessions();
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const serializeRef = useRef<SerializeAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fontSizeRef = useRef(DEFAULT_FONT_SIZE);
  const latencyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingSentRef = useRef<number>(0);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef = useRef(false);

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    return saved ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parseInt(saved, 10))) : DEFAULT_FONT_SIZE;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [activeTheme, setActiveTheme] = useState<ThemeDef>(() => {
    const savedId = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.find(t => t.id === savedId) || THEMES[0];
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);

  // ---------- Focus helper ----------
  const doFocus = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.focus();
    const ta = termRef.current?.querySelector(".xterm-helper-textarea") as HTMLTextAreaElement | null;
    if (ta) ta.focus({ preventScroll: true });
  }, []);

  // ---------- Search ----------
  const handleSearch = useCallback((query: string, direction: "next" | "prev" = "next") => {
    if (!searchRef.current || !query) return;
    if (direction === "next") searchRef.current.findNext(query, { caseSensitive: false });
    else searchRef.current.findPrevious(query, { caseSensitive: false });
  }, []);

  const toggleSearch = useCallback(() => {
    setShowSearch(prev => {
      if (!prev) setTimeout(() => searchInputRef.current?.focus(), 50);
      else doFocus();
      return !prev;
    });
  }, [doFocus]);

  // ---------- Font size zoom ----------
  const changeFontSize = useCallback((delta: number) => {
    const term = terminalRef.current;
    if (!term) return;
    const newSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSizeRef.current + delta));
    fontSizeRef.current = newSize;
    setFontSize(newSize);
    localStorage.setItem(FONT_STORAGE_KEY, String(newSize));
    term.options.fontSize = newSize;
    try { fitRef.current?.fit(); } catch { /* */ }
  }, []);

  const resetFontSize = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    fontSizeRef.current = DEFAULT_FONT_SIZE;
    setFontSize(DEFAULT_FONT_SIZE);
    localStorage.setItem(FONT_STORAGE_KEY, String(DEFAULT_FONT_SIZE));
    term.options.fontSize = DEFAULT_FONT_SIZE;
    try { fitRef.current?.fit(); } catch { /* */ }
  }, []);

  // ---------- Theme switching ----------
  const applyTheme = useCallback((themeDef: ThemeDef) => {
    setActiveTheme(themeDef);
    localStorage.setItem(THEME_STORAGE_KEY, themeDef.id);
    const term = terminalRef.current;
    if (term) term.options.theme = themeDef.theme;
    setShowThemePicker(false);
    doFocus();
  }, [doFocus]);

  const cycleTheme = useCallback(() => {
    const idx = THEMES.findIndex(t => t.id === activeTheme.id);
    const next = THEMES[(idx + 1) % THEMES.length];
    applyTheme(next);
  }, [activeTheme, applyTheme]);

  // ---------- Session export ----------
  const exportSession = useCallback(() => {
    const term = terminalRef.current;
    const serialize = serializeRef.current;
    if (!term) return;
    let text: string;
    if (serialize) {
      text = serialize.serialize();
    } else {
      const lines: string[] = [];
      const buf = term.buffer.active;
      for (let i = 0; i < buf.length; i++) {
        const line = buf.getLine(i);
        if (line) lines.push(line.translateToString(true));
      }
      text = lines.join("\n");
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${accountName}-session-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ---------- Fullscreen ----------
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // ---------- Visual bell ----------
  const flashBell = useCallback(() => {
    const el = termRef.current;
    if (!el) return;
    el.style.transition = "filter 100ms";
    el.style.filter = "brightness(1.5)";
    setTimeout(() => { el.style.filter = ""; }, 100);
  }, []);

  // ---------- Latency measurement ----------
  const measureLatency = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    pingSentRef.current = performance.now();
    // Send a no-op character (DC4 = 0x14) and measure round-trip
    // Actually: we measure time between message sends. Use a simple approach:
    // send empty-ish keepalive and measure ACK turnaround
    try {
      // Send a zero-width no-op through SSM — we'll track message round-trip
      ssm.sendText(socket, textEncoder.encode(""));
    } catch { /* */ }
  }, []);

  // ---------- Reconnect ----------
  const handleReconnect = useCallback(async () => {
    if (reconnecting) return;
    const term = terminalRef.current;
    if (!term) return;
    setReconnecting(true);
    term.writeln("\r\n\x1b[38;2;168;139;250m⚡ Reconnecting...\x1b[0m");
    try {
      try { socketRef.current?.close(); } catch { /* */ }
      const newSession = await api.getSsmSession(accountId);

      const socket = new WebSocket(newSession.streamUrl);
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setStatus("connected");
        try { fitRef.current?.fit(); } catch { /* */ }
        const termOptions = { rows: term.rows || 24, cols: term.cols || 80 };
        ssm.init(socket, { token: newSession.tokenValue, termOptions });
      });
      socket.addEventListener("close", () => {
        setStatus("disconnected");
        term.writeln("\r\n\x1b[1;31m● Session ended\x1b[0m");
      });
      socket.addEventListener("error", () => {
        setStatus("disconnected");
        term.writeln("\r\n\x1b[1;31m● Connection error\x1b[0m");
      });
      socket.addEventListener("message", (event) => {
        try {
          const agentMessage = ssm.decode(event.data);
          ssm.sendACK(socket, agentMessage);
          if (agentMessage.payloadType === 1 && agentMessage.payload) {
            term.write(textDecoder.decode(agentMessage.payload));
          } else if (agentMessage.payloadType === 17) {
            ssm.sendInitMessage(socket, { rows: term.rows || 24, cols: term.cols || 80 });
          }
        } catch { /* */ }
      });
    } catch (err) {
      term.writeln(`\r\n\x1b[1;31m● Reconnect failed: ${err instanceof Error ? err.message : err}\x1b[0m`);
    } finally {
      setReconnecting(false);
    }
  }, [accountId, reconnecting]);

  // ---------- Close overlays on Escape (global) ----------
  const closeOverlays = useCallback(() => {
    setShowShortcuts(false);
    setShowThemePicker(false);
    doFocus();
  }, [doFocus]);

  // ---------- Click outside theme picker ----------
  useEffect(() => {
    if (!showThemePicker) return;
    const handler = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showThemePicker]);

  // ---------- Main terminal setup ----------
  useEffect(() => {
    if (!termRef.current) return;

    fontSizeRef.current = fontSize;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      scrollback: 10000,
      allowProposedApi: true,
      allowTransparency: false,
      drawBoldTextInBrightColors: true,
      // Smart selection: define word separators for double-click
      wordSeparator: " ()[]{}|;:'\",.<>~!@#$%^&*=+`",
      theme: activeTheme.theme,
    });

    // Load addons
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      window.open(uri, "_blank", "noopener");
    });
    const serializeAddon = new SerializeAddon();
    const unicode11Addon = new Unicode11Addon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(serializeAddon);
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = "11";

    term.open(termRef.current);
    terminalRef.current = term;
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;
    serializeRef.current = serializeAddon;

    // WebGL renderer (delayed for stability)
    setTimeout(() => {
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => { console.warn("WebGL context lost"); webglAddon.dispose(); });
        term.loadAddon(webglAddon);
      } catch (e) {
        console.warn("WebGL not available:", e);
      }
    }, 500);

    // Fit terminal after container has dimensions
    const fitTimer = setInterval(() => {
      try {
        const el = termRef.current;
        if (el && el.clientHeight > 0) { fitAddon.fit(); clearInterval(fitTimer); }
      } catch { /* */ }
    }, 100);
    setTimeout(() => clearInterval(fitTimer), 5000);

    // Visual bell
    term.onBell(flashBell);

    // Copy on select
    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection && selection.length > 0) {
        navigator.clipboard.writeText(selection).catch(() => {});
      }
    });

    // Keyboard shortcuts
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;

      // Escape — close overlays
      if (e.key === "Escape") {
        closeOverlays();
        // still pass to terminal
      }

      // Ctrl+F — search
      if (e.key === "f" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); toggleSearch(); return false;
      }
      // Ctrl+Shift+C — copy
      if (e.key === "C" && e.ctrlKey && e.shiftKey) {
        const sel = term.getSelection();
        if (sel) navigator.clipboard.writeText(sel).catch(() => {});
        return false;
      }
      // Ctrl+Shift+V — paste
      if (e.key === "V" && e.ctrlKey && e.shiftKey) {
        navigator.clipboard.readText().then(text => {
          if (text && socketRef.current?.readyState === WebSocket.OPEN) {
            ssm.sendText(socketRef.current, textEncoder.encode(text));
          }
        }).catch(() => {});
        return false;
      }
      // Ctrl+= / Ctrl++ — zoom in
      if ((e.key === "+" || e.key === "=") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); changeFontSize(2); return false;
      }
      // Ctrl+- — zoom out
      if (e.key === "-" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); changeFontSize(-2); return false;
      }
      // Ctrl+0 — reset
      if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); resetFontSize(); return false;
      }
      // Ctrl+Shift+T — cycle theme
      if (e.key === "T" && e.ctrlKey && e.shiftKey) {
        e.preventDefault(); cycleTheme(); return false;
      }
      // Ctrl+/ — shortcuts overlay
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); setShowShortcuts(prev => !prev); return false;
      }
      // F11 — fullscreen
      if (e.key === "F11") {
        e.preventDefault(); toggleFullscreen(); return false;
      }

      return true;
    });

    // Right-click paste
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        if (text && socketRef.current?.readyState === WebSocket.OPEN) {
          ssm.sendText(socketRef.current, textEncoder.encode(text));
        }
      }).catch(() => {});
    };
    termRef.current.addEventListener("contextmenu", handleContextMenu);

    term.writeln("\x1b[38;2;168;139;250m⚡ Connecting...\x1b[0m");

    // ── SSM WebSocket ──
    const socket = new WebSocket(streamUrl);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setStatus("connected");
      // Fit terminal first so we send actual dimensions, not defaults
      try { fitAddon.fit(); } catch { /* */ }
      const termOptions = { rows: term.rows || 24, cols: term.cols || 80 };
      ssm.init(socket, { token: tokenValue, termOptions });
      // After shell starts, force PTY size with stty + clear for TUI compat
      connectedRef.current = false;
    });

    socket.addEventListener("close", () => {
      setStatus("disconnected");
      term.writeln("\r\n\x1b[1;31m● Session ended\x1b[0m");
      
    });

    socket.addEventListener("error", () => {
      setStatus("disconnected");
      term.writeln("\r\n\x1b[1;31m● Connection error\x1b[0m");
    });

    socket.addEventListener("message", (event) => {
      try {
        const now = performance.now();
        const agentMessage = ssm.decode(event.data);
        ssm.sendACK(socket, agentMessage);

        // Latency: track time between our last send and this response
        if (pingSentRef.current > 0) {
          const rtt = Math.round(now - pingSentRef.current);
          if (rtt > 0 && rtt < 30000) setLatencyMs(rtt);
          pingSentRef.current = 0;
        }

        if (agentMessage.payloadType === 1 && agentMessage.payload) {
          term.write(textDecoder.decode(agentMessage.payload));
          // On first output (shell ready), set correct PTY size via SSM protocol
          if (!connectedRef.current) {
            connectedRef.current = true;
            setTimeout(() => {
              if (socket.readyState === WebSocket.OPEN) {
                // Send resize via SSM protocol — updates remote PTY without visible stty command.
                // AL2023 has checkwinsize enabled by default, so bash picks up the new size.
                ssm.sendInitMessage(socket, { rows: term.rows || 24, cols: term.cols || 80 });
              }
            }, 500);
          }
        } else if (agentMessage.payloadType === 17) {
          ssm.sendInitMessage(socket, { rows: term.rows || 24, cols: term.cols || 80 });
        }
      } catch (err) {
        console.error("SSM decode error:", err);
      }
    });

    // Terminal input → SSM (use ref so reconnect works)
    term.onData((data) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        pingSentRef.current = performance.now();
        ssm.sendText(ws, textEncoder.encode(data));
      }
    });

    // Resize → send stty to update remote PTY, then erase just the stty line locally
    term.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN && connectedRef.current) {
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            // Send resize via SSM protocol — clean, no visible stty command.
            // checkwinsize in bash picks up the new PTY dimensions automatically.
            ssm.sendInitMessage(socket, { rows, cols });
          }
        }, 300);
      }
    });

    // Auto-fit on container resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => { try { fitAddon.fit(); } catch { /* */ } });
    });
    resizeObserver.observe(termRef.current);

    // Fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => { try { fitAddon.fit(); } catch { /* */ } }, 100);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Latency ping interval (every 10s, only measures actual keystroke RTT)
    const latencyInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN && pingSentRef.current === 0) {
        measureLatency();
      }
    }, 10000);
    latencyIntervalRef.current = latencyInterval;

    const ctxEl = termRef.current;
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      ctxEl?.removeEventListener("contextmenu", handleContextMenu);
      clearInterval(latencyInterval);
      clearInterval(fitTimer);
      try { socket.close(); } catch { /* */ }
      term.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
      serializeRef.current = null;
      socketRef.current = null;
    };
  }, [streamUrl, tokenValue]);

  // Auto-focus on connect
  useEffect(() => {
    if (status === "connected") setTimeout(doFocus, 100);
  }, [status, doFocus]);

  // Latency color helper
  const latencyColor = latencyMs === null ? "text-zinc-600" :
    latencyMs < 100 ? "text-emerald-400" :
    latencyMs < 250 ? "text-amber-400" : "text-red-400";

  const latencyDot = latencyMs === null ? "bg-zinc-600" :
    latencyMs < 100 ? "bg-emerald-400" :
    latencyMs < 250 ? "bg-amber-400" : "bg-red-400";

  return (
    <div ref={wrapperRef} className="flex flex-col h-full relative" style={{ background: activeTheme.bg }}
      onClick={() => { if (!showSearch && !showShortcuts && !showThemePicker) doFocus(); }}
    >
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/60 shrink-0 bg-black/20 backdrop-blur-sm z-10">
        {/* Status */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          status === "connected" ? "bg-emerald-400" :
          status === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"
        }`} />
        <span className="text-[11px] text-zinc-500">
          {status === "connected" ? "Connected" :
           status === "connecting" ? "Connecting..." : "Disconnected"}
        </span>

        {/* Latency */}
        {status === "connected" && (
          <div className="flex items-center gap-1 ml-1" title={latencyMs !== null ? `Latency: ${latencyMs}ms` : "Measuring..."}>
            <div className={`w-1.5 h-1.5 rounded-full ${latencyDot}`} />
            <span className={`text-[10px] tabular-nums ${latencyColor}`}>
              {latencyMs !== null ? `${latencyMs}ms` : "—"}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Font size */}
        <span className="text-[10px] text-zinc-600 tabular-nums">{fontSize}px</span>
        <ToolbarBtn onClick={() => changeFontSize(-2)} title="Zoom out (Ctrl+-)">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M20 12H4" /></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => changeFontSize(2)} title="Zoom in (Ctrl++)">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </ToolbarBtn>

        <Divider />

        {/* Theme picker */}
        <div className="relative" ref={themePickerRef}>
          <ToolbarBtn onClick={() => setShowThemePicker(p => !p)} title="Theme (Ctrl+Shift+T)" active={showThemePicker}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          </ToolbarBtn>
          {showThemePicker && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wide border-b border-zinc-800">Dark</div>
              {THEMES.filter(t => t.mode === "dark").map(t => (
                <ThemeOption key={t.id} theme={t} active={t.id === activeTheme.id} onClick={() => applyTheme(t)} />
              ))}
              <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-medium uppercase tracking-wide border-b border-zinc-800 border-t">Light</div>
              {THEMES.filter(t => t.mode === "light").map(t => (
                <ThemeOption key={t.id} theme={t} active={t.id === activeTheme.id} onClick={() => applyTheme(t)} />
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <ToolbarBtn onClick={toggleSearch} title="Search (Ctrl+F)" active={showSearch}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </ToolbarBtn>

        {/* Export */}
        <ToolbarBtn onClick={exportSession} title="Export session">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </ToolbarBtn>

        {/* Shortcuts help */}
        <ToolbarBtn onClick={() => setShowShortcuts(p => !p)} title="Keyboard shortcuts (Ctrl+/)" active={showShortcuts}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </ToolbarBtn>

        {/* Fullscreen */}
        <ToolbarBtn onClick={toggleFullscreen} title="Fullscreen (F11)">
          {isFullscreen ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
          )}
        </ToolbarBtn>

        {/* Reconnect */}
        {status === "disconnected" && (
          <>
            <Divider />
            <button onClick={handleReconnect} disabled={reconnecting}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded transition-colors disabled:opacity-50">
              <svg className={`w-3 h-3 ${reconnecting ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {reconnecting ? "..." : "Reconnect"}
            </button>
          </>
        )}
      </div>

      {/* ─── Search bar ─── */}
      {showSearch && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/60 bg-black/30 backdrop-blur-sm shrink-0 z-10">
          <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input ref={searchInputRef} type="text" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(searchQuery, e.shiftKey ? "prev" : "next");
              else if (e.key === "Escape") toggleSearch();
            }}
            placeholder="Search terminal..." className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600" />
          <ToolbarBtn onClick={() => handleSearch(searchQuery, "prev")} title="Previous (Shift+Enter)">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => handleSearch(searchQuery, "next")} title="Next (Enter)">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </ToolbarBtn>
          <ToolbarBtn onClick={toggleSearch} title="Close (Esc)">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </ToolbarBtn>
        </div>
      )}

      {/* ─── Terminal ─── */}
      <div ref={termRef} className="flex-1" style={{ cursor: "text", minHeight: 0, overflow: "hidden" }} />

      {/* ─── Shortcuts overlay ─── */}
      {showShortcuts && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShortcuts(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-200">⌨️ Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-zinc-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-1">
              {SHORTCUTS.map(s => (
                <div key={s.keys} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-800/50">
                  <span className="text-xs text-zinc-400">{s.action}</span>
                  <kbd className="text-[11px] text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded font-mono">{s.keys}</kbd>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-4 text-center">Press Esc or Ctrl+/ to close</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════

function ToolbarBtn({ onClick, title, active, children }: {
  onClick: () => void; title: string; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`p-0.5 transition-colors ${active ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"}`}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-3 bg-zinc-700 mx-0.5" />;
}

function ThemeOption({ theme, active, onClick }: { theme: ThemeDef; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-800 ${active ? "text-violet-300 bg-zinc-800/60" : "text-zinc-300"}`}>
      <div className="flex gap-0.5 shrink-0">
        <div className="w-3 h-3 rounded-sm border border-zinc-700" style={{ background: theme.theme.background || "#000" }} />
        <div className="w-3 h-3 rounded-sm border border-zinc-700" style={{ background: theme.theme.green || "#0f0" }} />
        <div className="w-3 h-3 rounded-sm border border-zinc-700" style={{ background: theme.theme.blue || "#00f" }} />
        <div className="w-3 h-3 rounded-sm border border-zinc-700" style={{ background: theme.theme.red || "#f00" }} />
      </div>
      <span>{theme.name}</span>
      {active && <span className="ml-auto text-violet-400">✓</span>}
    </button>
  );
}
