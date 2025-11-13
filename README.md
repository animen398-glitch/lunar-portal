# Lunar Day Portal

A clean, modern web application for displaying lunar day information, inspired by `amlich.dev` layout with content similar to `moonday.info`.

## Features

- 🌙 **Lunar Day Information**: Displays moonrise, moonset, new moon, full moon, lunar sign, nakshatra, and more
- 🌍 **Multi-language Support**: English and Russian (easily extensible)
- 📅 **Date Selection**: Choose any date to view lunar information
- 🔄 **API Integration Ready**: Prepared for Swiss Ephemeris and NASA API integration
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Clean, minimalist design with glassmorphism effects

## Project Structure

```
LunarPortal/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── app.js              # Main application logic
├── locales/            # Translation files
│   ├── en.json         # English translations
│   └── ru.json         # Russian translations
├── services/           # Data services
│   ├── ephemeris.js    # Ephemeris data fetching (Swiss Ephemeris, NASA, fallback)
│   └── lunarDays.js    # Lunar day content and descriptions
└── README.md           # This file
```

## Setup

1. **No build step required** - This is a vanilla JavaScript application that runs directly in the browser.

2. **For local development**, you can use any static file server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (npx)
   npx serve
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser.

## API Integration

### Swiss Ephemeris

To connect Swiss Ephemeris, edit `services/ephemeris.js`:

```javascript
const EPHEMERIS_CONFIG = {
  swissEphemerisUrl: 'https://your-swiss-ephemeris-api.com/api/v1/calculate',
  // ... other config
};
```

The `fetchSwissEphemeris()` function expects a POST request with:
```json
{
  "date": "2025-10-22T00:00:00Z",
  "latitude": 55.7558,
  "longitude": 37.6173,
  "objects": ["moon", "sun"],
  "calculations": ["rise_set", "position", "phase"]
}
```

### NASA API

The application can use NASA's USNO (US Naval Observatory) API for rise/set times. This is already configured in `fetchNASAData()`.

**Note**: Some NASA APIs require an API key. You may need to:
1. Register at [api.nasa.gov](https://api.nasa.gov/)
2. Add your API key to requests if required

### Fallback Mode

If no APIs are available, the application uses simplified calculations. These are placeholders and should be replaced with proper astronomical calculations for production use.

## Adding New Languages

1. Create a new JSON file in `locales/` (e.g., `de.json` for German)
2. Copy the structure from `en.json` and translate all values
3. Add the language button to `index.html`:
   ```html
   <button data-lang="de">DE</button>
   ```
4. Add translations to `lunarDaysData` in `services/lunarDays.js`

## Customization

### Styling
Edit `styles.css` to change colors, fonts, spacing, etc. CSS variables are defined at the top for easy theming.

### Lunar Day Content
Edit `services/lunarDays.js` to add more lunar days or modify existing descriptions.

### Location
By default, the app uses Moscow coordinates. Users can allow geolocation, or you can set a default location in `services/ephemeris.js`.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6 modules support
- Geolocation API for automatic location detection (optional)

## License

This project is provided as-is for educational and personal use.

## Notes

- The current implementation uses simplified calculations for demonstration
- For production use, integrate proper astronomical calculation libraries
- Consider adding error handling and retry logic for API calls
- Add caching to reduce API calls for frequently accessed dates

