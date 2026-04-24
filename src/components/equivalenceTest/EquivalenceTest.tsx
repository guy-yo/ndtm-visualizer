import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { runNTM } from '../../engine/ntmEngine';
import { loadMachineFromFile } from '../../utils/machineIO';
import { EXAMPLE_MACHINES } from '../../store/exampleMachines';
import type { NTMDefinition } from '../../types/machine';
import styles from './EquivalenceTest.module.css';

type Verdict = 'ACCEPT' | 'REJECT' | 'LOOP' | 'INVALID';

interface EqResult {
  input: string;
  verdictA: Verdict;
  verdictB: Verdict;
  match: boolean;
}

const VERDICT_CLS: Record<Verdict, string> = {
  ACCEPT:  styles.accept,
  REJECT:  styles.reject,
  LOOP:    styles.loop,
  INVALID: styles.invalid,
};

function deriveVerdict(machine: NTMDefinition, input: string, settings: ReturnType<typeof useAppStore.getState>['executionSettings']): Verdict {
  const bad = input.split('').filter((c) => c !== '' && !machine.inputAlphabet.includes(c));
  if (bad.length > 0) return 'INVALID';
  const tree = runNTM(machine, input, { ...settings, stopOnAccept: false, buildFullTree: true });
  if (tree.acceptPaths.length > 0) return 'ACCEPT';
  const hasLoop = [...tree.nodes.values()].some((n) => n.status === 'loop');
  return hasLoop ? 'LOOP' : 'REJECT';
}

interface MachineBInfo {
  machine: NTMDefinition;
  label: string;
}

export function EquivalenceTest() {
  const machineA  = useAppStore((s) => s.machine);
  const settings  = useAppStore((s) => s.executionSettings);

  const [open,      setOpen]      = React.useState(false);
  const [machineB,  setMachineB]  = React.useState<MachineBInfo | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [text,      setText]      = React.useState('');
  const [results,   setResults]   = React.useState<EqResult[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const m = await loadMachineFromFile(file);
      setMachineB({ machine: m, label: file.name.replace(/\.json$/i, '') });
      setLoadError(null);
      setResults([]);
    } catch {
      setLoadError('Invalid JSON — could not load machine.');
    }
    e.target.value = '';
  }

  function handleExampleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const entry = EXAMPLE_MACHINES[idx];
    setMachineB({ machine: entry.machine, label: entry.label });
    setLoadError(null);
    setResults([]);
    e.target.value = '';
  }

  function handleRun() {
    if (!machineB) return;
    const inputs = text.split('\n').map((s) => s.trim());
    const newResults: EqResult[] = inputs.map((inp) => {
      const vA = deriveVerdict(machineA,        inp, settings);
      const vB = deriveVerdict(machineB.machine, inp, settings);
      return { input: inp === '' ? '""' : inp, verdictA: vA, verdictB: vB, match: vA === vB };
    });
    setResults(newResults);
  }

  const matchCount    = results.filter((r) => r.match).length;
  const mismatchCount = results.filter((r) => !r.match).length;

  return (
    <section className={styles.section}>
      <button className={styles.toggle} onClick={() => setOpen((o) => !o)}>
        <span className={styles.toggleIcon}>{open ? '▾' : '▸'}</span>
        <span className={styles.toggleLabel}>Equivalence Test</span>
        {mismatchCount > 0 && !open && (
          <span className={styles.badge}>{mismatchCount} ✗</span>
        )}
      </button>

      {open && (
        <div className={styles.body}>

          {/* Machine B loader */}
          <div className={styles.machineBSection}>
            <span className={styles.machineBLabel}>Machine B</span>
            <div className={styles.machineBRow}>
              <button
                className={styles.loadBtn}
                onClick={() => fileRef.current?.click()}
              >
                📂 Load JSON
              </button>
              <select
                className={styles.exampleSel}
                onChange={handleExampleSelect}
                defaultValue=""
              >
                <option value="" disabled>Pick example…</option>
                {EXAMPLE_MACHINES.map((e, i) => (
                  <option key={i} value={i}>{e.label}</option>
                ))}
              </select>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileLoad}
            />
            {loadError && <div className={styles.loadError}>{loadError}</div>}
            {machineB && (
              <div className={styles.machineBBadge}>
                <span>
                  <span className={styles.machineBName}>{machineB.label}</span>
                  <span className={styles.machineBMeta}>
                    {' '}— {machineB.machine.states.length} states,{' '}
                    {machineB.machine.transitions.length} transitions
                  </span>
                </span>
                <button
                  className={styles.clearBtn}
                  onClick={() => { setMachineB(null); setResults([]); }}
                  title="Remove Machine B"
                >✕</button>
              </div>
            )}
          </div>

          {/* Input strings */}
          <div className={styles.hint}>One input string per line. Empty line = empty string.</div>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'0011\nabc\n'}
            rows={4}
            spellCheck={false}
          />
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={!machineB || text.trim() === ''}
          >
            Run Comparison
          </button>

          {/* Results */}
          {results.length > 0 && (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <colgroup>
                    <col /><col /><col /><col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Input</th>
                      <th>Machine A</th>
                      <th>Machine B</th>
                      <th style={{ textAlign: 'center' }}>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td className={styles.inputCell}><code>{r.input}</code></td>
                        <td>
                          <span className={`${styles.verdict} ${VERDICT_CLS[r.verdictA]}`}>
                            {r.verdictA}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.verdict} ${VERDICT_CLS[r.verdictB]}`}>
                            {r.verdictB}
                          </span>
                        </td>
                        <td className={`${styles.matchCell} ${r.match ? styles.matchOk : styles.matchBad}`}>
                          {r.match ? '✓' : '✗'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.summaryRow}>
                {mismatchCount === 0
                  ? <span className={styles.summaryOk}>✓ All {matchCount} inputs agree — machines appear equivalent</span>
                  : <span className={styles.summaryBad}>✗ {mismatchCount} mismatch{mismatchCount > 1 ? 'es' : ''} on {results.length} inputs</span>
                }
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
