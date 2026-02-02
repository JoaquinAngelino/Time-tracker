const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tracker', {
  // Get all data
  getData: () => ipcRenderer.invoke('get-data'),
  
  // Create new activity
  createActivity: (name, type) => ipcRenderer.invoke('create-activity', name, type),
  
  // Start time activity
  start: (activityId) => ipcRenderer.invoke('start-activity', activityId),
  
  // Stop time activity
  stop: (activityId) => ipcRenderer.invoke('stop-activity', activityId),
  
  // Toggle check activity for a date
  toggleCheck: (activityId, date = null) => ipcRenderer.invoke('toggle-check', activityId, date),
  
  // Rename activity
  rename: (activityId, newName) => ipcRenderer.invoke('rename-activity', activityId, newName),
  
  // Delete activity
  delete: (activityId) => ipcRenderer.invoke('delete-activity', activityId),
  
  // Reset activity
  reset: (activityId) => ipcRenderer.invoke('reset-activity', activityId),
  
  // Get progress data for a specific period
  getProgress: (period, dateStr = null) => {
    switch (period) {
      case 'day':
        return ipcRenderer.invoke('get-daily-progress', dateStr);
      case 'week':
        return ipcRenderer.invoke('get-weekly-progress', dateStr);
      case 'month':
        return ipcRenderer.invoke('get-monthly-progress', dateStr);
      case 'year':
        return ipcRenderer.invoke('get-yearly-progress', dateStr);
      default:
        return ipcRenderer.invoke('get-daily-progress', dateStr);
    }
  }
});
