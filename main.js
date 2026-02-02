const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, 'data.json');

// ==========================================
// Data Management
// ==========================================

/**
 * Load data from JSON file
 * @returns {Object} Application data
 */
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return { activities: {} };
}

/**
 * Save data to JSON file
 * @param {Object} data - Data to save
 */
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

/**
 * Generate unique activity ID
 * @returns {string} Unique ID
 */
function generateId() {
  return 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// ==========================================
// Date Helper Functions
// ==========================================

/**
 * Get ISO date string (YYYY-MM-DD) for a timestamp
 * @param {number} timestamp - Unix timestamp
 * @returns {string} ISO date string
 */
function getISODate(timestamp = Date.now()) {
  const d = new Date(timestamp);
  return d.toISOString().split('T')[0];
}

/**
 * Get start of day timestamp
 * @param {Date} date - Date object
 * @returns {number} Timestamp
 */
function getDayStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get end of day timestamp
 * @param {Date} date - Date object
 * @returns {number} Timestamp
 */
function getDayEnd(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Get start of week (Monday)
 * @param {Date} date - Date object
 * @returns {Date} Start of week
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of week (Sunday)
 * @param {Date} date - Date object
 * @returns {Date} End of week
 */
function getWeekEnd(date = new Date()) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Get start of month
 * @param {Date} date - Date object
 * @returns {Date} Start of month
 */
function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get end of month
 * @param {Date} date - Date object
 * @returns {Date} End of month
 */
function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get start of year
 * @param {Date} date - Date object
 * @returns {Date} Start of year
 */
function getYearStart(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

/**
 * Get end of year
 * @param {Date} date - Date object
 * @returns {Date} End of year
 */
function getYearEnd(date = new Date()) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

// ==========================================
// Time Calculation Functions
// ==========================================

/**
 * Check if activity is currently running
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
 * Calculate time within a specific range
 * @param {Array} entries - Time entries array
 * @param {number} rangeStart - Range start timestamp
 * @param {number} rangeEnd - Range end timestamp
 * @returns {number} Total milliseconds
 */
function calculateTimeInRange(entries, rangeStart, rangeEnd) {
  if (!entries || entries.length === 0) return 0;
  
  return entries.reduce((total, entry) => {
    // Only count completed entries for progress
    if (entry.end === null) return total;
    
    const entryStart = entry.start;
    const entryEnd = entry.end;
    
    // Skip if completely outside range
    if (entryEnd < rangeStart || entryStart > rangeEnd) return total;
    
    // Calculate overlap
    const overlapStart = Math.max(entryStart, rangeStart);
    const overlapEnd = Math.min(entryEnd, rangeEnd);
    
    return total + (overlapEnd - overlapStart);
  }, 0);
}

/**
 * Count checked days in a range
 * @param {Object} checks - Checks object
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Object} Count info
 */
function countChecksInRange(checks, startDate, endDate) {
  if (!checks) return { checked: 0, total: 0 };
  
  let checked = 0;
  let total = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dateStr = getISODate(current.getTime());
    total++;
    if (checks[dateStr] === true) {
      checked++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return { checked, total };
}

// ==========================================
// Progress Data Functions
// ==========================================

/**
 * Get daily progress data
 * @param {Object} data - Application data
 * @param {Date} date - Target date
 * @returns {Object} Daily progress
 */
function getDailyProgress(data, date = new Date()) {
  const dayStart = getDayStart(date);
  const dayEnd = getDayEnd(date);
  const dateStr = getISODate(date.getTime());
  
  const progress = {
    period: 'day',
    date: dateStr,
    activities: {}
  };
  
  for (const [id, activity] of Object.entries(data.activities)) {
    if (activity.type === 'time') {
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'time',
        time: calculateTimeInRange(activity.entries, dayStart, dayEnd),
        running: isActivityRunning(activity)
      };
    } else {
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'check',
        checked: activity.checks?.[dateStr] === true
      };
    }
  }
  
  return progress;
}

/**
 * Get weekly progress data
 * @param {Object} data - Application data
 * @param {Date} date - Target date
 * @returns {Object} Weekly progress
 */
function getWeeklyProgress(data, date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = getWeekEnd(date);
  
  const days = [];
  const current = new Date(weekStart);
  while (current <= weekEnd) {
    days.push(getISODate(current.getTime()));
    current.setDate(current.getDate() + 1);
  }
  
  const progress = {
    period: 'week',
    startDate: getISODate(weekStart.getTime()),
    endDate: getISODate(weekEnd.getTime()),
    days,
    activities: {}
  };
  
  for (const [id, activity] of Object.entries(data.activities)) {
    if (activity.type === 'time') {
      const dailyTotals = {};
      let weekTotal = 0;
      
      days.forEach(dateStr => {
        const d = new Date(dateStr);
        const dayStart = getDayStart(d);
        const dayEnd = getDayEnd(d);
        const time = calculateTimeInRange(activity.entries, dayStart, dayEnd);
        dailyTotals[dateStr] = time;
        weekTotal += time;
      });
      
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'time',
        dailyTotals,
        weekTotal,
        running: isActivityRunning(activity)
      };
    } else {
      const dailyChecks = {};
      let checkedCount = 0;
      
      days.forEach(dateStr => {
        const checked = activity.checks?.[dateStr] === true;
        dailyChecks[dateStr] = checked;
        if (checked) checkedCount++;
      });
      
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'check',
        dailyChecks,
        checkedCount,
        totalDays: days.length
      };
    }
  }
  
  return progress;
}

