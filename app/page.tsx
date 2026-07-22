"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

export default function Home() {
  const [input, setInput] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<PromptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clarificationRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("prompt_gateway_messages");
    const savedResult = localStorage.getItem("prompt_gateway_result");
    const savedUndo = localStorage.getItem("prompt_gateway_undo");

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
  const submitPrompt = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;

      const updatedMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content },
      ];

      /* Save snapshot for undo */
      setUndoSnapshot({ messages: [...messages], result, userText: content });

      setMessages(updatedMessages);
      setInput("");
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
    },
    [input, messages, loading],
  );

  /* ── Submit clarification answer ── */
  function submitClarification() {
    if (!clarificationAnswer.trim()) return;
    submitPrompt(clarificationAnswer);
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
    if (messages.length > 0 && !window.confirm("Start a new chat? This will clear the current conversation.")) {
      return;
    }
    setInput("");
    setClarificationAnswer("");
    setMessages([]);
    setResult(null);
    setError(null);
    setLoading(false);
    setCopied(false);
    setUndoSnapshot(null);
    inputRef.current?.focus();
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

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColor()}`}>
            {statusText()}
          </span>
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
              return (
                <div key={idx} className="flex justify-end animate-message-in">
                  <div className="group relative max-w-[85%]">
                    <div className="rounded-2xl rounded-br-md bg-[var(--user-bubble)] border border-[var(--user-bubble-border)] px-4 py-3 text-sm text-[var(--foreground)] leading-relaxed shadow-sm">
                      {msg.content}
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
          {needsClarification ? (
            /* Clarification answer input */
            <div className="flex gap-3">
              <textarea
                ref={clarificationRef}
                value={clarificationAnswer}
                onChange={(e) => setClarificationAnswer(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, submitClarification)}
                placeholder="Answers ek saath likh do…"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors duration-200 hover:border-[var(--border-light)]"
              />
              <button
                onClick={submitClarification}
                disabled={loading || !clarificationAnswer.trim()}
                className="self-end rounded-xl bg-[var(--accent)] p-3 text-white transition-all duration-200 hover:bg-[var(--accent-hover)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Initial prompt input */
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  handleKeyDown(e, () => submitPrompt())
                }
                placeholder="Hindi/Hinglish mein likho… e.g. recorder wali problem theek karni hai"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors duration-200 hover:border-[var(--border-light)]"
              />
              <button
                onClick={() => submitPrompt()}
                disabled={loading || !input.trim()}
                className="self-end rounded-xl bg-[var(--accent)] p-3 text-white transition-all duration-200 hover:bg-[var(--accent-hover)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
            Enter to send, Shift + Enter for new line
          </p>
        </div>
      </footer>
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
}: {
  extractedIntent: string;
  questions: string[];
}) {
  return (
    <div className="glass-surface overflow-hidden animate-message-in">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-amber-500/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          Clarification needed
        </p>
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