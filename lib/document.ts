import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import type { LessonOutputs } from './claude';

export async function generateLessonDocx(
  title: string,
  outputs: LessonOutputs
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Summary
  sections.push(
    new Paragraph({ text: 'Resumo da Aula', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: outputs.summary, spacing: { after: 300 } })
  );

  // Transcription summary
  sections.push(
    new Paragraph({ text: 'Síntese da Transcrição', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: outputs.transcription_summary, spacing: { after: 300 } })
  );

  // Quiz
  sections.push(
    new Paragraph({ text: 'Quiz', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
  );
  outputs.quiz.forEach((item, i) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${item.question}`, bold: true })],
        spacing: { before: 200, after: 100 },
      })
    );
    item.options.forEach((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      const isAnswer = opt === item.answer;
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `  ${letter}) ${opt}`, bold: isAnswer, color: isAnswer ? '16A34A' : undefined }),
          ],
          spacing: { after: 60 },
        })
      );
    });
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `Explicação: ${item.explanation}`, italics: true, color: '6B7280' })],
        spacing: { after: 160 },
      })
    );
  });

  // References
  sections.push(
    new Paragraph({ text: 'Referências e Leituras Complementares', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: outputs.references, spacing: { after: 300 } })
  );

  // Next class suggestions
  sections.push(
    new Paragraph({ text: 'Sugestões para Próxima Aula', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: outputs.next_class_suggestions, spacing: { after: 300 } })
  );

  const doc = new Document({
    sections: [{ children: sections }],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 24 },
        },
      },
    },
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
