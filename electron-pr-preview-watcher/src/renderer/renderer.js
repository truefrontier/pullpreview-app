// DOM Elements
const elements = {
  header: document.getElementById('header'),
  repoPath: document.getElementById('repo-path'),
  currentBranch: document.getElementById('current-branch'),
  targetBranchSelect: document.getElementById('target-branch-select'),
  autoRefreshToggle: document.getElementById('auto-refresh'),
  refreshButton: document.getElementById('refresh-button'),
  selectRepoButton: document.getElementById('select-repo-button'),
  changeRepoButton: document.getElementById('change-repo-button'),
  emptyState: document.getElementById('empty-state'),
  loading: document.getElementById('loading'),
  noDifferences: document.getElementById('no-differences'),
  diffContainer: document.getElementById('diff-container'),
  errorToast: document.getElementById('error-toast'),
  errorMessage: document.getElementById('error-message'),
  closeError: document.getElementById('close-error'),
  statusText: document.getElementById('status-text'),
  lastUpdatedTime: document.getElementById('last-updated-time')
};

// Application state
let appState = {
  repositoryLoaded: false,
  repositoryPath: '',
  currentBranch: '',
  targetBranch: '',
  branches: [],
  isLoading: false,
  autoRefreshEnabled: true
};

// Import Lucide icons
let lucideIcons;
async function importLucideIcons() {
  try {
    // Use the bridge function to import the module
    lucideIcons = await window.__electron_import__('lucide');
  } catch (error) {
    console.error('Error loading Lucide icons:', error);
  }
}

// Initialize the application
async function init() {
  await importLucideIcons();
  setupEventListeners();
  setupIpcListeners();
  
  // Use the imported module or fallback to global lucide object
  if (lucideIcons) {
    lucideIcons.createIcons();
  } else if (window.lucide) {
    window.lucide.createIcons();
  }
  
  // Initialize UI with empty state
  updateUI();
}

// Set up event listeners
function setupEventListeners() {
  // Repository selection from empty state
  elements.selectRepoButton.addEventListener('click', selectRepository);
  
  // Repository change from toolbar
  elements.changeRepoButton.addEventListener('click', selectRepository);
  
  // Repository selection function
  async function selectRepository() {
    try {
      updateStatus('Selecting repository...');
      const result = await window.api.selectRepository();
      if (!result.success && result.error) {
        showError(result.error);
        updateStatus('Failed to load repository', 'error');
      }
    } catch (error) {
      showError(`Error selecting repository: ${error.message}`);
      updateStatus('Error', 'error');
    }
  }
  
  // Target branch selection
  elements.targetBranchSelect.addEventListener('change', async () => {
    try {
      const selectedBranch = elements.targetBranchSelect.value;
      appState.targetBranch = selectedBranch;
      
      const result = await window.api.setTargetBranch(selectedBranch);
      if (!result.success && result.error) {
        showError(result.error);
      }
    } catch (error) {
      showError(`Error changing target branch: ${error.message}`);
    }
  });
  
  // Auto-refresh toggle
  elements.autoRefreshToggle.addEventListener('change', async () => {
    try {
      const isEnabled = elements.autoRefreshToggle.checked;
      appState.autoRefreshEnabled = isEnabled;
      
      elements.refreshButton.classList.toggle('hidden', isEnabled);
      
      await window.api.toggleAutoRefresh(isEnabled);
    } catch (error) {
      showError(`Error toggling auto-refresh: ${error.message}`);
    }
  });
  
  // Manual refresh
  elements.refreshButton.addEventListener('click', async () => {
    try {
      const result = await window.api.refreshDiff(appState.targetBranch);
      if (!result.success && result.error) {
        showError(result.error);
      }
    } catch (error) {
      showError(`Error refreshing diff: ${error.message}`);
    }
  });
  
  // Close error toast
  elements.closeError.addEventListener('click', () => {
    elements.errorToast.classList.add('hidden');
  });
  
  // Clean up event listeners when window is closed
  window.addEventListener('beforeunload', () => {
    window.api.removeAllListeners();
  });
}

