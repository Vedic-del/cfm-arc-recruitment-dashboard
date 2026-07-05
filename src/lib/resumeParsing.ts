export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const pdfParser = new PDFParse({ data: buffer });
  const result = await pdfParser.getText();
  return result.text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractResumeText(file: File): Promise<string | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.pdf')) {
      return await extractTextFromPdf(buffer);
    }
    if (name.endsWith('.docx')) {
      return await extractTextFromDocx(buffer);
    }
    return null;
  } catch (error) {
    console.error('extractResumeText failed:', error);
    return null;
  }
}
