const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { simpleGit } = require('simple-git');
const chokidar = require('chokidar');

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

// Keep track of the current repository and refresh timer
let currentRepo = null;
let refreshTimer = null;
let isAutoRefreshEnabled = true;

// Settings storage
let appSettings = {
  editorType: 'system',
  customEditorPath: ''
};

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

  // Don't automatically load a repository path
  // We'll always prompt the user to select one first
}

// Load settings from preferences file
function loadSettings() {
  try {
    const userDataPath = path.join(app.getPath('userData'), 'prefs.json');
    if (fs.existsSync(userDataPath)) {
      const data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      
      // Load settings if they exist
      if (data.settings) {
        appSettings = data.settings;
      }
      
      // Send settings to the renderer
      if (mainWindow) {
        mainWindow.webContents.send('settings-loaded', {
          settings: appSettings
        });
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Load saved repository if available
async function loadSavedRepository() {
  try {
    const userDataPath = path.join(app.getPath('userData'), 'prefs.json');
    if (fs.existsSync(userDataPath)) {
      const data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      
      // Check if we have a saved repository path
      if (data.lastRepository && fs.existsSync(data.lastRepository)) {
        // Notify renderer that we're loading a repository
        if (mainWindow) {
          mainWindow.webContents.send('repository-loading', {
            path: data.lastRepository
          });
        }
        
        const isValid = await validateRepository(data.lastRepository);
        
        if (isValid) {
          await loadRepository(data.lastRepository);
          
          // If we have a saved target branch, set it
          if (data.lastTargetBranch) {
            // We need to wait a longer time to let the UI fully initialize and load all branches
            // before setting the target branch
            setTimeout(() => {
              if (mainWindow) {
                console.log(`Setting target branch from saved preferences: ${data.lastTargetBranch}`);
                
                // First check if the target branch exists
                currentRepo.git.branch().then(branchInfo => {
                  const allBranches = [...branchInfo.all];
                  
                  if (allBranches.includes(data.lastTargetBranch)) {
                    mainWindow.webContents.send('set-target-branch', {
                      branch: data.lastTargetBranch
                    });
                  } else {
                    console.warn(`Saved target branch "${data.lastTargetBranch}" not found in available branches`);
                  }
                }).catch(err => {
                  console.error("Error checking branches before setting target branch:", err);
                });
              }
            }, 1000); // Increased from 500ms to 1000ms
          }
          
          return true;
        } else {
          // Repository is not valid, notify renderer
          if (mainWindow) {
            mainWindow.webContents.send('repository-load-failed', {
              path: data.lastRepository,
              error: 'The saved repository is not valid.'
            });
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error loading saved repository:', error);
    // Notify renderer about the error
    if (mainWindow) {
      mainWindow.webContents.send('repository-load-failed', {
        error: `Error loading saved repository: ${error.message}`
      });
    }
    return false;
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  createWindow();
  
  // Load settings first
  loadSettings();
  
  // Try to load the saved repository
  await loadSavedRepository();

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
    
    // Log what we found for debugging
    console.log(`Current branch: ${currentBranch}`);
    console.log(`Available branches: ${branches.join(', ')}`);
    
    // We don't select a default target branch anymore
    // This avoids potentially large diffs when first opening a repository
    const targetBranch = "";
    
    // Save repository path in preferences
    // Load existing prefs to preserve any other settings
    let userData = {};
    const userDataPath = path.join(app.getPath('userData'), 'prefs.json');
    
    if (fs.existsSync(userDataPath)) {
      try {
        userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      } catch (e) {
        console.warn('Error reading prefs file, will overwrite:', e);
      }
    }
    
    // Update with new repository path
    userData.lastRepository = repoPath;
    
    // Write updated preferences
    fs.writeFileSync(
      userDataPath,
      JSON.stringify(userData),
      'utf8'
    );
    
    // Send repository information to renderer
    if (mainWindow) {
      mainWindow.webContents.send('repository-loaded', {
        path: repoPath,
        currentBranch,
        targetBranch, // Empty string, no branch selected by default
        branches
      });
    }
    
    // Set up auto-refresh, but don't generate diff yet
    // (we'll wait for the user to select a branch)
    setupAutoRefresh();
    
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
    // Get the list of branches in a more reliable way
    let branches = [];
    
    // Get local branches
    try {
      const branchSummary = await currentRepo.git.branchLocal();
      console.log('Local branches:', branchSummary.all);
      branches = [...branchSummary.all];
    } catch (error) {
      console.warn('Error getting local branches:', error);
    }
    
    // Try to fetch remote branches
    try {
      await currentRepo.git.fetch(['--prune']);
      
      // Get remote branches
      const remoteRefs = await currentRepo.git.raw(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/']);
      
      // Parse the remote refs and convert to branch names
      if (remoteRefs) {
        const remoteBranches = remoteRefs
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            // Convert remote branch name (e.g., origin/main -> main)
            const parts = line.split('/');
            if (parts.length >= 2) {
              return parts.slice(1).join('/'); // Skip the remote name (origin)
            }
            return line;
          });
        
        console.log('Remote branches:', remoteBranches);
        
        // Add unique remote branches to our list
        branches = [...new Set([...branches, ...remoteBranches])];
      }
    } catch (error) {
      console.warn('Error fetching or getting remote branches:', error);
    }
    
    // If we still don't have any branches, try a last resort approach
    if (branches.length === 0) {
      try {
        // Try to get all refs
        const allRefs = await currentRepo.git.raw(['show-ref']);
        if (allRefs) {
          const refBranches = allRefs
            .split('\n')
            .filter(line => line.includes('refs/heads/') || line.includes('refs/remotes/'))
            .map(line => {
              if (line.includes('refs/heads/')) {
                return line.split('refs/heads/')[1];
              } else if (line.includes('refs/remotes/')) {
                const remote = line.split('refs/remotes/')[1];
                return remote.split('/').slice(1).join('/'); // Remove origin/ prefix
              }
              return '';
            })
            .filter(branch => branch !== '');
          
          console.log('Branches from refs:', refBranches);
          branches = [...new Set([...branches, ...refBranches])];
        }
      } catch (error) {
        console.warn('Error getting refs:', error);
      }
    }
    
    // If branches is still empty, try to get at least the current branch
    if (branches.length === 0) {
      const currentBranch = await getCurrentBranch();
      if (currentBranch && currentBranch !== 'unknown') {
        branches.push(currentBranch);
      }
    }
    
    console.log('Final branches list:', branches);
    return branches;
  } catch (error) {
    console.error('Error getting branches:', error);
    return [];
  }
}

// Set up auto-refresh
function setupAutoRefresh(targetBranch) {
  stopAutoRefresh(); // Clear any existing watchers
  
  if (!currentRepo || !isAutoRefreshEnabled) return;
  
  // Skip initial check if no target branch is provided
  if (targetBranch) {
    // First check - start immediately
    checkGitStatusAndRefresh(targetBranch);
  }
  
  // Set up periodic check for both local changes and remote changes
  refreshTimer = setInterval(async () => {
    try {
      if (currentRepo) {
        // Get the latest target branch from UI state
        // This is needed because targetBranch might be empty initially
        const branch = targetBranch; // If provided externally
        
        // Only run checks if we have a valid target branch
        if (branch && branch.trim() !== '') {
          checkGitStatusAndRefresh(branch);
        }
      }
    } catch (error) {
      console.error('Error in periodic refresh:', error);
    }
  }, 3000); // Check every 3 seconds
}

// Check git status and refresh diff if changes are detected
async function checkGitStatusAndRefresh(targetBranch) {
  if (!currentRepo || !targetBranch) return;
  
  try {
    // Check if we have any changes before regenerating the diff
    let shouldRefresh = false;
    
    try {
      // Use git status to check for changes efficiently
      const status = await currentRepo.git.status();
      
      // If there are any changes, set the refresh flag
      if (status.files && status.files.length > 0) {
        shouldRefresh = true;
      } else if (
        (status.created && status.created.length > 0) || 
        (status.deleted && status.deleted.length > 0) || 
        (status.modified && status.modified.length > 0) ||
        (status.renamed && status.renamed.length > 0)
      ) {
        shouldRefresh = true;
      }
    } catch (statusError) {
      console.warn('Error in git status:', statusError);
      // Still try to refresh diff if status check fails
      shouldRefresh = true;
    }
    
    // If we have changes or status check failed, regenerate the diff
    if (shouldRefresh) {
      // Occasionally fetch from remote
      if (Math.random() < 0.1) { // ~10% chance
        try {
          await currentRepo.git.fetch(['--prune']);
        } catch (fetchError) {
          console.warn('Error fetching from remote:', fetchError);
          // Continue anyway
        }
      }
      
      // Generate the diff
      generateDiff(targetBranch);
    }
  } catch (error) {
    console.error('Error in checkGitStatusAndRefresh:', error);
  }
}

// Stop auto-refresh
function stopAutoRefresh() {
  // No more file watcher - we use git status instead
  fileWatcher = null;
  
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
  if (!targetBranch) return;
  
  try {
    // Notify UI that diff is loading
    if (mainWindow) {
      mainWindow.webContents.send('diff-loading', true);
    }
    
    // Get current branch - we'll need it as fallback
    const currentBranch = await getCurrentBranch();
    
    // First verify that the target branch exists
    console.log(`Attempting to diff against target branch: ${targetBranch}`);
    const branches = await getAllBranches();
    console.log(`Available branches: ${branches.join(', ')}`);
    
    // If target branch doesn't exist, fall back to current branch
    if (!branches.includes(targetBranch)) {
      console.warn(`Branch "${targetBranch}" not found in available branches. Falling back to current branch.`);
      
      // If current branch is also not in the list, we have a problem
      if (!branches.includes(currentBranch)) {
        console.error("Neither target branch nor current branch are in the list of available branches");
        throw new Error(`Branch "${targetBranch}" does not exist, and current branch lookup failed. Please select a valid branch.`);
      }
      
      // Use current branch as fallback
      targetBranch = currentBranch;
      
      // Notify UI that we're changing target branch
      if (mainWindow) {
        mainWindow.webContents.send('branch-changed', {
          targetBranch: currentBranch
        });
      }
    }
    
    // Try to determine a valid revision to diff against
    let diffCommand;
    try {
      // Check if this is a valid revision first
      await currentRepo.git.revparse([targetBranch]);
      diffCommand = [targetBranch, '--'];
    } catch (revError) {
      console.warn(`Invalid revision: ${targetBranch}. Trying fallback options.`);
      
      // Try with origin/ prefix
      try {
        await currentRepo.git.revparse([`origin/${targetBranch}`]);
        diffCommand = [`origin/${targetBranch}`, '--'];
      } catch (originError) {
        // Last resort - try HEAD
        console.warn(`Falling back to HEAD for diff`);
        diffCommand = ['HEAD', '--'];
      }
    }
    
    console.log(`Executing diff command: git diff ${diffCommand.join(' ')}`);
    
    // Generate diff
    const diffResult = await currentRepo.git.diff(diffCommand);
    
    // Parse diff result
    const parsedDiff = parseDiffOutput(diffResult);
    
    // Send diff to renderer
    if (mainWindow) {
      mainWindow.webContents.send('diff-result', parsedDiff);
      mainWindow.webContents.send('diff-loading', false);
    }
  } catch (error) {
    console.error('Error generating diff:', error);
    
    // Create a user-friendly error message
    let userMessage = 'Could not generate diff. ';
    
    if (error.message.includes('bad revision') || error.message.includes('does not exist')) {
      userMessage += `Branch "${targetBranch}" does not exist. Please select a different branch.`;
    } else if (error.message.includes('not a git repository')) {
      userMessage += 'The selected directory is not a valid Git repository.';
    } else {
      userMessage += error.message;
    }
    
    if (mainWindow) {
      mainWindow.webContents.send('error', {
        message: userMessage
      });
      mainWindow.webContents.send('diff-loading', false);
    }
  }
}

// Change target branch
ipcMain.handle('set-target-branch', async (event, branch) => {
  if (!currentRepo) return { success: false };
  
  try {
    // Save target branch in preferences
    const userDataPath = path.join(app.getPath('userData'), 'prefs.json');
    let userData = {};
    
    if (fs.existsSync(userDataPath)) {
      try {
        userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      } catch (e) {
        console.warn('Error reading prefs file:', e);
      }
    }
    
    // Update with the new target branch
    userData.lastTargetBranch = branch;
    
    // Write updated preferences
    fs.writeFileSync(
      userDataPath,
      JSON.stringify(userData),
      'utf8'
    );
    
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
    
    // Use custom editor if configured
    if (appSettings.editorType === 'custom' && appSettings.customEditorPath) {
      const { spawn } = require('child_process');
      spawn(appSettings.customEditorPath, [fullPath], { 
        detached: true, 
        stdio: 'ignore' 
      }).unref();
      return { success: true };
    } 
    // Use editor-specific commands
    else if (appSettings.editorType === 'vscode') {
      // For VS Code
      const vscodeCommand = process.platform === 'win32' ? 'code.cmd' : 'code';
      const { spawn } = require('child_process');
      spawn(vscodeCommand, [fullPath], { 
        detached: true, 
        stdio: 'ignore' 
      }).unref();
      return { success: true };
    }
    else if (appSettings.editorType === 'sublime') {
      // For Sublime Text
      const sublimeCommand = process.platform === 'win32' ? 'subl.exe' : 'subl';
      const { spawn } = require('child_process');
      spawn(sublimeCommand, [fullPath], { 
        detached: true, 
        stdio: 'ignore' 
      }).unref();
      return { success: true };
    }
    else if (appSettings.editorType === 'atom') {
      // For Atom
      const atomCommand = process.platform === 'win32' ? 'atom.cmd' : 'atom';
      const { spawn } = require('child_process');
      spawn(atomCommand, [fullPath], { 
        detached: true, 
        stdio: 'ignore' 
      }).unref();
      return { success: true };
    }
    // Default to system default
    else {
      shell.openPath(fullPath);
      return { success: true };
    }
  } catch (error) {
    console.error('Error opening file:', error);
    return { 
      success: false, 
      error: `Error opening file: ${error.message}` 
    };
  }
});

// Save settings
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    // Update app settings
    appSettings = settings;
    
    // Load existing prefs to preserve other settings
    let userData = {};
    const userDataPath = path.join(app.getPath('userData'), 'prefs.json');
    
    if (fs.existsSync(userDataPath)) {
      try {
        userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
      } catch (e) {
        console.warn('Error reading prefs file, will overwrite:', e);
      }
    }
    
    // Update with new settings
    userData.settings = settings;
    
    // Write updated preferences
    fs.writeFileSync(
      userDataPath,
      JSON.stringify(userData),
      'utf8'
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { 
      success: false, 
      error: `Error saving settings: ${error.message}` 
    };
  }
});

// Select editor path
ipcMain.handle('select-editor-path', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Select Editor',
      message: 'Select the editor executable',
      filters: [
        { name: 'Applications', extensions: ['exe', 'app', 'dmg', '*'] }
      ]
    });
    
    if (!canceled && filePaths.length > 0) {
      return { success: true, path: filePaths[0] };
    }
    
    return { success: false };
  } catch (error) {
    console.error('Error selecting editor path:', error);
    return { 
      success: false, 
      error: `Error selecting editor path: ${error.message}` 
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