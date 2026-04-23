import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { runNTM } from '../../engine/ntmEngine';
import styles from './BatchTest.module.css';

type Verdict = 'ACCEPT' | 'REJECT' | 'LOOP' | 'INVALID';

interface BatchResult {
  input: string;
  verdict: Verdict;
  nodes: number;
  depth: number;
}

const VERDICT_STYLE: Record<Verdict, string> = {
  ACCEPT:  styles.accept,
  REJECT:  styles.reject,
  LOOP:    styles.loop,
  INVALID: styles.invalid,
};

export function BatchTest() {
  const machine = useAppStore((s) => s.machine);
  const settings = useAppStore((s) => s.executionSettings);

  const [isOpen, setIsOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [results, setResults] = React.useState<BatchResult[]>([]);

  function deriveVerdict(input: string): BatchResult {
    // Check alphabet validity
    const invalid = input.split('').filter((c) => !machine.inputAlphabet.includes(c));
    if (invalid.length > 0) {
      return { input, verdict: 'INVALID', nodes: 0, depth: 0 };
    }

    const tree = runNTM(machine, input, { ...settings, stopOnAccept: false, buildFullTree: true });

    let verdict: Verdict;
    if (tree.acceptPaths.length > 0) {
      verdict = 'ACCEPT';
    } else {
      const hasLoop = [...tree.nodes.values()].some((n) => n.status === 'loop');
      verdict = hasLoop ? 'LOOP' : 'REJECT';
    }

    return {
      input: input === '' ? '""' : input,
      verdict,
      nodes: tree.stats.totalNodes,
      depth: tree.stats.maxDepth,
    };
  }

  function handleRun() {
    const inputs = text.split('\n').map((s) => s.trim());
    const newResults = inputs.map((inp) => deriveVerdict(inp));
    setResults(newResults);
  }

  return (
    <section className={styles.section}>
      <button className={styles.toggle} onClick={() => setIsOpen((o) => !o)}>
        <span className={styles.toggleIcon}>{isOpen ? '▾' : '▸'}</span>
        <span className={styles.toggleLabel}>Batch Test</span>
        {results.length > 0 && !isOpen && (
          <span className={styles.badge}>{results.length}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.body}>
          <div className={styles.hint}>One input string per line. Empty line = empty string.</div>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'10\n0011\n111\n0'}
            rows={5}
            spellCheck={false}
          />
          <button className={styles.runBtn} onClick={handleRun} disabled={text.trim() === ''}>
            Run All
          </button>

          {results.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Input</th>
                    <th>Result</th>
                    <th>Nodes</th>
                    <th>Depth</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td className={styles.inputCell}>
                        <code>{r.input}</code>
                      </td>
                      <td>
                        <span className={`${styles.verdict} ${VERDICT_STYLE[r.verdict]}`}>
                          {r.verdict}
                        </span>
                      </td>
                      <td className={styles.num}>{r.verdict === 'INVALID' ? '—' : r.nodes}</td>
                      <td className={styles.num}>{r.verdict === 'INVALID' ? '—' : r.depth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
