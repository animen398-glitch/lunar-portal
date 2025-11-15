import { getEphemerisData, getUserLocation, estimateLunarDay } from './services/ephemeris.js';
import { getLunarDayContent, getAllLunarDays } from './services/lunarDays.js';

const dom = {
  body: document.body,
  dateInput: document.getElementById('date-input'),
  languageButtons: Array.from(document.querySelectorAll('.language-switch button')),
  heroWeekday: document.getElementById('hero-weekday'),
  heroMonth: document.getElementById('hero-month'),
  heroDayNumber: document.getElementById('hero-day-number'),
  heroLunarDay: document.getElementById('hero-lunar-day'),
  heroMoonSign: document.getElementById('hero-moon-sign'),
  heroNakshatra: document.getElementById('hero-nakshatra'),
  heroSunrise: document.getElementById('hero-sunrise'),
  heroSunset: document.getElementById('hero-sunset'),
  heroMoonrise: document.getElementById('hero-moonrise'),
  heroMoonset: document.getElementById('hero-moonset'),
  quickSummary: document.getElementById('quick-summary'),
  atAGlance: document.getElementById('at-a-glance'),
  statsGrid: document.getElementById('stats-grid'),
  notesNav: document.getElementById('notes-nav'),
  notesContent: document.getElementById('notes-content'),
  notesSubtitle: document.getElementById('notes-subtitle'),
  calendarWeekdays: document.getElementById('calendar-weekdays'),
  calendarGrid: document.getElementById('calendar-grid'),
  calendarMonthLabel: document.getElementById('calendar-month-label'),
  calendarMeta: document.getElementById('calendar-meta'),
  statusMessage: document.getElementById('status-message'),
  prevDayBtn: document.getElementById('prev-day'),
  nextDayBtn: document.getElementById('next-day'),
  prevMonthBtn: document.getElementById('prev-month'),
  nextMonthBtn: document.getElementById('next-month'),
  calendarTodayBtn: document.getElementById('calendar-today')
};

const state = {
  date: new Date(),
  calendarMonth: null,
  lang: 'en',
  location: null,
  ephemeris: null,
  i18n: {},
  isLoading: false,
  activeNotesDay: 1,
  notesPreview: false
};

init();

async function init() {
  state.calendarMonth = startOfMonth(state.date);
  if (dom.dateInput) {
    dom.dateInput.value = formatDateInput(state.date);
  }
  attachEventListeners();
  await changeLanguage(state.lang);
  try {
    state.location = await getUserLocation();
  } catch (error) {
    console.warn('Geolocation unavailable, using default location.', error);
  }
  await refreshData();
  renderAll();
}

function attachEventListeners() {
  dom.languageButtons.forEach(button => {
    button.addEventListener('click', () => {
      const lang = button.dataset.lang;
      if (lang && lang !== state.lang) {
        changeLanguage(lang);
      }
    });
  });

  if (dom.dateInput) {
    dom.dateInput.addEventListener('change', (event) => {
      if (!event.target.value) return;
      const nextDate = new Date(`${event.target.value}T12:00:00`);
      setDate(nextDate);
    });
  }

  dom.prevDayBtn?.addEventListener('click', () => setDate(addDays(state.date, -1)));
  dom.nextDayBtn?.addEventListener('click', () => setDate(addDays(state.date, 1)));
  dom.prevMonthBtn?.addEventListener('click', () => shiftCalendarMonth(-1));
  dom.nextMonthBtn?.addEventListener('click', () => shiftCalendarMonth(1));
  dom.calendarTodayBtn?.addEventListener('click', () => setDate(new Date()));
}

async function changeLanguage(lang) {
  try {
    const response = await fetch(`./locales/${lang}.json?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Locale load error ${response.status}`);
    }
    state.i18n = await response.json();
    state.lang = lang;
    document.documentElement.lang = lang;
    dom.dateInput?.setAttribute('lang', lang);
    applyStaticTranslations();
    highlightActiveLanguage();
    renderAll();
  } catch (error) {
    console.error(error);
    updateStatus(getI18nValue('error') || 'Error loading data.', 'error');
  }
}

function highlightActiveLanguage() {
  dom.languageButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.lang === state.lang);
  });
}

async function refreshData() {
  setLoading(true);
  try {
    const data = await getEphemerisData(state.date, state.location || undefined);
    state.ephemeris = data;
    if (data?.lunarDay) {
      state.activeNotesDay = data.lunarDay;
      state.notesPreview = false;
    }
    updateStatus('');
  } catch (error) {
    console.error('Ephemeris error', error);
    updateStatus(getI18nValue('error') || 'Error loading data.', 'error');
  } finally {
    setLoading(false);
    renderAll();
  }
}

function setDate(nextDate) {
  state.date = new Date(nextDate);
  state.calendarMonth = startOfMonth(state.date);
  if (dom.dateInput) {
    dom.dateInput.value = formatDateInput(state.date);
  }
  refreshData();
}

