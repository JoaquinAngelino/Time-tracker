/**
 * Goal Evaluation Engine
 * Evaluates time, count, and streak goals based on activity data
 */

// ==========================================
// Date Helper Functions
// ==========================================

/**
 * Get ISO date string (YYYY-MM-DD)
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} ISO date string
 */
function getISODate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
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

/**
 * Get period range based on period type
 * @param {string} period - Period type: "day", "week", "month", "year"
 * @param {Date} date - Reference date
 * @returns {Object} { start: Date, end: Date }
 */
function getPeriodRange(period, date = new Date()) {
  switch (period) {
    case 'day':
      return {
        start: new Date(getDayStart(date)),
        end: new Date(getDayEnd(date))
      };
    case 'week':
      return {
        start: getWeekStart(date),
        end: getWeekEnd(date)
      };
    case 'month':
      return {
        start: getMonthStart(date),
        end: getMonthEnd(date)
      };
    case 'year':
      return {
        start: getYearStart(date),
        end: getYearEnd(date)
      };
    default:
      return {
        start: new Date(getDayStart(date)),
        end: new Date(getDayEnd(date))
      };
  }
}

// ==========================================
// Time Calculation Functions
// ==========================================

/**
 * Calculate time within a specific range for given activities
 * @param {Object} activities - Activities object
 * @param {Array} activityIds - Activity IDs to include (empty = all)
 * @param {number} rangeStart - Range start timestamp
 * @param {number} rangeEnd - Range end timestamp
 * @returns {number} Total milliseconds
 */
function calculateTimeInRange(activities, activityIds, rangeStart, rangeEnd) {
  let totalMs = 0;
  
  const idsToCheck = activityIds && activityIds.length > 0 
    ? activityIds 
    : Object.keys(activities);
  
  for (const id of idsToCheck) {
    const activity = activities[id];
    if (!activity || activity.type !== 'time' || !activity.entries) continue;
    
    for (const entry of activity.entries) {
      // Only count completed entries
      if (entry.end === null) continue;
      
      const entryStart = entry.start;
      const entryEnd = entry.end;
      
      // Skip if completely outside range
      if (entryEnd < rangeStart || entryStart > rangeEnd) continue;
      
      // Calculate overlap
      const overlapStart = Math.max(entryStart, rangeStart);
      const overlapEnd = Math.min(entryEnd, rangeEnd);
      
      totalMs += (overlapEnd - overlapStart);
    }
  }
  
  return totalMs;
}

/**
 * Count check completions in a range for given activities
 * @param {Object} activities - Activities object
 * @param {Array} activityIds - Activity IDs to include (empty = all check activities)
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {number} Total check count
 */
function countChecksInRange(activities, activityIds, startDate, endDate) {
  let count = 0;
  
  const idsToCheck = activityIds && activityIds.length > 0 
    ? activityIds 
    : Object.keys(activities).filter(id => activities[id]?.type === 'check');
  
  for (const id of idsToCheck) {
    const activity = activities[id];
    if (!activity || activity.type !== 'check' || !activity.checks) continue;
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = getISODate(current);
      if (activity.checks[dateStr] === true) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
  }
  
  return count;
}

// ==========================================
// Streak Calculation Functions
// ==========================================

/**
 * Check if a day has activity (time or check based)
 * @param {Object} activities - Activities object
 * @param {Array} activityIds - Activity IDs to check
 * @param {string} dateStr - ISO date string
 * @param {string} streakType - "time" or "check"
 * @returns {boolean} True if day has activity
 */
