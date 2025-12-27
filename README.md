# Personal Assistant Dashboard 🏠

A beautiful, modern personal dashboard that displays your calendar events, prayer times, weather forecasts, and quick notes - all in one place.

![Dashboard Preview](https://img.shields.io/badge/status-ready-brightgreen)

## ✨ Features

- **📅 Calendar Integration**: View events from multiple Google Calendars
- **🕌 Prayer Times**: Automatically displays prayer times based on your location
- **🌤️ Weather Forecasts**:
  - Current weather conditions
  - 24-hour hourly forecast
  - 7-day weekly forecast
- **📝 Quick Notes**: Take notes that are saved locally in your browser
- **⏰ Live Clock**: Real-time clock display
- **🎨 Modern UI**: Dark theme with smooth animations and responsive design

## 🚀 Quick Start

### 1. Download or Clone

```bash
git clone <your-repo-url>
cd Personal-Assistant
```

### 2. Configure Your Settings

Open `config.js` and customize the following:

#### Location Settings
```javascript
location: {
    city: 'New York',        // Your city name
    country: 'US',           // Your country code
    latitude: 40.7128,       // Your latitude
    longitude: -74.0060,     // Your longitude
    timezone: 'America/New_York'
}
```

#### Weather API Key (Required)
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key
4. Add it to config.js:
```javascript
weather: {
    apiKey: 'your_api_key_here',
    units: 'imperial' // or 'metric' for Celsius
}
```

#### Google Calendar API (Optional but Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Calendar API
4. Create credentials:
   - API Key (for basic access)
   - OAuth 2.0 Client ID (for full access)
5. Add to config.js:
```javascript
calendar: {
    google: {
        apiKey: 'your_google_api_key',
        clientId: 'your_oauth_client_id',
        calendarIds: [
            'primary',
            'other-calendar@group.calendar.google.com'
        ]
    }
}
```

**Getting Calendar IDs:**
- Open Google Calendar in a browser
- Click on the calendar you want to add
- Go to Settings > Integrate calendar
- Copy the Calendar ID

#### Apple/iCloud Calendar (Optional)
You can add your Apple Calendar by making it public and using the URL:

**Option 1: Public iCloud Calendar**
1. Open Calendar app on Mac
2. Right-click on the calendar you want to share
3. Select "Share Calendar" → "Public Calendar"
4. Copy the URL that appears
5. Replace `webcal://` with `https://` in the URL
6. Add to config.js:
```javascript
calendar: {
    apple: [
        'https://p01-calendars.icloud.com/published/2/YOUR_CALENDAR_ID'
    ]
}
```

**Option 2: Get Calendar Subscription URL**
1. Open Calendar app on Mac
2. File → Export → Export the calendar
3. Host the .ics file somewhere publicly accessible
4. Add the URL to config.js

**Option 3: Use Google Calendar Sync**
- Easiest method: Subscribe to your iCloud calendar in Google Calendar
- Then use Google Calendar API (events from both sources appear together)

**Note:** Apple Calendar integration works with public calendars or .ics subscription URLs. For private calendars, consider syncing them to Google Calendar first.

#### Prayer Times Settings
```javascript
prayer: {
    method: 2,  // Calculation method (see below)
    school: 0   // 0=Shafi, 1=Hanafi
}
```

**Prayer Calculation Methods:**
- 1 = University of Islamic Sciences, Karachi
- 2 = Islamic Society of North America (ISNA)
- 3 = Muslim World League
- 4 = Umm Al-Qura University, Makkah
- 5 = Egyptian General Authority of Survey

### 3. Run the Dashboard

Simply open `index.html` in your web browser!

#### Option A: Double-click the file
- Navigate to the folder
- Double-click `index.html`

#### Option B: Use a local server (recommended for full functionality)
```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (requires http-server: npm install -g http-server)
http-server

# Using PHP
php -S localhost:8000
```

Then open your browser to `http://localhost:8000`

## 📱 Features Guide

### Calendar Events
- Shows all events for the current day
- **Supports both Google Calendar and Apple/iCloud Calendar**
- Mix events from multiple calendar sources
- Google Calendar: Click "Sign in with Google" if prompted (first time only)
- Apple Calendar: Works with public calendars and .ics subscription URLs
- Events auto-refresh every 5 minutes
- Calendar sources are labeled with 📧 (Google) or 🍎 (Apple)

### Prayer Times
- Automatically displays based on your location
- Highlights the next upcoming prayer
- Updates every hour
- Supports different calculation methods

### Weather
- **Current**: Temperature, feels like, humidity, wind speed
- **Hourly**: Next 24 hours with icons and temperatures
- **Weekly**: 7-day forecast with high/low temperatures
- Updates every 10 minutes

### Quick Notes
- Type anything you need to remember
- Automatically saves to your browser's local storage
- Persists between sessions

## 🎨 Customization

### Change Colors
Edit `styles.css` and modify the CSS variables:
```css
:root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --accent: #3b82f6;
    /* ... more colors */
}
```

### Adjust Refresh Intervals
Edit `config.js`:
```javascript
refreshIntervals: {
    clock: 1000,        // 1 second
    weather: 600000,    // 10 minutes
    prayer: 3600000,    // 1 hour
    calendar: 300000    // 5 minutes
}
```

## 🔧 Troubleshooting

### Weather Not Loading
- Verify your API key is correct in `config.js`
- Check that you have an active internet connection
- Make sure your API key is activated (can take a few minutes after signup)

### Calendar Not Loading
- **Google Calendar:**
  - Ensure you've enabled Google Calendar API in Google Cloud Console
  - Check that your API key has the correct permissions
  - Try signing in with OAuth (click "Sign in with Google")
- **Apple/iCloud Calendar:**
  - Verify the calendar is set to Public
  - Make sure you replaced `webcal://` with `https://` in the URL
  - Check that the URL is accessible in a browser
  - If using CORS issues, consider hosting via a proxy or using Google Calendar sync

### Prayer Times Not Showing
- Verify your latitude and longitude are correct
- Check your calculation method setting
- Ensure internet connection is active

### Location Issues
You can find your coordinates:
1. Go to [Google Maps](https://maps.google.com)
2. Right-click your location
3. Click the coordinates to copy them

## 🌐 Browser Compatibility

Works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## 📄 Privacy

All data is processed locally or directly with the respective APIs:
- Notes are stored in your browser's local storage
- No data is sent to any third-party servers except the APIs you configure
- Calendar access requires your explicit permission

## 🛠️ Technology Stack

- Pure HTML5, CSS3, and JavaScript (no frameworks required)
- Google Calendar API
- OpenWeatherMap API
- Aladhan Prayer Times API
- Local Storage for notes

## 📝 License

Free to use and modify for personal use.

## 🤝 Contributing

Feel free to fork and customize for your needs!

## 📮 Support

If you encounter issues:
1. Check the browser console for error messages (F12)
2. Verify all API keys are configured correctly
3. Ensure your internet connection is stable

---

**Enjoy your personal dashboard! 🎉**
