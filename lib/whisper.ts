import Groq from 'groq-sdk';
import OpenAI from 'openai';

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const arrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  const file = new File([arrayBuffer], `audio.${ext}`, { type: mimeType });

  // Groq ativa se GROQ_API_KEY estiver definida — senão usa OpenAI Whisper
  if (process.env.GROQ_API_KEY) {
    console.log('[whisper] provider: Groq (whisper-large-v3)');
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'pt',
      response_format: 'text',
    });
    return response as unknown as string;
  }

  console.log('[whisper] provider: OpenAI (whisper-1)');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt',
  });
  return response.text;
}