/**
 * Get monthly progress data
 * @param {Object} data - Application data
 * @param {Date} date - Target date
 * @returns {Object} Monthly progress
 */
function getMonthlyProgress(data, date = new Date()) {
  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);
  
  const days = [];
  const current = new Date(monthStart);
  while (current <= monthEnd) {
    days.push(getISODate(current.getTime()));
    current.setDate(current.getDate() + 1);
  }
  
  const progress = {
    period: 'month',
    year: date.getFullYear(),
    month: date.getMonth(),
    startDate: getISODate(monthStart.getTime()),
    endDate: getISODate(monthEnd.getTime()),
    days,
    firstDayOfWeek: monthStart.getDay(),
    activities: {}
  };
  
  for (const [id, activity] of Object.entries(data.activities)) {
    if (activity.type === 'time') {
      const dailyTotals = {};
      let monthTotal = 0;
      
      days.forEach(dateStr => {
        const d = new Date(dateStr);
        const dayStart = getDayStart(d);
        const dayEnd = getDayEnd(d);
        const time = calculateTimeInRange(activity.entries, dayStart, dayEnd);
        dailyTotals[dateStr] = time;
        monthTotal += time;
      });
      
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'time',
        dailyTotals,
        monthTotal,
        running: isActivityRunning(activity)
      };
    } else {
      const dailyChecks = {};
      let checkedCount = 0;
      
      days.forEach(dateStr => {
        const checked = activity.checks?.[dateStr] === true;
        dailyChecks[dateStr] = checked;
        if (checked) checkedCount++;
      });
      
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'check',
        dailyChecks,
        checkedCount,
        totalDays: days.length
      };
    }
  }
  
  return progress;
}

/**
 * Get yearly progress data
 * @param {Object} data - Application data
 * @param {Date} date - Target date
 * @returns {Object} Yearly progress
 */
function getYearlyProgress(data, date = new Date()) {
  const year = date.getFullYear();
  const yearStart = getYearStart(date);
  const yearEnd = getYearEnd(date);
  
  const months = [];
  for (let m = 0; m < 12; m++) {
    months.push({
      month: m,
      name: new Date(year, m, 1).toLocaleString('en-US', { month: 'short' }),
      start: new Date(year, m, 1),
      end: new Date(year, m + 1, 0, 23, 59, 59, 999)
    });
  }
  
  const progress = {
    period: 'year',
    year,
    months: months.map(m => ({ month: m.month, name: m.name })),
    activities: {}
  };
  
  for (const [id, activity] of Object.entries(data.activities)) {
    if (activity.type === 'time') {
      const monthlyTotals = {};
      let yearTotal = 0;
      
      months.forEach(m => {
        const time = calculateTimeInRange(activity.entries, m.start.getTime(), m.end.getTime());
        monthlyTotals[m.month] = time;
        yearTotal += time;
      });
      
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'time',
        monthlyTotals,
        yearTotal,
        running: isActivityRunning(activity)
      };
    } else {
      const monthlyChecks = {};
      let yearCheckedCount = 0;
      let yearTotalDays = 0;
      
      months.forEach(m => {
        const { checked, total } = countChecksInRange(activity.checks, m.start, m.end);
        monthlyChecks[m.month] = { checked, total };
        yearCheckedCount += checked;
        yearTotalDays += total;
      });
      
      progress.activities[id] = {
        id,
        name: activity.name,
        type: 'check',
        monthlyChecks,
        yearCheckedCount,
        yearTotalDays
      };
    }
  }
  
  return progress;
}

