// DOM Elements
const elements = {
  header: document.getElementById('header'),
  repoPath: document.getElementById('repo-path'),
  currentBranch: document.getElementById('current-branch'),
  targetBranchSelect: document.getElementById('target-branch-select'),
  autoRefreshToggle: document.getElementById('auto-refresh'),
  refreshButton: document.getElementById('refresh-button'),
  selectRepoButton: document.getElementById('select-repo-button'),
  emptyState: document.getElementById('empty-state'),
  loading: document.getElementById('loading'),
  noDifferences: document.getElementById('no-differences'),
  diffContainer: document.getElementById('diff-container'),
  errorToast: document.getElementById('error-toast'),
  errorMessage: document.getElementById('error-message'),
  closeError: document.getElementById('close-error')
};

// Application state
let appState = {
  repositoryLoaded: false,
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
}

// Set up event listeners
function setupEventListeners() {
  // Repository selection
  elements.selectRepoButton.addEventListener('click', async () => {
    try {
      const result = await window.api.selectRepository();
      if (!result.success && result.error) {
        showError(result.error);
      }
    } catch (error) {
      showError(`Error selecting repository: ${error.message}`);
    }
  });
  
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
    appState.currentBranch = data.currentBranch;
    appState.targetBranch = data.targetBranch;
    appState.branches = data.branches;
    
    updateUI();
  });
  
  // Diff loading state
  window.api.onDiffLoading((isLoading) => {
    appState.isLoading = isLoading;
    updateLoadingState();
  });
  
  // Diff result
  window.api.onDiffResult((diffData) => {
    renderDiff(diffData);
  });
  
  // Error message
  window.api.onError((error) => {
    showError(error.message);
  });
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
  elements.emptyState.classList.toggle('hidden', appState.repositoryLoaded);
  
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

// Show error message
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorToast.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    elements.errorToast.classList.add('hidden');
  }, 5000);
}

// Initialize the application
init();