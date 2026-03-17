
export const SAUDI_CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'Madinah', 'Khobar', 'Dhahran', 'Jubail', 'Abha', 'Tabuk', 'Other'];

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Jeddah': { lat: 21.4858, lng: 39.1925 },
  'Dammam': { lat: 26.4207, lng: 50.0888 },
  'Makkah': { lat: 21.3891, lng: 39.8579 },
  'Madinah': { lat: 24.4672, lng: 39.6024 },
  'Khobar': { lat: 26.2172, lng: 50.1971 },
  'Dhahran': { lat: 26.2361, lng: 50.1111 },
  'Jubail': { lat: 27.0112, lng: 49.6583 },
  'Abha': { lat: 18.2164, lng: 42.5053 },
  'Tabuk': { lat: 28.3998, lng: 36.5715 },
};

export const DEFAULT_COORDS = CITY_COORDS['Riyadh'];
