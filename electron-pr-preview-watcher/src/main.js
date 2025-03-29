const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { simpleGit } = require('simple-git');
const chokidar = require('chokidar');

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

// Keep track of the current repository and watcher
let currentRepo = null;
let fileWatcher = null;
let refreshTimer = null;
let isAutoRefreshEnabled = true;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    show: false, // Don't show until loaded
  });

  // and load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools if in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    stopAutoRefresh();
  });

  // Load last repository path from user preferences if available
  const lastRepoPath = app.getPath('userData');
  if (lastRepoPath && fs.existsSync(lastRepoPath)) {
    loadRepository(lastRepoPath);
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle repository selection
ipcMain.handle('select-repository', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository',
    message: 'Select a Git repository to view differences',
  });

  if (!canceled && filePaths.length > 0) {
    const repoPath = filePaths[0];
    const isValid = await validateRepository(repoPath);
    
    if (isValid) {
      await loadRepository(repoPath);
      return { success: true, path: repoPath };
    } else {
      return { 
        success: false, 
        error: 'The selected directory is not a valid Git repository.' 
      };
    }
  }
  
  return { success: false };
});

// Validate if the directory is a Git repository
async function validateRepository(path) {
  const gitDir = `${path}/.git`;
  return fs.existsSync(gitDir);
}

// Load repository and get its information
async function loadRepository(repoPath) {
  try {
    currentRepo = { path: repoPath, git: simpleGit(repoPath) };
    
    // Get repository information
    const currentBranch = await getCurrentBranch();
    const branches = await getAllBranches();
    let targetBranch = 'main';
    
    // Use stored target branch or fallback to main/master
    if (branches.includes('main')) {
      targetBranch = 'main';
    } else if (branches.includes('master')) {
      targetBranch = 'master';
    }
    
    // Save repository path in preferences
    app.setPath('userData', repoPath);
    
    // Send repository information to renderer
    if (mainWindow) {
      mainWindow.webContents.send('repository-loaded', {
        path: repoPath,
        currentBranch,
        targetBranch,
        branches
      });
    }
    
    // Set up auto-refresh
    setupAutoRefresh(targetBranch);
    
    // Generate initial diff
    generateDiff(targetBranch);
    
  } catch (error) {
    console.error('Error loading repository:', error);
    if (mainWindow) {
      mainWindow.webContents.send('error', {
        message: `Error loading repository: ${error.message}`
      });
    }
  }
}

// Get current branch name
async function getCurrentBranch() {
  if (!currentRepo) return null;
  try {
    return (await currentRepo.git.branch()).current;
  } catch (error) {
    console.error('Error getting current branch:', error);
    return 'unknown';
  }
}

// Get all branches
async function getAllBranches() {
  if (!currentRepo) return [];
  try {
    // Fetch to ensure the branch list is up-to-date
    await currentRepo.git.fetch(['--prune']);
    
    const result = await currentRepo.git.branch(['-a']);
    return result.all.map(branch => {
      // Clean up remote branch names
      return branch.replace(/^remotes\/origin\//, '');
    });
  } catch (error) {
    console.error('Error getting branches:', error);
    return [];
  }
}

// Set up auto-refresh
function setupAutoRefresh(targetBranch) {
  stopAutoRefresh(); // Clear any existing watchers
  
  if (!currentRepo || !isAutoRefreshEnabled) return;
  
  // Watch repository for file changes
  fileWatcher = chokidar.watch(currentRepo.path, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**'
    ],
    persistent: true,
    ignoreInitial: true,
  });
  
  // Debounce file changes to avoid too many refreshes
  let debounceTimeout = null;
  fileWatcher.on('all', (event, path) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      generateDiff(targetBranch);
    }, 500); // 500ms debounce
  });
  
  // Set up periodic refresh (every 2 minutes)
  refreshTimer = setInterval(async () => {
    try {
      if (currentRepo) {
        // Fetch latest changes
        await currentRepo.git.fetch(['--prune']);
        generateDiff(targetBranch);
      }
    } catch (error) {
      console.error('Error in periodic refresh:', error);
    }
  }, 120000); // 2 minutes
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// Toggle auto-refresh
ipcMain.handle('toggle-auto-refresh', async (event, enabled) => {
  isAutoRefreshEnabled = enabled;
  
  if (currentRepo && isAutoRefreshEnabled) {
    const branches = await getAllBranches();
    setupAutoRefresh(branches[0]); // Use first branch as target
  } else {
    stopAutoRefresh();
  }
  
  return isAutoRefreshEnabled;
});

