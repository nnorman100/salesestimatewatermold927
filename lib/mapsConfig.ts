/**
 * Alert Disaster Restoration — Google Maps Platform Configuration
 * Provides API credentials and attribution for Address Autocomplete.
 */

export const MAPS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  defaultCenter: {
    lat: 34.1425, // Glendale / Los Angeles, CA
    lng: -118.2551,
  },
  defaultZoom: 12,
  componentRestrictions: { country: 'us' },
  fields: ['address_components', 'formatted_address', 'geometry', 'name'],
};
