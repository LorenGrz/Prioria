import { randomUUID } from 'crypto';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ok, badRequest, serverError } from '../../lib/response.js';

const polly = new PollyClient({});
const s3 = new S3Client({});

// Mirrors the Voz screen's two options. "Enrique" only ships as a standard
// (non-neural) voice in Polly's es-ES catalog, so the engine differs.
const VOICE_MAP = {
  lucia: { VoiceId: 'Lucia', Engine: 'neural' },
  enrique: { VoiceId: 'Enrique', Engine: 'standard' },
};

const MAX_TEXT_LEN = 2000;

/**
 * Used both for "Probar voz" in Settings and for auto-reading a critical
 * notification once the agent has flagged it. Returns a short-lived
 * presigned URL rather than streaming bytes through API Gateway.
 */
export const handler = async (event) => {
  try {
    const { text, voiceId = 'lucia', speed = 1.0, language = 'es-ES' } = JSON.parse(
      event.body || '{}'
    );

    if (!text) return badRequest('text is required');
    if (text.length > MAX_TEXT_LEN) return badRequest(`text must be at most ${MAX_TEXT_LEN} characters`);
    const voice = VOICE_MAP[voiceId] ?? VOICE_MAP.lucia;

    const rate = Math.round(Math.max(0.5, Math.min(2.0, speed)) * 100);
    const ssml = `<speak><prosody rate="${rate}%">${escapeSsml(text)}</prosody></speak>`;

    const synthResult = await polly.send(
      new SynthesizeSpeechCommand({
        Text: ssml,
        TextType: 'ssml',
        OutputFormat: 'mp3',
        VoiceId: voice.VoiceId,
        Engine: voice.Engine,
        LanguageCode: language,
      })
    );

    const audioBytes = await synthResult.AudioStream.transformToByteArray();
    const key = `${randomUUID()}.mp3`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.VOICE_CLIPS_BUCKET,
        Key: key,
        Body: audioBytes,
        ContentType: 'audio/mpeg',
      })
    );

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: process.env.VOICE_CLIPS_BUCKET, Key: key }),
      { expiresIn: 3600 }
    );

    return ok({ url, key, expiresInSeconds: 3600 });
  } catch (err) {
    return serverError(err);
  }
};

function escapeSsml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