function shiftCalendarMonth(offset) {
  state.calendarMonth = startOfMonth(addMonths(state.calendarMonth || state.date, offset));
  renderCalendar();
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  dom.body.classList.toggle('loading', isLoading);
  if (dom.dateInput) {
    dom.dateInput.disabled = isLoading;
  }
}

function renderAll() {
  if (!Object.keys(state.i18n).length) return;
  renderHero();
  renderStats();
  renderQuickPanels();
  renderCalendar();
  renderNotesNav();
  renderNotesContent();
}

function renderHero() {
  const date = state.date;
  const ephemeris = state.ephemeris;
  const weekdayFormatter = new Intl.DateTimeFormat(state.lang, { weekday: 'long' });
  const monthFormatter = new Intl.DateTimeFormat(state.lang, { month: 'long', year: 'numeric' });

  dom.heroWeekday.textContent = capitalize(weekdayFormatter.format(date));
  dom.heroMonth.textContent = capitalize(monthFormatter.format(date));
  dom.heroDayNumber.textContent = date.getDate();
  dom.heroLunarDay.textContent = ephemeris?.lunarDay ?? '—';
  dom.heroMoonSign.textContent = ephemeris?.lunarSign || '—';
  dom.heroNakshatra.textContent = ephemeris?.nakshatra || '—';
  dom.heroSunrise.textContent = ephemeris?.sunrise || '--:--';
  dom.heroSunset.textContent = ephemeris?.sunset || '--:--';
  dom.heroMoonrise.textContent = ephemeris?.moonrise || '--:--';
  dom.heroMoonset.textContent = ephemeris?.moonset || '--:--';
}

function renderStats() {
  const labels = state.i18n.stats || {};
  const ephemeris = state.ephemeris || {};
  const weekdayFormatter = new Intl.DateTimeFormat(state.lang, { weekday: 'long' });
  const weekday = capitalize(weekdayFormatter.format(state.date));

  const statsList = [
    { key: 'moonrise', value: ephemeris.moonrise || '--:--' },
    { key: 'moonset', value: ephemeris.moonset || '--:--' },
    { key: 'sunrise', value: ephemeris.sunrise || '--:--' },
    { key: 'sunset', value: ephemeris.sunset || '--:--' },
    { key: 'newMoon', value: ephemeris.newMoon || '—' },
    { key: 'fullMoon', value: ephemeris.fullMoon || '—' },
    { key: 'lunarSign', value: ephemeris.lunarSign || '—' },
    { key: 'nakshatra', value: ephemeris.nakshatra || '—' },
    { key: 'weekday', value: weekday },
    { key: 'rahuKala', value: ephemeris.rahuKala || '—' },
    { key: 'gulikaKala', value: ephemeris.gulikaKala || '—' }
  ];

  dom.statsGrid.innerHTML = statsList.map(item => {
    const label = labels[item.key] || item.key;
    return `
      <div class="stat">
        <h3>${label}</h3>
        <p>${item.value}</p>
      </div>
    `;
  }).join('');
}

function renderQuickPanels() {
  const content = getLunarDayContent(state.activeNotesDay, state.lang);
  dom.quickSummary.textContent = content.summary;
  dom.atAGlance.innerHTML = content.bulletPoints.map(point => `<li>${point}</li>`).join('');
}

function renderCalendar() {
  const monthRef = state.calendarMonth || startOfMonth(state.date);
  renderCalendarWeekdays();

  const monthFormatter = new Intl.DateTimeFormat(state.lang, { month: 'long', year: 'numeric' });
  dom.calendarMonthLabel.textContent = capitalize(monthFormatter.format(monthRef));

  const weekNumber = getISOWeekNumber(state.date);
  const dayOfYear = getDayOfYear(state.date);
  const calendarLabels = state.i18n.calendar || {};
  dom.calendarMeta.textContent = `${calendarLabels.week || 'Week'} ${weekNumber} · ${calendarLabels.dayOfYear || 'Day'} ${dayOfYear}`;

  const firstDay = new Date(monthRef.getFullYear(), monthRef.getMonth(), 1);
  const daysInMonth = new Date(monthRef.getFullYear(), monthRef.getMonth() + 1, 0).getDate();
  const leadingEmpty = (firstDay.getDay() + 6) % 7; // Monday first
  const totalCells = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7;
  const today = new Date();

  dom.calendarGrid.innerHTML = '';

  for (let cell = 0; cell < totalCells; cell++) {
    const dayNumber = cell - leadingEmpty + 1;
    const cellDate = new Date(monthRef.getFullYear(), monthRef.getMonth(), dayNumber);
    const button = document.createElement('button');
    const lunarDay = estimateLunarDay(cellDate, state.location);
    button.innerHTML = `
      <span class="date">${cellDate.getDate()}</span>
      <span class="lunar">${calendarLabels.lunarDay || 'LD'} ${lunarDay}</span>
    `;
    button.classList.toggle('muted', cellDate.getMonth() !== monthRef.getMonth());
    if (cellDate.toDateString() === state.date.toDateString()) {
      button.classList.add('selected');
    }
    if (cellDate.toDateString() === today.toDateString()) {
      button.classList.add('today');
    }
    button.addEventListener('click', () => setDate(cellDate));
    dom.calendarGrid.appendChild(button);
  }
}

