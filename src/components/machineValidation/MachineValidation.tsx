import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { analyzeMachine, type MachineIssue, type IssueSeverity } from '../../utils/machineValidator';
import styles from './MachineValidation.module.css';

const ICONS: Record<IssueSeverity, string> = {
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const ROW_CLS: Record<IssueSeverity, string> = {
  error:   styles.issueRowError,
  warning: styles.issueRowWarning,
  info:    styles.issueRowInfo,
};

const BADGE_CLS: Record<IssueSeverity, string> = {
  error:   styles.badgeError,
  warning: styles.badgeWarning,
  info:    styles.badgeInfo,
};

function summaryBadge(issues: MachineIssue[]) {
  const errors   = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos    = issues.filter((i) => i.severity === 'info').length;

  if (errors > 0)   return { text: `${errors} error${errors > 1 ? 's' : ''}`,     cls: styles.badgeError };
  if (warnings > 0) return { text: `${warnings} warning${warnings > 1 ? 's' : ''}`, cls: styles.badgeWarning };
  if (infos > 0)    return { text: `${infos} info`,                                cls: styles.badgeInfo };
  return null;
}

export function MachineValidation() {
  const machine = useAppStore((s) => s.machine);
  const [open, setOpen] = React.useState(true);

  const issues = React.useMemo(() => analyzeMachine(machine), [machine]);
  const badge  = summaryBadge(issues);

  return (
    <section className={styles.section}>
      <button className={styles.toggle} onClick={() => setOpen((o) => !o)}>
        <span className={styles.toggleIcon}>{open ? '▾' : '▸'}</span>
        <span className={styles.toggleLabel}>Validation</span>
        {badge && !open && (
          <span className={`${styles.badge} ${badge.cls}`}>{badge.text}</span>
        )}
        {issues.length === 0 && !open && (
          <span className={`${styles.badge} ${styles.badgeOk}`}>OK</span>
        )}
      </button>

      {open && (
        <div className={styles.body}>
          {issues.length === 0 ? (
            <div className={styles.ok}>✓ No issues detected</div>
          ) : (
            issues.map((issue, i) => (
              <div
                key={i}
                className={`${styles.issueRow} ${ROW_CLS[issue.severity]}`}
              >
                <span className={styles.severityIcon}>{ICONS[issue.severity]}</span>
                <div>
                  <div className={styles.issueText}>{issue.message}</div>
                  {issue.states && issue.states.length > 0 && (
                    <div className={styles.stateChips}>
                      {issue.states.map((s) => (
                        <span key={s} className={styles.chip}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
