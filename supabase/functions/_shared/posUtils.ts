// ============================================================
// Shared utilities for all POS integrations
// ============================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface POSLocation {
  posLocationId:  string;
  name:           string;
  address:        string;
  city:           string;
  state:          string;
  zip:            string;
  phone?:         string;
  timezone?:      string;
  isActive:       boolean;
}

export interface POSEmployee {
  posEmployeeId: string;
  firstName:     string;
  lastName:      string;
  email?:        string;
  phone?:        string;
  role?:         string;
  isActive:      boolean;
}

// Detect CA county from city/zip — used for auto-jurisdiction assignment
export const detectCountyFromCity = (city: string, state: string): string | null => {
  if (state !== 'CA') return null;
  const cityMap: Record<string, string> = {
    'los angeles': 'Los Angeles', 'la': 'Los Angeles',
    'san diego': 'San Diego',
    'san francisco': 'San Francisco',
    'fresno': 'Fresno',
    'merced': 'Merced',
    'modesto': 'Stanislaus',
    'stockton': 'San Joaquin',
    'sacramento': 'Sacramento',
    'mariposa': 'Mariposa',
    'yosemite': 'Mariposa',
    'bakersfield': 'Kern',
    'visalia': 'Tulare',
    'san jose': 'Santa Clara',
    'san bernardino': 'San Bernardino',
    'riverside': 'Riverside',
    'anaheim': 'Orange',
    'irvine': 'Orange',
    'oakland': 'Alameda',
    'berkeley': 'Alameda',
    'long beach': 'Los Angeles',
    'santa ana': 'Orange',
    'pasadena': 'Los Angeles',
    'santa barbara': 'Santa Barbara',
    'santa cruz': 'Santa Cruz',
    'monterey': 'Monterey',
    'napa': 'Napa',
    'sonoma': 'Sonoma',
    'redding': 'Shasta',
    'eureka': 'Humboldt',
    'chico': 'Butte',
  };
  return cityMap[city.toLowerCase()] || null;
};

// Standard success/error response
export const ok = (data: Record<string, unknown>) => new Response(
  JSON.stringify({ success: true, ...data }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

export const err = (message: string, status = 200) => new Response(
  JSON.stringify({ success: false, error: message }),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// POS type → credential field names (used by connect UI)
export const POS_CREDENTIAL_FIELDS: Record<string, string[]> = {
  toast:      ['Client ID', 'Client Secret', 'Restaurant GUID'],
  square:     ['Access Token'],
  clover:     ['Merchant ID', 'API Key'],
  lightspeed: ['Client ID', 'Client Secret'],
  aloha:      ['API Key', 'Site ID'],
  revel:      ['API Key', 'API Secret', 'Establishment'],
  spoton:     ['API Key'],
  heartland:  ['Secret Key'],
};
