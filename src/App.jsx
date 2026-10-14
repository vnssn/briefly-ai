import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Check,
  CheckCheck,
  ChevronRight,
  Clipboard,
  Download,
  FileText,
  Flag,
  HelpCircle,
  Layers,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import {
  SAMPLE_NOTES,
  SAMPLE_BRIEF,
  validateBrief,
  toMarkdown,
} from "./brief.js";
export function NotesEditor({
  notes,
  setNotes,
  onGenerate,
  busy,
  onSample,
  cooldownSeconds = 0,
}) {
  return (
    <section className="editor card" aria-labelledby="notes-title">
      <div className="card-heading">
        <div className="heading-icon">
          <FileText size={19} />
        </div>
        <h2 id="notes-title">Your meeting notes</h2>
        <span className="step-label">STEP 01</span>
      </div>
      <div className="editor-body">
        <label htmlFor="notes">Start with the messy part.</label>
        <p>
          Paste your transcript, rough notes, or a brain dump. We’ll find the
          signal.
        </p>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={15000}
          placeholder={
            "Product sync, Monday 10:00 AM\n\nWhat did you discuss? What was decided?\nWho is doing what next?"
          }
          aria-describedby="notes-help"
          disabled={busy}
        />
        <div className="editor-meta">
          <span id="notes-help">40 characters minimum</span>
          <span>{notes.length.toLocaleString()} / 15,000</span>
        </div>
        <div className="sample-callout">
          <span className="sample-symbol">
            <Sparkles size={17} />
          </span>
          <div>
            <strong>Just looking around?</strong>
            <span>See what a little clarity looks like.</span>
          </div>
          <button className="text-button" onClick={onSample} disabled={busy}>
            Try a sample <ArrowUpRight size={15} />
          </button>
        </div>
        <button
          className="generate"
          onClick={onGenerate}
          disabled={busy || cooldownSeconds > 0 || notes.trim().length < 40}
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}{" "}
          {busy
            ? "Finding the important things…"
            : cooldownSeconds > 0
              ? `Try again in ${Math.ceil(cooldownSeconds / 60)} min`
              : "Create my brief"}
          {!busy && <ArrowRight size={18} />}
        </button>
        <p className="privacy">
          <ShieldCheck size={13} /> Notes are sent to Gemini only when you
          create a brief.
        </p>
      </div>
    </section>
  );
}
export function BriefResult({
  brief,
  completed,
  toggle,
  onExport,
  onCopy,
  copied,
  isSample,
}) {
  return (
    <section className="result card" aria-labelledby="result-title">
      <div className="card-heading">
        <div className="heading-icon mint">
          <Layers size={19} />
        </div>
        <h2 id="result-title">The clear version</h2>
        <span className="ready">
          <span /> {isSample ? "SAMPLE BRIEF" : "READY TO GO"}
        </span>
      </div>
      <div className="result-body">
        <div className="result-eyebrow">
          MEETING BRIEF <span>•</span>{" "}
          {isSample ? "EXAMPLE" : "AI GENERATED · REVIEW BEFORE SHARING"}
        </div>
        <h3>{brief.title}</h3>
        <p className="summary">{brief.summary}</p>
        <div className="section-label">
          <Flag size={15} />
          <h4>Decisions made</h4>
          <span>{brief.decisions.length}</span>
        </div>
        {brief.decisions.length ? (
          <ul className="decisions">
            {brief.decisions.map((d, i) => (
              <li key={i}>
                <Check size={15} />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-line">No confirmed decisions in these notes.</p>
        )}
        <div className="section-label">
          <CheckCheck size={16} />
          <h4>Next moves</h4>
          <span>{brief.actions.length}</span>
          <small>{completed.length} completed</small>
        </div>
        <div className="actions">
          {brief.actions.length ? (
            brief.actions.map((a, i) => (
              <label
                key={i}
                className={`action ${completed.includes(i) ? "done" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={completed.includes(i)}
                  onChange={() => toggle(i)}
                />
                <span>
                  <strong>{a.task}</strong>
                  <span className="action-meta">
                    <b>{a.owner}</b>
                    <span>Due {a.due}</span>
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="empty-line">No explicit action items found.</p>
          )}
        </div>
        <div className="questions">
          <div className="section-label">
            <HelpCircle size={16} />
            <h4>Still to figure out</h4>
          </div>
          {brief.questions.length ? (
            <ul>
              {brief.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          ) : (
            <p>No open questions recorded.</p>
          )}
        </div>
        <div className="result-footer">
          <span>Clarity looks good on you.</span>
          <button
            className="icon-button"
            onClick={onCopy}
            aria-label="Copy brief as Markdown"
          >
            {copied ? <Check size={17} /> : <Clipboard size={17} />}
          </button>
          <button className="export-button" onClick={onExport}>
            <Download size={15} /> Export .md
          </button>
        </div>
      </div>
    </section>
  );
}
export default function App() {
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const deadline = Date.now() + cooldownSeconds * 1000;
    const timer = setInterval(
      () =>
        setCooldownSeconds(
          Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [cooldownSeconds]);
  const [notes, setNotes] = useState(""),
    [brief, setBrief] = useState(null),
    [completed, setCompleted] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [isSample, setIsSample] = useState(false),
    [copied, setCopied] = useState(false),
    [notice, setNotice] = useState("");
  const resultRef = useRef(null),
    requestRef = useRef(false);
  const sample = () => {
    setNotes(SAMPLE_NOTES);
    setBrief(SAMPLE_BRIEF);
    setCompleted([]);
    setIsSample(true);
    setError("");
    setNotice(
      "Sample loaded. This is a prepared example, not a live AI response.",
    );
  };
  const generate = async () => {
    if (requestRef.current || cooldownSeconds > 0) return;
    requestRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (
        !response.ok &&
        Number.isFinite(data.retryAfter) &&
        data.retryAfter > 0
      )
        setCooldownSeconds(Math.min(86400, Math.ceil(data.retryAfter)));
      if (!response.ok)
        throw new Error(
          data.error || "We couldn’t create your brief. Please try again.",
        );
      setBrief(validateBrief(data.brief));
      setCompleted([]);
      setIsSample(false);
      setNotice(
        "Your brief is ready. Review the details against your original notes.",
      );
      resultRef.current?.focus();
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? "The request timed out. Your notes are still here; try again."
          : e instanceof SyntaxError
            ? "The server returned an unexpected response. Your notes are still here; try again."
            : e.message,
      );
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  };
  const exportBrief = () => {
    const url = URL.createObjectURL(
      new Blob([toMarkdown(brief, completed)], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "briefly-meeting-brief.md";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Brief exported as Markdown.");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(brief, completed));
      setCopied(true);
      setNotice("Brief copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Clipboard unavailable. Use Export .md to save your brief.");
    }
  };
  const reset = () => {
    setNotes("");
    setBrief(null);
    setCompleted([]);
    setError("");
    setIsSample(false);
    setNotice("Workspace cleared.");
    document.getElementById("notes")?.focus();
  };
  return (
    <>
      <a className="skip" href="#workspace">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a className="logo" href="#" aria-label="Briefly home">
          <span className="logo-mark">
            <AudioLines size={24} />
          </span>
          briefly<span className="logo-dot">.</span>
        </a>
        <div className="workspace-name">
          <span className="avatar">V</span>
          <span>
            Personal workspace<small>Your space for clear thinking</small>
          </span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item selected" href="#workspace">
          <SquarePen size={18} /> Meeting workspace <ChevronRight size={15} />
        </a>
        <div className="sidebar-note">
          <span className="little-stars">✳</span>
          <h3>
            Less meeting.
            <br />
            More meaning.
          </h3>
          <p>Good ideas deserve better than getting lost in your notes.</p>
          <div className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Built for your next move{" "}
          <span>↗</span>
        </div>
      </aside>
      <div className="page">
        <header>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <strong>Meeting brief</strong>
          </div>
          <span className="header-badge">
            <Sparkles size={13} /> A LITTLE HELP FROM AI
          </span>
        </header>
        <main id="workspace">
          <div className="intro">
            <div>
              <div className="eyebrow">
                <span /> FROM CONVERSATION TO CLARITY
              </div>
              <h1>
                Great meetings.
                <br />
                <span>Even better follow-through.</span>
              </h1>
              <p>
                Turn a tangle of notes into decisions, next steps, and a clear
                way forward.
              </p>
            </div>
            <button className="new-button" onClick={reset} disabled={busy}>
              <Plus size={16} /> New brief
            </button>
          </div>
          <div className="workflow-strip">
            <span>
              <b>1</b> Drop in your notes
            </span>
            <div />
            <span>
              <b>2</b> Let AI connect the dots
            </span>
            <div />
            <span>
              <b>3</b> Leave with a plan <ArrowUpRight size={14} />
            </span>
          </div>
          {error && (
            <div className="error" role="alert">
              <HelpCircle size={18} />
              <span>
                {error} {brief ? "Your previous brief remains below." : ""}
              </span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="sr-only" role="status">
            {notice}
          </div>
          <div className="workspace-grid" aria-busy={busy}>
            <NotesEditor
              notes={notes}
              setNotes={setNotes}
              busy={busy}
              cooldownSeconds={cooldownSeconds}
              onGenerate={generate}
              onSample={sample}
            />
            <div tabIndex={-1} ref={resultRef} className="result-container">
              {brief ? (
                <BriefResult
                  brief={brief}
                  completed={completed}
                  toggle={(i) =>
                    setCompleted((c) =>
                      c.includes(i) ? c.filter((x) => x !== i) : [...c, i],
                    )
                  }
                  onExport={exportBrief}
                  onCopy={copy}
                  copied={copied}
                  isSample={isSample}
                />
              ) : (
                <section
                  className="empty-result card"
                  aria-labelledby="empty-title"
                >
                  <div className="card-heading">
                    <div className="heading-icon mint">
                      <Layers size={19} />
                    </div>
                    <h2 id="empty-title">The clear version</h2>
                    <span className="step-label">STEP 02</span>
                  </div>
                  <div className="empty-content">
                    <div className="paper-art">
                      <div className="paper-icon">
                        <Sparkles size={23} />
                      </div>
                      <div className="paper-line long" />
                      <div className="paper-line" />
                      <div className="paper-check">
                        <Check size={12} />
                        <div />
                      </div>
                      <div className="paper-check">
                        <Check size={12} />
                        <div />
                      </div>
                      <span className="paper-spark">✳</span>
                    </div>
                    <h3>
                      A little structure.
                      <br />A lot more headspace.
                    </h3>
                    <p>
                      Your summary, decisions, and action items
                      <br />
                      will find their home right here.
                    </p>
                    <button className="text-button" onClick={sample}>
                      Show me an example <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="empty-bottom">
                    <ShieldCheck size={15} /> No notes saved. No extra noise.
                  </div>
                </section>
              )}
            </div>
          </div>
          <div className="bottom-note">
            <ShieldCheck size={16} />
            <span>
              Your workspace stays in this tab. We don’t store your meeting
              notes.
            </span>
            <span className="review-note">
              AI can miss things. A quick review goes a long way.
            </span>
          </div>
        </main>
        <footer>
          <span>Made for the moment after the meeting.</span>
          <span>
            BRIEFLY <span className="footer-star">✳</span> MAKE SPACE FOR WHAT’S
            NEXT
          </span>
        </footer>
      </div>
    </>
  );
}
