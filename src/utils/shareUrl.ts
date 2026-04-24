import type { NTMDefinition } from '../types/machine';

/** Encode machine + input into a URL hash fragment */
export function generateShareUrl(machine: NTMDefinition, inputString: string): string {
  const payload = JSON.stringify({ machine, input: inputString });
  const encoded = btoa(unescape(encodeURIComponent(payload)));
  const url = new URL(window.location.href);
  url.hash = `#m=${encoded}`;
  return url.toString();
}

/** Write share URL to clipboard; returns true on success */
export async function copyShareUrl(machine: NTMDefinition, inputString: string): Promise<boolean> {
  try {
    const url = generateShareUrl(machine, inputString);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Try to parse a machine from the current URL hash. Returns null if not present or invalid. */
export function parseMachineFromHash(): { machine: NTMDefinition; input: string } | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#m=')) return null;
    const decoded = decodeURIComponent(escape(atob(hash.slice(3))));
    const parsed = JSON.parse(decoded);
    if (!parsed?.machine?.states) return null;
    return { machine: parsed.machine as NTMDefinition, input: parsed.input ?? '' };
  } catch {
    return null;
  }
}
