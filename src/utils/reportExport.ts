/**
 * Report export utilities — PDF, Excel, CSV, Print.
 * Uses jsPDF (already installed) and xlsx (already installed).
 */
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// ── PDF Export ───────────────────────────────────────────────

export function exportReportPdf(
  title: string,
  headers: string[],
  rows: string[][],
  filename?: string,
): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Header band
  doc.setFillColor(...hexToRgb(NAVY));
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text('HoodOps', 18, 16);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 18, 24);
  doc.setFontSize(8);
  doc.text(`Generated ${now}`, 210 - 18, 24, { align: 'right' });

  // Table
  let y = 40;
  const colW = (210 - 36) / headers.length;

  // Header row
  doc.setFillColor(240, 241, 243);
  doc.rect(18, y - 4, 210 - 36, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(NAVY));
  headers.forEach((h, i) => {
    doc.text(h, 18 + i * colW + 2, y);
  });
  y += 10;

  // Data rows
  doc.setTextColor(80, 80, 80);
  rows.forEach((row, ri) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (ri % 2 === 1) {
      doc.setFillColor(248, 249, 252);
      doc.rect(18, y - 4, 210 - 36, 7, 'F');
    }
    row.forEach((cell, ci) => {
      doc.text(String(cell).substring(0, 30), 18 + ci * colW + 2, y);
    });
    y += 7;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`HoodOps Report | Page ${p} of ${pages}`, 105, 290, { align: 'center' });
  }

  doc.save(filename || `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

// ── Excel Export ─────────────────────────────────────────────

export function exportReportExcel(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename?: string,
): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, filename || `${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

// ── CSV Export ───────────────────────────────────────────────

export function exportReportCsv(
  headers: string[],
  rows: (string | number)[][],
  filename?: string,
): void {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'report.csv';
  a.click();
  URL.revokeObjectURL(url);
}
