// ==========================================
// Application State
// ==========================================

let appData = { activities: {} };
let goalsData = { goals: {}, evaluations: {} };
let liveTimers = {};
let currentPeriod = 'day';
let currentDate = new Date();
let editingGoalId = null;

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

// Goals
const goalsList = document.getElementById('goals-list');
const newGoalBtn = document.getElementById('new-goal-btn');
const goalFormContainer = document.getElementById('goal-form-container');
const goalForm = document.getElementById('goal-form');
const goalFormTitle = document.getElementById('goal-form-title');
const goalEditId = document.getElementById('goal-edit-id');
const goalNameInput = document.getElementById('goal-name');
const goalTypeSelect = document.getElementById('goal-type');
const goalActivitySelect = document.getElementById('goal-activity');
const cancelGoalBtn = document.getElementById('cancel-goal-btn');

// Goal Config Fields
const timeConfigFields = document.getElementById('time-config');
const countConfigFields = document.getElementById('count-config');
const streakConfigFields = document.getElementById('streak-config');

// History Edit Modal
const historyModal = document.getElementById('history-modal');
const historyModalTitle = document.getElementById('history-modal-title');
const historyModalBody = document.getElementById('history-modal-body');
const closeHistoryModalBtn = document.getElementById('close-history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');

// Entry Edit Modal
const entryEditModal = document.getElementById('entry-edit-modal');
const entryEditTitle = document.getElementById('entry-edit-title');
const entryEditForm = document.getElementById('entry-edit-form');
const editActivityId = document.getElementById('edit-activity-id');
const editEntryIndex = document.getElementById('edit-entry-index');
const editEntryDate = document.getElementById('edit-entry-date');
const editEntryStart = document.getElementById('edit-entry-start');
const editEntryEnd = document.getElementById('edit-entry-end');
const closeEntryEditModalBtn = document.getElementById('close-entry-edit-modal');
const cancelEntryEditBtn = document.getElementById('cancel-entry-edit');
const saveEntryEditBtn = document.getElementById('save-entry-edit');

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
  const createdAt = activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : null;

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
        ${createdAt ? `<div class="activity-created">Created ${createdAt}</div>` : ''}
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
        ${createdAt ? `<div class="activity-created">Created ${createdAt}</div>` : ''}
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
        <div class="daily-item editable" data-activity-id="${act.id}">
          <div class="daily-item-info">
            <span class="type-badge time">Time</span>
            <span class="daily-item-name">${escapeHtml(act.name)}</span>
            ${act.running ? '<span class="status-indicator running"></span>' : ''}
          </div>
          <span class="daily-item-value time">${formatTime(act.time)}</span>
          <button class="daily-item-edit-btn" data-action="open-history" data-id="${act.id}" title="Edit History">📝</button>
        </div>
      `;
    } else {
      html += `
        <div class="daily-item editable" data-activity-id="${act.id}">
          <div class="daily-item-info">
            <span class="type-badge check">Check</span>
            <span class="daily-item-name">${escapeHtml(act.name)}</span>
          </div>
          <span class="daily-item-value ${act.checked ? 'checked' : 'unchecked'}">${act.checked ? '✓ Done' : '○ Not done'}</span>
          <button class="daily-item-edit-btn" data-action="open-history" data-id="${act.id}" title="Edit History">📝</button>
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
// History Editing Functions
// ==========================================

let currentHistoryActivityId = null;
let isAddingNewEntry = false;

/**
 * Format date for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format time for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted time string
 */
