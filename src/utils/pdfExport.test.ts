/** @jest-environment node */
import { generatePDF } from './pdfExport';

it('generates a PDF with the report summary', async () => {
  const doc = await generatePDF([], {
    total: 0,
    applied: 0,
    shortlisted: 0,
    interviewed: 0,
    selected: 0,
    rejected: 0,
    ghosted: 0,
  }, 'summary');

  const pdf = doc.output();
  expect(pdf).toMatch(/^%PDF-/);
  expect(pdf).toContain('FutureTracker Report');
  expect(pdf).toContain('Total Opportunities: 0');
});
