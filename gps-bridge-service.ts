import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

interface GPSCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

interface GPSPosition {
  coords: GPSCoords;
  timestamp: number;
}

let lastPosition: GPSPosition | null = null;
let isEnabled = true; // Can be controlled via /control endpoint

async function getAndroidGPS(): Promise<GPSPosition | null> {
  if (!isEnabled) {
    lastPosition = null;
    return null;
  }
  
  try {
    const { stdout } = await execAsync('adb shell dumpsys location');
    const match = stdout.match(/last location=Location\[\w+\s+([\-\d.]+),([\-\d.]+)\s+hAcc=([\d.]+)/i);
    
    if (match) {
      lastPosition = {
        coords: {
          latitude: parseFloat(match[1]),
          longitude: parseFloat(match[2]),
          accuracy: parseFloat(match[3]) || 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        },
        timestamp: Date.now()
      };
      console.log('[GPS Bridge] GPS data:', lastPosition.coords.latitude, lastPosition.coords.longitude);
    }
  } catch (error) {
    console.error('[GPS Bridge] Error reading GPS:', error.message);
    lastPosition = null; // Clear cache when device disconnected
  }
  return lastPosition;
}

const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/gps') {
    const position = await getAndroidGPS();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(position || { coords: null }));
  } else if (req.url.startsWith('/control')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const enabled = url.searchParams.get('enabled');
    if (enabled !== null) {
      isEnabled = enabled === 'true';
      console.log(`[GPS Bridge] ${isEnabled ? 'Enabled' : 'Disabled'}`);
      if (!isEnabled) {
        lastPosition = null;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ enabled: isEnabled }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

setInterval(getAndroidGPS, 30000); // Poll every 30 seconds

server.listen(8080, () => {
  console.log('[GPS Bridge] Running on http://localhost:8080');
  console.log('[GPS Bridge] Endpoint: http://localhost:8080/gps');
});
