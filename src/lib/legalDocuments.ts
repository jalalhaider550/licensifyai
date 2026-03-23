import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";

export type LegalWorkProductKind = "document" | "review" | "strategy";

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocumentPayload {
  kind: "document";
  title: string;
  date?: string;
  recipientName?: string;
  recipientDetails?: string[];
  subject?: string;
  introduction?: string;
  sections: LegalSection[];
  closing?: string;
  signature?: string;
}

export interface LegalReviewPayload {
  kind: "review";
  title: string;
  overview: string;
  keyIssues: string[];
  legalRisks: string[];
  recommendations: string[];
}

export interface LegalStrategyPayload {
  kind: "strategy";
  title: string;
  bestCourse: string[];
  risks: string[];
  alternatives: string[];
  immediateNextMoves: string[];
}

export type LegalWorkProduct = LegalDocumentPayload | LegalReviewPayload | LegalStrategyPayload;

const isLegalWorkProduct = (value: unknown): value is LegalWorkProduct => {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: string }).kind;
  return kind === "document" || kind === "review" || kind === "strategy";
};

export const slugifyFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export const parseLegalWorkProduct = (raw: string): LegalWorkProduct => {
  try {
    const parsed = JSON.parse(raw);
    if (isLegalWorkProduct(parsed)) return parsed;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (isLegalWorkProduct(parsed)) return parsed;
      } catch {
        // noop
      }
    }
  }

  return {
    kind: "document",
    title: "Legal Draft",
    date: new Date().toLocaleDateString(),
    sections: [{ heading: "Draft", body: [raw] }],
  };
};

const renderBullets = (items: string[]) => items.filter(Boolean).map((item) => `• ${item}`);

export const renderLegalWorkProductText = (payload: LegalWorkProduct) => {
  if (payload.kind === "document") {
    const lines = [payload.title.toUpperCase(), "", payload.date || new Date().toLocaleDateString()];

    if (payload.recipientName || payload.recipientDetails?.length) {
      lines.push("");
      if (payload.recipientName) lines.push(payload.recipientName);
      (payload.recipientDetails || []).forEach((line) => lines.push(line));
    }

    if (payload.subject) {
      lines.push("", `Re: ${payload.subject}`);
    }

    if (payload.introduction) {
      lines.push("", payload.introduction);
    }

    payload.sections.forEach((section) => {
      lines.push("", section.heading.toUpperCase());
      section.body.forEach((paragraph) => lines.push(paragraph));
    });

    if (payload.closing) lines.push("", payload.closing);
    if (payload.signature) lines.push("", payload.signature);

    return lines.join("\n");
  }

  if (payload.kind === "review") {
    return [
      payload.title.toUpperCase(),
      "",
      "OVERVIEW",
      payload.overview,
      "",
      "KEY ISSUES",
      ...renderBullets(payload.keyIssues),
      "",
      "LEGAL RISKS",
      ...renderBullets(payload.legalRisks),
      "",
      "RECOMMENDATIONS",
      ...renderBullets(payload.recommendations),
    ].join("\n");
  }

  return [
    payload.title.toUpperCase(),
    "",
    "BEST COURSE OF ACTION",
    ...renderBullets(payload.bestCourse),
    "",
    "RISKS",
    ...renderBullets(payload.risks),
    "",
    "ALTERNATIVES",
    ...renderBullets(payload.alternatives),
    "",
    "IMMEDIATE NEXT MOVES",
    ...renderBullets(payload.immediateNextMoves),
  ].join("\n");
};

const createBodyParagraph = (text: string) =>
  new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
  });

export const createLegalDocxBlob = async (payload: LegalWorkProduct) => {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: payload.title, bold: true, font: "Arial", size: 30 })],
    }),
  ];

  if (payload.kind === "document") {
    if (payload.date) children.push(createBodyParagraph(payload.date));
    if (payload.recipientName) children.push(createBodyParagraph(payload.recipientName));
    (payload.recipientDetails || []).forEach((line) => children.push(createBodyParagraph(line)));
    if (payload.subject) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 180 },
          children: [new TextRun({ text: `Re: ${payload.subject}`, bold: true, font: "Arial", size: 24 })],
        }),
      );
    }
    if (payload.introduction) children.push(createBodyParagraph(payload.introduction));
    payload.sections.forEach((section) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 120 },
          children: [new TextRun({ text: section.heading, bold: true, font: "Arial", size: 26 })],
        }),
      );
      section.body.forEach((paragraph) => children.push(createBodyParagraph(paragraph)));
    });
    if (payload.closing) children.push(createBodyParagraph(payload.closing));
    if (payload.signature) children.push(createBodyParagraph(payload.signature));
  }

  if (payload.kind === "review") {
    children.push(createBodyParagraph(payload.overview));
    [
      { title: "Key Issues", items: payload.keyIssues },
      { title: "Legal Risks", items: payload.legalRisks },
      { title: "Recommendations", items: payload.recommendations },
    ].forEach((section) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: section.title, bold: true, font: "Arial", size: 26 })],
        }),
      );
      section.items.forEach((item) => children.push(createBodyParagraph(`• ${item}`)));
    });
  }

  if (payload.kind === "strategy") {
    [
      { title: "Best Course of Action", items: payload.bestCourse },
      { title: "Risks", items: payload.risks },
      { title: "Alternatives", items: payload.alternatives },
      { title: "Immediate Next Moves", items: payload.immediateNextMoves },
    ].forEach((section) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: section.title, bold: true, font: "Arial", size: 26 })],
        }),
      );
      section.items.forEach((item) => children.push(createBodyParagraph(`• ${item}`)));
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
};

export const createLegalPdfBlob = async (payload: LegalWorkProduct) => {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 54;
  const maxWidth = 504;
  let y = 72;

  const addLine = (text: string, options?: { bold?: boolean; center?: boolean; size?: number; gap?: number }) => {
    const size = options?.size ?? 11;
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth);

    lines.forEach((line: string) => {
      if (y > 730) {
        pdf.addPage();
        y = 72;
      }
      const x = options?.center ? 306 : marginX;
      pdf.text(line, x, y, { align: options?.center ? "center" : "left", maxWidth });
      y += size + 6;
    });

    y += options?.gap ?? 4;
  };

  addLine(payload.title, { bold: true, center: true, size: 14, gap: 10 });

  renderLegalWorkProductText(payload)
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 8;
        return;
      }

      const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length < 60;
      addLine(trimmed, { bold: isHeading, size: isHeading ? 12 : 11, gap: isHeading ? 6 : 3 });
    });

  return pdf.output("blob");
};