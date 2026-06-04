import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const alt = `${siteConfig.name} · ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#fbfaf7',
          padding: '90px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '22px',
              backgroundColor: '#3f9268',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '26px', height: '40px', borderRadius: '13px', backgroundColor: '#ffffff' }} />
          </div>
          <div style={{ fontSize: '38px', fontWeight: 700, color: '#2b3138' }}>BridgingMinds</div>
        </div>

        <div style={{ marginTop: '44px', fontSize: '68px', fontWeight: 800, color: '#2b3138' }}>
          Speak with confidence.
        </div>
        <div style={{ marginTop: '26px', fontSize: '30px', color: '#2b3138', opacity: 0.6, maxWidth: '940px' }}>
          {siteConfig.description}
        </div>
      </div>
    ),
    { ...size },
  );
}