function formatTimeOfDay(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Open history modal for an activity
 * @param {string} activityId - Activity ID
 */
async function openHistoryModal(activityId) {
  currentHistoryActivityId = activityId;
  const activity = appData.activities[activityId];
  
  if (!activity) return;
  
  historyModalTitle.textContent = `History: ${activity.name}`;
  
  if (activity.type === 'time') {
    renderTimeHistory(activity);
  } else {
    renderCheckHistory(activity);
  }
  
  historyModal.classList.add('active');
}

/**
 * Close history modal
 */
function closeHistoryModal() {
  historyModal.classList.remove('active');
  currentHistoryActivityId = null;
}

/**
 * Render time activity history
 * @param {Object} activity - Activity object
 */
function renderTimeHistory(activity) {
  const entries = activity.entries || [];
  
  if (entries.length === 0) {
    historyModalBody.innerHTML = `
      <div class="empty-state">
        <h3>No history yet</h3>
        <p>Start tracking to see your history here</p>
      </div>
      <button class="add-entry-btn" data-action="add-entry">
        ➕ Add Manual Entry
      </button>
    `;
    return;
  }
  
  // Group entries by date
  const entriesByDate = {};
  entries.forEach((entry, index) => {
    const dateStr = getISODate(new Date(entry.start));
    if (!entriesByDate[dateStr]) {
      entriesByDate[dateStr] = [];
    }
    entriesByDate[dateStr].push({ ...entry, index });
  });
  
  // Sort dates descending (most recent first)
  const sortedDates = Object.keys(entriesByDate).sort().reverse();
  
  let html = '<div class="history-list">';
  
  sortedDates.forEach(dateStr => {
    const dayEntries = entriesByDate[dateStr];
    const totalMs = dayEntries.reduce((sum, e) => sum + ((e.end || Date.now()) - e.start), 0);
    
    html += `<div class="history-date-group">`;
    html += `<div class="history-date-header" style="font-weight: 600; margin: 15px 0 10px; color: var(--text-secondary);">
      ${formatDate(new Date(dateStr))} — Total: ${formatTime(totalMs)}
    </div>`;
    
    dayEntries.forEach(entry => {
      const duration = (entry.end || Date.now()) - entry.start;
      const isRunning = entry.end === null;
      
      html += `
        <div class="history-entry${isRunning ? ' running' : ''}">
          <div class="history-entry-info">
            <div class="history-entry-time">
              <span>${formatTimeOfDay(entry.start)}</span>
              <span>→</span>
              <span>${isRunning ? 'Running...' : formatTimeOfDay(entry.end)}</span>
            </div>
          </div>
          <span class="history-entry-duration">${formatTime(duration)}</span>
          <div class="history-entry-actions">
            ${!isRunning ? `
              <button class="btn btn-small" data-action="edit-entry" data-index="${entry.index}" title="Edit">✏️</button>
              <button class="btn btn-danger btn-small" data-action="delete-entry" data-index="${entry.index}" title="Delete">🗑️</button>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  html += '</div>';
  html += `
    <button class="add-entry-btn" data-action="add-entry" style="margin-top: 15px;">
      ➕ Add Manual Entry
    </button>
  `;
  
  historyModalBody.innerHTML = html;
}

/**
 * Render check activity history
 * @param {Object} activity - Activity object
 */
function renderCheckHistory(activity) {
  const checks = activity.checks || {};
  const checkDates = Object.keys(checks).sort().reverse();
  
  // Get last 30 days
  const days = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(getISODate(date));
  }
  
  let html = '<div class="history-list">';
  
  days.forEach(dateStr => {
    const isChecked = checks[dateStr] === true;
    html += `
      <div class="check-history-toggle" data-action="toggle-check-history" data-date="${dateStr}">
        <span class="check-history-date">${formatDate(new Date(dateStr))}</span>
        <span class="check-history-status ${isChecked ? 'checked' : 'unchecked'}">
          ${isChecked ? '✓ Completed' : '○ Not done'}
        </span>
      </div>
    `;
  });
  
  html += '</div>';
  historyModalBody.innerHTML = html;
}

/**
 * Open entry edit modal
 * @param {number} entryIndex - Entry index (-1 for new entry)
 */
function openEntryEditModal(entryIndex) {
  const activity = appData.activities[currentHistoryActivityId];
  if (!activity) return;
  
  isAddingNewEntry = entryIndex === -1;
  entryEditTitle.textContent = isAddingNewEntry ? 'Add New Entry' : 'Edit Entry';
  
  editActivityId.value = currentHistoryActivityId;
  editEntryIndex.value = entryIndex;
  
  if (isAddingNewEntry) {
    // Default to today
    const today = new Date();
    editEntryDate.value = getISODate(today);
    editEntryStart.value = '09:00';
    editEntryEnd.value = '10:00';
  } else {
    const entry = activity.entries[entryIndex];
    const startDate = new Date(entry.start);
    const endDate = new Date(entry.end);
    
    editEntryDate.value = getISODate(startDate);
    editEntryStart.value = formatTimeOfDay(entry.start);
    editEntryEnd.value = formatTimeOfDay(entry.end);
  }
  
  entryEditModal.classList.add('active');
}

/**
 * Close entry edit modal
 */
function closeEntryEditModal() {
  entryEditModal.classList.remove('active');
  isAddingNewEntry = false;
}

/**
 * Save entry edit
 */
async function saveEntryEdit() {
  const activityId = editActivityId.value;
  const entryIndex = parseInt(editEntryIndex.value);
  const dateStr = editEntryDate.value;
  const startTime = editEntryStart.value;
  const endTime = editEntryEnd.value;
  
  // Parse date and times
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startDate = new Date(dateStr);
  startDate.setHours(startHours, startMinutes, 0, 0);
  
  const endDate = new Date(dateStr);
  endDate.setHours(endHours, endMinutes, 0, 0);
  
  // Handle overnight entries
  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  const newStart = startDate.getTime();
  const newEnd = endDate.getTime();
  
  try {
    let result;
    if (isAddingNewEntry) {
      result = await window.tracker.addTimeEntry(activityId, newStart, newEnd);
    } else {
      result = await window.tracker.editTimeEntry(activityId, entryIndex, newStart, newEnd);
    }
    
    if (result.success) {
      appData = result.data;
      closeEntryEditModal();
      openHistoryModal(activityId); // Refresh history view
      loadProgress(); // Refresh progress view
    } else {
      alert(result.error || 'Failed to save entry');
    }
  } catch (err) {
    console.error('Error saving entry:', err);
    alert('An error occurred while saving the entry');
  }
}

/**
 * Delete time entry
 * @param {number} entryIndex - Entry index
 */
async function deleteTimeEntry(entryIndex) {
  if (!confirm('Are you sure you want to delete this entry?')) return;
  
  try {
    const result = await window.tracker.deleteTimeEntry(currentHistoryActivityId, entryIndex);
    if (result.success) {
      appData = result.data;
      openHistoryModal(currentHistoryActivityId); // Refresh history view
      loadProgress(); // Refresh progress view
    }
  } catch (err) {
    console.error('Error deleting entry:', err);
  }
}

/**
 * Toggle check for a specific date in history
 * @param {string} dateStr - ISO date string
 */
async function toggleCheckHistory(dateStr) {
  try {
    const result = await window.tracker.toggleCheck(currentHistoryActivityId, dateStr);
    if (result.success) {
      appData = result.data;
      openHistoryModal(currentHistoryActivityId); // Refresh history view
      loadProgress(); // Refresh progress view
    }
  } catch (err) {
    console.error('Error toggling check:', err);
  }
}

// ==========================================
// Goals Functions
// ==========================================

/**
 * Load goals data
 */
async function loadGoals() {
  try {
    const result = await window.goals.evaluate();
    goalsData = result;
    renderGoals();
  } catch (err) {
    console.error('Error loading goals:', err);
  }
}

/**
 * Populate activity select dropdown for goals
 */
function populateActivitySelect() {
  goalActivitySelect.innerHTML = '<option value="">Select activity...</option>';
  
  Object.keys(appData.activities).forEach(activityId => {
    const activity = appData.activities[activityId];
    const option = document.createElement('option');
    option.value = activityId;
    option.textContent = `${activity.type === 'time' ? '⏱️' : '✅'} ${activity.name}`;
    option.dataset.activityType = activity.type;
    goalActivitySelect.appendChild(option);
  });
}

/**
 * Show/hide goal config fields based on type
 * @param {string} goalType - Goal type
 */
function showGoalConfigFields(goalType) {
  timeConfigFields.classList.remove('active');
  countConfigFields.classList.remove('active');
  streakConfigFields.classList.remove('active');
  
  switch (goalType) {
    case 'time':
      timeConfigFields.classList.add('active');
      break;
    case 'count':
      countConfigFields.classList.add('active');
      break;
    case 'streak':
      streakConfigFields.classList.add('active');
      break;
  }
}

/**
 * Filter activities based on goal type selection
 * @param {string} goalType - Selected goal type
 */
function filterActivitiesByGoalType(goalType) {
  const options = goalActivitySelect.querySelectorAll('option');
  options.forEach(option => {
    if (option.value === '') {
      option.style.display = '';
      return;
    }
    
    const activityType = option.dataset.activityType;
    
    // Time goals need time activities
    // Count and streak goals need check activities
    if (goalType === 'time') {
      option.style.display = activityType === 'time' ? '' : 'none';
    } else if (goalType === 'count' || goalType === 'streak') {
      option.style.display = activityType === 'check' ? '' : 'none';
    } else {
      option.style.display = '';
    }
  });
  
  // Reset selection
  goalActivitySelect.value = '';
}

/**
 * Open goal form for creating or editing
 * @param {string|null} goalId - Goal ID for editing, null for new
 */
function openGoalForm(goalId = null) {
  editingGoalId = goalId;
  populateActivitySelect();
  
  if (goalId && goalsData.goals[goalId]) {
    const goal = goalsData.goals[goalId];
    goalFormTitle.textContent = 'Edit Goal';
    goalEditId.value = goalId;
    goalNameInput.value = goal.name;
    goalTypeSelect.value = goal.type;
    
    showGoalConfigFields(goal.type);
    filterActivitiesByGoalType(goal.type);
    
    // Set activity
    goalActivitySelect.value = goal.config.activityId || '';
    
    // Set config values based on type
    if (goal.type === 'time') {
      document.getElementById('goal-time-minutes').value = goal.config.targetMinutes || '';
      document.getElementById('goal-time-period').value = goal.config.period || 'day';
    } else if (goal.type === 'count') {
      document.getElementById('goal-count-target').value = goal.config.targetCount || '';
      document.getElementById('goal-count-period').value = goal.config.period || 'day';
    } else if (goal.type === 'streak') {
      document.getElementById('goal-streak-days').value = goal.config.targetDays || '';
    }
  } else {
    goalFormTitle.textContent = 'Create New Goal';
    goalEditId.value = '';
    goalForm.reset();
    showGoalConfigFields('');
  }
  
  goalFormContainer.classList.add('active');
}

/**
 * Close goal form
 */
function closeGoalForm() {
  goalFormContainer.classList.remove('active');
  goalForm.reset();
  editingGoalId = null;
  showGoalConfigFields('');
}

/**
 * Save goal (create or update)
 */
async function saveGoal() {
  const name = goalNameInput.value.trim();
  const type = goalTypeSelect.value;
  const activityId = goalActivitySelect.value;
  
  if (!name || !type || !activityId) {
    alert('Please fill in all required fields.');
    return;
  }
  
  const config = { activityId };
  
  if (type === 'time') {
    const targetMinutes = parseInt(document.getElementById('goal-time-minutes').value);
    const period = document.getElementById('goal-time-period').value;
    if (!targetMinutes || targetMinutes < 1) {
      alert('Please enter a valid target minutes value.');
      return;
    }
    config.targetMinutes = targetMinutes;
    config.period = period;
  } else if (type === 'count') {
    const targetCount = parseInt(document.getElementById('goal-count-target').value);
    const period = document.getElementById('goal-count-period').value;
    if (!targetCount || targetCount < 1) {
      alert('Please enter a valid target count value.');
      return;
    }
    config.targetCount = targetCount;
    config.period = period;
  } else if (type === 'streak') {
    const targetDays = parseInt(document.getElementById('goal-streak-days').value);
    if (!targetDays || targetDays < 1) {
      alert('Please enter a valid target days value.');
      return;
    }
    config.targetDays = targetDays;
  }
  
  const goalData = { name, type, config };
  
  try {
    let result;
    if (editingGoalId) {
      result = await window.goals.update(editingGoalId, goalData);
    } else {
      result = await window.goals.create(goalData);
    }
    
    if (result.success) {
      closeGoalForm();
      await loadGoals();
    } else {
      alert(result.error || 'Failed to save goal.');
    }
  } catch (err) {
    console.error('Error saving goal:', err);
    alert('An error occurred while saving the goal.');
  }
}

/**
 * Delete goal
 * @param {string} goalId - Goal ID
 */
async function deleteGoal(goalId) {
  if (!confirm('Are you sure you want to delete this goal?')) return;
  
  try {
    const result = await window.goals.delete(goalId);
    if (result.success) {
      await loadGoals();
    }
  } catch (err) {
    console.error('Error deleting goal:', err);
  }
}

/**
 * Get goal progress percentage
 * @param {Object} evaluation - Goal evaluation result
 * @returns {number} Progress percentage (0-100)
 */
function getGoalProgress(evaluation) {
  if (!evaluation) return 0;
  const progress = (evaluation.current / evaluation.target) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Get goal progress class
 * @param {number} percentage - Progress percentage
 * @returns {string} CSS class
 */
function getGoalProgressClass(percentage) {
  if (percentage >= 100) return 'achieved';
  if (percentage >= 50) return 'in-progress';
  return 'low';
}

/**
 * Format goal current value for display
 * @param {Object} goal - Goal object
 * @param {Object} evaluation - Evaluation result
 * @returns {string} Formatted value
 */
function formatGoalCurrent(goal, evaluation) {
  if (!evaluation) return '0';
  
  if (goal.type === 'time') {
    return formatTime(evaluation.current * 60000); // Convert minutes to ms
  }
  return evaluation.current.toString();
}

/**
 * Format goal target value for display
 * @param {Object} goal - Goal object
 * @returns {string} Formatted value
 */
function formatGoalTarget(goal) {
  if (goal.type === 'time') {
    return formatTime(goal.config.targetMinutes * 60000);
  } else if (goal.type === 'count') {
    return `${goal.config.targetCount} completions`;
  } else if (goal.type === 'streak') {
    return `${goal.config.targetDays} days`;
  }
  return '';
}

/**
 * Get goal description text
 * @param {Object} goal - Goal object
 * @returns {string} Description text
 */
function getGoalDescription(goal) {
  const activity = appData.activities[goal.config.activityId];
  const activityName = activity ? activity.name : 'Unknown Activity';
  
  if (goal.type === 'time') {
    const period = goal.config.period;
    return `Track ${formatTime(goal.config.targetMinutes * 60000)} of "${activityName}" ${period === 'day' ? 'daily' : period === 'week' ? 'weekly' : 'monthly'}`;
  } else if (goal.type === 'count') {
    const period = goal.config.period;
    return `Complete "${activityName}" ${goal.config.targetCount} times ${period === 'day' ? 'daily' : period === 'week' ? 'weekly' : 'monthly'}`;
  } else if (goal.type === 'streak') {
    return `Maintain a ${goal.config.targetDays}-day streak for "${activityName}"`;
  }
  return '';
}

/**
 * Get period badge text
 * @param {Object} goal - Goal object
 * @returns {string} Period text
 */
function getPeriodBadge(goal) {
  if (goal.type === 'streak') return '';
  const period = goal.config.period;
  return period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly';
}

/**
 * Create goal card element
 * @param {string} goalId - Goal ID
 * @returns {HTMLElement} Goal card element
 */
function createGoalElement(goalId) {
  const goal = goalsData.goals[goalId];
  const evaluation = goalsData.evaluations[goalId];
  const progress = getGoalProgress(evaluation);
  const progressClass = getGoalProgressClass(progress);
  const isAchieved = progress >= 100;
  
  const card = document.createElement('div');
  card.className = `goal-card ${isAchieved ? 'achieved' : progress >= 50 ? 'in-progress' : 'not-started'}`;
  card.dataset.goalId = goalId;
  
  const periodBadge = getPeriodBadge(goal);
  
  card.innerHTML = `
    <div class="goal-card-header">
      <div class="goal-card-info">
        <div class="goal-card-name">
          <span class="goal-status-icon">${isAchieved ? '✅' : progress >= 50 ? '🔄' : '⭕'}</span>
          ${escapeHtml(goal.name)}
          <span class="goal-type-badge ${goal.type}">${goal.type === 'time' ? 'Time' : goal.type === 'count' ? 'Count' : 'Streak'}</span>
          ${periodBadge ? `<span class="goal-period-badge">${periodBadge}</span>` : ''}
        </div>
        <div class="goal-card-description">${getGoalDescription(goal)}</div>
      </div>
      <div class="goal-card-actions">
        <button class="btn btn-small" data-action="edit-goal" data-id="${goalId}" title="Edit">✏️</button>
        <button class="btn btn-danger btn-small" data-action="delete-goal" data-id="${goalId}" title="Delete">🗑️</button>
      </div>
    </div>
    <div class="goal-progress-container">
      <div class="goal-progress-bar">
        <div class="goal-progress-fill ${progressClass}" style="width: ${progress}%"></div>
      </div>
      <div class="goal-progress-text">
        <span class="current">${formatGoalCurrent(goal, evaluation)}</span>
        <span class="target">/ ${formatGoalTarget(goal)}</span>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Render all goals
 */
function renderGoals() {
  goalsList.innerHTML = '';
  
  const goalIds = Object.keys(goalsData.goals || {});
  
  if (goalIds.length === 0) {
    goalsList.innerHTML = `
      <div class="goals-empty-state">
        <h3>No goals yet</h3>
        <p>Create your first goal to start tracking your progress</p>
      </div>
    `;
    return;
  }
  
  // Sort goals: achieved last, then by type
  goalIds.sort((a, b) => {
    const evalA = goalsData.evaluations[a];
    const evalB = goalsData.evaluations[b];
    const progressA = getGoalProgress(evalA);
    const progressB = getGoalProgress(evalB);
    
    // Achieved goals at the end
    if (progressA >= 100 && progressB < 100) return 1;
    if (progressB >= 100 && progressA < 100) return -1;
    
    // Then sort by progress (highest first)
    return progressB - progressA;
  });
  
  goalIds.forEach(id => {
    const element = createGoalElement(id);
    goalsList.appendChild(element);
  });
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
    } else if (targetTab === 'goals') {
      loadGoals();
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
// Goals Event Listeners
// ==========================================

// New goal button
newGoalBtn.addEventListener('click', () => openGoalForm());

// Cancel goal button
cancelGoalBtn.addEventListener('click', closeGoalForm);

// Goal form submission
goalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  saveGoal();
});

// Goal type change - show/hide config fields and filter activities
goalTypeSelect.addEventListener('change', (e) => {
  const goalType = e.target.value;
  showGoalConfigFields(goalType);
  filterActivitiesByGoalType(goalType);
});

// Goals list actions (event delegation)
goalsList.addEventListener('click', (e) => {
  const target = e.target;
  const action = target.dataset.action;
  const goalId = target.dataset.id;
  
  if (!action || !goalId) return;
  
  switch (action) {
    case 'edit-goal':
      openGoalForm(goalId);
      break;
    case 'delete-goal':
      deleteGoal(goalId);
      break;
  }
});

// ==========================================
// History Edit Event Listeners
// ==========================================

// Progress content actions (event delegation for history edit buttons)
progressContent.addEventListener('click', (e) => {
  const target = e.target;
  const action = target.dataset.action;
  const activityId = target.dataset.id;
  
  if (action === 'open-history' && activityId) {
    openHistoryModal(activityId);
  }
});

// History modal close buttons
closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
closeHistoryBtn.addEventListener('click', closeHistoryModal);

// Close history modal on overlay click
historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) {
    closeHistoryModal();
  }
});

// History modal body actions (event delegation)
historyModalBody.addEventListener('click', (e) => {
  const target = e.target;
  const action = target.dataset.action;
  
  if (action === 'edit-entry') {
    const entryIndex = parseInt(target.dataset.index);
    openEntryEditModal(entryIndex);
  } else if (action === 'delete-entry') {
    const entryIndex = parseInt(target.dataset.index);
    deleteTimeEntry(entryIndex);
  } else if (action === 'add-entry') {
    openEntryEditModal(-1);
  } else if (action === 'toggle-check-history') {
    const dateStr = target.dataset.date;
    if (dateStr) {
      toggleCheckHistory(dateStr);
    }
  }
  
  // Also handle clicks on parent elements
  const toggleEl = target.closest('[data-action="toggle-check-history"]');
  if (toggleEl) {
    const dateStr = toggleEl.dataset.date;
    if (dateStr) {
      toggleCheckHistory(dateStr);
    }
  }
});

// Entry edit modal close buttons
closeEntryEditModalBtn.addEventListener('click', closeEntryEditModal);
cancelEntryEditBtn.addEventListener('click', closeEntryEditModal);

// Close entry edit modal on overlay click
entryEditModal.addEventListener('click', (e) => {
  if (e.target === entryEditModal) {
    closeEntryEditModal();
  }
});

// Save entry edit button
saveEntryEditBtn.addEventListener('click', saveEntryEdit);

// Entry edit form submission
entryEditForm.addEventListener('submit', (e) => {
  e.preventDefault();
  saveEntryEdit();
});

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', loadData);