// Generate diff between current branch and target branch
async function generateDiff(targetBranch) {
  if (!currentRepo) return;
  
  try {
    // Notify UI that diff is loading
    if (mainWindow) {
      mainWindow.webContents.send('diff-loading', true);
    }
    
    // Generate diff
    const diffResult = await currentRepo.git.diff([targetBranch, '--']);
    
    // Parse diff result
    const parsedDiff = parseDiffOutput(diffResult);
    
    // Send diff to renderer
    if (mainWindow) {
      mainWindow.webContents.send('diff-result', parsedDiff);
      mainWindow.webContents.send('diff-loading', false);
    }
  } catch (error) {
    console.error('Error generating diff:', error);
    if (mainWindow) {
      mainWindow.webContents.send('error', {
        message: `Error generating diff: ${error.message}`
      });
      mainWindow.webContents.send('diff-loading', false);
    }
  }
}

// Change target branch
ipcMain.handle('set-target-branch', async (event, branch) => {
  if (!currentRepo) return { success: false };
  
  try {
    generateDiff(branch);
    setupAutoRefresh(branch);
    return { success: true };
  } catch (error) {
    console.error('Error changing target branch:', error);
    return { 
      success: false, 
      error: `Error changing target branch: ${error.message}` 
    };
  }
});

// Manual refresh
ipcMain.handle('refresh-diff', async (event, branch) => {
  if (!currentRepo) return { success: false };
  
  try {
    // Fetch latest changes
    await currentRepo.git.fetch(['--prune']);
    generateDiff(branch);
    return { success: true };
  } catch (error) {
    console.error('Error refreshing diff:', error);
    return { 
      success: false, 
      error: `Error refreshing diff: ${error.message}` 
    };
  }
});

// Open file in external editor
ipcMain.handle('open-file', async (event, filePath) => {
  if (!currentRepo) return { success: false };
  
  try {
    const fullPath = path.join(currentRepo.path, filePath);
    shell.openPath(fullPath);
    return { success: true };
  } catch (error) {
    console.error('Error opening file:', error);
    return { 
      success: false, 
      error: `Error opening file: ${error.message}` 
    };
  }
});

// Parse diff output
function parseDiffOutput(diffOutput) {
  const files = [];
  let currentFile = null;
  let currentHunks = [];
  let currentLines = [];
  let oldStart = 0;
  let oldCount = 0;
  let newStart = 0;
  let newCount = 0;
  
  const lines = diffOutput.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      // New file diff
      if (currentFile) {
        if (currentLines.length > 0) {
          currentHunks.push({
            oldStart,
            oldCount,
            newStart,
            newCount,
            lines: currentLines
          });
        }
        
        files.push({
          path: currentFile,
          isBinary: false,
          hunks: currentHunks
        });
      }
      
      // Extract file path from "diff --git a/path b/path"
      const components = line.split(' ');
      if (components.length >= 4) {
        const path = components[3].substr(2); // Remove "b/"
        currentFile = path;
        currentHunks = [];
        currentLines = [];
      }
    } else if (line.startsWith('Binary files')) {
      if (currentFile) {
        files.push({
          path: currentFile,
          isBinary: true,
          hunks: []
        });
      }
      currentFile = null;
    } else if (line.match(/^@@ -\d+,?\d* \+\d+,?\d* @@/)) {
      // New hunk
      if (currentLines.length > 0) {
        currentHunks.push({
          oldStart,
          oldCount,
          newStart,
          newCount,
          lines: currentLines
        });
        currentLines = [];
      }
      
      // Parse hunk header using regex
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      
      if (match) {
        oldStart = parseInt(match[1], 10);
        oldCount = match[2] ? parseInt(match[2], 10) : 1;
        newStart = parseInt(match[3], 10);
        newCount = match[4] ? parseInt(match[4], 10) : 1;
      }
    } else if (currentFile && currentFile.length > 0) {
      // Diff line content
      if (line.length === 0) continue;
      
      let lineType;
      let lineNumber;
      
      if (line.startsWith('+')) {
        lineType = 'addition';
        lineNumber = newStart++;
      } else if (line.startsWith('-')) {
        lineType = 'deletion';
        lineNumber = oldStart++;
      } else {
        lineType = 'context';
        lineNumber = newStart++;
        oldStart++;
      }
      
      const content = line.substr(1);
      currentLines.push({
        type: lineType,
        content,
        lineNumber
      });
    }
  }
  
  // Add the last hunk and file if any
  if (currentFile && currentLines.length > 0) {
    currentHunks.push({
      oldStart,
      oldCount,
      newStart,
      newCount,
      lines: currentLines
    });
    
    files.push({
      path: currentFile,
      isBinary: false,
      hunks: currentHunks
    });
  }
  
  return files;
}