// Set up IPC listeners for communication with main process
function setupIpcListeners() {
  // Repository loaded
  window.api.onRepositoryLoaded((data) => {
    appState.repositoryLoaded = true;
    appState.repositoryPath = data.path;
    appState.currentBranch = data.currentBranch;
    appState.targetBranch = data.targetBranch;
    appState.branches = data.branches;
    
    updateUI();
    updateStatus(`Repository loaded: ${truncatePath(data.path)}`, 'success');
  });
  
  // Diff loading state
  window.api.onDiffLoading((isLoading) => {
    appState.isLoading = isLoading;
    updateLoadingState();
    
    if (isLoading) {
      updateStatus('Loading diff...');
    }
  });
  
  // Diff result
  window.api.onDiffResult((diffData) => {
    renderDiff(diffData);
    
    if (diffData && diffData.length > 0) {
      updateStatus(`Showing ${diffData.length} changed file${diffData.length === 1 ? '' : 's'}`, 'success');
    } else {
      updateStatus('No differences found', 'success');
    }
  });
  
  // Error message
  window.api.onError((error) => {
    showError(error.message);
  });
  
  // Branch changed (when target branch is automatically updated)
  window.api.onBranchChanged((data) => {
    console.log(`Target branch changed to: ${data.targetBranch}`);
    appState.targetBranch = data.targetBranch;
    
    // Update the UI to reflect the new branch
    updateTargetBranchSelect();
    
    // Show a warning to the user
    updateStatus(`Target branch changed to "${data.targetBranch}" (previous selection was not found)`, 'warning');
  });
}

// Update just the target branch dropdown
function updateTargetBranchSelect() {
  // Find the currently selected option
  const options = [...elements.targetBranchSelect.options];
  const targetBranchIndex = options.findIndex(opt => opt.value === appState.targetBranch);
  
  if (targetBranchIndex >= 0) {
    elements.targetBranchSelect.selectedIndex = targetBranchIndex;
  } else if (appState.branches.includes(appState.targetBranch)) {
    // If it doesn't exist in the dropdown but is in our branches list, add it
    const option = document.createElement('option');
    option.value = appState.targetBranch;
    option.textContent = appState.targetBranch;
    option.selected = true;
    elements.targetBranchSelect.appendChild(option);
  }
}

// Helper function to truncate repository path for display
function truncatePath(path) {
  if (!path) return '';
  
  // If path is short enough, return it as is
  if (path.length <= 40) return path;
  
  // Otherwise truncate the middle
  const parts = path.split('/');
  if (parts.length <= 2) return path;
  
  const start = parts.slice(0, 2).join('/');
  const end = parts.slice(-2).join('/');
  
  return `${start}/.../${end}`;
}

// Update UI based on application state
function updateUI() {
  // Update header
  elements.header.classList.toggle('hidden', !appState.repositoryLoaded);
  elements.repoPath.textContent = appState.repositoryLoaded ? appState.repositoryPath : '';
  elements.currentBranch.textContent = appState.currentBranch;
  
  // Update branches dropdown
  updateBranchesDropdown();
  
  // Update auto-refresh toggle
  elements.autoRefreshToggle.checked = appState.autoRefreshEnabled;
  elements.refreshButton.classList.toggle('hidden', appState.autoRefreshEnabled);
  
  // Update main content visibility
  if (!appState.repositoryLoaded) {
    // Show empty state when no repository is loaded
    elements.emptyState.classList.remove('hidden');
    elements.loading.classList.add('hidden');
    elements.noDifferences.classList.add('hidden');
    elements.diffContainer.classList.add('hidden');
  } else {
    // Hide empty state when a repository is loaded
    elements.emptyState.classList.add('hidden');
    // Other states will be handled by updateLoadingState
  }
  
  updateLoadingState();
}

// Update loading state
function updateLoadingState() {
  elements.loading.classList.toggle('hidden', !appState.isLoading);
  elements.noDifferences.classList.toggle('hidden', appState.isLoading || elements.diffContainer.children.length > 0);
  elements.diffContainer.classList.toggle('hidden', appState.isLoading || elements.diffContainer.children.length === 0);
}

// Update branches dropdown
function updateBranchesDropdown() {
  elements.targetBranchSelect.innerHTML = '';
  
  appState.branches.forEach(branch => {
    const option = document.createElement('option');
    option.value = branch;
    option.textContent = branch;
    option.selected = branch === appState.targetBranch;
    elements.targetBranchSelect.appendChild(option);
  });
}

// Render diff data
function renderDiff(diffData) {
  elements.diffContainer.innerHTML = '';
  
  if (!diffData || diffData.length === 0) {
    elements.noDifferences.classList.remove('hidden');
    elements.diffContainer.classList.add('hidden');
    return;
  }
  
  elements.noDifferences.classList.add('hidden');
  elements.diffContainer.classList.remove('hidden');
  
  diffData.forEach(file => {
    const fileElement = createFileElement(file);
    elements.diffContainer.appendChild(fileElement);
  });
}

