/**
 * Main Application Entry Point
 * Handles UI updates, language switching, and data fetching
 */

// Dynamic imports with error handling
let getEphemerisData, getUserLocation, getLunarDayContent, getAllLunarDays;

async function loadServices() {
  try {
    const ephemerisModule = await import('./services/ephemeris.js');
    getEphemerisData = ephemerisModule.getEphemerisData;
    getUserLocation = ephemerisModule.getUserLocation;
  } catch (error) {
    console.error('❌ Не удалось загрузить ephemeris.js:', error);
    // Fallback functions
    getEphemerisData = async () => {
      throw new Error('ephemeris.js не загружен. Загрузите файлы на GitHub.');
    };
    getUserLocation = async () => ({ lat: 55.7558, lon: 37.6173 });
  }
  
  try {
    const lunarDaysModule = await import('./services/lunarDays.js');
    getLunarDayContent = lunarDaysModule.getLunarDayContent;
    getAllLunarDays = lunarDaysModule.getAllLunarDays;
  } catch (error) {
    console.error('❌ Не удалось загрузить lunarDays.js:', error);
    // Fallback functions
    getLunarDayContent = () => ({
      day: 1,
      title: 'Day 1',
      summary: 'Данные не загружены. Загрузите файлы services/lunarDays.js на GitHub.',
      bulletPoints: ['Файл lunarDays.js не найден'],
      notes: ['Пожалуйста, загрузите все файлы из папки services на GitHub']
    });
    getAllLunarDays = () => [{
      day: 1,
      title: 'Day 1',
      summary: 'Данные не загружены',
      bulletPoints: [],
      notes: []
    }];
  }
}

// Application state
const state = {
  currentDate: new Date(),
  currentLang: localStorage.getItem('preferredLang') || 'en',
  location: null,
  isLoading: false,
  currentLunarDay: 1
};

// Translations embedded directly (works without server)
const translationsData = {
  en: {
    brand: {
      title: "Lunar Day Portal",
      subtitle: "Daily lunar insights in a clean dashboard"
    },
    controls: {
      dateLabel: "Choose date",
      timezone: "All times in your local timezone."
    },
    panels: {
      outlook: "Quick Outlook",
      glance: "At a Glance"
    },
    notes: {
      title: "Lunar Day Guidance",
      subtitle: "Automatically adapts to the chosen lunar day."
    },
    footer: {
      disclaimer: "Data shown for demo purposes. Connect to your live ephemeris or NASA feeds for production."
    },
    stats: {
      moonrise: "Moonrise",
      moonset: "Moonset",
      newMoon: "New Moon",
      fullMoon: "Full Moon",
      lunarSign: "Lunar Sign",
      nakshatra: "Nakshatra",
      sunrise: "Sunrise",
      sunset: "Sunset",
      weekday: "Day of Week",
      rahuKala: "Rahu Kala",
      gulikaKala: "Gulika Kala"
    },
    loading: "Loading...",
    error: "Error loading data. Please try again."
  },
  ru: {
    brand: {
      title: "Портал Лунных Дней",
      subtitle: "Ежедневные лунные инсайты в удобной панели"
    },
    controls: {
      dateLabel: "Выберите дату",
      timezone: "Все времена в вашем часовом поясе."
    },
    panels: {
      outlook: "Краткий обзор",
      glance: "Основное"
    },
    notes: {
      title: "Руководство по Лунным Дням",
      subtitle: "Автоматически адаптируется к выбранному лунному дню."
    },
    footer: {
      disclaimer: "Данные показаны для демонстрации. Подключите ваши источники эфемерид или NASA для продакшена."
    },
    stats: {
      moonrise: "Восход Луны",
      moonset: "Заход Луны",
      newMoon: "Новолуние",
      fullMoon: "Полнолуние",
      lunarSign: "Лунный Знак",
      nakshatra: "Накшатра",
      sunrise: "Восход Солнца",
      sunset: "Заход Солнца",
      weekday: "День Недели",
      rahuKala: "Раху Кала",
      gulikaKala: "Гулика Кала"
    },
    loading: "Загрузка...",
    error: "Ошибка загрузки данных. Пожалуйста, попробуйте снова."
  }
};

// Translation cache
let translations = {};

/**
 * Load translation files (now uses embedded data)
 */
function loadTranslations(lang) {
  translations = translationsData[lang] || translationsData.en;
  setDocumentLang(lang);
  return translations;
}

/**
 * Translate text using i18n keys
 */
function t(key) {
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    value = value?.[k];
    if (!value) return key;
  }
  return value;
}

