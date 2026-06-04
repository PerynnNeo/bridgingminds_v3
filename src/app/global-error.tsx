'use client';

import { useEffect } from 'react';

// Catches errors in the root layout itself. It replaces the whole document,
// so it must render <html>/<body> and cannot rely on global CSS (uses inline styles).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: '#fbfaf7',
          color: '#2b3138',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: '14px', color: 'rgba(43,49,56,0.6)', margin: 0, maxWidth: '20rem' }}>
          The app hit an unexpected error. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            height: '44px',
            padding: '0 20px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#3f9268',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
