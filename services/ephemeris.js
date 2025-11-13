/**
 * Ephemeris Data Service
 * 
 * This module provides a unified interface for fetching lunar and solar data
 * from multiple sources: Swiss Ephemeris, NASA APIs, or fallback calculations.
 * 
 * Usage:
 *   import { getEphemerisData } from './services/ephemeris.js';
 *   const data = await getEphemerisData(new Date(), { lat: 55.7558, lon: 37.6173 });
 */

const EPHEMERIS_CONFIG = {
  // Ваш собственный API сервер (если запущен локально или на хостинге)
  // Для локального тестирования: http://localhost:3000/api/ephemeris
  // Для продакшена: замените на URL вашего хостинга
  customApiUrl: null, // Например: 'https://your-api.com/api/ephemeris'
  
  // Swiss Ephemeris API endpoint (you'll need to set this up)
  swissEphemerisUrl: 'https://your-swiss-ephemeris-api.com/api/v1/calculate',
  
  // NASA API endpoints
  nasaRiseSetUrl: 'https://api.nasa.gov/planetary/earth/imagery',
  nasaEphemerisUrl: 'https://ssd.jpl.nasa.gov/api/horizons.api',
  
  // Fallback calculation library (if using client-side calculations)
  useFallback: true,
  
  // Default location (Moscow, Russia)
  defaultLocation: { lat: 55.7558, lon: 37.6173 }
};

/**
 * Calculate lunar day using a simplified algorithm
 * This is a fallback when APIs are unavailable
 */
function calculateLunarDay(date, location) {
  // Simplified lunar day calculation
  // For production, use proper astronomical calculations
  const epoch = new Date('2000-01-06T00:00:00Z');
  const daysSinceEpoch = (date - epoch) / (1000 * 60 * 60 * 24);
  const lunarCycle = 29.53058867; // Average synodic month
  const lunarDay = Math.floor((daysSinceEpoch % lunarCycle) / lunarCycle * 30) + 1;
  return Math.max(1, Math.min(30, lunarDay));
}

/**
 * Calculate moonrise/moonset times (simplified fallback)
 */
function calculateMoonTimes(date, location) {
  // This is a placeholder - real calculations require complex algorithms
  const hour = date.getHours();
  const moonriseHour = (hour + 6) % 24;
  const moonsetHour = (hour + 18) % 24;
  
  return {
    moonrise: `${String(moonriseHour).padStart(2, '0')}:${String((date.getMinutes() + 37) % 60).padStart(2, '0')}`,
    moonset: `${String(moonsetHour).padStart(2, '0')}:${String((date.getMinutes() + 43) % 60).padStart(2, '0')}`
  };
}

/**
 * Fetch data from Swiss Ephemeris API
 */
