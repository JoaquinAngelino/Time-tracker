// ==========================================
// Application State
// ==========================================

let appData = { activities: {} };
let liveTimers = {};
let currentPeriod = 'day';
let currentDate = new Date();

// ==========================================
// DOM Elements
// ==========================================

// Activities
const activitiesList = document.getElementById('activities-list');
const activityNameInput = document.getElementById('activity-name-input');
const activityTypeSelect = document.getElementById('activity-type-select');
const createBtn = document.getElementById('create-btn');

// Navigation
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const periodButtons = document.querySelectorAll('.period-btn');

// Progress
const progressContent = document.getElementById('progress-content');
const currentPeriodLabel = document.getElementById('current-period-label');
const prevPeriodBtn = document.getElementById('prev-period');
const nextPeriodBtn = document.getElementById('next-period');

// ==========================================
// Utility Functions
// ==========================================

/**
 * Format milliseconds to "Xh Ym" format
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
  if (ms < 0 || !ms) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Format milliseconds to "HH:MM:SS" format for live display
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTimeLive(ms) {
  if (ms < 0 || !ms) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format time for compact display
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTimeCompact(ms) {
  if (ms < 0 || !ms) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? minutes + 'm' : ''}`;
  }
  return `${minutes}m`;
}

/**
 * Get ISO date string
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
function getISODate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate total time from entries
 * @param {Array} entries - Time entries
 * @returns {number} Total milliseconds
 */
function calculateTotalTime(entries) {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((total, entry) => {
    const end = entry.end || Date.now();
    return total + (end - entry.start);
  }, 0);
}

/**
 * Check if activity is running
 * @param {Object} activity - Activity object
 * @returns {boolean} True if running
 */
function isActivityRunning(activity) {
  if (!activity || activity.type !== 'time' || !activity.entries || activity.entries.length === 0) {
    return false;
  }
  const lastEntry = activity.entries[activity.entries.length - 1];
  return lastEntry.end === null;
}

/**
 * Escape HTML
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get day name abbreviation
 * @param {Date} date - Date object
 * @returns {string} Day abbreviation
 */
function getDayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get month name
 * @param {number} month - Month index (0-11)
 * @returns {string} Month name
 */
function getMonthName(month) {
  return new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'long' });
}

// ==========================================
// Activity Rendering
// ==========================================

/**
 * Create activity card element
 * @param {string} activityId - Activity ID
 * @returns {HTMLElement} Activity card element
 */
function createActivityElement(activityId) {
  const activity = appData.activities[activityId];
  const name = activity.name || 'Unnamed';
  const type = activity.type;
  const running = isActivityRunning(activity);
  const todayStr = getISODate();

  const card = document.createElement('div');
  card.className = `activity-card ${type}-type${running ? ' running' : ''}`;
  card.dataset.activityId = activityId;

  if (type === 'time') {
    const totalMs = calculateTotalTime(activity.entries);
    card.innerHTML = `
      <div class="activity-info">
        <div class="activity-header">
          <span class="status-indicator${running ? ' running' : ''}"></span>
          <div class="activity-name">
            <input type="text" value="${escapeHtml(name)}" data-action="rename" data-id="${activityId}">
          </div>
          <span class="type-badge time">Time</span>
        </div>
        <div class="activity-time${running ? ' running' : ''}" data-time-display="${activityId}">
          ${running ? formatTimeLive(totalMs) : formatTime(totalMs)}
        </div>
      </div>
      <div class="activity-actions">
        ${running 
          ? `<button class="btn btn-warning btn-small" data-action="stop" data-id="${activityId}">⏹ Stop</button>`
          : `<button class="btn btn-success btn-small" data-action="start" data-id="${activityId}">▶ Start</button>`
        }
        <button class="btn btn-danger btn-small" data-action="reset" data-id="${activityId}" title="Reset">🔄</button>
        <button class="btn btn-danger btn-small" data-action="delete" data-id="${activityId}" title="Delete">🗑️</button>
      </div>
    `;
  } else {
    const isCheckedToday = activity.checks?.[todayStr] === true;
    card.innerHTML = `
      <div class="activity-info">
        <div class="activity-header">
          <div class="activity-name">
            <input type="text" value="${escapeHtml(name)}" data-action="rename" data-id="${activityId}">
          </div>
          <span class="type-badge check">Check</span>
        </div>
      </div>
      <div class="check-toggle">
        <button class="check-btn${isCheckedToday ? ' checked' : ''}" data-action="toggle-check" data-id="${activityId}">
          ${isCheckedToday ? '✓' : ''}
        </button>
        <span class="check-status${isCheckedToday ? ' done' : ''}">${isCheckedToday ? 'Done today' : 'Not done'}</span>
      </div>
      <div class="activity-actions">
        <button class="btn btn-danger btn-small" data-action="delete" data-id="${activityId}" title="Delete">🗑️</button>
      </div>
    `;
  }

  return card;
}

