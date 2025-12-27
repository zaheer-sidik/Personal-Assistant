// Personal Assistant Dashboard - Main JavaScript

// Global state
let CONFIG = null; // Will be loaded from Netlify function
let calendarInitialized = false;
let gapi = null;
let tokenClient = null;

// Weather API rate limiting
const WEATHER_API_LIMIT = 100; // Max calls per day
const WEATHER_API_KEY = 'weatherApiCalls';

function checkWeatherAPILimit() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // Get existing calls from localStorage
    let calls = JSON.parse(localStorage.getItem(WEATHER_API_KEY) || '[]');
    
    // Filter out calls older than 24 hours
    calls = calls.filter(timestamp => timestamp > oneDayAgo);
    
    // Save filtered calls
    localStorage.setItem(WEATHER_API_KEY, JSON.stringify(calls));
    
    // Check if we've hit the limit
    if (calls.length >= WEATHER_API_LIMIT) {
        return false; // Limit exceeded
    }
    
    return true; // OK to make API call
}

function recordWeatherAPICall() {
    const now = Date.now();
    let calls = JSON.parse(localStorage.getItem(WEATHER_API_KEY) || '[]');
    calls.push(now);
    localStorage.setItem(WEATHER_API_KEY, JSON.stringify(calls));
}

function getWeatherAPICallsRemaining() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    let calls = JSON.parse(localStorage.getItem(WEATHER_API_KEY) || '[]');
    calls = calls.filter(timestamp => timestamp > oneDayAgo);
    return WEATHER_API_LIMIT - calls.length;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Load config from Netlify function first
    await loadConfig();
    
    initializeDashboard();
    setupEventListeners();
    
    // Load Google Calendar API
    loadGoogleCalendarAPI();
});

// Load configuration from Netlify function
async function loadConfig() {
    try {
        const response = await fetch('/.netlify/functions/config');
        if (!response.ok) {
            throw new Error('Failed to load config');
        }
        CONFIG = await response.json();
        console.log('Configuration loaded successfully');
    } catch (error) {
        console.error('Error loading config:', error);
        // Fallback to empty config
        CONFIG = {
            locations: [],
            prayer: { method: 0, school: 0 },
            weather: { units: 'metric' },
            calendar: { google: { apiKey: '', clientId: '', calendarIds: [] }, apple: [] },
            refreshIntervals: { clock: 1000, weather: 600000, prayer: 3600000, calendar: 300000 }
        };
    }
}

function initializeDashboard() {
    updateClock();
    updateGreeting();
    generateLocationCards();
    loadAllLocations();
    
    // Set up refresh intervals
    setInterval(updateClock, CONFIG.refreshIntervals.clock);
    setInterval(loadAllLocations, CONFIG.refreshIntervals.weather);
}

function setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', function() {
        loadAllLocations();
        if (calendarInitialized) {
            loadCalendarEvents();
        }
    });
}

// ===== TIME & GREETING =====
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('current-time').textContent = timeString;
    document.getElementById('footer-time').textContent = timeString;
}

function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const dateString = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    
    document.getElementById('greeting-text').textContent = greeting;
    document.getElementById('current-date').textContent = dateString;
}

// ===== MULTI-LOCATION SUPPORT =====
function generateLocationCards() {
    // Generate Prayer Times section (single table with columns)
    const prayerContainer = document.getElementById('prayer-times-container');
    prayerContainer.innerHTML = '<div class="loading">Loading prayer times...</div>';
    
    // Generate Weather section (single table with columns)
    const weatherContainer = document.getElementById('weather-container');
    weatherContainer.innerHTML = '<div class="loading">Loading weather...</div>';
}

function loadAllLocations() {
    // Load all prayer times and then display them together
    const prayerPromises = CONFIG.locations.map((location, index) => 
        loadPrayerTimesData(location, index)
    );
    
    Promise.all(prayerPromises).then(results => {
        displayConsolidatedPrayerTimes(results);
    });
    
    // Load all weather and then display them together
    const weatherPromises = CONFIG.locations.map((location, index) => 
        loadWeatherData(location, index)
    );
    
    Promise.all(weatherPromises).then(results => {
        displayConsolidatedWeather(results);
    });
}

// ===== PRAYER TIMES =====
async function loadPrayerTimesData(location, locationIndex) {
    try {
        const date = new Date();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${location.latitude}&longitude=${location.longitude}&method=${CONFIG.prayer.method}&school=${CONFIG.prayer.school}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            return {
                location: location,
                timings: data.data.timings,
                success: true
            };
        } else {
            throw new Error('Failed to fetch prayer times');
        }
    } catch (error) {
        console.error('Error loading prayer times for', location.city, error);
        return {
            location: location,
            error: error.message,
            success: false
        };
    }
}

