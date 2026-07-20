"use client";

import { useState } from "react";
import type { ChatMessage, PromptResponse } from "@/lib/prompt-schema";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<PromptResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitPrompt(text = input) {
    if (!text.trim() || loading) return;

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];

    setMessages(updatedMessages);
    setInput("");
    setResult(null);
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
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyFinalPrompt() {
    if (!result?.finalPrompt) return;
    await navigator.clipboard.writeText(result.finalPrompt);
    alert("Copied. Now paste it into Antigravity.");
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6 md:p-12">
      <h1 className="text-3xl font-bold">Antigravity Prompt Gateway</h1>

      <p className="mt-2 text-sm text-zinc-500">
        Hindi/Hinglish mein likho. Unclear hua to questions aayenge;
        clear hua to Antigravity-ready English prompt milega.
      </p>

      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Example: recorder wali problem theek karni hai, AI ki awaz video mein nahi aa rahi..."
        className="mt-6 min-h-40 w-full rounded-lg border p-4 outline-none focus:ring-2"
      />

      <button
        onClick={() => submitPrompt()}
        disabled={loading || !input.trim()}
        className="mt-3 rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Refine Prompt"}
      </button>

      {result?.status === "needs_clarification" && (
        <section className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold">Pehle yeh clarify karo</h2>
          <p className="mt-2 text-sm">{result.extractedIntent}</p>

          <div className="mt-4 space-y-2">
            {result.questions.map((question, index) => (
              <p key={index}>
                {index + 1}. {question}
              </p>
            ))}
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Answers ek saath likh do..."
            className="mt-4 min-h-28 w-full rounded-lg border bg-white p-3"
          />

          <button
            onClick={() => submitPrompt()}
            disabled={loading || !input.trim()}
            className="mt-3 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
          >
            Send Answers
          </button>
        </section>
      )}

      {result?.status === "ready" && (
        <section className="mt-8 rounded-xl border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="font-semibold">Final Antigravity Prompt</h2>

          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-white p-4 text-sm">
            {result.finalPrompt}
          </pre>

          <button
            onClick={copyFinalPrompt}
            className="mt-4 rounded-lg bg-black px-5 py-3 text-white"
          >
            Copy for Antigravity
          </button>

          {result.assumptions.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold">Assumptions</h3>
              <ul className="mt-2 list-disc pl-5">
                {result.assumptions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </>
          )}

          <h3 className="mt-6 font-semibold">Verification checklist</h3>
          <ul className="mt-2 list-disc pl-5">
            {result.verificationChecklist.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}