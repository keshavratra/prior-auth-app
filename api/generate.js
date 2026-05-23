export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userMessage } = req.body;
  if (!userMessage) return res.status(400).json({ error: "No input provided" });

  const SYSTEM_PROMPT = `You are a prior authorization assistant for medical practices.

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

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.prior,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}