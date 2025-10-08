import { useState, useEffect } from 'react';
import { gpsService } from '../services/gpsService';

export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function useGPS() {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const updatePosition = () => {
      const lastKnown = gpsService.getLastKnownPosition();
      if (lastKnown && mounted) {
        setPosition({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy,
          timestamp: lastKnown.timestamp
        });
        setError(null);
        setLoading(false);
      }
    };

    // Check for position immediately
    updatePosition();

    // Try to get current position
    gpsService.getCurrentPosition()
      .then((pos) => {
        if (mounted) {
          setPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    // Update position periodically
    const interval = setInterval(updatePosition, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const refreshPosition = async () => {
    setLoading(true);
    try {
      const pos = await gpsService.getCurrentPosition();
      setPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GPS error');
    } finally {
      setLoading(false);
    }
  };

  return {
    position,
    error,
    loading,
    refreshPosition
  };
}