async function fetchSwissEphemeris(date, location) {
  try {
    const response = await fetch(EPHEMERIS_CONFIG.swissEphemerisUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: date.toISOString(),
        latitude: location.lat,
        longitude: location.lon,
        objects: ['moon', 'sun'],
        calculations: ['rise_set', 'position', 'phase']
      })
    });
    
    if (!response.ok) throw new Error(`Swiss Ephemeris API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Swiss Ephemeris API unavailable:', error);
    return null;
  }
}

/**
 * Fetch data from NASA/USNO APIs
 * USNO (US Naval Observatory) provides free astronomical data
 */
async function fetchNASAData(date, location) {
  try {
    // USNO Rise/Set API (free, no key required)
    const dateStr = date.toISOString().split('T')[0];
    const coords = `${location.lat},${location.lon}`;
    
    const riseSetUrl = `https://api.usno.navy.mil/rstt/oneday?date=${dateStr}&coords=${coords}`;
    
    console.log('🌐 Запрос к NASA/USNO API:', riseSetUrl);
    
    const response = await fetch(riseSetUrl);
    
    if (!response.ok) {
      throw new Error(`USNO API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📡 Ответ от NASA/USNO:', data);
    
    // Parse times from USNO response
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      // USNO returns time in format "HH:MM" or "HH:MM:SS"
      const time = timeStr.substring(0, 5); // Return HH:MM
      return time;
    };
    
    const result = {
      sunrise: parseTime(data.sundata?.[0]?.time),
      sunset: parseTime(data.sundata?.[1]?.time),
      moonrise: parseTime(data.moondata?.[0]?.time),
      moonset: parseTime(data.moondata?.[1]?.time)
    };
    
    console.log('✅ NASA/USNO данные обработаны:', result);
    return result;
    
  } catch (error) {
    console.warn('⚠️ USNO/NASA API недоступен:', error.message);
    console.warn('Используются упрощенные расчеты');
    return null;
  }
}

/**
 * Fetch data from custom API server
 */
async function fetchCustomAPI(date, location) {
  if (!EPHEMERIS_CONFIG.customApiUrl) {
    return null;
  }
  
  try {
    console.log('🌐 Запрос к кастомному API:', EPHEMERIS_CONFIG.customApiUrl);
    
    const response = await fetch(EPHEMERIS_CONFIG.customApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: date.toISOString(),
        latitude: location.lat,
        longitude: location.lon
      })
    });
    
    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Данные от кастомного API:', data);
    
    return {
      moonrise: data.moonrise,
      moonset: data.moonset,
      sunrise: data.sunrise,
      sunset: data.sunset,
      lunarDay: data.lunarDay,
      lunarSign: data.lunarSign,
      nakshatra: data.nakshatra,
      newMoon: data.newMoon,
      fullMoon: data.fullMoon,
      rahuKala: data.rahuKala,
      gulikaKala: data.gulikaKala
    };
  } catch (error) {
    console.warn('⚠️ Кастомный API недоступен:', error.message);
    return null;
  }
}

/**
 * Main function to get ephemeris data
 * Tries multiple sources in order of preference
 */
export async function getEphemerisData(date = new Date(), location = EPHEMERIS_CONFIG.defaultLocation) {
  // Try custom API first (if configured)
  let data = await fetchCustomAPI(date, location);
  if (data) {
    return data;
  }
  
  // Try NASA/USNO (free and reliable)
  data = await fetchNASAData(date, location);
  if (data && (data.sunrise || data.moonrise)) {
    return normalizeNASAData(data, date, location);
  }
  
  // Try Swiss Ephemeris if configured
  data = await fetchSwissEphemeris(date, location);
  if (data) {
    return normalizeSwissEphemerisData(data, date);
  }
  
  // Final fallback: simplified calculations
  if (EPHEMERIS_CONFIG.useFallback) {
    return calculateFallbackData(date, location);
  }
  
  throw new Error('No ephemeris data source available');
}

/**
 * Normalize Swiss Ephemeris API response
 */
function normalizeSwissEphemerisData(data, date) {
  return {
    moonrise: formatTime(data.moon?.rise),
    moonset: formatTime(data.moon?.set),
    sunrise: formatTime(data.sun?.rise),
    sunset: formatTime(data.sun?.set),
    lunarDay: data.moon?.lunarDay || calculateLunarDay(date),
    lunarSign: data.moon?.sign || 'Scorpio',
    nakshatra: data.moon?.nakshatra || 'Anuradha',
    newMoon: formatNextNewMoon(data.moon?.nextNewMoon),
    fullMoon: formatNextFullMoon(data.moon?.nextFullMoon),
    rahuKala: calculateRahuKala(date),
    gulikaKala: calculateGulikaKala(date)
  };
}

/**
 * Normalize NASA API response
 */
function normalizeNASAData(data, date, location) {
  const lunarDay = calculateLunarDay(date, location);
  
  return {
    moonrise: formatTime(data.moonrise),
    moonset: formatTime(data.moonset),
    sunrise: formatTime(data.sunrise),
    sunset: formatTime(data.sunset),
    lunarDay,
    lunarSign: getLunarSign(lunarDay),
    nakshatra: getNakshatra(lunarDay),
    newMoon: formatNextNewMoon(null),
    fullMoon: formatNextFullMoon(null),
    rahuKala: calculateRahuKala(date),
    gulikaKala: calculateGulikaKala(date)
  };
}

/**
 * Fallback calculation when no APIs are available
 */
function calculateFallbackData(date, location) {
  const lunarDay = calculateLunarDay(date, location);
  const moonTimes = calculateMoonTimes(date, location);
  
  return {
    ...moonTimes,
    sunrise: '07:27',
    sunset: '16:34',
    lunarDay,
    lunarSign: getLunarSign(lunarDay),
    nakshatra: getNakshatra(lunarDay),
    newMoon: formatNextNewMoon(null),
    fullMoon: formatNextFullMoon(null),
    rahuKala: calculateRahuKala(date),
    gulikaKala: calculateGulikaKala(date)
  };
}

/**
 * Helper functions
 */
function formatTime(timeStr) {
  if (!timeStr) return '--:--';
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    return timeStr.substring(0, 5); // HH:MM
  }
  return '--:--';
}

function formatNextNewMoon(date) {
  if (!date) {
    const next = new Date();
    next.setDate(next.getDate() + 15);
    return `${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 12:49`;
  }
  const d = new Date(date);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatNextFullMoon(date) {
  if (!date) {
    const next = new Date();
    next.setDate(next.getDate() + 8);
    return `${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 10:27`;
  }
  const d = new Date(date);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function calculateRahuKala(date) {
  // Simplified calculation - real Rahu Kala requires precise astrological calculations
  const hour = date.getHours();
  const start = (hour + 1) % 24;
  const end = (start + 1) % 24;
  return `${String(start).padStart(2, '0')}:24 – ${String(end).padStart(2, '0')}:42`;
}

function calculateGulikaKala(date) {
  // Simplified calculation
  const hour = date.getHours();
  const start = (hour - 1 + 24) % 24;
  const end = (start + 1) % 24;
  return `${String(start).padStart(2, '0')}:53 – ${String(end).padStart(2, '0')}:11`;
}

function getLunarSign(lunarDay) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs[(lunarDay - 1) % 12];
}

function getNakshatra(lunarDay) {
  const nakshatras = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
                      'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
                      'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
                      'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
                      'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  return nakshatras[(lunarDay - 1) % 27];
}

/**
 * Get user's location (with permission)
 */
export async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      resolve(EPHEMERIS_CONFIG.defaultLocation);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      () => {
        // Fallback to default location on error
        resolve(EPHEMERIS_CONFIG.defaultLocation);
      },
      { timeout: 5000 }
    );
  });
}