function dayHasActivity(activities, activityIds, dateStr, streakType) {
  const date = new Date(dateStr);
  const dayStart = getDayStart(date);
  const dayEnd = getDayEnd(date);
  
  const idsToCheck = activityIds && activityIds.length > 0 
    ? activityIds 
    : Object.keys(activities);
  
  if (streakType === 'time') {
    // Check if any time was tracked that day
    for (const id of idsToCheck) {
      const activity = activities[id];
      if (!activity || activity.type !== 'time' || !activity.entries) continue;
      
      for (const entry of activity.entries) {
        if (entry.end === null) continue;
        
        // Check if entry overlaps with this day
        if (entry.end >= dayStart && entry.start <= dayEnd) {
          return true;
        }
      }
    }
  } else {
    // Check if any check was completed that day
    for (const id of idsToCheck) {
      const activity = activities[id];
      if (!activity || activity.type !== 'check' || !activity.checks) continue;
      
      if (activity.checks[dateStr] === true) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate current streak length
 * @param {Object} activities - Activities object
 * @param {Array} activityIds - Activity IDs to include
 * @param {string} streakType - "time" or "check"
 * @returns {number} Current streak length in days
 */
function calculateStreak(activities, activityIds, streakType) {
  let streak = 0;
  const today = new Date();
  const current = new Date(today);
  
  // Start from today and walk backward
  while (true) {
    const dateStr = getISODate(current);
    
    if (dayHasActivity(activities, activityIds, dateStr, streakType)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      // If today has no activity, check if yesterday started a streak
      if (streak === 0) {
        current.setDate(current.getDate() - 1);
        const yesterdayStr = getISODate(current);
        if (dayHasActivity(activities, activityIds, yesterdayStr, streakType)) {
          streak++;
          current.setDate(current.getDate() - 1);
          continue;
        }
      }
      break;
    }
    
    // Safety limit - don't go back more than 365 days
    const daysDiff = Math.floor((today - current) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) break;
  }
  
  return streak;
}

// ==========================================
// Goal Evaluation Functions
// ==========================================

/**
 * Evaluate a time goal
 * @param {Object} goal - Goal object
 * @param {Object} activities - Activities object
 * @returns {Object} Evaluation result
 */
function evaluateTimeGoal(goal, activities) {
  const config = goal.config;
  const { start, end } = getPeriodRange(config.period);
  
  // Use single activityId, not array
  const activityIds = config.activityId ? [config.activityId] : [];
  
  const totalMs = calculateTimeInRange(
    activities, 
    activityIds, 
    start.getTime(), 
    end.getTime()
  );
  
  const currentMinutes = Math.floor(totalMs / 60000);
  const targetMinutes = config.targetMinutes;
  const progressPercentage = Math.min(100, Math.round((currentMinutes / targetMinutes) * 100));
  
  return {
    achieved: currentMinutes >= targetMinutes,
    current: currentMinutes,
    target: targetMinutes,
    progressPercentage,
    unit: 'minutes'
  };
}

/**
 * Evaluate a count goal
 * @param {Object} goal - Goal object
 * @param {Object} activities - Activities object
 * @returns {Object} Evaluation result
 */
function evaluateCountGoal(goal, activities) {
  const config = goal.config;
  const { start, end } = getPeriodRange(config.period);
  
  // Use single activityId, not array
  const activityIds = config.activityId ? [config.activityId] : [];
  
  const currentCount = countChecksInRange(activities, activityIds, start, end);
  const targetCount = config.targetCount;
  const progressPercentage = Math.min(100, Math.round((currentCount / targetCount) * 100));
  
  return {
    achieved: currentCount >= targetCount,
    current: currentCount,
    target: targetCount,
    progressPercentage,
    unit: 'completions'
  };
}

/**
 * Evaluate a streak goal
 * @param {Object} goal - Goal object
 * @param {Object} activities - Activities object
 * @returns {Object} Evaluation result
 */
function evaluateStreakGoal(goal, activities) {
  const config = goal.config;
  
  // Use single activityId, not array
  const activityIds = config.activityId ? [config.activityId] : [];
  
  // Determine streak type based on activity type
  const activity = config.activityId ? activities[config.activityId] : null;
  const streakType = activity ? activity.type : 'check';
  
  const currentStreak = calculateStreak(activities, activityIds, streakType);
  const targetStreak = config.targetDays;
  const progressPercentage = Math.min(100, Math.round((currentStreak / targetStreak) * 100));
  
  return {
    achieved: currentStreak >= targetStreak,
    current: currentStreak,
    target: targetStreak,
    progressPercentage,
    unit: 'days'
  };
}

/**
 * Evaluate a single goal
 * @param {Object} goal - Goal object
 * @param {Object} activities - Activities object
 * @returns {Object} Evaluation result
 */
function evaluateGoal(goal, activities) {
  switch (goal.type) {
    case 'time':
      return evaluateTimeGoal(goal, activities);
    case 'count':
      return evaluateCountGoal(goal, activities);
    case 'streak':
      return evaluateStreakGoal(goal, activities);
    default:
      return {
        achieved: false,
        current: 0,
        target: 0,
        progressPercentage: 0,
        unit: 'unknown'
      };
  }
}

/**
 * Evaluate all goals
 * @param {Object} goals - Goals object
 * @param {Object} activities - Activities object
 * @returns {Object} Evaluation results keyed by goal ID
 */
function evaluateAllGoals(goals, activities) {
  const results = {};
  
  for (const [goalId, goal] of Object.entries(goals)) {
    results[goalId] = evaluateGoal(goal, activities);
  }
  
  return results;
}

// Export functions for use in main process
module.exports = {
  getISODate,
  getDayStart,
  getDayEnd,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getYearStart,
  getYearEnd,
  getPeriodRange,
  calculateTimeInRange,
  countChecksInRange,
  calculateStreak,
  evaluateGoal,
  evaluateAllGoals
};
