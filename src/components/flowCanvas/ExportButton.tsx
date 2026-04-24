import React from 'react';
import { toPng } from 'html-to-image';
import { useAppStore } from '../../store/useAppStore';
import styles from './ExportButton.module.css';

interface Props {
  canvasRef: React.RefObject<HTMLDivElement>;
  /** When true the button renders even when phase === 'idle' */
  alwaysVisible?: boolean;
  /** File name for the downloaded PNG (default: 'computation-tree.png') */
  filename?: string;
}

export function ExportButton({
  canvasRef,
  alwaysVisible,
  filename = 'computation-tree.png',
}: Props) {
  const phase = useAppStore((s) => s.executionPhase);
  const [exporting, setExporting] = React.useState(false);

  if (!alwaysVisible && phase === 'idle') return null;

  async function handleExport() {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      className={styles.exportBtn}
      onClick={handleExport}
      disabled={exporting}
      title="Download computation tree as PNG"
    >
      {exporting ? '…' : '⬇ PNG'}
    </button>
  );
}
