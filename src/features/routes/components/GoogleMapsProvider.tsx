import { APIProvider } from '@vis.gl/react-google-maps';
import { ReactNode } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API Key fehlt! Bitte VITE_GOOGLE_MAPS_API_KEY in .env setzen.');
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg p-4">
        <p className="text-muted-foreground text-center">
          Google Maps API Key fehlt.<br />
          Bitte in .env konfigurieren.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      {children}
    </APIProvider>
  );
}