function renderCalendarWeekdays() {
  const weekdays = getWeekdayNames(state.lang);
  dom.calendarWeekdays.innerHTML = weekdays.map(day => `<span>${day}</span>`).join('');
}

function renderNotesNav() {
  const allDays = getAllLunarDays(state.lang);
  dom.notesNav.innerHTML = '';

  allDays.forEach(day => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = day.day;
    if (day.day === state.activeNotesDay) {
      button.classList.add('active');
    }
    button.addEventListener('click', () => {
      state.activeNotesDay = day.day;
      state.notesPreview = !(state.ephemeris && state.ephemeris.lunarDay === day.day);
      renderQuickPanels();
      renderNotesContent();
      renderNotesNav();
    });
    dom.notesNav.appendChild(button);
  });
}

function renderNotesContent() {
  const content = getLunarDayContent(state.activeNotesDay, state.lang);
  const labels = state.i18n.notesSections || {};
  const calendarLabels = state.i18n.calendar || {};
  const baseSubtitle = state.i18n.notes?.subtitle || '';
  const previewLabel = state.i18n.notes?.preview;
  const dayLabel = `${calendarLabels.lunarDay || 'Lunar day'} ${state.activeNotesDay}`;

  dom.notesSubtitle.textContent = state.notesPreview && previewLabel
    ? `${dayLabel} · ${previewLabel}`
    : `${dayLabel} · ${baseSubtitle}`;

  dom.notesContent.innerHTML = '';
  const overviewSection = createNoteSection(labels.overview, content.sections?.overview || content.summary, content.notes);
  if (overviewSection) dom.notesContent.appendChild(overviewSection);

  ['health', 'business', 'relationships', 'sleep', 'practice'].forEach(key => {
    const section = createNoteSection(labels[key], content.sections?.[key]);
    if (section) dom.notesContent.appendChild(section);
  });

  const highlights = [
    { label: labels.symbol, value: content.sections?.symbol },
    { label: labels.stone, value: content.sections?.stone },
    { label: labels.color, value: content.sections?.color },
    { label: labels.zodiac, value: content.sections?.zodiac }
  ].filter(item => item.label && item.value);

  if (highlights.length) {
    const highlightWrap = document.createElement('div');
    highlightWrap.className = 'note-highlights';
    highlights.forEach(item => {
      const card = document.createElement('div');
      card.className = 'highlight-card';
      const label = document.createElement('span');
      label.textContent = item.label;
      const value = document.createElement('strong');
      value.textContent = item.value;
      card.append(label, value);
      highlightWrap.appendChild(card);
    });
    dom.notesContent.appendChild(highlightWrap);
  }

  const astrologers = content.sections?.astrologers || {};
  const astrologerEntries = Object.entries(astrologers).filter(([, value]) => value);
  if (astrologerEntries.length) {
    const heading = document.createElement('h3');
    heading.textContent = labels.astrologers || 'Astrologers';
    const grid = document.createElement('div');
    grid.className = 'astrologer-grid';

    astrologerEntries.forEach(([name, value]) => {
      const article = document.createElement('article');
      const title = document.createElement('h4');
      title.textContent = capitalizeName(name);
      const text = document.createElement('p');
      text.textContent = value;
      article.append(title, text);
      grid.appendChild(article);
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'note-section';
    wrapper.append(heading, grid);
    dom.notesContent.appendChild(wrapper);
  }
}

function createNoteSection(label, text, bulletNotes = []) {
  if (!label || (!text && !bulletNotes?.length)) {
    return null;
  }
  const section = document.createElement('section');
  section.className = 'note-section';
  const title = document.createElement('h3');
  title.textContent = label;
  section.appendChild(title);

  if (text) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    section.appendChild(paragraph);
  }

  if (bulletNotes && bulletNotes.length) {
    const list = document.createElement('ul');
    bulletNotes.forEach(note => {
      const li = document.createElement('li');
      li.textContent = note;
      list.appendChild(li);
    });
    section.appendChild(list);
  }

  return section;
}

function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n-key]').forEach(node => {
    const key = node.getAttribute('data-i18n-key');
    const value = getI18nValue(key);
    if (value) {
      node.textContent = value;
    }
  });
}

function getI18nValue(path) {
  return path.split('.').reduce((acc, part) => acc?.[part], state.i18n);
}

function updateStatus(message, variant = 'info') {
  if (!dom.statusMessage) return;
  if (!message) {
    dom.statusMessage.hidden = true;
    dom.statusMessage.textContent = '';
    return;
  }
  dom.statusMessage.hidden = false;
  dom.statusMessage.textContent = message;
}

function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function capitalizeName(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDateInput(date) {
  return date.toISOString().split('T')[0];
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getWeekdayNames(lang) {
  const base = new Date(Date.UTC(2021, 5, 7)); // Monday
  const formatter = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() + idx);
    return formatter.format(date).toUpperCase();
  });
}

function getISOWeekNumber(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

