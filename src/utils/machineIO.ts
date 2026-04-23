import type { NTMDefinition } from '../types/machine';

export function saveMachine(machine: NTMDefinition): void {
  const json = JSON.stringify(machine, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ntm-machine.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function loadMachineFromFile(file: File): Promise<NTMDefinition> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as NTMDefinition;
        if (!Array.isArray(parsed.states) || !Array.isArray(parsed.transitions)) {
          throw new Error('Invalid machine JSON: missing states or transitions');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
