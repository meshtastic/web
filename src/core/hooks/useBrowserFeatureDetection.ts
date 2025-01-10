type Feature = 'Web Bluetooth' | 'Web Serial';
type FeatureKey = 'bluetooth' | 'serial';

interface BrowserFeatureDetection {
  hasRequiredFeatures: boolean;
  missingFeatures: Feature[];
  isSecureContext: boolean;
}

const featureLabels: Record<FeatureKey, Feature> = {
  bluetooth: 'Web Bluetooth',
  serial: 'Web Serial'
};

export function useBrowserFeatureDetection(): BrowserFeatureDetection {
  const { bluetooth, serial } = navigator;
  const isSecureContext = window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost';

  const features = {
    bluetooth,
    serial
  };

  return {
    hasRequiredFeatures: Object.values(features).every(Boolean),
    missingFeatures: Object.entries(features)
      .filter(([_, supported]) => !supported)
      .map(([feature]) => featureLabels[feature as FeatureKey]),
    isSecureContext
  };
}