// ==========================================
// IPC Handlers
// ==========================================

// Get all data
ipcMain.handle('get-data', async () => {
  return loadData();
});

// Create new activity
ipcMain.handle('create-activity', async (event, name, type) => {
  const data = loadData();
  const id = generateId();
  
  data.activities[id] = {
    id,
    name,
    type,
    entries: type === 'time' ? [] : undefined,
    checks: type === 'check' ? {} : undefined
  };
  
  saveData(data);
  return { success: true, id, data };
});

// Start time activity
ipcMain.handle('start-activity', async (event, activityId) => {
  const data = loadData();
  const activity = data.activities[activityId];
  
  if (!activity) {
    return { success: false, error: 'Activity not found' };
  }
  
  if (activity.type !== 'time') {
    return { success: false, error: 'Not a time-based activity' };
  }
  
  if (isActivityRunning(activity)) {
    return { success: false, error: 'Activity already running' };
  }
  
  activity.entries.push({
    start: Date.now(),
    end: null
  });
  
  saveData(data);
  return { success: true, data };
});

// Stop time activity
ipcMain.handle('stop-activity', async (event, activityId) => {
  const data = loadData();
  const activity = data.activities[activityId];
  
  if (!activity) {
    return { success: false, error: 'Activity not found' };
  }
  
  if (activity.type !== 'time') {
    return { success: false, error: 'Not a time-based activity' };
  }
  
  if (!isActivityRunning(activity)) {
    return { success: false, error: 'Activity not running' };
  }
  
  const entries = activity.entries;
  entries[entries.length - 1].end = Date.now();
  
  saveData(data);
  return { success: true, data };
});

// Toggle check activity
ipcMain.handle('toggle-check', async (event, activityId, dateStr = null) => {
  const data = loadData();
  const activity = data.activities[activityId];
  
  if (!activity) {
    return { success: false, error: 'Activity not found' };
  }
  
  if (activity.type !== 'check') {
    return { success: false, error: 'Not a check-based activity' };
  }
  
  const date = dateStr || getISODate();
  
  if (!activity.checks) {
    activity.checks = {};
  }
  
  activity.checks[date] = !activity.checks[date];
  
  saveData(data);
  return { success: true, data, checked: activity.checks[date] };
});

// Rename activity
ipcMain.handle('rename-activity', async (event, activityId, newName) => {
  const data = loadData();
  
  if (!data.activities[activityId]) {
    return { success: false, error: 'Activity not found' };
  }
  
  data.activities[activityId].name = newName;
  saveData(data);
  return { success: true, data };
});

// Delete activity
ipcMain.handle('delete-activity', async (event, activityId) => {
  const data = loadData();
  
  if (!data.activities[activityId]) {
    return { success: false, error: 'Activity not found' };
  }
  
  delete data.activities[activityId];
  saveData(data);
  return { success: true, data };
});

// Reset time activity
ipcMain.handle('reset-activity', async (event, activityId) => {
  const data = loadData();
  const activity = data.activities[activityId];
  
  if (!activity) {
    return { success: false, error: 'Activity not found' };
  }
  
  if (activity.type === 'time') {
    activity.entries = [];
  } else {
    activity.checks = {};
  }
  
  saveData(data);
  return { success: true, data };
});

// Get daily progress
ipcMain.handle('get-daily-progress', async (event, dateStr = null) => {
  const data = loadData();
  const date = dateStr ? new Date(dateStr) : new Date();
  return getDailyProgress(data, date);
});

// Get weekly progress
ipcMain.handle('get-weekly-progress', async (event, dateStr = null) => {
  const data = loadData();
  const date = dateStr ? new Date(dateStr) : new Date();
  return getWeeklyProgress(data, date);
});

// Get monthly progress
ipcMain.handle('get-monthly-progress', async (event, dateStr = null) => {
  const data = loadData();
  const date = dateStr ? new Date(dateStr) : new Date();
  return getMonthlyProgress(data, date);
});

// Get yearly progress
ipcMain.handle('get-yearly-progress', async (event, dateStr = null) => {
  const data = loadData();
  const date = dateStr ? new Date(dateStr) : new Date();
  return getYearlyProgress(data, date);
});

// ==========================================
// Window Management
// ==========================================

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  win.loadFile('index.html');
  
  // Uncomment to open DevTools in development
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Ensure data file exists
  if (!fs.existsSync(DATA_FILE)) {
    saveData({ activities: {} });
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
