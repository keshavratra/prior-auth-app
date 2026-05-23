import { useState } from "react";

// System prompt — tells Claude exactly what to do.
// It receives questions + notes and returns answers as JSON.
// Keeping it generic means it works for ANY drug and ANY insurer automatically.
const SYSTEM_PROMPT = `You are a prior authorization assistant for rheumatology practices.

You will receive two things:
1. Prior authorization questions (copied from CoverMyMeds or similar)
2. Clinical notes for the patient

Answer each question using only information found in the clinical notes.
Return ONLY a JSON array in this exact format:
[
  { "question": "the question text exactly as given", "answer": "your extracted answer" },
  ...
]

If information for a question cannot be found in the notes, use exactly:
"NOT FOUND — needs clarification"

Never invent, assume, or infer clinical information.
Return only the JSON array. No preamble, no explanation, no markdown fences.`;

export default function App() {
  const [questions, setQuestions] = useState("");  // pasted CoverMyMeds questions
  const [notes, setNotes]         = useState("");  // pasted chart notes
  const [answers, setAnswers]     = useState([]);  // Claude's extracted answers
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  async function handleExtract() {
    if (!questions.trim() || !notes.trim()) return;

    setLoading(true);
    setError("");
    setDone(false);
    setAnswers([]);

    try {
      // Combine both inputs into one user message
      const userMessage = `PRIOR AUTHORIZATION QUESTIONS:\n${questions}\n\nCLINICAL NOTES:\n${notes}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text);

      setAnswers(parsed);
      setDone(true);

    } catch (e) {
      setError("Extraction failed — check your API key or input format.");
    } finally {
      setLoading(false);
    }
  }

  // Allow user to manually correct any answer
  function handleEdit(index, value) {
    setAnswers((prev) => prev.map((a, i) => i === index ? { ...a, answer: value } : a));
  }

  const missingCount = answers.filter(a => a.answer === "NOT FOUND — needs clarification").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>
            Prior auth extractor
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>
            Paste questions and chart notes — get answers instantly
          </p>
        </div>

        {/* Two input boxes side by side on wide screens, stacked on narrow */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>

          {/* Box 1: Questions from CoverMyMeds */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.25rem"
          }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
              Paste questions
            </label>
            <textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="Copy and paste the questions from CoverMyMeds here..."
              style={{
                width: "100%", minHeight: 220, resize: "vertical",
                fontSize: 13, lineHeight: 1.6, padding: "10px 12px",
                boxSizing: "border-box",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-primary)",
                outline: "none", fontFamily: "var(--font-mono)"
              }}
            />
          </div>

          {/* Box 2: Chart notes */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "1.25rem"
          }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
              Paste chart notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste progress notes, med list, labs, assessment/plan..."
              style={{
                width: "100%", minHeight: 220, resize: "vertical",
                fontSize: 13, lineHeight: 1.6, padding: "10px 12px",
                boxSizing: "border-box",
                background: "var(--color-background-secondary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                color: "var(--color-text-primary)",
                outline: "none", fontFamily: "var(--font-mono)"
              }}
            />
          </div>
        </div>

        {/* Extract button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem" }}>
          <button
            onClick={handleExtract}
            disabled={loading || !questions.trim() || !notes.trim()}
            style={{
              background: loading || !questions.trim() || !notes.trim()
                ? "var(--color-background-secondary)"
                : "#185FA5",
              color: loading || !questions.trim() || !notes.trim()
                ? "var(--color-text-secondary)"
                : "white",
              border: "none", borderRadius: "var(--border-radius-md)",
              padding: "10px 24px", fontSize: 14, fontWeight: 500,
              cursor: loading || !questions.trim() || !notes.trim() ? "not-allowed" : "pointer",
              transition: "background 0.2s"
            }}
          >
            {loading ? "Extracting…" : "Extract answers"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "var(--color-background-danger)", color: "var(--color-text-danger)",
            border: "0.5px solid var(--color-border-danger)",
            borderRadius: "var(--border-radius-md)", padding: "10px 14px",
            fontSize: 13, marginBottom: "1.25rem"
          }}>
            {error}
          </div>
        )}

        {/* Status banner */}
        {done && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem",
            fontSize: 13,
            color: missingCount > 0 ? "var(--color-text-warning)" : "var(--color-text-success)"
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={missingCount > 0 ? "var(--color-text-warning)" : "var(--color-text-success)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {missingCount > 0
                ? <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                : <><circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14 15 10"/></>
              }
            </svg>
            {missingCount > 0
              ? `${missingCount} field${missingCount > 1 ? "s" : ""} need clarification`
              : "All answers extracted — review before submitting to CoverMyMeds"}
          </div>
        )}

        {/* Answers */}
        {answers.length > 0 && (
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
              fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)",
              letterSpacing: "0.04em", textTransform: "uppercase"
            }}>
              Extracted answers — edit as needed before pasting into CoverMyMeds
            </div>

            {answers.map((item, i) => {
              const missing = item.answer === "NOT FOUND — needs clarification";
              return (
                <div key={i} style={{
                  padding: "14px 16px",
                  borderBottom: i < answers.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                  background: missing ? "var(--color-background-warning)" : "transparent"
                }}>
                  {/* The original question text */}
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
                    {item.question}
                  </p>
                  {/* Editable answer */}
                  <input
                    value={item.answer}
                    onChange={(e) => handleEdit(i, e.target.value)}
                    style={{
                      width: "100%", fontSize: 13, padding: "7px 10px",
                      boxSizing: "border-box",
                      background: missing ? "rgba(255,255,255,0.6)" : "var(--color-background-secondary)",
                      border: missing
                        ? "0.5px solid var(--color-border-warning)"
                        : "0.5px solid var(--color-border-tertiary)",
                      borderRadius: "var(--border-radius-md)",
                      color: missing ? "var(--color-text-warning)" : "var(--color-text-primary)",
                      outline: "none", fontFamily: "var(--font-sans)"
                    }}
                  />
                </div>
              );
            })}

            {/* Copy all */}
            <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  const out = answers.map((a, i) => `Q${i+1}: ${a.question}\nA: ${a.answer}`).join("\n\n");
                  navigator.clipboard.writeText(out);
                }}
                style={{
                  fontSize: 13, padding: "7px 14px",
                  background: "transparent", border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: "var(--border-radius-md)", cursor: "pointer",
                  color: "var(--color-text-primary)"
                }}
              >
                Copy all
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}