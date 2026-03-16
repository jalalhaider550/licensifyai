import mammoth from "mammoth";

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain") {
    return file.text();
  }

  if (file.type === "application/pdf") {
    return extractTextFromPDF(file);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    return extractTextFromWord(file);
  }

  if (file.type === "application/msword" || file.name.toLowerCase().endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported yet. Please upload a PDF or .docx file.");
  }

  throw new Error("Unsupported file type. Please upload a PDF, .docx, or text file.");
}

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (pageText) {
      textParts.push(pageText);
    }
  }

  return textParts.join("\n\n");
}

async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}
