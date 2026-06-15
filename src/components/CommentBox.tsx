"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { buildSubmission, validate } from "@/lib/comment";

// Set NEXT_PUBLIC_COMMENT_ENDPOINT (e.g. a Formspree form URL) to enable. Inert
// until configured — mirrors Analytics.tsx (no account/code needed to ship this).
const ENDPOINT = process.env.NEXT_PUBLIC_COMMENT_ENDPOINT;

/** "Leave a comment" trigger + modal (D-010). Renders nothing until an endpoint is
 * configured. Submissions POST to a third-party form service; nothing is stored by us. */
export function CommentBox() {
  const [open, setOpen] = useState(false);
  if (!ENDPOINT) return null;
  return (
    <>
      <span className="mx-1">·</span>
      <button onClick={() => setOpen(true)} className="underline decoration-faded underline-offset-2 hover:text-ink">
        leave a comment
      </button>
      {open && <CommentModal endpoint={ENDPOINT} onClose={() => setOpen(false)} />}
    </>
  );
}

function CommentModal({ endpoint, onClose }: { endpoint: string; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textarea.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (honeypot.current?.value) {
      onClose(); // bot filled the hidden field — silently drop
      return;
    }
    const invalid = validate(message);
    if (invalid) {
      setErr(invalid);
      return;
    }
    setStatus("sending");
    setErr(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          buildSubmission(message, name, typeof window !== "undefined" ? window.location.pathname : ""),
        ),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
    } catch {
      setStatus("error");
      setErr("Couldn't send right now — please try again later.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leave a comment"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg border-2 border-ink bg-paper p-5 text-ink">
        {status === "sent" ? (
          <div className="text-center">
            <p className="font-display text-xl uppercase tracking-wide">Thanks</p>
            <p className="mt-1 font-mono text-xs text-ink-soft">Your comment is on its way to the maker.</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-vintage px-6 py-2 font-mono text-xs uppercase tracking-widest text-paper"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="font-display text-lg uppercase tracking-wide">Leave a comment</h2>
            <p className="mt-1 font-mono text-[10px] text-ink-faint">Bugs, ideas, anything — it goes straight to the maker.</p>
            <textarea
              ref={textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="What's on your mind?"
              className="mt-3 w-full rounded-md border border-faded bg-paper-dark/30 p-2 font-mono text-sm text-ink outline-none focus:border-ink"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="mt-2 w-full rounded-md border border-faded bg-paper-dark/30 p-2 font-mono text-xs text-ink outline-none focus:border-ink"
            />
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
            {err && <p className="mt-2 font-mono text-xs text-vintage">{err}</p>}
            <div className="mt-4 flex items-center justify-between gap-3">
              <button type="button" onClick={onClose} className="font-mono text-xs uppercase tracking-widest text-navy underline underline-offset-4">
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-lg bg-vintage px-6 py-2 font-mono text-xs uppercase tracking-widest text-paper disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
            <p className="mt-3 font-mono text-[9px] text-ink-faint">Sent via a third-party form — no account needed, nothing else collected.</p>
          </form>
        )}
      </div>
    </div>
  );
}
