import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain") {
    return file.text();
  }

  if (file.type === "application/pdf") {
    return extractTextFromPDF(file);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  ) {
    return extractTextFromWord(file);
  }

  throw new Error("Unsupported file type. Please upload a PDF, Word, or text file.");
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n\n");
}

async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
