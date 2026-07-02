// Excludes ambiguous chars (I, L, O, 0, 1) to avoid confusion when reading codes aloud.
export function generateRoomCode(): string {
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}