/**
 * Update all i18n elements on the page
 */
function updateTranslations() {
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.getAttribute('data-i18n-key');
    const text = t(key);
    if (text && text !== key) {
      if (el.tagName === 'INPUT' && el.type === 'date') {
        // Don't translate input placeholders for date inputs
        return;
      }
      el.textContent = text;
    }
  });
}

/**
 * Set document language and direction
 */
function setDocumentLang(lang) {
  const html = document.documentElement;
  html.lang = lang === 'ru' ? 'ru' : 'en';
  if (lang === 'ar' || lang === 'he') {
    html.dir = 'rtl';
  } else {
    html.dir = 'ltr';
  }
}

/**
 * Initialize language switcher
 */
function initLanguageSwitcher() {
  const buttons = document.querySelectorAll('.language-switch button');
  
  if (buttons.length === 0) {
    console.warn('⚠️ Кнопки переключения языка не найдены');
    return;
  }
  
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const lang = btn.getAttribute('data-lang');
      console.log('🔄 Переключение языка на:', lang);
      
      if (state.currentLang === lang) {
        console.log('Язык уже установлен:', lang);
        return;
      }
      
      try {
        state.currentLang = lang;
        localStorage.setItem('preferredLang', lang);
        
        // Update button states
        buttons.forEach(b => {
          b.classList.remove('active');
          if (b === btn) {
            b.classList.add('active');
          }
        });
        
        // Update date input language
        const dateInput = document.getElementById('date-input');
        if (dateInput) {
          dateInput.lang = lang === 'ru' ? 'ru' : 'en';
          // Force date format update
          const currentValue = dateInput.value;
          dateInput.value = '';
          setTimeout(() => {
            dateInput.value = currentValue;
          }, 10);
        }
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Reload translations and update UI
        loadTranslations(lang);
        updateTranslations();
        
        // Refresh data if services are loaded
        if (getEphemerisData && getLunarDayContent) {
          refreshData();
        } else {
          console.warn('⚠️ Сервисы не загружены, обновление данных пропущено');
        }
        
        console.log('✅ Язык переключен на:', lang);
      } catch (error) {
        console.error('❌ Ошибка при переключении языка:', error);
      }
    });
  });
  
  // Set initial active button
  buttons.forEach(btn => {
    if (btn.getAttribute('data-lang') === state.currentLang) {
      btn.classList.add('active');
    }
  });
  
  console.log('✅ Переключатель языка инициализирован');
}

/**
 * Format date for display
 */
function formatDate(date, lang) {
  return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Render statistics grid
 */
function renderStats(data, lang) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  
  const statKeys = [
    { key: 'moonrise', value: data.moonrise },
    { key: 'moonset', value: data.moonset },
    { key: 'newMoon', value: data.newMoon },
    { key: 'fullMoon', value: data.fullMoon },
    { key: 'lunarSign', value: data.lunarSign },
    { key: 'nakshatra', value: data.nakshatra },
    { key: 'sunrise', value: data.sunrise },
    { key: 'sunset', value: data.sunset },
    { key: 'weekday', value: formatDate(state.currentDate, lang).split(',')[0] },
    { key: 'rahuKala', value: data.rahuKala },
    { key: 'gulikaKala', value: data.gulikaKala }
  ];
  
  statKeys.forEach(({ key, value }) => {
    const stat = document.createElement('article');
    stat.className = 'stat';
    stat.innerHTML = `
      <h3>${t(`stats.${key}`)}</h3>
      <p>${value || '--:--'}</p>
    `;
    grid.appendChild(stat);
  });
}

/**
 * Update overview section
 */
function updateOverview(data, lang) {
  document.getElementById('gregorian-date').textContent = formatDate(state.currentDate, lang);
  document.getElementById('lunar-day-label').textContent = 
    `${lang === 'ru' ? 'Лунный день' : 'Lunar Day'} ${data.lunarDay} · ${lang === 'ru' ? 'Луна в' : 'Moon in'} ${data.lunarSign}`;
  
  const lunarDayContent = getLunarDayContent(data.lunarDay, lang);
  document.getElementById('quick-summary').textContent = lunarDayContent.summary;
  
  // Update "At a Glance" list
  const glanceList = document.getElementById('at-a-glance');
  glanceList.innerHTML = '';
  lunarDayContent.bulletPoints.forEach(point => {
    const li = document.createElement('li');
    li.textContent = point;
    glanceList.appendChild(li);
  });
}

/**
 * Build lunar day navigation
 */
