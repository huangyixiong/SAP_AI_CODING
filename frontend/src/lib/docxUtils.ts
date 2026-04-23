import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ISectionOptions,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';

// Parse inline markdown: **bold**, *italic*, `code`
function parseInline(text: string): TextRun[] {
  if (!text) return [new TextRun({ text: '' })];
  const runs: TextRun[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, idx) }));
    }
    if (match[1] !== undefined) {
      runs.push(new TextRun({ text: match[1], bold: true }));
    } else if (match[2] !== undefined) {
      runs.push(new TextRun({ text: match[2], italics: true }));
    } else if (match[3] !== undefined) {
      runs.push(new TextRun({ text: match[3], font: 'Courier New', size: 20 }));
    }
    lastIndex = idx + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

function isTableSep(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableCells(line: string): string[] {
  return line.split('|').slice(1, -1).map(c => c.trim());
}

const CELL_BORDERS = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
};

function buildTable(lines: string[]): Table {
  const dataLines = lines.filter(l => !isTableSep(l));
  const [headerLine, ...bodyLines] = dataLines;
  const headers = parseTableCells(headerLine || '');
  const colCount = Math.max(headers.length, 1);

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headers.map(h =>
        new TableCell({
          shading: { fill: 'F5F5F5' },
          borders: CELL_BORDERS,
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        })
      ),
    }),
    ...bodyLines.map(bl => {
      const cells = parseTableCells(bl);
      while (cells.length < colCount) cells.push('');
      return new TableRow({
        children: cells.slice(0, colCount).map(c =>
          new TableCell({
            borders: CELL_BORDERS,
            children: [new Paragraph({ children: parseInline(c) })],
          })
        ),
      });
    }),
  ];

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function toElements(content: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      elements.push(new Paragraph({ text: '' }));
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.slice(4), bold: true, color: '2E2E38' })],
        heading: HeadingLevel.HEADING_3,
      }));
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.slice(3), bold: true, color: '2E2E38' })],
        heading: HeadingLevel.HEADING_2,
      }));
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), bold: true, color: '2E2E38' })],
        heading: HeadingLevel.HEADING_1,
      }));
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith('```')) {
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        elements.push(new Paragraph({
          children: [new TextRun({ text: lines[i], font: 'Courier New', size: 20, color: '333333' })],
          indent: { left: 360 },
        }));
        i++;
      }
      i++; // skip closing ```
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(buildTable(tableLines));
      elements.push(new Paragraph({ text: '' }));
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2), italics: true, color: '747480' })],
        indent: { left: 360 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: 'FFE600', space: 8 },
        },
      }));
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: '• ' }), ...parseInline(line.replace(/^[-*+]\s/, ''))],
        indent: { left: 360 },
      }));
      i++;
      continue;
    }

    // Ordered list
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: `${numMatch[1]}. ` }), ...parseInline(numMatch[2])],
        indent: { left: 360 },
      }));
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(new Paragraph({ children: parseInline(line) }));
    i++;
  }

  return elements;
}

export async function generateDocxBlob(content: string, referencePrompt?: string): Promise<Blob> {
  const sections: ISectionOptions[] = [
    { properties: {}, children: toElements(content) },
  ];
  if (referencePrompt?.trim()) {
    sections.push({
      properties: {},
      children: [
        new Paragraph({ text: '开发提示词', heading: HeadingLevel.HEADING_1 }),
        ...toElements(referencePrompt),
      ],
    });
  }
  const doc = new Document({ sections });
  return Packer.toBlob(doc);
}
