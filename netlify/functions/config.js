// Netlify serverless function to provide non-sensitive config
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse environment variables
    const locations = JSON.parse(process.env.LOCATIONS || '[]');
    const googleCalendarIds = process.env.GOOGLE_CALENDAR_IDS ? 
      process.env.GOOGLE_CALENDAR_IDS.split(',') : ['primary'];
    const appleCalendarUrls = process.env.APPLE_CALENDAR_URLS ? 
      process.env.APPLE_CALENDAR_URLS.split(',') : [];

    const config = {
      locations: locations,
      prayer: {
        method: parseInt(process.env.PRAYER_METHOD || '0'),
        school: parseInt(process.env.PRAYER_SCHOOL || '0')
      },
      weather: {
        units: process.env.WEATHER_UNITS || 'metric'
      },
      calendar: {
        google: {
          apiKey: process.env.GOOGLE_CALENDAR_API_KEY || '',
          clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
          calendarIds: googleCalendarIds
        },
        apple: appleCalendarUrls
      },
      refreshIntervals: {
        clock: parseInt(process.env.REFRESH_CLOCK || '1000'),
        weather: parseInt(process.env.REFRESH_WEATHER || '600000'),
        prayer: parseInt(process.env.REFRESH_PRAYER || '3600000'),
        calendar: parseInt(process.env.REFRESH_CALENDAR || '300000')
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config)
    };
  } catch (error) {
    console.error('Config function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load configuration' })
    };
  }
};
