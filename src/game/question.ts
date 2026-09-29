// A question in any subject, as text. The UI renders these fields without knowing the subject.
export interface Question {
  id: number;
  // Identifies the content (e.g. "en-3-017" or "7 × 6") so a run can avoid repeats.
  key: string;
  prompt: string;
  answer: string;
  choices: string[];
  // Shown on a miss as before + answer + after, with the answer highlighted.
  reveal: { before: string; after: string };
}