// Create a file element for the diff
function createFileElement(file) {
  const fileElement = document.createElement('div');
  fileElement.className = 'diff-file';
  
  // Create file header
  const fileHeader = document.createElement('div');
  fileHeader.className = 'file-header';
  fileHeader.innerHTML = `
    <span>${file.path}</span>
    <i data-lucide="external-link" width="16" height="16"></i>
  `;
  
  // Add click handler to open file
  fileHeader.addEventListener('click', async () => {
    try {
      await window.api.openFile(file.path);
    } catch (error) {
      showError(`Error opening file: ${error.message}`);
    }
  });
  
  fileElement.appendChild(fileHeader);
  
  // If binary file, show simple message
  if (file.isBinary) {
    const binaryContent = document.createElement('div');
    binaryContent.className = 'binary-file-content';
    binaryContent.textContent = 'Binary file changed';
    fileElement.appendChild(binaryContent);
    return fileElement;
  }
  
  // Create diff hunks container
  const hunksContainer = document.createElement('div');
  hunksContainer.className = 'diff-hunks';
  
  // Create hunks
  file.hunks.forEach(hunk => {
    const hunkElement = createHunkElement(hunk);
    hunksContainer.appendChild(hunkElement);
  });
  
  fileElement.appendChild(hunksContainer);
  
  // Initialize Lucide icons in the newly created element
  if (lucideIcons) {
    lucideIcons.createIcons({
      attrs: {
        width: '16',
        height: '16'
      },
      elements: [fileElement]
    });
  } else if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        width: '16',
        height: '16'
      },
      elements: [fileElement]
    });
  }
  
  return fileElement;
}

// Create a hunk element for the diff
function createHunkElement(hunk) {
  const hunkElement = document.createElement('div');
  hunkElement.className = 'diff-hunk';
  
  // Create hunk header
  const hunkHeader = document.createElement('div');
  hunkHeader.className = 'hunk-header';
  hunkHeader.textContent = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
  hunkElement.appendChild(hunkHeader);
  
  // Create hunk lines
  hunk.lines.forEach(line => {
    const lineElement = createLineElement(line);
    hunkElement.appendChild(lineElement);
  });
  
  return hunkElement;
}

// Create a line element for the diff
function createLineElement(line) {
  const lineElement = document.createElement('div');
  lineElement.className = `diff-line ${line.type}`;
  
  // Line number
  const lineNumber = document.createElement('div');
  lineNumber.className = 'diff-line-number';
  lineNumber.textContent = line.lineNumber || '';
  
  // Line content
  const lineContent = document.createElement('div');
  lineContent.className = 'diff-line-content';
  
  // Add line type symbol
  const symbol = line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' ';
  lineContent.textContent = `${symbol}${line.content}`;
  
  lineElement.appendChild(lineNumber);
  lineElement.appendChild(lineContent);
  
  return lineElement;
}

// Update status bar message
function updateStatus(message, type = 'info') {
  elements.statusText.textContent = message;
  
  // Change icon based on status type
  const statusIcon = elements.statusText.previousElementSibling;
  
  if (type === 'error') {
    statusIcon.setAttribute('data-lucide', 'alert-circle');
    elements.statusText.style.color = 'var(--error-text)';
  } else if (type === 'success') {
    statusIcon.setAttribute('data-lucide', 'check-circle');
    elements.statusText.style.color = '#4caf50';
  } else if (type === 'warning') {
    statusIcon.setAttribute('data-lucide', 'alert-triangle');
    elements.statusText.style.color = '#ff9800';
  } else {
    statusIcon.setAttribute('data-lucide', 'info');
    elements.statusText.style.color = '';
  }
  
  // Update last updated time
  updateLastUpdatedTime();
  
  // Refresh Lucide icons
  if (lucideIcons) {
    lucideIcons.createIcons();
  } else if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Update the last updated time in the status bar
function updateLastUpdatedTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  elements.lastUpdatedTime.textContent = timeString;
}

// Show error message
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorToast.classList.remove('hidden');
  
  // Also update status
  updateStatus(message, 'error');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    elements.errorToast.classList.add('hidden');
  }, 5000);
}

// Initialize the application
init();