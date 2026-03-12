import OpenAI from 'openai';

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  // Slice to get a plain ArrayBuffer (avoids SharedArrayBuffer TS incompatibility)
  const arrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  const file = new File([arrayBuffer], `audio.${ext}`, { type: mimeType });

  const response = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'pt',
  });

  return response.text;
}
