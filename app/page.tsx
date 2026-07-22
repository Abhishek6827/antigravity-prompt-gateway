"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage, PromptResponse } from "@/lib/prompt-schema";

/* ── Icons (inline SVGs to avoid deps) ── */

function SendIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275z" />
    </svg>
  );
}

function UndoIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M3 13a9 9 0 0 1 15.36-6.36L21 9" />
    </svg>
  );
}

function RocketIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ImageIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ── Typing indicator ── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-dot-pulse inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */

type UndoSnapshot = {
  messages: ChatMessage[];
  result: PromptResponse | null;
  userText: string;
};

type HistoryItem = {
  id: number;
  timestamp: string;
  userPrompt: string;
  finalPrompt: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<PromptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clarificationRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function saveToHistory(userPrompt: string, finalPrompt: string) {
    if (!finalPrompt) return;
    const newItem: HistoryItem = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      userPrompt,
      finalPrompt,
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev.filter((h) => h.finalPrompt !== finalPrompt)].slice(0, 30);
      try {
        localStorage.setItem("prompt_gateway_history", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }

  // Load from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("prompt_gateway_messages");
    const savedResult = localStorage.getItem("prompt_gateway_result");
    const savedUndo = localStorage.getItem("prompt_gateway_undo");
    const savedHistory = localStorage.getItem("prompt_gateway_history");

    if (savedMessages) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
      } catch (e) {
        console.error("Failed to parse saved result", e);
      }
    }
    if (savedUndo) {
      try {
        setUndoSnapshot(JSON.parse(savedUndo));
      } catch (e) {
        console.error("Failed to parse saved undo snapshot", e);
      }
    }
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse saved history", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!isLoaded) return;
    if (messages.length > 0) {
      localStorage.setItem("prompt_gateway_messages", JSON.stringify(messages));
    } else {
      localStorage.removeItem("prompt_gateway_messages");
    }
  }, [messages, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (result) {
      localStorage.setItem("prompt_gateway_result", JSON.stringify(result));
    } else {
      localStorage.removeItem("prompt_gateway_result");
    }
  }, [result, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (undoSnapshot) {
      localStorage.setItem("prompt_gateway_undo", JSON.stringify(undoSnapshot));
    } else {
      localStorage.removeItem("prompt_gateway_undo");
    }
  }, [undoSnapshot, isLoaded]);

  /* Auto-scroll to bottom when messages change or loading toggles */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, result]);

  /* Focus clarification textarea when questions arrive */
  useEffect(() => {
    if (result?.status === "needs_clarification") {
      clarificationRef.current?.focus();
    }
  }, [result]);

  /* ── Core submission logic (unchanged API behavior) ── */
  /* ── Core submission logic (unchanged API behavior) ── */
  async function submitPrompt(text?: string) {
    const contentStr = (text ?? input).trim();
    if (!contentStr || loading) return;

    let finalContent: any = contentStr;
    if (images.length > 0) {
      finalContent = [
        { type: "text", text: contentStr },
        ...images.map(img => ({ type: "image_url", image_url: { url: img } }))
      ];
    }

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: finalContent },
    ];

    /* Save snapshot for undo */
    setUndoSnapshot({ messages: [...messages], result, userText: contentStr });

    setMessages(updatedMessages);
    setInput("");
    setImages([]);
    setClarificationAnswer("");
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data);

      if (data.status === "ready" && data.finalPrompt) {
        saveToHistory(contentStr, data.finalPrompt);
      }

      const assistantSummary =
        data.status === "needs_clarification"
          ? `Questions:\n${data.questions.join("\n")}`
          : data.finalPrompt;

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: assistantSummary },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /* ── Submit clarification answer ── */
  function submitClarification() {
    const textStr = clarificationAnswer.trim();
    if (!textStr && images.length === 0) return;
    submitPrompt(textStr);
  }

  /* ── Copy final prompt ── */
  async function copyFinalPrompt() {
    if (!result?.finalPrompt) return;
    try {
      await navigator.clipboard.writeText(result.finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  }

  /* ── Send to Antigravity via bridge extension ── */
  async function sendToAntigravity() {
    if (!result?.finalPrompt || sent) return;
    try {
      const res = await fetch("http://127.0.0.1:9877/send-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: result.finalPrompt }),
      });
      if (!res.ok) throw new Error("Bridge server responded with an error.");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch {
      setError(
        "Could not reach the bridge extension. Make sure the Prompt Gateway Bridge extension is installed and running in your IDE.",
      );
    }
  }

  /* ── Undo last send ── */
  function handleUndo() {
    if (!undoSnapshot || loading) return;
    setMessages(undoSnapshot.messages);
    setResult(undoSnapshot.result);
    setError(null);
    /* Put text back in the right input */
    if (undoSnapshot.result?.status === "needs_clarification") {
      setClarificationAnswer(undoSnapshot.userText);
    } else {
      setInput(undoSnapshot.userText);
    }
    setUndoSnapshot(null);
  }

  /* ── New chat ── */
  function handleNewChat() {
    if (result?.status === "ready" && result.finalPrompt) {
      // Find the last user message text
      let userText = "Prompt";
      const lastUserMsg = messages.findLast((m) => m.role === "user");
      if (lastUserMsg) {
        userText = typeof lastUserMsg.content === 'string' 
          ? lastUserMsg.content 
          : lastUserMsg.content.find((i: any) => i.type === 'text')?.text || "Prompt";
      }
      saveToHistory(userText, result.finalPrompt);
    }
    if (messages.length > 0 && !window.confirm("Start a new chat? This will clear the current conversation.")) {
      return;
    }
    setInput("");
    setImages([]);
    setClarificationAnswer("");
    setMessages([]);
    setResult(null);
    setError(null);
    setLoading(false);
    setCopied(false);
    setUndoSnapshot(null);
    inputRef.current?.focus();
  }

  /* ── Image Upload Handlers ── */
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    addImages(files);
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const files = [];
    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) addImages(files);
  }

  function addImages(files: File[]) {
    if (images.length >= 2) {
      setError("Maximum 2 screenshots allowed.");
      return;
    }
    const toProcess = files.slice(0, 2 - images.length);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  /* ── Determine current phase ── */
  const isEmpty = messages.length === 0 && !loading;
  const needsClarification = result?.status === "needs_clarification";
  const isReady = result?.status === "ready";

  /* ── Keyboard submit (Enter) ── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, submitFn: () => void) {
    const isEnter = e.key === "Enter" || e.keyCode === 13 || e.code === "Enter";
    if (isEnter && !e.shiftKey) {
      if (e.nativeEvent.isComposing && e.keyCode === 229) return;
      e.preventDefault();
      e.stopPropagation();
      submitFn();
    }
  }

  /* ── Status pill ── */
  function statusText() {
    if (loading) return "Analyzing…";
    if (isReady) return "Prompt ready";
    if (needsClarification) return "Awaiting answers";
    return "Ready";
  }

  function statusColor() {
    if (loading) return "bg-amber-500/20 text-amber-400";
    if (isReady) return "bg-emerald-500/20 text-emerald-400";
    if (needsClarification) return "bg-violet-500/20 text-violet-400";
    return "bg-[var(--border)] text-[var(--muted)]";
  }

  return (
    <div className="flex h-screen flex-col animate-fade-in">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)] md:text-lg">
            Prompt Gateway
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColor()}`}>
            {statusText()}
          </span>
          <button
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--secondary)] transition-all duration-200 hover:border-[var(--border-light)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            History
          </button>
          <button
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--secondary)] transition-all duration-200 hover:border-[var(--border-light)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </header>

      {/* ── Chat messages list ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Welcome state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 animate-message-in">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 shadow-lg shadow-[var(--accent)]/5">
                <SparklesIcon className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] mb-2">
                Prompt Gateway
              </h2>
              <p className="text-sm text-[var(--secondary)] max-w-md leading-relaxed mb-6">
                Apna raw intent Hindi, Hinglish ya English mein likho. AI context analyze karke Antigravity ke liye optimized prompt banayega.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg text-left">
                {[
                  "recorder wali problem theek karni hai",
                  "FastAPI setup setup karo with PostgreSQL",
                  "Docker image generate karo Python app ke liye",
                  "UI design responsive banao with Tailwind"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(example); inputRef.current?.focus(); }}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-light)] hover:bg-[var(--surface-hover)] text-xs text-[var(--secondary)] hover:text-[var(--foreground)] transition-all duration-200 text-left flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{example}</span>
                    <span className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render chat history */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const isLastUser = idx === messages.findLastIndex((m) => m.role === "user");

            if (isUser) {
              const textContent = typeof msg.content === 'string' 
                ? msg.content 
                : msg.content.find((i: any) => i.type === 'text')?.text || "";
              
              const imageContent = Array.isArray(msg.content) 
                ? msg.content.filter((i: any) => i.type === 'image_url').map((i: any) => i.image_url.url)
                : [];

              return (
                <div key={idx} className="flex justify-end animate-message-in">
                  <div className="group relative max-w-[85%]">
                    <div className="rounded-2xl rounded-br-md bg-[var(--user-bubble)] border border-[var(--user-bubble-border)] px-4 py-3 text-sm text-[var(--foreground)] leading-relaxed shadow-sm">
                      {imageContent.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto">
                          {imageContent.map((imgUrl, i) => (
                            <img key={i} src={imgUrl} alt="uploaded" className="h-20 w-auto rounded object-cover border border-[var(--border)]" />
                          ))}
                        </div>
                      )}
                      {textContent}
                    </div>
                    {/* Undo button for the last user message */}
                    {isLastUser && undoSnapshot && !loading && (
                      <button
                        onClick={handleUndo}
                        className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border)] shadow-sm"
                      >
                        <UndoIcon />
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            /* Assistant messages */
            return (
              <div key={idx} className="space-y-4">
                {needsClarification && idx === messages.length - 1 && (
                  <ClarificationCard
                    extractedIntent={result.extractedIntent}
                    questions={result.questions}
                    onNewChat={handleNewChat}
                  />
                )}
                {isReady && idx === messages.length - 1 && (
                  <FinalPromptCard
                    result={result}
                    copied={copied}
                    sent={sent}
                    onCopy={copyFinalPrompt}
                    onSend={sendToAntigravity}
                  />
                )}
                {/* Fallback plain text summary if older message */}
                {!((needsClarification || isReady) && idx === messages.length - 1) && (
                  <div className="flex justify-start animate-message-in">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md glass-surface px-4 py-3 text-sm text-[var(--secondary)] leading-relaxed">
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start animate-message-in">
              <div className="glass-surface rounded-2xl rounded-bl-md">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      {/* ── Input composer ── */}
      <footer className="border-t border-[var(--border)] bg-[var(--background)]/80 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto max-w-2xl">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400 animate-message-in flex justify-between items-center">
              <span><span className="font-semibold">Error:</span> {error}</span>
              <button onClick={() => setError(null)} className="underline opacity-75 hover:opacity-100">Dismiss</button>
            </div>
          )}
          
          {images.length > 0 && (
            <div className="flex gap-2 mb-3">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="upload preview" className="h-16 w-16 object-cover rounded-lg border border-[var(--border)]" />
                  <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />
            <textarea
              ref={needsClarification ? clarificationRef : inputRef}
              value={needsClarification ? clarificationAnswer : input}
              onChange={(e) => {
                if (needsClarification) setClarificationAnswer(e.target.value);
                else setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (needsClarification) submitClarification();
                  else submitPrompt();
                }
              }}
              onPaste={handlePaste}
              placeholder={needsClarification ? "Answers ek saath likh do... (or attach a screenshot)" : "Hindi/Hinglish mein likho… e.g. recorder wali problem theek karni hai"}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors duration-200 hover:border-[var(--border-light)]"
            />
            <div className="flex flex-col gap-2 justify-end">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || images.length >= 2}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--secondary)] transition-all duration-200 hover:border-[var(--border-light)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:hover:bg-[var(--surface)]"
                title="Attach Screenshot"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (needsClarification) submitClarification();
                  else submitPrompt();
                }}
                disabled={loading || (!(needsClarification ? clarificationAnswer : input).trim() && images.length === 0)}
                className="rounded-xl bg-[var(--accent)] p-2.5 text-white transition-all duration-200 hover:bg-[var(--accent-hover)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
            Enter to send, Shift + Enter for new line
          </p>
        </div>
      </footer>

      {/* ── History Drawer Modal ── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4 backdrop-blur-md animate-message-in">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between border-b border-[var(--border)] pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Prompt History</h3>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-lg p-1 text-sm text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              ✕
            </button>
          </div>

          <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto space-y-3 pr-1">
            {history.length === 0 ? (
              <div className="py-16 text-center text-xs text-[var(--muted)]">
                No history saved yet. Refine a prompt to see it here!
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2 transition-all hover:border-[var(--accent)]/40"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span className="truncate max-w-[250px] font-mono text-[var(--secondary)]">{item.userPrompt}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border)]/50 bg-black/40 p-2.5 font-mono text-xs text-[var(--foreground)] select-text">
                    {item.finalPrompt}
                  </pre>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.finalPrompt);
                      }}
                      className="rounded-lg border border-[var(--border)] bg-black/30 px-2.5 py-1 text-xs text-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        setInput(item.finalPrompt);
                        setShowHistory(false);
                        inputRef.current?.focus();
                      }}
                      className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs text-white hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Use Prompt
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mx-auto flex w-full max-w-2xl justify-between border-t border-[var(--border)] pt-3 mt-3 text-xs text-[var(--muted)] shrink-0">
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem("prompt_gateway_history");
              }}
              className="hover:text-red-400 transition-colors"
            >
              Clear History
            </button>
            <span>Saved locally in browser</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

/* ── Clarification card ── */

function ClarificationCard({
  extractedIntent,
  questions,
  onNewChat,
}: {
  extractedIntent: string;
  questions: string[];
  onNewChat?: () => void;
}) {
  return (
    <div className="glass-surface overflow-hidden animate-message-in">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-amber-500/5 px-4 py-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Clarification needed
        </p>
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="text-xs text-[var(--secondary)] hover:text-[var(--foreground)] underline transition-colors"
          >
            Start New Prompt
          </button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Extracted intent */}
        <p className="text-sm leading-relaxed text-[var(--secondary)]">
          {extractedIntent}
        </p>

        {/* Questions */}
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg bg-[var(--background)] px-3 py-2.5"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-400">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-[var(--foreground)]">
                {q}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Final prompt card ── */

function FinalPromptCard({
  result,
  copied,
  sent,
  onCopy,
  onSend,
}: {
  result: PromptResponse;
  copied: boolean;
  sent: boolean;
  onCopy: () => void;
  onSend: () => void;
}) {
  return (
    <div className="glass-surface overflow-hidden animate-message-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-emerald-500/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Final Antigravity Prompt
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              copied
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-[var(--surface-hover)] text-[var(--secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={onSend}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              sent
                ? "bg-violet-500/20 text-violet-400"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            }`}
          >
            {sent ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                Sent!
              </>
            ) : (
              <>
                <RocketIcon className="w-3.5 h-3.5" />
                Send to Antigravity
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prompt body */}
      <div className="px-4 py-4">
        <pre className="whitespace-pre-wrap rounded-lg bg-[var(--background)] p-4 font-mono text-sm leading-relaxed text-[var(--foreground)] border border-[var(--border)]">
          {result.finalPrompt}
        </pre>
      </div>

      {/* Assumptions */}
      {result.assumptions.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Assumptions
          </p>
          <ul className="space-y-1">
            {result.assumptions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--secondary)]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verification checklist */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Verification Checklist
        </p>
        <ul className="space-y-1">
          {result.verificationChecklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--secondary)]">
              <CheckIcon className="mt-0.5 w-3.5 h-3.5 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}