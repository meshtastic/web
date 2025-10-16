import { useGPS } from '@core/hooks/useGPS';
import { PageLayout } from '@components/PageLayout.tsx';
import { Sidebar } from '@components/Sidebar.tsx';
import { Switch } from '@components/UI/Switch.tsx';
import { toast } from '@core/hooks/useToast';
import { Satellite, Smartphone, Wifi, RefreshCw, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function GPSPage() {
  const { position, error, loading, refreshPosition } = useGPS();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [useBrowser, setUseBrowser] = useState(() => localStorage.getItem('gps-browser') !== 'false');
  const [useAndroid, setUseAndroid] = useState(() => localStorage.getItem('gps-android') === 'true');
  const [useIOS, setUseIOS] = useState(() => localStorage.getItem('gps-ios') !== 'false');
  const [browserConnected, setBrowserConnected] = useState(false);
  const [androidConnected, setAndroidConnected] = useState(false);
  const [iosConnected, setIOSConnected] = useState(false);

  // Save to localStorage when changed
  const handleBrowserToggle = (checked: boolean) => {
    setUseBrowser(checked);
    localStorage.setItem('gps-browser', String(checked));
  };

  const handleAndroidToggle = (checked: boolean) => {
    setUseAndroid(checked);
    localStorage.setItem('gps-android', String(checked));
  };

  const handleIOSToggle = (checked: boolean) => {
    setUseIOS(checked);
    localStorage.setItem('gps-ios', String(checked));
  };

  // Check GPS source connectivity
  useEffect(() => {
    const checkSources = async () => {
      // Check browser GPS
      if (navigator.geolocation) {
        setBrowserConnected(true);
      }
      
      // Check Android GPS
      try {
        const response = await fetch('http://localhost:8080/gps');
        const data = await response.json();
        setAndroidConnected(!!data.coords);
      } catch {
        setAndroidConnected(false);
      }
      
      // Check iOS GPS
      try {
        const response = await fetch('http://localhost:8081/ios-gps');
        const data = await response.json();
        setIOSConnected(!!data.coords);
      } catch {
        setIOSConnected(false);
      }
    };
    checkSources();
    const interval = setInterval(checkSources, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPosition();
    setIsRefreshing(false);
  };

  return (
    <PageLayout
      label="GPS Status"
      leftBar={<Sidebar />}
      actions={[
        {
          key: 'refresh',
          icon: RefreshCw,
          iconClasses: isRefreshing ? 'animate-spin' : '',
          onClick: handleRefresh,
          disabled: isRefreshing,
          label: 'Refresh',
          className: 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
        },

      ]}
    >
      <div className="p-6 max-w-4xl mx-auto overflow-y-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Position */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Satellite className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Current Position</h2>
          </div>
          
          {loading ? (
            <div className="text-gray-500">Loading GPS data...</div>
          ) : error ? (
            <div className="text-red-500">Error: {error}</div>
          ) : position ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                <span className="font-mono">{position.latitude.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                <span className="font-mono">{position.longitude.toFixed(6)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Accuracy:</span>
                <span className="font-mono">{position.accuracy.toFixed(1)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Update:</span>
                <span className="text-sm">{new Date(position.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No GPS data available</div>
          )}
        </div>

        {/* GPS Sources */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wifi className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold">GPS Sources</h2>
          </div>
          
          {!androidConnected && !iosConnected && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              <div className="font-medium mb-1">External GPS Bridge</div>
              <div className="text-gray-600 dark:text-gray-400">
                To use GPS from a tethered device, run:
                <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">node gps-bridge-service.js</code>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${browserConnected && useBrowser ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <Smartphone className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium">Browser Geolocation</div>
                  <div className="text-sm text-gray-500">Primary GPS source</div>
                </div>
              </div>
              <Switch checked={useBrowser} onCheckedChange={handleBrowserToggle} />
            </div>
            
            {androidConnected && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${androidConnected && useAndroid ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium">Android Device (ADB)</div>
                    <div className="text-sm text-gray-500">Port 8080 - Tethered via USB</div>
                  </div>
                </div>
                <Switch checked={useAndroid} onCheckedChange={handleAndroidToggle} />
              </div>
            )}
            
            {iosConnected && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${iosConnected && useIOS ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="font-medium">iOS Device</div>
                    <div className="text-sm text-gray-500">Port 8081 - Tethered via USB</div>
                  </div>
                </div>
                <Switch checked={useIOS} onCheckedChange={handleIOSToggle} />
              </div>
            )}
          </div>
        </div>

        {/* Meshtastic Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Send className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold">Meshtastic Integration</h2>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="font-medium">Auto Position Broadcast</div>
              <div className="text-sm text-gray-500">Sends GPS to mesh every 30 seconds</div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="font-medium">Manual Position Send</div>
              <div className="text-sm text-gray-500">Click 'Send to Device' to broadcast now</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                if (position) {
                  navigator.clipboard.writeText(`${position.latitude}, ${position.longitude}`);
                  toast({ title: 'Copied!', description: 'Coordinates copied to clipboard' });
                }
              }}
              disabled={!position}
              className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 text-left"
            >
              <div className="font-medium">Copy Coordinates</div>
              <div className="text-sm text-gray-500">Copy lat/lng to clipboard</div>
            </button>
            
            <button
              onClick={() => position && window.open(`https://www.google.com/maps?q=${position.latitude},${position.longitude}`, '_blank')}
              disabled={!position}
              className="w-full p-3 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50 text-left"
            >
              <div className="font-medium">Google Maps</div>
              <div className="text-sm text-gray-500">View in Google Maps</div>
            </button>
            
            <button
              onClick={() => position && window.open(`https://www.openstreetmap.org/?mlat=${position.latitude}&mlon=${position.longitude}&zoom=15`, '_blank')}
              disabled={!position}
              className="w-full p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 disabled:opacity-50 text-left"
            >
              <div className="font-medium">OpenStreetMap</div>
              <div className="text-sm text-gray-500">View in OSM</div>
            </button>
          </div>
        </div>

        </div>
      </div>
    </PageLayout>
  );
}