import { logger } from "../logger.ts";

// GPS Service for automatic tethered device detection
export class GPSService {
  private position: GeolocationPosition | null = null;
  private watchId: number | null = null;
  private fallbackSources: Array<() => Promise<GeolocationPosition | null>> = [];
  private isDev = import.meta.env.DEV;

  constructor() {
    if (this.isDev) {
      this.setupFallbackSources();
    }
    this.startGPSWatch();
  }

  private setupFallbackSources() {
    // Only setup fallback sources in development
    if (!this.isDev) return;
    
    // ADB GPS Bridge (Android devices)
    this.fallbackSources.push(async () => {
      // Check if Android GPS is enabled
      if (localStorage.getItem('gps-android') === 'false') return null;
      
      try {
        const response = await fetch('http://localhost:8080/gps', {
          signal: AbortSignal.timeout(2000)
        });
        const data = await response.json();
        if (data.coords) {
          logger.debug('GPS: Using ADB bridge');
          return {
            coords: {
              latitude: data.coords.latitude,
              longitude: data.coords.longitude,
              accuracy: data.coords.accuracy || 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          } as GeolocationPosition;
        }
      } catch {
        // GPS bridge not available - silent fail
      }
      return null;
    });

    // iOS/iPad via libimobiledevice (if available)
    this.fallbackSources.push(async () => {
      // Check if iOS GPS is enabled
      if (localStorage.getItem('gps-ios') === 'false') return null;
      
      try {
        const response = await fetch('http://localhost:8081/ios-gps', {
          signal: AbortSignal.timeout(2000)
        });
        const data = await response.json();
        if (data.coords) {
          logger.debug('GPS: Using iOS bridge');
          return {
            coords: {
              latitude: data.coords.latitude,
              longitude: data.coords.longitude,
              accuracy: data.coords.accuracy || 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          } as GeolocationPosition;
        }
      } catch {
        // iOS GPS not available - silent fail
      }
      return null;
    });
  }

  private async tryFallbackSources(): Promise<GeolocationPosition | null> {
    for (const source of this.fallbackSources) {
      const position = await source();
      if (position) {

        return position;
      }
    }
    return null;
  }

  private startGPSWatch() {
    // Try tethered GPS first (more accurate)
    this.tryFallbackLoop();
    
    // Also start browser geolocation as backup
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Check if browser GPS is enabled
          if (localStorage.getItem('gps-browser') === 'false') return;
          
          // Only use browser GPS if no tethered GPS available
          if (!this.position) {
            this.position = position;
            logger.debug('GPS: Using browser geolocation');
          }
        },
        () => {
          logger.debug('GPS: Browser geolocation failed');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    }
  }

  private async tryFallbackLoop() {
    // Check immediately
    const initialPosition = await this.tryFallbackSources();
    if (initialPosition) {
      this.position = initialPosition;
    }
    
    // Then check every 5 seconds
    setInterval(async () => {
      const fallbackPosition = await this.tryFallbackSources();
      if (fallbackPosition) {
        this.position = fallbackPosition;
      }
    }, 5000);
  }

  public getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise(async (resolve, reject) => {
      if (this.position) {
        resolve(this.position);
        return;
      }

      // Try browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          resolve,
          async (error) => {
            // Try fallback sources
            const fallbackPosition = await this.tryFallbackSources();
            if (fallbackPosition) {
              resolve(fallbackPosition);
            } else {
              reject(error);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      } else {
        // Try fallback sources
        const fallbackPosition = await this.tryFallbackSources();
        if (fallbackPosition) {
          resolve(fallbackPosition);
        } else {
          reject(new Error('No GPS sources available'));
        }
      }
    });
  }

  public getLastKnownPosition(): GeolocationPosition | null {
    return this.position;
  }

  public async getTetheredPosition(): Promise<GeolocationPosition | null> {
    // Only try tethered sources, not browser geolocation
    return await this.tryFallbackSources();
  }

  public destroy() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

// Global GPS service instance
export const gpsService = new GPSService();