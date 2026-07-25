import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

declare global {
  interface Window {
    google: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export function GoogleSignInButton() {
  const { signIn } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      // eslint-disable-next-line no-console
      console.warn('VITE_GOOGLE_CLIENT_ID is not set — add it to your .env file.');
      return;
    }

    // The GIS script tag is async/defer, so it may not be loaded yet when
    // this effect first runs — poll briefly rather than assuming it's ready.
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      if (!window.google || !ref.current) {
        setTimeout(tryInit, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp: { credential: string }) => signIn(resp.credential),
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large' });
    };
    tryInit();

    return () => {
      cancelled = true;
    };
  }, [signIn]);

  return <div ref={ref} />;
}