/**
 * Render all activities
 */
function renderActivities() {
  activitiesList.innerHTML = '';
  
  const activityIds = Object.keys(appData.activities);
  
  if (activityIds.length === 0) {
    activitiesList.innerHTML = `
      <div class="empty-state">
        <h3>No activities yet</h3>
        <p>Create your first activity to start tracking</p>
      </div>
    `;
    return;
  }

  // Sort: time activities first, then check activities
  activityIds.sort((a, b) => {
    const typeA = appData.activities[a].type;
    const typeB = appData.activities[b].type;
    if (typeA === typeB) return 0;
    return typeA === 'time' ? -1 : 1;
  });

  activityIds.forEach(id => {
    const element = createActivityElement(id);
    activitiesList.appendChild(element);
  });

  startLiveTimers();
}

// ==========================================
// Live Timers
// ==========================================

/**
 * Start live timers for running activities
 */
function startLiveTimers() {
  Object.values(liveTimers).forEach(timer => clearInterval(timer));
  liveTimers = {};

  Object.keys(appData.activities).forEach(activityId => {
    const activity = appData.activities[activityId];
    if (isActivityRunning(activity)) {
      liveTimers[activityId] = setInterval(() => {
        const timeDisplay = document.querySelector(`[data-time-display="${activityId}"]`);
        if (timeDisplay) {
          const totalMs = calculateTotalTime(activity.entries);
          timeDisplay.textContent = formatTimeLive(totalMs);
        }
      }, 1000);
    }
  });
}

// ==========================================
// Progress Rendering
// ==========================================

/**
 * Get period label for navigation
 * @param {string} period - Period type
 * @param {Date} date - Current date
 * @returns {string} Label text
 */
function getPeriodLabel(period, date) {
  const today = new Date();
  
  switch (period) {
    case 'day':
      if (getISODate(date) === getISODate(today)) return 'Today';
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    case 'week':
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    case 'year':
      return date.getFullYear().toString();
    default:
      return '';
  }
}

/**
 * Navigate to previous/next period
 * @param {number} direction - -1 for previous, 1 for next
 */
function navigatePeriod(direction) {
  switch (currentPeriod) {
    case 'day':
      currentDate.setDate(currentDate.getDate() + direction);
      break;
    case 'week':
      currentDate.setDate(currentDate.getDate() + (direction * 7));
      break;
    case 'month':
      currentDate.setMonth(currentDate.getMonth() + direction);
      break;
    case 'year':
      currentDate.setFullYear(currentDate.getFullYear() + direction);
      break;
  }
  loadProgress();
}

/**
 * Load and render progress data
 */
async function loadProgress() {
  currentPeriodLabel.textContent = getPeriodLabel(currentPeriod, currentDate);
  
  try {
    const dateStr = getISODate(currentDate);
    const progressData = await window.tracker.getProgress(currentPeriod, dateStr);
    renderProgress(progressData);
  } catch (err) {
    console.error('Error loading progress:', err);
  }
}

/**
 * Render progress based on period
 * @param {Object} data - Progress data
 */
function renderProgress(data) {
  switch (data.period) {
    case 'day':
      renderDailyProgress(data);
      break;
    case 'week':
      renderWeeklyProgress(data);
      break;
    case 'month':
      renderMonthlyProgress(data);
      break;
    case 'year':
      renderYearlyProgress(data);
      break;
  }
}

/**
 * Render daily progress view
 * @param {Object} data - Daily progress data
 */
