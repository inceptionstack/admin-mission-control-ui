import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { FileText, Save, RefreshCw, AlertCircle, Check, ChevronDown, ChevronRight, Github } from "lucide-react";
import { request } from "../api/client";

interface BrainFile {
  name: string;
  size: number;
  sha: string;
  download_url: string;
}

interface ScriptFile {
  name: string;
  size: number;
  gist_id: string;
  updated_at: string | null;
}

export default function Bootstrap() {
  const [brainFiles, setBrainFiles] = useState<BrainFile[]>([]);
  const [scripts, setScripts] = useState<ScriptFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: "brain" | "script"; sha?: string } | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brainExpanded, setBrainExpanded] = useState(true);
  const [scriptsExpanded, setScriptsExpanded] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const [brainRes, scriptRes] = await Promise.all([
        request<BrainFile[]>("/bootstrap/brain"),
        request<ScriptFile[]>("/bootstrap/scripts"),
      ]);
      setBrainFiles(brainRes);
      setScripts(scriptRes);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const openFile = async (name: string, type: "brain" | "script", sha?: string) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await request<{ filename: string; content: string }>(`/bootstrap/${type === "brain" ? "brain" : "scripts"}/${name}`);
      setContent(res.content);
      setOriginalContent(res.content);
      setSelectedFile({ name, type, sha });
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    setError(null);
    try {
      if (selectedFile.type === "brain") {
        const res = await request<{ ok: boolean; sha: string }>(`/bootstrap/brain/${selectedFile.name}`, {
          method: "PUT",
          body: JSON.stringify({ content, sha: selectedFile.sha, message: `Update ${selectedFile.name} via Mission Control` }),
        });
        setSelectedFile({ ...selectedFile, sha: res.sha });
      } else {
        await request<{ ok: boolean }>(`/bootstrap/scripts/${selectedFile.name}`, {
          method: "PUT",
          body: JSON.stringify({ content }),
        });
      }
      setOriginalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchFiles();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const isDirty = content !== originalContent;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bootstrap Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage workspace templates and bootstrap scripts deployed to new environments</p>
        </div>
        <button onClick={fetchFiles} disabled={loading} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File List */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setBrainExpanded(!brainExpanded)}>
              <CardTitle className="text-sm flex items-center gap-2">
                {brainExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Github className="w-4 h-4" /> Brain Templates
                <span className="text-xs text-muted-foreground ml-auto">{brainFiles.length}</span>
              </CardTitle>
            </CardHeader>
            {brainExpanded && (
              <CardContent className="pt-0 space-y-0.5">
                {brainFiles.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => openFile(f.name, "brain", f.sha)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      selectedFile?.name === f.name && selectedFile?.type === "brain"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-auto">{(f.size / 1024).toFixed(1)}k</span>
                  </button>
                ))}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setScriptsExpanded(!scriptsExpanded)}>
              <CardTitle className="text-sm flex items-center gap-2">
                {scriptsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Github className="w-4 h-4" /> Bootstrap Scripts
                <span className="text-xs text-muted-foreground ml-auto">{scripts.length}</span>
              </CardTitle>
            </CardHeader>
            {scriptsExpanded && (
              <CardContent className="pt-0 space-y-0.5">
                {scripts.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => openFile(f.name, "script")}
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      selectedFile?.name === f.name && selectedFile?.type === "script"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-[10px] text-zinc-600 ml-auto">{(f.size / 1024).toFixed(1)}k</span>
                  </button>
                ))}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Editor */}
        <div className="lg:col-span-9">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {selectedFile ? (
                    <>
                      <Github className="w-4 h-4" />
                      {selectedFile.name}
                      {isDirty && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select a file to edit</span>
                  )}
                </CardTitle>
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                    <button
                      onClick={saveFile}
                      disabled={saving || !isDirty}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        isDirty
                          ? "bg-blue-600 text-white hover:bg-blue-500"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[calc(100vh-280px)] min-h-[400px] bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-300 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                  spellCheck={false}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
                  Select a brain template or bootstrap script to view and edit
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
