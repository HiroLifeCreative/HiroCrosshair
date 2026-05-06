/**
 * Converts a KeyboardEvent or MouseEvent into a Hiro-compatible hotkey string.
 * Supports Numpad keys and Mouse Buttons (Middle, Side1, Side2).
 */
export function recordHotkey(e: KeyboardEvent | MouseEvent): string | null {
  // If it's a mouse event
  if (e instanceof MouseEvent) {
    // We only care about M3 (Middle), M4 (Back), M5 (Forward)
    if (e.button === 1) return "MOUSE3";
    if (e.button === 3) return "MOUSE4";
    if (e.button === 4) return "MOUSE5";
    return null;
  }

  // If it's a keyboard event
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Super");

  const k = e.key;
  const code = e.code;
  const isMod = ["Control", "Shift", "Alt", "Meta"].includes(k);

  if (!isMod && k.length > 0) {
    let keyName = "";
    if (code.startsWith("Numpad")) {
      keyName = code.toUpperCase();
    } else {
      keyName = k.length === 1 ? k.toUpperCase() : k.replace(/^Arrow/, "");
    }
    parts.push(keyName);
    return parts.join("+");
  }
  
  return null;
}
