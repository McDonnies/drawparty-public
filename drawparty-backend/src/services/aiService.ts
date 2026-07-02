import Groq from "groq-sdk";

const client = new Groq(); // reads GROQ_API_KEY from env

const callCounts = new Map<string, number>();
const correctRounds = new Set<string>();
const MAX_PER_ROUND = 3;

export function canCall(roomId: string, round: number): boolean {
  const key = `${roomId}:${round}`;
  return !correctRounds.has(key) && (callCounts.get(key) ?? 0) < MAX_PER_ROUND;
}

export function recordCall(roomId: string, round: number): void {
  const key = `${roomId}:${round}`;
  callCounts.set(key, (callCounts.get(key) ?? 0) + 1);
}

export function markCorrect(roomId: string, round: number): void {
  correctRounds.add(`${roomId}:${round}`);
}

export function clearRoom(roomId: string): void {
  for (const key of callCounts.keys()) {
    if (key.startsWith(`${roomId}:`)) callCounts.delete(key);
  }
  for (const key of correctRounds) {
    if (key.startsWith(`${roomId}:`)) correctRounds.delete(key);
  }
}

function toDataUrl(imageBase64: string): string {
  if (imageBase64.startsWith("data:")) return imageBase64;
  return `data:image/png;base64,${imageBase64}`;
}

/**
 * Parses the hint string format ("_ P _ _ E") into a human-readable constraint description.
 * Format: space-separated tokens — "_" = hidden, "|" = word boundary, uppercase = revealed letter.
 */
function parseHint(hint: string): { description: string; pattern: string } | null {
  if (!hint || !hint.trim()) return null;

  const tokens = hint.split(" ");
  const words: string[][] = [];
  let current: string[] = [];
  for (const t of tokens) {
    if (t === "|") {
      words.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  words.push(current);

  const totalLetters = words.reduce((sum, w) => sum + w.length, 0);
  const revealedCount = words.flat().filter((t) => t !== "_").length;

  const wordDescriptions = words.map((w) => {
    const revealed = w.map((t) => (t === "_" ? "_" : t.toUpperCase())).join("");
    return `${revealed} (${w.length} letter${w.length === 1 ? "" : "s"})`;
  });

  const pattern = words.map((w) => w.join("")).join(" ");

  const wordCountPart =
    words.length === 1
      ? `The answer is a single word with ${totalLetters} letter${totalLetters === 1 ? "" : "s"}.`
      : `The answer is ${words.length} words with ${totalLetters} letters total.`;

  const patternPart = `Word structure: ${wordDescriptions.join(" | ")}.`;

  const revealedPart =
    revealedCount > 0
      ? `Revealed letters (must appear in exact positions): ${wordDescriptions.join(" | ")}.`
      : `No letters revealed yet, but the length and structure must match exactly.`;

  return {
    description: `${wordCountPart} ${patternPart} ${revealedPart}`,
    pattern,
  };
}

export async function guessDrawing(imageBase64: string, hint?: string, wordLength?: number, letterHint?: string): Promise<string> {
  const hintInfo = hint ? parseHint(hint) : null;

  const skribblConstraints = hintInfo
    ? `\n\nCRITICAL CONSTRAINTS — your answer MUST satisfy ALL of these:\n${hintInfo.description}\nYour guess must match the letter pattern exactly. Do not guess a word of different length or structure.`
    : "";

  let aiJudgeConstraints = "";
  if (wordLength !== undefined) {
    aiJudgeConstraints += `\n\nCRITICAL: The answer is exactly ONE single word — no spaces, no phrases. The word has exactly ${wordLength} letter${wordLength === 1 ? "" : "s"}.`;
    if (letterHint) {
      aiJudgeConstraints += `\nLetter hint (revealed positions, underscore = hidden): ${letterHint}\nYour answer MUST match these revealed letters in their exact positions.`;
    }
    aiJudgeConstraints += `\nDo NOT include any explanation. Reply with the single word ONLY.`;
  }

  const constraints = wordLength !== undefined ? aiJudgeConstraints : skribblConstraints;

  const singleWordNote = wordLength !== undefined
    ? "Guess the single word depicted in this drawing."
    : "Guess what word or phrase is being depicted.";

  const prompt = `You are playing a drawing guessing game. Look at this drawing carefully and ${singleWordNote}${constraints}\n\nReply with ONLY your guess — nothing else. No explanation, no punctuation at the end.`;

  const response = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: wordLength !== undefined ? 8 : 20,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: toDataUrl(imageBase64) } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const raw = (response.choices[0]?.message?.content ?? "").trim().toLowerCase().replace(/\.+$/, "");
  // For AI Judge mode (single-word), take only the first token if model adds extra words
  if (wordLength !== undefined) {
    return raw.split(/\s+/)[0] ?? raw;
  }
  return raw;
}
