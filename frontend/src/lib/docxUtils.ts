import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function generateDocxBlob(content: string): Promise<Blob> {
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      const plainText = line
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/^[-*+]\s/, '• ');
      children.push(new Paragraph({ children: [new TextRun({ text: plainText })] }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBlob(doc);
}
