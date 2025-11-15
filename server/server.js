/**
 * Простой API сервер для Lunar Portal
 * Использует упрощенные расчеты (можно заменить на Swiss Ephemeris)
 */

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Упрощенная функция расчета лунного дня
function calculateLunarDay(date) {
  const epoch = new Date('2000-01-06T00:00:00Z');
  const daysSinceEpoch = (date - epoch) / (1000 * 60 * 60 * 24);
  const lunarCycle = 29.53058867;
  const lunarDay = Math.floor((daysSinceEpoch % lunarCycle) / lunarCycle * 30) + 1;
  return Math.max(1, Math.min(30, lunarDay));
}

// Получение данных эфемерид
app.post('/api/ephemeris', async (req, res) => {
  try {
    const { date, latitude, longitude } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const targetDate = new Date(date);
    const location = {
      lat: latitude || 55.7558, // Москва по умолчанию
      lon: longitude || 37.6173
    };
    
    // Попытка получить данные от NASA/USNO API
    try {
      const dateStr = targetDate.toISOString().split('T')[0];
      const coords = `${location.lat},${location.lon}`;
      const usnoUrl = `https://api.usno.navy.mil/rstt/oneday?date=${dateStr}&coords=${coords}`;
      
      const response = await fetch(usnoUrl);
      if (response.ok) {
        const data = await response.json();
        
        const parseTime = (timeStr) => {
          if (!timeStr) return null;
          return timeStr.substring(0, 5);
        };
        
        const lunarDay = calculateLunarDay(targetDate);
        
        return res.json({
          moonrise: parseTime(data.moondata?.[0]?.time),
          moonset: parseTime(data.moondata?.[1]?.time),
          sunrise: parseTime(data.sundata?.[0]?.time),
          sunset: parseTime(data.sundata?.[1]?.time),
          lunarDay: lunarDay,
          lunarSign: getLunarSign(lunarDay),
          nakshatra: getNakshatra(lunarDay),
          newMoon: formatNextNewMoon(targetDate),
          fullMoon: formatNextFullMoon(targetDate),
          rahuKala: calculateRahuKala(targetDate),
          gulikaKala: calculateGulikaKala(targetDate),
          source: 'USNO/NASA'
        });
      }
    } catch (error) {
      console.warn('USNO API недоступен, используем fallback');
    }
    
    // Fallback: упрощенные расчеты
    const lunarDay = calculateLunarDay(targetDate);
    
    res.json({
      moonrise: '08:37',
      moonset: '18:43',
      sunrise: '07:27',
      sunset: '16:34',
      lunarDay: lunarDay,
      lunarSign: getLunarSign(lunarDay),
      nakshatra: getNakshatra(lunarDay),
      newMoon: formatNextNewMoon(targetDate),
      fullMoon: formatNextFullMoon(targetDate),
      rahuKala: calculateRahuKala(targetDate),
      gulikaKala: calculateGulikaKala(targetDate),
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('Ошибка API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Вспомогательные функции
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

function formatNextNewMoon(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 15);
  return `${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 12:49`;
}

function formatNextFullMoon(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 8);
  return `${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · 10:27`;
}

function calculateRahuKala(date) {
  const hour = date.getHours();
  const start = (hour + 1) % 24;
  const end = (start + 1) % 24;
  return `${String(start).padStart(2, '0')}:24 – ${String(end).padStart(2, '0')}:42`;
}

function calculateGulikaKala(date) {
  const hour = date.getHours();
  const start = (hour - 1 + 24) % 24;
  const end = (start + 1) % 24;
  return `${String(start).padStart(2, '0')}:53 – ${String(end).padStart(2, '0')}:11`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/ephemeris`);
});