function buildLunarDayNav(lang) {
  const nav = document.getElementById('notes-nav');
  nav.innerHTML = '';
  
  const days = getAllLunarDays(lang);
  days.forEach(dayData => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${lang === 'ru' ? 'День' : 'Day'} ${dayData.day}`;
    btn.dataset.day = dayData.day;
    btn.addEventListener('click', () => {
      setActiveLunarDay(dayData.day, lang);
      if (state.currentLunarDay !== dayData.day) {
        state.currentLunarDay = dayData.day;
      }
    });
    nav.appendChild(btn);
  });
}

/**
 * Set active lunar day and display content
 */
function setActiveLunarDay(dayNumber, lang) {
  state.currentLunarDay = dayNumber;
  const content = getLunarDayContent(dayNumber, lang);
  const container = document.getElementById('notes-content');
  
  container.innerHTML = `
    <h3>${content.title}</h3>
    <p>${content.summary}</p>
    ${content.notes.map(paragraph => `<p>${paragraph}</p>`).join('')}
  `;
  
  // Update active button
  document.querySelectorAll('#notes-nav button').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.day) === dayNumber);
  });
}

/**
 * Refresh all data from APIs
 */
async function refreshData() {
  if (state.isLoading) return;
  
  state.isLoading = true;
  document.body.classList.add('loading');
  
  try {
    console.log('🔄 Загрузка данных...');
    
    // Get location if not set
    if (!state.location) {
      console.log('📍 Получение местоположения...');
      state.location = await getUserLocation();
      console.log('📍 Местоположение:', state.location);
    }
    
    // Fetch ephemeris data
    console.log('🌙 Запрос данных эфемерид...');
    const ephemerisData = await getEphemerisData(state.currentDate, state.location);
    console.log('✅ Данные получены:', ephemerisData);

    state.currentLunarDay = ephemerisData.lunarDay;
    
    // Update UI
    renderStats(ephemerisData, state.currentLang);
    updateOverview(ephemerisData, state.currentLang);
    buildLunarDayNav(state.currentLang);
    setActiveLunarDay(ephemerisData.lunarDay, state.currentLang);
    
    console.log('✅ Интерфейс обновлен');
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных:', error);
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.textContent = t('error') + ': ' + error.message;
    const primaryCard = document.querySelector('.primary-card');
    if (primaryCard) {
      primaryCard.prepend(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
    }
  } finally {
    state.isLoading = false;
    document.body.classList.remove('loading');
  }
}

/**
 * Initialize date picker
 */
function initDatePicker() {
  const dateInput = document.getElementById('date-input');
  const todayISO = new Date().toISOString().split('T')[0];
  dateInput.value = todayISO;
  
  // Set language for date input to match page language
  dateInput.lang = state.currentLang === 'ru' ? 'ru' : 'en';
  
  dateInput.addEventListener('change', (event) => {
    const selectedDate = new Date(event.target.value);
    state.currentDate = selectedDate;
    refreshData();
  });
  
  // Update date input language when language changes
  const updateDateInputLang = () => {
    dateInput.lang = state.currentLang === 'ru' ? 'ru' : 'en';
  };
  
  // Store function to call on language change
  window.updateDateInputLang = updateDateInputLang;
}

/**
 * Main initialization
 */
async function init() {
  console.log('🚀 Инициализация приложения...');
  
  // Load services first
  await loadServices();
  
  // Load translations (synchronous now)
  loadTranslations(state.currentLang);
  updateTranslations();
  
  // Initialize components
  initLanguageSwitcher();
  initDatePicker();
  
  // Build navigation if services loaded
  if (getAllLunarDays) {
    buildLunarDayNav(state.currentLang);
  } else {
    console.warn('⚠️ Не удалось построить навигацию лунных дней');
  }
  
  // Load initial data if services are available
  if (getEphemerisData && getLunarDayContent) {
    await refreshData();
  } else {
    console.error('❌ Не удалось загрузить данные. Проверьте, что файлы services/ загружены на GitHub.');
    
    // Show error message to user
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.innerHTML = `
      <strong>⚠️ Файлы не загружены</strong><br>
      Загрузите папку <code>services</code> с файлами <code>ephemeris.js</code> и <code>lunarDays.js</code> на GitHub.
    `;
    const primaryCard = document.querySelector('.primary-card');
    if (primaryCard) {
      primaryCard.prepend(errorMsg);
    }
  }
  
  console.log('✅ Инициализация завершена');
}

// Start the application
init().catch(error => {
  console.error('❌ Критическая ошибка инициализации:', error);
});