function renderDailyProgress(data) {
  const activities = Object.values(data.activities);
  
  if (activities.length === 0) {
    progressContent.innerHTML = '<div class="empty-state"><h3>No activities</h3><p>Create activities to see your progress</p></div>';
    return;
  }

  // Calculate totals
  let totalTime = 0;
  let totalChecked = 0;
  let totalCheckActivities = 0;

  activities.forEach(act => {
    if (act.type === 'time') {
      totalTime += act.time;
    } else {
      totalCheckActivities++;
      if (act.checked) totalChecked++;
    }
  });

  let html = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card-label">Total Time</div>
        <div class="summary-card-value time">${formatTime(totalTime)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Tasks Completed</div>
        <div class="summary-card-value check">${totalChecked}/${totalCheckActivities}</div>
      </div>
    </div>
    <div class="daily-list">
  `;

  activities.forEach(act => {
    if (act.type === 'time') {
      html += `
        <div class="daily-item">
          <div class="daily-item-info">
            <span class="type-badge time">Time</span>
            <span class="daily-item-name">${escapeHtml(act.name)}</span>
            ${act.running ? '<span class="status-indicator running"></span>' : ''}
          </div>
          <span class="daily-item-value time">${formatTime(act.time)}</span>
        </div>
      `;
    } else {
      html += `
        <div class="daily-item">
          <div class="daily-item-info">
            <span class="type-badge check">Check</span>
            <span class="daily-item-name">${escapeHtml(act.name)}</span>
          </div>
          <span class="daily-item-value ${act.checked ? 'checked' : 'unchecked'}">${act.checked ? '✓ Done' : '○ Not done'}</span>
        </div>
      `;
    }
  });

  html += '</div>';
  progressContent.innerHTML = html;
}

/**
 * Render weekly progress view
 * @param {Object} data - Weekly progress data
 */
function renderWeeklyProgress(data) {
  const activities = Object.values(data.activities);
  
  if (activities.length === 0) {
    progressContent.innerHTML = '<div class="empty-state"><h3>No activities</h3><p>Create activities to see your progress</p></div>';
    return;
  }

  // Calculate totals
  let totalTime = 0;
  let totalChecked = 0;
  let totalPossibleChecks = 0;

  activities.forEach(act => {
    if (act.type === 'time') {
      totalTime += act.weekTotal;
    } else {
      totalChecked += act.checkedCount;
      totalPossibleChecks += act.totalDays;
    }
  });

  let html = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card-label">Week Total Time</div>
        <div class="summary-card-value time">${formatTime(totalTime)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Tasks Completion</div>
        <div class="summary-card-value check">${totalChecked}/${totalPossibleChecks}</div>
      </div>
    </div>
    <div class="weekly-grid">
  `;

  activities.forEach(act => {
    html += `<div class="weekly-activity">`;
    html += `
      <div class="weekly-activity-header">
        <span class="weekly-activity-name">
          <span class="type-badge ${act.type}">${act.type === 'time' ? 'Time' : 'Check'}</span>
          ${escapeHtml(act.name)}
        </span>
        ${act.type === 'time' 
          ? `<span class="weekly-total">${formatTime(act.weekTotal)}</span>`
          : `<span class="weekly-total" style="color: var(--check-color)">${act.checkedCount}/${act.totalDays}</span>`
        }
      </div>
      <div class="weekly-days">
    `;

    data.days.forEach(dateStr => {
      const d = new Date(dateStr);
      const dayName = getDayName(d);
      
      if (act.type === 'time') {
        const time = act.dailyTotals[dateStr] || 0;
        html += `
          <div class="weekly-day">
            <div class="weekly-day-label">${dayName}</div>
            <div class="weekly-day-value time">${formatTimeCompact(time)}</div>
          </div>
        `;
      } else {
        const checked = act.dailyChecks[dateStr];
        html += `
          <div class="weekly-day">
            <div class="weekly-day-label">${dayName}</div>
            <div class="weekly-day-value ${checked ? 'checked' : 'unchecked'}">${checked ? '✓' : '○'}</div>
          </div>
        `;
      }
    });

    html += '</div></div>';
  });

  html += '</div>';
  progressContent.innerHTML = html;
}

/**
 * Render monthly progress view
 * @param {Object} data - Monthly progress data
 */
function renderMonthlyProgress(data) {
  const activities = Object.values(data.activities);
  
  if (activities.length === 0) {
    progressContent.innerHTML = '<div class="empty-state"><h3>No activities</h3><p>Create activities to see your progress</p></div>';
    return;
  }

  // Calculate totals
  let totalTime = 0;
  let totalChecked = 0;
  let totalPossibleChecks = 0;

  activities.forEach(act => {
    if (act.type === 'time') {
      totalTime += act.monthTotal;
    } else {
      totalChecked += act.checkedCount;
      totalPossibleChecks += act.totalDays;
    }
  });

  const todayStr = getISODate();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card-label">Month Total Time</div>
        <div class="summary-card-value time">${formatTime(totalTime)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Tasks Completion</div>
        <div class="summary-card-value check">${totalChecked}/${totalPossibleChecks}</div>
      </div>
    </div>

    <div class="activity-selector">
      <label>Select activity to view calendar:</label>
      <select id="calendar-activity-select">
        <option value="all">All Activities (Summary)</option>
        ${activities.map(act => `<option value="${act.id}">${escapeHtml(act.name)} (${act.type})</option>`).join('')}
      </select>
    </div>

    <div class="monthly-calendar" id="monthly-calendar">
      <div class="calendar-header">
        ${dayNames.map(d => `<div class="calendar-header-day">${d}</div>`).join('')}
      </div>
      <div class="calendar-grid">
  `;

  // Add empty cells for days before the first of month
  const firstDayOfWeek = data.firstDayOfWeek;
  for (let i = 0; i < firstDayOfWeek; i++) {
    html += '<div class="calendar-cell empty"></div>';
  }

  // Add calendar days
  data.days.forEach(dateStr => {
    const d = new Date(dateStr);
    const dayNum = d.getDate();
    const isToday = dateStr === todayStr;

    let cellContent = '';
    
    // Show summary for all activities
    let dayTotalTime = 0;
    let dayChecks = 0;
    let dayTotalChecks = 0;

    activities.forEach(act => {
      if (act.type === 'time') {
        dayTotalTime += act.dailyTotals[dateStr] || 0;
      } else {
        dayTotalChecks++;
        if (act.dailyChecks[dateStr]) dayChecks++;
      }
    });

    if (dayTotalTime > 0) {
      cellContent += `<div class="calendar-cell-value time">${formatTimeCompact(dayTotalTime)}</div>`;
    }
    if (dayTotalChecks > 0) {
      cellContent += `<div class="calendar-cell-dot ${dayChecks > 0 ? 'checked' : 'unchecked'}"></div>`;
    }

    html += `
      <div class="calendar-cell${isToday ? ' today' : ''}">
        <div class="calendar-cell-day">${dayNum}</div>
        ${cellContent}
      </div>
    `;
  });

  html += '</div></div>';
  progressContent.innerHTML = html;

  // Add event listener for activity selector
  document.getElementById('calendar-activity-select').addEventListener('change', (e) => {
    renderMonthlyCalendarForActivity(data, e.target.value);
  });
}

/**
 * Render monthly calendar for a specific activity
 * @param {Object} data - Monthly progress data
 * @param {string} activityId - Activity ID or 'all'
 */
function renderMonthlyCalendarForActivity(data, activityId) {
  const calendar = document.getElementById('monthly-calendar');
  const activities = Object.values(data.activities);
  const todayStr = getISODate();

  let html = `
    <div class="calendar-header">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-header-day">${d}</div>`).join('')}
    </div>
    <div class="calendar-grid">
  `;

  // Add empty cells
  for (let i = 0; i < data.firstDayOfWeek; i++) {
    html += '<div class="calendar-cell empty"></div>';
  }

  data.days.forEach(dateStr => {
    const d = new Date(dateStr);
    const dayNum = d.getDate();
    const isToday = dateStr === todayStr;

    let cellContent = '';

    if (activityId === 'all') {
      let dayTotalTime = 0;
      let dayChecks = 0;
      let dayTotalChecks = 0;

      activities.forEach(act => {
        if (act.type === 'time') {
          dayTotalTime += act.dailyTotals[dateStr] || 0;
        } else {
          dayTotalChecks++;
          if (act.dailyChecks[dateStr]) dayChecks++;
        }
      });

      if (dayTotalTime > 0) {
        cellContent += `<div class="calendar-cell-value time">${formatTimeCompact(dayTotalTime)}</div>`;
      }
      if (dayTotalChecks > 0) {
        cellContent += `<div class="calendar-cell-dot ${dayChecks > 0 ? 'checked' : 'unchecked'}"></div>`;
      }
    } else {
      const act = data.activities[activityId];
      if (act) {
        if (act.type === 'time') {
          const time = act.dailyTotals[dateStr] || 0;
          if (time > 0) {
            cellContent = `<div class="calendar-cell-value time">${formatTimeCompact(time)}</div>`;
          }
        } else {
          const checked = act.dailyChecks[dateStr];
          cellContent = `<div class="calendar-cell-dot ${checked ? 'checked' : 'unchecked'}"></div>`;
        }
      }
    }

    html += `
      <div class="calendar-cell${isToday ? ' today' : ''}">
        <div class="calendar-cell-day">${dayNum}</div>
        ${cellContent}
      </div>
    `;
  });

  html += '</div>';
  calendar.innerHTML = html;
}

/**
 * Render yearly progress view
 * @param {Object} data - Yearly progress data
 */
function renderYearlyProgress(data) {
  const activities = Object.values(data.activities);
  
  if (activities.length === 0) {
    progressContent.innerHTML = '<div class="empty-state"><h3>No activities</h3><p>Create activities to see your progress</p></div>';
    return;
  }

  // Calculate yearly totals
  let yearTotalTime = 0;
  let yearTotalChecks = 0;
  let yearPossibleChecks = 0;

  activities.forEach(act => {
    if (act.type === 'time') {
      yearTotalTime += act.yearTotal;
    } else {
      yearTotalChecks += act.yearCheckedCount;
      yearPossibleChecks += act.yearTotalDays;
    }
  });

  let html = `
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card-label">Year Total Time</div>
        <div class="summary-card-value time">${formatTime(yearTotalTime)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Year Tasks Completion</div>
        <div class="summary-card-value check">${yearTotalChecks}/${yearPossibleChecks}</div>
      </div>
    </div>
    <div class="yearly-grid">
  `;

  data.months.forEach(monthInfo => {
    const monthNum = monthInfo.month;
    const monthName = getMonthName(monthNum);

    html += `
      <div class="yearly-month">
        <div class="yearly-month-header">${monthName}</div>
        <div class="yearly-month-stats">
    `;

    activities.forEach(act => {
      if (act.type === 'time') {
        const monthTime = act.monthlyTotals[monthNum] || 0;
        html += `
          <div class="yearly-stat">
            <span class="yearly-stat-name">${escapeHtml(act.name)}</span>
            <span class="yearly-stat-value time">${formatTime(monthTime)}</span>
          </div>
        `;
      } else {
        const monthData = act.monthlyChecks[monthNum] || { checked: 0, total: 0 };
        html += `
          <div class="yearly-stat">
            <span class="yearly-stat-name">${escapeHtml(act.name)}</span>
            <span class="yearly-stat-value check">${monthData.checked}/${monthData.total}</span>
          </div>
        `;
      }
    });

    html += '</div></div>';
  });

  html += '</div>';
  progressContent.innerHTML = html;
}

// ==========================================
// Data Loading
// ==========================================

/**
 * Load initial data
 */
async function loadData() {
  try {
    appData = await window.tracker.getData();
    renderActivities();
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// ==========================================
// Activity Actions
// ==========================================

/**
 * Create new activity
 */
async function createActivity() {
  const name = activityNameInput.value.trim();
  const type = activityTypeSelect.value;
  
  if (!name) {
    activityNameInput.focus();
    return;
  }

  try {
    const result = await window.tracker.createActivity(name, type);
    if (result.success) {
      appData = result.data;
      activityNameInput.value = '';
      renderActivities();
    }
  } catch (err) {
    console.error('Error creating activity:', err);
  }
}

/**
 * Start time activity
 * @param {string} activityId - Activity ID
 */
async function startActivity(activityId) {
  try {
    const result = await window.tracker.start(activityId);
    if (result.success) {
      appData = result.data;
      renderActivities();
    } else {
      console.warn(result.error);
    }
  } catch (err) {
    console.error('Error starting activity:', err);
  }
}

/**
 * Stop time activity
 * @param {string} activityId - Activity ID
 */
async function stopActivity(activityId) {
  try {
    const result = await window.tracker.stop(activityId);
    if (result.success) {
      appData = result.data;
      if (liveTimers[activityId]) {
        clearInterval(liveTimers[activityId]);
        delete liveTimers[activityId];
      }
      renderActivities();
    } else {
      console.warn(result.error);
    }
  } catch (err) {
    console.error('Error stopping activity:', err);
  }
}

/**
 * Toggle check activity
 * @param {string} activityId - Activity ID
 */
async function toggleCheck(activityId) {
  try {
    const result = await window.tracker.toggleCheck(activityId);
    if (result.success) {
      appData = result.data;
      renderActivities();
    }
  } catch (err) {
    console.error('Error toggling check:', err);
  }
}

/**
 * Rename activity
 * @param {string} activityId - Activity ID
 * @param {string} newName - New name
 */
async function renameActivity(activityId, newName) {
  if (!newName.trim()) return;
  
  try {
    const result = await window.tracker.rename(activityId, newName.trim());
    if (result.success) {
      appData = result.data;
    }
  } catch (err) {
    console.error('Error renaming activity:', err);
  }
}

/**
 * Delete activity
 * @param {string} activityId - Activity ID
 */
async function deleteActivity(activityId) {
  if (!confirm('Are you sure you want to delete this activity?')) return;
  
  try {
    const result = await window.tracker.delete(activityId);
    if (result.success) {
      appData = result.data;
      if (liveTimers[activityId]) {
        clearInterval(liveTimers[activityId]);
        delete liveTimers[activityId];
      }
      renderActivities();
    }
  } catch (err) {
    console.error('Error deleting activity:', err);
  }
}

/**
 * Reset activity
 * @param {string} activityId - Activity ID
 */
async function resetActivity(activityId) {
  if (!confirm('Are you sure you want to reset this activity?')) return;
  
  try {
    const result = await window.tracker.reset(activityId);
    if (result.success) {
      appData = result.data;
      if (liveTimers[activityId]) {
        clearInterval(liveTimers[activityId]);
        delete liveTimers[activityId];
      }
      renderActivities();
    }
  } catch (err) {
    console.error('Error resetting activity:', err);
  }
}

// ==========================================
// Event Listeners
// ==========================================

// Create button
createBtn.addEventListener('click', createActivity);

// Enter key in input
activityNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') createActivity();
});

// Activity actions (event delegation)
activitiesList.addEventListener('click', (e) => {
  const target = e.target;
  const action = target.dataset.action;
  const activityId = target.dataset.id;

  if (!action || !activityId) return;

  switch (action) {
    case 'start':
      startActivity(activityId);
      break;
    case 'stop':
      stopActivity(activityId);
      break;
    case 'toggle-check':
      toggleCheck(activityId);
      break;
    case 'delete':
      deleteActivity(activityId);
      break;
    case 'reset':
      resetActivity(activityId);
      break;
  }
});

// Rename on blur
activitiesList.addEventListener('blur', (e) => {
  if (e.target.dataset.action === 'rename') {
    renameActivity(e.target.dataset.id, e.target.value);
  }
}, true);

// Rename on Enter
activitiesList.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && e.target.dataset.action === 'rename') {
    e.target.blur();
  }
});

// Navigation tabs
navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${targetTab}-tab`) {
        content.classList.add('active');
      }
    });
    
    if (targetTab === 'progress') {
      currentDate = new Date();
      loadProgress();
    }
  });
});

// Period buttons
periodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const period = btn.dataset.period;
    currentPeriod = period;
    currentDate = new Date();
    
    periodButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    loadProgress();
  });
});

// Period navigation
prevPeriodBtn.addEventListener('click', () => navigatePeriod(-1));
nextPeriodBtn.addEventListener('click', () => navigatePeriod(1));

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', loadData);
