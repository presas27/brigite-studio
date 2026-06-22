/**
 * Content moderation for the contact form — the anti-troll layer.
 *
 * Returns one of three verdicts:
 *  - `reject`  → silently dropped (unambiguous hate speech or heavy spam). The
 *                sender sees a normal "success", so they get no feedback to
 *                tune around.
 *  - `flag`    → delivered to Sara, but the email is marked ⚠️ with the reasons.
 *                Nothing legitimate is ever lost — borderline lands here.
 *  - `accept`  → clean, normal flow.
 *
 * Design bias: false positives must NEVER be silently dropped, so `reject` is
 * reserved for the unambiguous. Everything doubtful resolves to `flag`, which
 * still reaches Sara. The word lists are intentionally curated and conservative
 * — extend them with care, preferring `PROFANITY` (flag) over `HATE_SLURS`
 * (reject) when a term could ever be innocent.
 */

export type Verdict = "accept" | "flag" | "reject";
export type ModerationResult = { verdict: Verdict; score: number; reasons: string[] };

const FLAG_THRESHOLD = 2;
const REJECT_THRESHOLD = 6;

/** Unambiguous slurs only → immediate silent reject. Keep this list tight. */
const HATE_SLURS = [
  // EN
  "nigger", "nigga", "faggot", "kike", "spic", "chink", "tranny", "wetback",
  // PT
  "paneleiro", "paneleiros",
];

/** Generic profanity / insults → flag (+score), never an outright drop alone. */
const PROFANITY = [
  // PT
  "merda", "caralho", "foda", "fodase", "fodese", "puta", "putas", "cabrao",
  "filho da puta", "fdp", "porra", "corno", "otario", "imbecil", "estupido",
  "parvo", "idiota", "vai te foder", "vai-te foder", "escroto", "cretino",
  // EN
  "fuck", "fucking", "shit", "bitch", "asshole", "bastard", "dick", "moron",
  "idiot", "stupid", "loser", "retard", "cunt", "slut", "whore",
];

/** Commercial-spam signals → +score. */
const SPAM_KEYWORDS = [
  "viagra", "cialis", "casino", "poker", "crypto", "bitcoin", "forex", "loan",
  "mortgage", "backlink", "backlinks", "seo services", "ranking", "make money",
  "earn money", "free money", "investment opportunity", "binary option",
  "escort", "porn", "webcam", "xxx",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "@": "a", "$": "s",
};

/** Lowercase, strip accents, undo common leetspeak, collapse char runs. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[01345789@$]/g, (c) => LEET[c] ?? c)
    .replace(/(.)\1{2,}/g, "$1");
}

const LINK_RE =
  /(https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|net|org|ru|info|biz|xyz|top|online|site|link|shop|io)\b/gi;

function countLinks(text: string): number {
  return (text.match(LINK_RE) ?? []).length;
}

function capsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (letters.length < 20) return 0;
  const upper = (text.match(/[A-ZÀ-Þ]/g) ?? []).length;
  return upper / letters.length;
}

/**
 * A term matches if it appears as a whole token, or — for longer terms, where
 * substring matching is safe from the "Scunthorpe problem" — anywhere in the
 * separator-stripped text (catches "f u c k" / "c.a.r.a.l.h.o").
 */
function hasTerm(term: string, tokens: Set<string>, condensed: string): boolean {
  if (term.includes(" ")) return condensed.includes(term.replace(/ /g, ""));
  if (tokens.has(term)) return true;
  return term.length >= 5 && condensed.includes(term);
}

export function screen(input: { name?: string; message?: string }): ModerationResult {
  const raw = `${input.name ?? ""}\n${input.message ?? ""}`;
  const norm = normalize(raw);
  const tokens = new Set(norm.split(/[^a-z0-9]+/).filter(Boolean));
  const condensed = norm.replace(/[^a-z0-9]/g, "");

  const reasons: string[] = [];
  let score = 0;

  if (HATE_SLURS.some((t) => hasTerm(t, tokens, condensed))) {
    return { verdict: "reject", score: 99, reasons: ["discurso-de-ódio"] };
  }

  const profanityHits = PROFANITY.filter((t) => hasTerm(t, tokens, condensed)).length;
  if (profanityHits > 0) {
    score += 2 * profanityHits;
    reasons.push("linguagem-imprópria");
  }

  const spamHits = SPAM_KEYWORDS.filter((t) => hasTerm(t, tokens, condensed)).length;
  if (spamHits > 0) {
    score += 2 * spamHits;
    reasons.push("spam-comercial");
  }

  const links = countLinks(raw);
  if (links >= 3) {
    score += 5;
    reasons.push("muitos-links");
  } else if (links >= 1) {
    score += links === 2 ? 3 : 1;
    reasons.push("contém-links");
  }

  if (capsRatio(raw) > 0.7) {
    score += 2;
    reasons.push("maiúsculas-excessivas");
  }

  if (/(.)\1{5,}/.test(raw)) {
    score += 1;
    reasons.push("texto-repetitivo");
  }

  const verdict: Verdict =
    score >= REJECT_THRESHOLD ? "reject" : score >= FLAG_THRESHOLD ? "flag" : "accept";

  return { verdict, score, reasons };
}