function displayConsolidatedPrayerTimes(results) {
    const container = document.getElementById('prayer-times-container');
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Check if any location failed
    const hasErrors = results.some(r => !r.success);
    if (hasErrors) {
        container.innerHTML = '<div class="error">Unable to load prayer times for one or more locations.</div>';
        return;
    }
    
    let html = '<div class="consolidated-prayer-table">';
    
    // Header row
    html += '<div class="prayer-table-row prayer-table-header">';
    html += '<div class="prayer-table-cell">Prayer</div>';
    results.forEach(result => {
        html += `<div class="prayer-table-cell">${result.location.city}</div>`;
    });
    html += '</div>';
    
    // Prayer time rows
    prayers.forEach(prayer => {
        let isNext = false;
        
        // Check if this is the next prayer for any location
        results.forEach(result => {
            const time = result.timings[prayer];
            const [hours, minutes] = time.split(':').map(Number);
            const prayerTime = hours * 60 + minutes;
            if (prayerTime > currentTime && !isNext) {
                isNext = true;
            }
        });
        
        const rowClass = isNext ? 'prayer-table-row next-prayer' : 'prayer-table-row';
        html += `<div class="${rowClass}">`;
        html += `<div class="prayer-table-cell prayer-name-cell"><strong>${prayer}</strong></div>`;
        
        results.forEach(result => {
            const time = result.timings[prayer];
            const displayTime = formatTime12Hour(time);
            html += `<div class="prayer-table-cell">${displayTime}</div>`;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function loadPrayerTimes(location, locationIndex) {
    // This function is kept for backward compatibility but not used
    const result = await loadPrayerTimesData(location, locationIndex);
    return result;
}

function formatTime12Hour(time24) {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ===== WEATHER =====
async function loadWeatherData(location, locationIndex) {
    // Check API rate limit
    if (!checkWeatherAPILimit()) {
        return {
            location: location,
            error: 'API limit reached',
            success: false
        };
    }
    
    try {
        // Record this API call
        recordWeatherAPICall();
        
        // Call Netlify serverless function
        const functionUrl = `/.netlify/functions/weather?latitude=${location.latitude}&longitude=${location.longitude}&units=${CONFIG.weather.units}`;
        const response = await fetch(functionUrl);
        
        if (!response.ok) {
            throw new Error(`Weather function error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }
        
        console.log(`Weather API calls remaining today: ${getWeatherAPICallsRemaining()}`);
        
        return {
            location: location,
            current: data.current,
            forecast: data.forecast,
            success: true
        };
    } catch (error) {
        console.error('Error loading weather for', location.city, error);
        return {
            location: location,
            error: error.message,
            success: false
        };
    }
}

function displayConsolidatedWeather(results) {
    const container = document.getElementById('weather-container');
    
    // Check if any location failed
    const hasErrors = results.some(r => !r.success);
    if (hasErrors) {
        const errorLocations = results.filter(r => !r.success).map(r => r.location.city).join(', ');
        container.innerHTML = `
            <div class="error">
                Unable to load weather for: ${errorLocations}<br><br>
                <strong>Troubleshooting:</strong><br>
                1. Verify your API key in config.js<br>
                2. New keys take 2-10 minutes to activate<br>
                3. Check API rate limit (100 calls/day)<br>
                4. Get a free key at <a href="https://openweathermap.org/api" target="_blank" style="color: #3b82f6;">openweathermap.org/api</a>
            </div>
        `;
        return;
    }
    
    const unit = CONFIG.weather.units === 'imperial' ? '°F' : '°C';
    let html = '<div class="consolidated-weather-table">';
    
    // Current Weather Table
    html += '<div class="weather-table-section">';
    html += '<h3>Current Weather</h3>';
    html += '<div class="weather-current-grid">';
    
    results.forEach(result => {
        const temp = Math.round(result.current.main.temp);
        const feelsLike = Math.round(result.current.main.feels_like);
        const humidity = result.current.main.humidity;
        const windSpeed = Math.round(result.current.wind.speed);
        const description = result.current.weather[0].description;
        const icon = getWeatherIcon(result.current.weather[0].icon);
        const windUnit = CONFIG.weather.units === 'imperial' ? 'mph' : 'm/s';
        
        html += `
            <div class="weather-location-card">
                <h4>${result.location.city}</h4>
                <div class="weather-main">
                    <div class="weather-icon">${icon}</div>
                    <div class="weather-temp">${temp}${unit}</div>
                </div>
                <div class="weather-description">${description}</div>
                <div class="weather-details-grid">
                    <div>Feels: ${feelsLike}${unit}</div>
                    <div>Humidity: ${humidity}%</div>
                    <div>Wind: ${windSpeed} ${windUnit}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    
    // Weekly Forecast (simplified)
    html += '<div class="weather-table-section">';
    html += '<h3>5-Day Forecast</h3>';
    html += displayConsolidatedForecast(results, unit);
    html += '</div>';
    
    html += '</div>';
    container.innerHTML = html;
}

function displayConsolidatedForecast(results, unit) {
    let html = '<div class="forecast-table">';
    
    // Get unique days from first location's forecast
    const dailyData = {};
    results[0].forecast.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toDateString();
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                date: date,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            };
        }
    });
    
    // Header row
    html += '<div class="forecast-table-row forecast-table-header">';
    html += '<div class="forecast-table-cell">Date</div>';
    results.forEach(result => {
        html += `<div class="forecast-table-cell">${result.location.city}</div>`;
    });
    html += '</div>';
    
    // Forecast rows (max 5 days)
    let count = 0;
    for (const dayKey in dailyData) {
        if (count >= 5) break;
        const day = dailyData[dayKey];
        
        html += '<div class="forecast-table-row">';
        html += `<div class="forecast-table-cell"><strong>${day.dayName}</strong></div>`;
        
        results.forEach(result => {
            // Get temps for this day from this location
            const dayForecasts = result.forecast.filter(item => {
                const itemDate = new Date(item.dt * 1000);
                return itemDate.toDateString() === dayKey;
            });
            
            if (dayForecasts.length > 0) {
                const temps = dayForecasts.map(f => f.main.temp);
                const high = Math.round(Math.max(...temps));
                const low = Math.round(Math.min(...temps));
                const icon = getWeatherIcon(dayForecasts[0].weather[0].icon);
                
                html += `
                    <div class="forecast-table-cell">
                        <span class="forecast-icon">${icon}</span>
                        <span class="temp-high">${high}${unit}</span> / 
                        <span class="temp-low">${low}${unit}</span>
                    </div>
                `;
            } else {
                html += '<div class="forecast-table-cell">-</div>';
            }
        });
        
        html += '</div>';
        count++;
    }
    
    html += '</div>';
    return html;
}

async function loadWeather(location, locationIndex) {
    // This function is kept for backward compatibility but not used
    const result = await loadWeatherData(location, locationIndex);
    return result;
}

function displayCurrentWeather(current, location, locationIndex) {
    const container = document.getElementById(`weather-current-${locationIndex}`);
    const temp = Math.round(current.temp || current.main.temp);
    const feelsLike = Math.round(current.feels_like || current.main.feels_like);
    const humidity = current.humidity || current.main.humidity;
    const windSpeed = Math.round(current.wind_speed || current.wind.speed);
    const description = current.weather[0].description;
    const icon = getWeatherIcon(current.weather[0].icon || current.weather[0].main);
    const unit = CONFIG.weather.units === 'imperial' ? '°F' : '°C';
    const windUnit = CONFIG.weather.units === 'imperial' ? 'mph' : 'm/s';
    
    container.innerHTML = `
        <div class="current-weather">
            <div class="weather-main">
                <div class="weather-icon">${icon}</div>
                <div>
                    <div class="weather-temp">${temp}${unit}</div>
                    <div class="weather-description">${description}</div>
                </div>
            </div>
            <div class="weather-details">
                <div class="weather-detail">
                    <div class="weather-detail-label">Feels Like</div>
                    <div class="weather-detail-value">${feelsLike}${unit}</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Humidity</div>
                    <div class="weather-detail-value">${humidity}%</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Wind</div>
                    <div class="weather-detail-value">${windSpeed} ${windUnit}</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Location</div>
                    <div class="weather-detail-value">${location.city}</div>
                </div>
            </div>
        </div>
    `;
}

function displayHourlyForecast(hourly, locationIndex) {
    const container = document.getElementById(`weather-hourly-${locationIndex}`);
    const unit = CONFIG.weather.units === 'imperial' ? '°F' : '°C';
    
    // Show next 24 hours
    const hours = hourly.slice(0, 24);
    
    let html = '';
    hours.forEach((hour, index) => {
        const time = new Date(hour.dt * 1000);
        const timeStr = index === 0 ? 'Now' : time.toLocaleTimeString('en-US', { hour: 'numeric' });
        const temp = Math.round(hour.temp);
        const icon = getWeatherIcon(hour.weather[0].icon || hour.weather[0].main);
        
        html += `
            <div class="hourly-item">
                <div class="hourly-time">${timeStr}</div>
                <div class="hourly-icon">${icon}</div>
                <div class="hourly-temp">${temp}${unit}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayHourlyForecastFallback(list, locationIndex) {
    const container = document.getElementById(`weather-hourly-${locationIndex}`);
    const unit = CONFIG.weather.units === 'imperial' ? '°F' : '°C';
    
    // Show next 8 readings (24 hours)
    const hours = list.slice(0, 8);
    
    let html = '';
    hours.forEach((hour, index) => {
        const time = new Date(hour.dt * 1000);
        const timeStr = index === 0 ? 'Now' : time.toLocaleTimeString('en-US', { hour: 'numeric' });
        const temp = Math.round(hour.main.temp);
        const icon = getWeatherIcon(hour.weather[0].icon);
        
        html += `
            <div class="hourly-item">
                <div class="hourly-time">${timeStr}</div>
                <div class="hourly-icon">${icon}</div>
                <div class="hourly-temp">${temp}${unit}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayWeeklyForecast(daily, locationIndex) {
    const container = document.getElementById(`weather-weekly-${locationIndex}`);
    const unit = CONFIG.weather.units === 'imperial' ? '°F' : '°C';
    
    // Show next 7 days
    const days = daily.slice(0, 7);
    
    let html = '';
    days.forEach((day, index) => {
        const date = new Date(day.dt * 1000);
        const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
        const tempHigh = Math.round(day.temp.max);
        const tempLow = Math.round(day.temp.min);
        const description = day.weather[0].description;
        const icon = getWeatherIcon(day.weather[0].icon || day.weather[0].main);
        
        html += `
            <div class="weekly-item">
                <div class="weekly-day">${dayName}</div>
                <div class="weekly-icon">${icon}</div>
                <div class="weekly-desc">${description}</div>
                <div class="weekly-temps">
                    <span class="temp-high">${tempHigh}${unit}</span>
                    <span class="temp-low">${tempLow}${unit}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayWeeklyForecastFallback(list, locationIndex) {
    const container = document.getElementById(`weather-weekly-${locationIndex}`);
    const unit = CONFIG.weather.units === 'imperial' ? '°F' : '°C';
    
    // Group by day and get min/max temps
    const dailyData = {};
    list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toDateString();
        
        if (!dailyData[dayKey]) {
            dailyData[dayKey] = {
                date: date,
                temps: [],
                weather: item.weather[0]
            };
        }
        dailyData[dayKey].temps.push(item.main.temp);
    });
    
    let html = '';
    let count = 0;
    for (const dayKey in dailyData) {
        if (count >= 5) break; // Show 5 days
        
        const day = dailyData[dayKey];
        const dayName = count === 0 ? 'Today' : day.date.toLocaleDateString('en-US', { weekday: 'long' });
        const tempHigh = Math.round(Math.max(...day.temps));
        const tempLow = Math.round(Math.min(...day.temps));
        const description = day.weather.description;
        const icon = getWeatherIcon(day.weather.icon);
        
        html += `
            <div class="weekly-item">
                <div class="weekly-day">${dayName}</div>
                <div class="weekly-icon">${icon}</div>
                <div class="weekly-desc">${description}</div>
                <div class="weekly-temps">
                    <span class="temp-high">${tempHigh}${unit}</span>
                    <span class="temp-low">${tempLow}${unit}</span>
                </div>
            </div>
        `;
        count++;
    }
    
    container.innerHTML = html;
}

function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': '☀️', '01n': '🌙',
        '02d': '⛅', '02n': '☁️',
        '03d': '☁️', '03n': '☁️',
        '04d': '☁️', '04n': '☁️',
        '09d': '🌧️', '09n': '🌧️',
        '10d': '🌦️', '10n': '🌧️',
        '11d': '⛈️', '11n': '⛈️',
        '13d': '🌨️', '13n': '🌨️',
        '50d': '🌫️', '50n': '🌫️',
        // Fallback for text descriptions
        'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️',
        'Drizzle': '🌦️', 'Thunderstorm': '⛈️', 'Snow': '🌨️',
        'Mist': '🌫️', 'Fog': '🌫️'
    };
    return iconMap[iconCode] || '🌤️';
}

// ===== GOOGLE CALENDAR =====
function loadGoogleCalendarAPI() {
    // Load Google API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
        gapi = window.gapi;
        gapi.load('client', initializeGoogleCalendar);
    };
    document.head.appendChild(script);
    
    // Load Google Identity Services
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = initializeGoogleIdentity;
    document.head.appendChild(gisScript);
}

async function initializeGoogleCalendar() {
    const hasGoogleConfig = CONFIG.calendar.google && 
                           CONFIG.calendar.google.apiKey && 
                           CONFIG.calendar.google.apiKey !== 'YOUR_GOOGLE_CALENDAR_API_KEY';
    
    const hasAppleConfig = CONFIG.calendar.apple && CONFIG.calendar.apple.length > 0;
    
    if (!hasGoogleConfig && !hasAppleConfig) {
        document.getElementById('calendar-events').innerHTML = '<div class="error">Please configure your calendar sources in config.js<br><br><a href="https://console.cloud.google.com/" target="_blank" style="color: #3b82f6;">Get Google API Key →</a></div>';
        return;
    }
    
    // Initialize Google Calendar if configured
    if (hasGoogleConfig) {
        try {
            await gapi.client.init({
                apiKey: CONFIG.calendar.google.apiKey,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            });
            
            calendarInitialized = true;
        } catch (error) {
            console.error('Error initializing Google Calendar:', error);
        }
    }
    
    // Load events from all sources
    loadCalendarEvents();
    
    // Refresh calendar events periodically
    setInterval(loadCalendarEvents, CONFIG.refreshIntervals.calendar);
}

function initializeGoogleIdentity() {
    if (!CONFIG.calendar.google || 
        !CONFIG.calendar.google.clientId || 
        CONFIG.calendar.google.clientId === 'YOUR_GOOGLE_OAUTH_CLIENT_ID') {
        return;
    }
    
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.calendar.google.clientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: '', // defined later
    });
}

async function loadCalendarEvents() {
    const container = document.getElementById('calendar-events');
    
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        let allEvents = [];
        
        // Fetch events from Google Calendar if initialized
        if (calendarInitialized && CONFIG.calendar.google) {
            const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay);
            allEvents = allEvents.concat(googleEvents);
        }
        
        // Fetch events from Apple/iCloud calendars
        if (CONFIG.calendar.apple && CONFIG.calendar.apple.length > 0) {
            const appleEvents = await fetchAppleCalendarEvents(startOfDay, endOfDay);
            allEvents = allEvents.concat(appleEvents);
        }
        
        // Sort all events by start time
        allEvents.sort((a, b) => {
            const aStart = new Date(a.start.dateTime || a.start.date);
            const bStart = new Date(b.start.dateTime || b.start.date);
            return aStart - bStart;
        });
        
        displayCalendarEvents(allEvents);
    } catch (error) {
        console.error('Error loading calendar events:', error);
        
        if (error.status === 401 || error.status === 403) {
            container.innerHTML = `
                <div class="error">
                    Calendar access requires authentication.<br><br>
                    <button onclick="handleAuthClick()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">
                        Sign in with Google
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = '<div class="error">Unable to load calendar events. Please check your configuration.</div>';
        }
    }
}

async function fetchGoogleCalendarEvents(startOfDay, endOfDay) {
    const events = [];
    
    try {
        // Fetch events from all configured Google calendars
        for (const calendarId of CONFIG.calendar.google.calendarIds) {
            const response = await gapi.client.calendar.events.list({
                'calendarId': calendarId,
                'timeMin': startOfDay.toISOString(),
                'timeMax': endOfDay.toISOString(),
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime'
            });
            
            const calendarEvents = response.result.items || [];
            calendarEvents.forEach(event => {
                event.calendarId = calendarId;
                event.source = 'google';
            });
            events.push(...calendarEvents);
        }
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        throw error;
    }
    
    return events;
}

async function fetchAppleCalendarEvents(startOfDay, endOfDay) {
    const events = [];
    
    for (const icsUrl of CONFIG.calendar.apple) {
        try {
            // Use a CORS proxy for iCloud calendars if needed
            const url = icsUrl;
            const response = await fetch(url);
            const icsData = await response.text();
            
            const parsedEvents = parseICS(icsData, startOfDay, endOfDay);
            parsedEvents.forEach(event => {
                event.source = 'apple';
                event.calendarId = 'Apple Calendar';
            });
            events.push(...parsedEvents);
        } catch (error) {
            console.error('Error fetching Apple Calendar:', icsUrl, error);
            // Continue with other calendars
        }
    }
    
    return events;
}

// Parse ICS/iCal format
function parseICS(icsData, startOfDay, endOfDay) {
    const events = [];
    const lines = icsData.split(/\r\n|\n|\r/);
    
    let currentEvent = null;
    let inEvent = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Handle line folding (lines starting with space or tab are continuations)
        while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
            i++;
            line += lines[i].trim();
        }
        
        if (line === 'BEGIN:VEVENT') {
            inEvent = true;
            currentEvent = {
                summary: '',
                start: {},
                end: {},
                description: ''
            };
        } else if (line === 'END:VEVENT' && currentEvent) {
            // Check if event is within today
            const eventStart = parseICSDate(currentEvent.dtstart);
            if (eventStart && eventStart >= startOfDay && eventStart <= endOfDay) {
                events.push(currentEvent);
            }
            currentEvent = null;
            inEvent = false;
        } else if (inEvent && currentEvent) {
            const colonIndex = line.indexOf(':');
            const semicolonIndex = line.indexOf(';');
            
            let key, value;
            if (semicolonIndex !== -1 && semicolonIndex < colonIndex) {
                key = line.substring(0, semicolonIndex);
                value = line.substring(colonIndex + 1);
            } else {
                key = line.substring(0, colonIndex);
                value = line.substring(colonIndex + 1);
            }
            
            switch (key) {
                case 'SUMMARY':
                    currentEvent.summary = value;
                    break;
                case 'DTSTART':
                case 'DTSTART;VALUE=DATE':
                    currentEvent.dtstart = value;
                    const startDate = parseICSDate(value);
                    if (startDate) {
                        if (value.length === 8) { // Date only (all-day event)
                            currentEvent.start.date = startDate.toISOString().split('T')[0];
                        } else {
                            currentEvent.start.dateTime = startDate.toISOString();
                        }
                    }
                    break;
                case 'DTEND':
                case 'DTEND;VALUE=DATE':
                    const endDate = parseICSDate(value);
                    if (endDate) {
                        if (value.length === 8) {
                            currentEvent.end.date = endDate.toISOString().split('T')[0];
                        } else {
                            currentEvent.end.dateTime = endDate.toISOString();
                        }
                    }
                    break;
                case 'DESCRIPTION':
                    currentEvent.description = value;
                    break;
                case 'LOCATION':
                    currentEvent.location = value;
                    break;
            }
        }
    }
    
    return events;
}

function parseICSDate(dateString) {
    if (!dateString) return null;
    
    // Remove any timezone ID (e.g., TZID=America/New_York:)
    dateString = dateString.split(':').pop();
    
    // Format: YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    if (dateString.length === 8) {
        // Date only: YYYYMMDD
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return new Date(year, month - 1, day);
    } else if (dateString.length >= 15) {
        // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        const hour = dateString.substring(9, 11);
        const minute = dateString.substring(11, 13);
        const second = dateString.substring(13, 15);
        
        if (dateString.endsWith('Z')) {
            return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        } else {
            return new Date(year, month - 1, day, hour, minute, second);
        }
    }
    
    return null;
}

function handleAuthClick() {
    if (!tokenClient) {
        alert('Please configure your OAuth Client ID in config.js');
        return;
    }
    
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        await loadCalendarEvents();
    };
    
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function displayCalendarEvents(events) {
    const container = document.getElementById('calendar-events');
    
    if (events.length === 0) {
        container.innerHTML = '<div class="no-events">No events scheduled for today</div>';
        return;
    }
    
    let html = '';
    events.forEach(event => {
        const start = event.start.dateTime || event.start.date;
        const startDate = new Date(start);
        const timeStr = event.start.dateTime 
            ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : 'All Day';
        
        // Determine calendar name based on source
        let calendarName = '';
        if (event.source === 'google') {
            calendarName = event.calendarId === 'primary' ? '📧 Google Calendar' : `📧 ${event.calendarId}`;
        } else if (event.source === 'apple') {
            calendarName = '🍎 Apple Calendar';
        } else {
            calendarName = event.calendarId || 'Calendar';
        }
        
        html += `
            <div class="event-item">
                <div class="event-time">${timeStr}</div>
                <div class="event-title">${event.summary || 'Untitled Event'}</div>
                <div class="event-calendar">${calendarName}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Make handleAuthClick available globally
window.handleAuthClick = handleAuthClick;
