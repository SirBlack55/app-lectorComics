function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < byteCount; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const part1 = randomHex(4);
  const part2 = randomHex(2);
  const part3 = `4${randomHex(2).slice(1)}`;
  const variantNibble = ((parseInt(randomHex(1), 16) & 0x3) | 0x8).toString(16);
  const part4 = `${variantNibble}${randomHex(2).slice(1)}`;
  const part5 = randomHex(6);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
