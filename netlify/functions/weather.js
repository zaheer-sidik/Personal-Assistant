// Netlify serverless function for weather API
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { latitude, longitude, units = 'metric' } = event.queryStringParameters || {};

  if (!latitude || !longitude) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing latitude or longitude' })
    };
  }

  const apiKey = process.env.WEATHER_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Weather API key not configured' })
    };
  }

  try {
    // Fetch current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${units}&appid=${apiKey}`;
    const currentResponse = await fetch(currentUrl);
    
    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.status}`);
    }
    
    const currentData = await currentResponse.json();

    // Fetch forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=${units}&appid=${apiKey}`;
    const forecastResponse = await fetch(forecastUrl);
    
    if (!forecastResponse.ok) {
      throw new Error(`Forecast API error: ${forecastResponse.status}`);
    }
    
    const forecastData = await forecastResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        current: currentData,
        forecast: forecastData.list,
        success: true
      })
    };
  } catch (error) {
    console.error('Weather function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, success: false })
    };
  }
};
