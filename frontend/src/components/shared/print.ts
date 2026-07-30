// Print-to-PDF exports: build an HTML string, open it in a window, let the browser's
// print dialog produce the PDF. No pdf dependency.

export const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function printHtml(title: string, body: string, css: string) {
  const w = window.open('', '_blank');
  if (!w) return alert('Allow pop-ups for this site to export the PDF.');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style>${body}`);
  w.document.close(); // triggers `load` once images and fonts have settled
  w.focus();
  w.onload = () => w.print(); // user picks "Save as PDF" in the print dialog
}
