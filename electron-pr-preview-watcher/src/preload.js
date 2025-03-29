const { contextBridge, ipcRenderer } = require('electron');
// Enable dynamic imports in the renderer
contextBridge.exposeInMainWorld('__electron_import__', (url) => import(url));

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Repository operations
  selectRepository: () => ipcRenderer.invoke('select-repository'),
  
  // Diff operations
  setTargetBranch: (branch) => ipcRenderer.invoke('set-target-branch', branch),
  refreshDiff: (branch) => ipcRenderer.invoke('refresh-diff', branch),
  
  // Auto-refresh
  toggleAutoRefresh: (enabled) => ipcRenderer.invoke('toggle-auto-refresh', enabled),
  
  // File operations
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  
  // Settings operations
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectEditorPath: () => ipcRenderer.invoke('select-editor-path'),
  
  // Events
  onRepositoryLoading: (callback) =>
    ipcRenderer.on('repository-loading', (_, data) => callback(data)),
    
  onRepositoryLoaded: (callback) => 
    ipcRenderer.on('repository-loaded', (_, data) => callback(data)),
    
  onRepositoryLoadFailed: (callback) =>
    ipcRenderer.on('repository-load-failed', (_, data) => callback(data)),
    
  onDiffLoading: (callback) => 
    ipcRenderer.on('diff-loading', (_, isLoading) => callback(isLoading)),
    
  onDiffResult: (callback) => 
    ipcRenderer.on('diff-result', (_, diffData) => callback(diffData)),
    
  onError: (callback) => 
    ipcRenderer.on('error', (_, error) => callback(error)),
    
  onBranchChanged: (callback) => 
    ipcRenderer.on('branch-changed', (_, data) => callback(data)),
    
  onSetTargetBranch: (callback) =>
    ipcRenderer.on('set-target-branch', (_, data) => callback(data)),
    
  onSettingsLoaded: (callback) =>
    ipcRenderer.on('settings-loaded', (_, data) => callback(data)),
    
  // Cleanup function for removing event listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('repository-loading');
    ipcRenderer.removeAllListeners('repository-loaded');
    ipcRenderer.removeAllListeners('repository-load-failed');
    ipcRenderer.removeAllListeners('diff-loading');
    ipcRenderer.removeAllListeners('diff-result');
    ipcRenderer.removeAllListeners('error');
    ipcRenderer.removeAllListeners('branch-changed');
    ipcRenderer.removeAllListeners('set-target-branch');
    ipcRenderer.removeAllListeners('settings-loaded');
  }
});