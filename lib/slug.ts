import { randomBytes } from "crypto";

// Lowercase alphanumeric, minus visually ambiguous characters (0/O, 1/l).
// Party slugs end up read aloud or typed by hand from a phone screen.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateSlug(length = 10): string {
  const bytes = randomBytes(length);
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return slug;
}
