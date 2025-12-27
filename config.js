// Configuration file for Personal Assistant Dashboard
// Copy this file and customize with your own settings

const CONFIG = {
    // Location settings for prayer times and weather
    // You can add multiple locations - each will be displayed separately on the dashboard
    locations: [
        {
            city: 'Oxford',
            country: 'GB',
            latitude: 51.7520,
            longitude: -1.2577,
            timezone: 'Europe/London'
        },
        {
            city: 'Harrow',
            country: 'GB',
            latitude: 51.5898,
            longitude: -0.3346,
            timezone: 'Europe/London'
        }
    ],

    // Prayer times settings
    prayer: {
        method: 0, // 0=Shia Ithna-Ashari (Jafari), 1=University of Islamic Sciences Karachi, 2=Islamic Society of North America (ISNA), 3=Muslim World League, 4=Umm Al-Qura University Makkah, 5=Egyptian General Authority of Survey, 7=Institute of Geophysics University of Tehran
        school: 0  // 0=Shafi, 1=Hanafi (Note: School parameter is not used for Jafari method)
    },

    // Weather API settings
    weather: {
        // Get your free API key from https://openweathermap.org/api
        apiKey: '65165807c19c20ca26602d1f568dfec3',
        units: 'metric' // 'imperial' for Fahrenheit, 'metric' for Celsius
    },

    // Google Calendar settings
    // Instructions:
    // 1. Go to https://console.cloud.google.com/
    // 2. Create a new project or select existing one
    // 3. Enable Google Calendar API
    // 4. Create credentials (API Key)
    // 5. For OAuth: Create OAuth 2.0 Client ID (Web application)
    calendar: {
        // Google Calendar API credentials
        google: {
            apiKey: 'YOUR_GOOGLE_CALENDAR_API_KEY',
            clientId: 'YOUR_GOOGLE_OAUTH_CLIENT_ID',
            // Add your calendar IDs here (you can find them in calendar settings)
            calendarIds: [
                'primary', // Your main calendar
                // 'example@group.calendar.google.com', // Additional calendars
            ]
        },
        
        // Apple/iCloud Calendar URLs (public calendars or .ics feeds)
        // Instructions:
        // 1. Open Calendar app on Mac/iPhone
        // 2. Right-click calendar → Share Calendar → Public Calendar
        // 3. Copy the URL or get the webcal:// URL
        // 4. Replace 'webcal://' with 'https://' in the URL below
        apple: [
            'https://p117-caldav.icloud.com/published/2/MjI0NTEyMjU1MzkyMjQ1MdXJZYh2shHaN7H3ZF-91wzN974zk8gvDCY1Pbklt5PRiGviHOz-Nx4SlRaz223dE1eMLCmB_WKCDig-B2sT5FU',
            'https://p117-caldav.icloud.com/published/2/MjI0NTEyMjU1MzkyMjQ1MdXJZYh2shHaN7H3ZF-91wzXvBYoRW4qpIqmhELfVGq58GnTAIkU6QmrVeK5FYvpkNfFM4faqH9EGP6HyKeu5w8'
        ]
    },

    // Refresh intervals (in milliseconds)
    refreshIntervals: {
        clock: 1000,        // 1 second
        weather: 600000,    // 10 minutes
        prayer: 3600000,    // 1 hour
        calendar: 300000    // 5 minutes
    }
};
