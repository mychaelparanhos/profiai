import AdmZip from 'adm-zip';

// pdf-parse ships CJS without a proper ESM default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

/**
 * Extract plain text from PPTX by reading slide XML files.
 * PPTX = ZIP archive; text lives in <a:t> elements in ppt/slides/slide*.xml
 */
function extractPptxText(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  const slideTexts = slideEntries.map((entry) => {
    const xml = entry.getData().toString('utf-8');
    const matches = Array.from(xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g));
    return matches
      .map((m) => m[1].trim())
      .filter(Boolean)
      .join(' ');
  });

  return slideTexts.filter(Boolean).join('\n\n');
}

export async function extractSlidesText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  return extractPptxText(buffer);
}
