import React from 'react';
import { toPng } from 'html-to-image';
import { useAppStore } from '../../store/useAppStore';
import styles from './ExportButton.module.css';

interface Props {
  canvasRef: React.RefObject<HTMLDivElement>;
}

export function ExportButton({ canvasRef }: Props) {
  const phase = useAppStore((s) => s.executionPhase);
  const [exporting, setExporting] = React.useState(false);

  if (phase === 'idle') return null;

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
      a.download = 'computation-tree.png';
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
