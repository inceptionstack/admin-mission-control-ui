import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { SearchAddon } from "xterm-addon-search";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import { ssm } from "ssm-session";
import { Search, X, ChevronUp, ChevronDown, Download, RotateCcw } from "lucide-react";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const API_BASE = "/api";
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("id_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export function TerminalPopup() {
  const [params] = useSearchParams();
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const initRef = useRef(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showTuiReminder, setShowTuiReminder] = useState(() => {
    return localStorage.getItem("tui-reminder-dismissed") !== "1";
  });

  const dismissTuiReminder = (dontShow: boolean) => {
    if (dontShow) localStorage.setItem("tui-reminder-dismissed", "1");
    setShowTuiReminder(false);
  };
  const searchInputRef = useRef<HTMLInputElement>(null);

  const streamUrl = params.get("streamUrl") || "";
  const tokenValue = params.get("tokenValue") || "";
  const accountName = params.get("accountName") || "Terminal";
  const accountId = params.get("accountId") || "";
  const instanceId = params.get("instanceId") || "";

  function connectSocket(terminal: Terminal, url: string, token: string) {
    const termOptions = { rows: terminal.rows || 24, cols: terminal.cols || 80 };
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setDisconnected(false);
      ssm.init(socket, { token, termOptions });
    });
    socket.addEventListener("close", () => {
      setDisconnected(true);
      terminal.writeln(`\r\n\x1b[1;31m● Session ended\x1b[0m`);
    });
    socket.addEventListener("error", () => {
      setDisconnected(true);
      terminal.writeln(`\r\n\x1b[1;31m● Connection error\x1b[0m`);
    });
    socket.addEventListener("message", (event) => {
      try {
        const msg = ssm.decode(event.data);
        ssm.sendACK(socket, msg);
        if (msg.payloadType === 1 && msg.payload) terminal.write(textDecoder.decode(msg.payload));
        else if (msg.payloadType === 17) ssm.sendInitMessage(socket, termOptions);
      } catch { /* */ }
    });
    terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) ssm.sendText(socket, textEncoder.encode(data));
    });
    return socket;
  }

  async function handleReconnect() {
    if (!terminalRef.current || reconnecting) return;
    setReconnecting(true);
    terminalRef.current.writeln(`\r\n\x1b[38;2;168;139;250m⚡ Reconnecting...\x1b[0m`);
    try {
      socketRef.current?.close();
      const res = await fetch(`${API_BASE}/environments/${accountId}/ssm-url`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      connectSocket(terminalRef.current, data.streamUrl, data.tokenValue);
    } catch (err) {
      terminalRef.current?.writeln(`\x1b[1;31m● Reconnect failed: ${err}\x1b[0m`);
    } finally {
      setReconnecting(false);
    }
  }

  function handleExport() {
    const term = terminalRef.current;
    if (!term) return;
    const lines: string[] = [];
    const buf = term.buffer.active;
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${accountName}-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!termRef.current || initRef.current || !streamUrl) return;
    initRef.current = true;
    document.title = `${accountName} — SSM`;

    const terminal = new Terminal({
      cursorBlink: true, cursorStyle: "block", fontSize: 14, scrollback: 5000,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      rightClickSelectsWord: true, allowTransparency: false,
      theme: {
        background: "#0a0a0f", foreground: "#d4d4d8", cursor: "#a78bfa", selectionBackground: "#a78bfa40",
        black: "#18181b", brightBlack: "#3f3f46", red: "#ef4444", brightRed: "#f87171",
        green: "#22c55e", brightGreen: "#4ade80", yellow: "#eab308", brightYellow: "#facc15",
        blue: "#3b82f6", brightBlue: "#60a5fa", magenta: "#a855f7", brightMagenta: "#c084fc",
        cyan: "#06b6d4", brightCyan: "#22d3ee", white: "#d4d4d8", brightWhite: "#fafafa",
      },
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(termRef.current);
    terminalRef.current = terminal;
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;

    setTimeout(() => { try { fitAddon.fit(); } catch { /* */ } }, 100);

    terminal.writeln(`\x1b[38;2;168;139;250m⚡ Connecting to ${accountName}...\x1b[0m`);

    terminal.attachCustomKeyEventHandler((e) => {
      if (e.type === "keydown" && e.key === "f" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowSearch((p) => { if (!p) setTimeout(() => searchInputRef.current?.focus(), 50); return !p; });
        return false;
      }
      return true;
    });

    const socket = connectSocket(terminal, streamUrl, tokenValue);

    const ro = new ResizeObserver(() => { requestAnimationFrame(() => { try { fitAddon.fit(); } catch { /* */ } }); });
    ro.observe(termRef.current);

    return () => { ro.disconnect(); socket.close(); terminal.dispose(); };
  }, [streamUrl, tokenValue, accountName]);

  function handleSearchAction(query: string, dir: "next" | "prev" = "next") {
    if (!searchRef.current || !query) return;
    dir === "next" ? searchRef.current.findNext(query, { caseSensitive: false }) : searchRef.current.findPrevious(query, { caseSensitive: false });
  }

  if (!streamUrl) {
    return <div style={{ background: "#0a0a0f", color: "#ef4444", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>Missing session parameters</div>;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "#0a0a0f", position: "relative" }}>
      {/* Title bar */}
      <div style={{ height: "28px", backgroundColor: "#18181b", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", padding: "0 12px", gap: "8px", fontSize: "12px", color: "#a1a1aa", userSelect: "none", WebkitAppRegion: "drag" } as React.CSSProperties}>
        <span style={{ color: "#a78bfa" }}>⚡</span>
        <span>{accountName}</span>
        <span style={{ color: "#3f3f46" }}>|</span>
        <span style={{ color: "#3f3f46" }}>{instanceId}</span>
        <div style={{ flex: 1 }} />
        <button onClick={handleExport} style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", padding: "2px" }} title="Export"><Download size={12} /></button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="absolute top-8 right-2 z-20 flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 shadow-lg">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input ref={searchInputRef} type="text" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleSearchAction(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearchAction(searchQuery, e.shiftKey ? "prev" : "next"); else if (e.key === "Escape") setShowSearch(false); }}
            placeholder="Search..." className="bg-transparent text-sm text-white outline-none w-40 placeholder:text-zinc-600" />
          <button onClick={() => handleSearchAction(searchQuery, "prev")} className="p-0.5 text-zinc-500 hover:text-white"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleSearchAction(searchQuery, "next")} className="p-0.5 text-zinc-500 hover:text-white"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowSearch(false)} className="p-0.5 text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* openclaw tui reminder */}
      {showTuiReminder && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 w-[min(440px,90vw)]">
          <div className="bg-zinc-900 border border-blue-500/30 rounded-xl shadow-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">⚡</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 mb-1">Launch the Loki TUI</p>
                <p className="text-xs text-zinc-400">For the best experience, run this command in the terminal:</p>
                <code className="block mt-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-blue-300 text-xs font-mono tracking-wide">
                  openclaw tui
                </code>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-zinc-600 bg-zinc-800 text-blue-500 cursor-pointer"
                  onChange={(e) => { if (e.target.checked) localStorage.setItem("tui-reminder-dismissed", "1"); else localStorage.removeItem("tui-reminder-dismissed"); }}
                />
                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">Don't show again</span>
              </label>
              <button
                onClick={() => dismissTuiReminder(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnect */}
      {disconnected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button onClick={handleReconnect} disabled={reconnecting}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-white shadow-xl transition-colors disabled:opacity-50">
            <RotateCcw className={`w-4 h-4 ${reconnecting ? "animate-spin" : ""}`} />
            {reconnecting ? "Reconnecting..." : "Reconnect"}
          </button>
        </div>
      )}

      <div ref={termRef} style={{ width: "100%", height: "calc(100vh - 29px)" }} />
    </div>
  );
}