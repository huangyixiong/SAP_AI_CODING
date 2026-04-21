import { Document, Packer, Paragraph, TextRun, HeadingLevel, ISectionOptions } from 'docx';

function toParagraphs(content: string): Paragraph[] {
  return content.split('\n').map((line) => {
    if (line.startsWith('# ')) return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
    if (line.startsWith('## ')) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    if (line.startsWith('### ')) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    if (line.trim() === '') return new Paragraph({ text: '' });
    const plainText = line
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/^[-*+]\s/, '• ');
    return new Paragraph({ children: [new TextRun({ text: plainText })] });
  });
}

export async function generateDocxBlob(content: string, referencePrompt?: string): Promise<Blob> {
  const sections: ISectionOptions[] = [
    { properties: {}, children: toParagraphs(content) },
  ];
  if (referencePrompt?.trim()) {
    sections.push({
      properties: {},
      children: [
        new Paragraph({ text: '开发提示词', heading: HeadingLevel.HEADING_1 }),
        ...toParagraphs(referencePrompt),
      ],
    });
  }
  const doc = new Document({ sections });
  return Packer.toBlob(doc);
}
