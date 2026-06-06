import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ElevenLabs "Adam", a clear confident male voice. Override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
const DEFAULT_MODEL = 'eleven_turbo_v2_5'; // low latency, good quality, cheaper
const MAX_CHARS = 800;

/**
 * Premium text-to-speech via ElevenLabs. The API key stays server-side and the
 * route is auth-gated so the quota can't be abused. If the key is absent or a
 * call fails, the client falls back to the free browser voice.
 */
export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You are not signed in.' }, { status: 401 });

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const text = (body.text ?? '').trim().slice(0, MAX_CHARS);
  if (!text) return NextResponse.json({ error: 'No text.' }, { status: 400 });

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[api/tts] ElevenLabs', res.status, detail.slice(0, 300));
      return NextResponse.json({ error: 'Voice generation failed.' }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[api/tts]', err);
    return NextResponse.json({ error: 'Voice generation error.' }, { status: 502 });
  }
}
