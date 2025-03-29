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
  selectBranch: document.getElementById('select-branch'),
  loading: document.getElementById('loading'),
  noDifferences: document.getElementById('no-differences'),
  diffContainer: document.getElementById('diff-container'),
  errorToast: document.getElementById('error-toast'),
  errorMessage: document.getElementById('error-message'),
  closeError: document.getElementById('close-error'),
  statusText: document.getElementById('status-text'),
  lastUpdatedTime: document.getElementById('last-updated-time'),
  expandCollapseAll: document.getElementById('expand-collapse-all')
};

// Application state
let appState = {
  repositoryLoaded: false,
  repositoryPath: '',
  currentBranch: '',
  targetBranch: '',
  branches: [],
  isLoading: false,
  autoRefreshEnabled: true,
  allFilesExpanded: true, // Default to expanded
  expandedFiles: new Set() // Track which files are expanded
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
      
      // Update UI immediately to hide the "select branch" message
      elements.selectBranch.classList.add('hidden');
      elements.loading.classList.remove('hidden');
      updateStatus(`Comparing against branch: ${selectedBranch}...`);
      
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
  
  // Expand/Collapse All
  elements.expandCollapseAll.addEventListener('click', () => {
    try {
      // Toggle global expansion state
      appState.allFilesExpanded = !appState.allFilesExpanded;
      
      // Clear individual file states (to reset to the global state)
      appState.expandedFiles.clear();
      
      // Update the button text and icon
      updateExpandCollapseAllButton();
      
      // Apply to all files
      const fileElements = elements.diffContainer.querySelectorAll('.diff-file');
      fileElements.forEach(fileElement => {
        const filePath = fileElement.dataset.filePath;
        const contentElement = fileElement.querySelector('.diff-hunks, .binary-file-content');
        const expandIcon = fileElement.querySelector('.expand-collapse-icon');
        
        if (contentElement) {
          contentElement.style.display = appState.allFilesExpanded ? 'block' : 'none';
        }
        
        if (expandIcon) {
          expandIcon.setAttribute('data-lucide', appState.allFilesExpanded ? 'chevron-down' : 'chevron-right');
        }
      });
      
      // Refresh icons
      if (lucideIcons) {
        lucideIcons.createIcons();
      } else if (window.lucide) {
        window.lucide.createIcons();
      }
      
      updateStatus(`All files ${appState.allFilesExpanded ? 'expanded' : 'collapsed'}`);
    } catch (error) {
      showError(`Error toggling expand/collapse: ${error.message}`);
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
    
    // Always hide select branch message when loading
    if (appState.targetBranch) {
      elements.selectBranch.classList.add('hidden');
    }
    
    // Show/hide loading spinner
    elements.loading.classList.toggle('hidden', !isLoading);
    
    // Hide other elements when loading
    if (isLoading) {
      elements.noDifferences.classList.add('hidden');
      elements.diffContainer.classList.add('hidden');
      updateStatus('Loading diff...');
    }
  });
  
  // Diff result
  window.api.onDiffResult((diffData) => {
    renderDiff(diffData);
    
    // Make sure we hide the select branch message and update the UI properly
    elements.selectBranch.classList.add('hidden');
    
    if (diffData && diffData.length > 0) {
      elements.noDifferences.classList.add('hidden');
      elements.diffContainer.classList.remove('hidden');
      updateStatus(`Showing ${diffData.length} changed file${diffData.length === 1 ? '' : 's'}`, 'success');
    } else {
      elements.diffContainer.classList.add('hidden');
      elements.noDifferences.classList.remove('hidden');
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
  
  // Set target branch (when loading from saved preferences)
  window.api.onSetTargetBranch((data) => {
    console.log(`Setting target branch from preferences: ${data.branch}`);
    
    // Set the target branch in the dropdown if it exists
    if (data.branch && appState.branches.includes(data.branch)) {
      // Update application state
      appState.targetBranch = data.branch;
      
      // Update UI to show the selected branch
      updateTargetBranchSelect();
      
      // Trigger a branch change to load the diff
      elements.targetBranchSelect.dispatchEvent(new Event('change'));
      
      updateStatus(`Loaded saved branch: ${data.branch}`);
    }
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

// Update the expand/collapse all button based on current state
function updateExpandCollapseAllButton() {
  const buttonIcon = elements.expandCollapseAll.querySelector('i');
  const buttonText = elements.expandCollapseAll.querySelector('span');
  
  if (appState.allFilesExpanded) {
    buttonIcon.setAttribute('data-lucide', 'chevrons-up');
    buttonText.textContent = 'Collapse All';
  } else {
    buttonIcon.setAttribute('data-lucide', 'chevrons-down');
    buttonText.textContent = 'Expand All';
  }
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
  
  // Update expand/collapse all button
  updateExpandCollapseAllButton();
  
  // Update main content visibility
  if (!appState.repositoryLoaded) {
    // Show empty state when no repository is loaded
    elements.emptyState.classList.remove('hidden');
    elements.selectBranch.classList.add('hidden');
    elements.loading.classList.add('hidden');
    elements.noDifferences.classList.add('hidden');
    elements.diffContainer.classList.add('hidden');
  } else {
    // Repository is loaded
    elements.emptyState.classList.add('hidden');
    
    // Show "select branch" message if no target branch is selected
    if (!appState.targetBranch) {
      elements.selectBranch.classList.remove('hidden');
      elements.loading.classList.add('hidden');
      elements.noDifferences.classList.add('hidden');
      elements.diffContainer.classList.add('hidden');
      
      // Update status text to guide the user
      updateStatus('Please select a target branch to compare against', 'info');
    } else {
      // Target branch is selected, handle other states
      elements.selectBranch.classList.add('hidden');
      updateLoadingState();
    }
  }
}

// Update loading state
function updateLoadingState() {
  // Only update these states if we have a target branch selected
  if (appState.targetBranch) {
    elements.loading.classList.toggle('hidden', !appState.isLoading);
    elements.noDifferences.classList.toggle('hidden', appState.isLoading || elements.diffContainer.children.length > 0);
    elements.diffContainer.classList.toggle('hidden', appState.isLoading || elements.diffContainer.children.length === 0);
  }
}

// Update branches dropdown
function updateBranchesDropdown() {
  elements.targetBranchSelect.innerHTML = '';
  
  // Add a placeholder/prompt option
  if (!appState.targetBranch) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select a branch --";
    placeholderOption.selected = true;
    placeholderOption.disabled = true;
    elements.targetBranchSelect.appendChild(placeholderOption);
  }
  
  // Add all available branches
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
  fileElement.dataset.filePath = file.path;
  
  // Check if this file should be expanded or collapsed
  const isExpanded = appState.expandedFiles.has(file.path) || 
                    (appState.allFilesExpanded && !appState.expandedFiles.has(file.path));
  
  // Create file header
  const fileHeader = document.createElement('div');
  fileHeader.className = 'file-header';
  
  // Left side with expand/collapse and filename
  const fileHeaderLeft = document.createElement('div');
  fileHeaderLeft.className = 'file-header-left';
  
  // Add expand/collapse icon
  const expandCollapseIcon = document.createElement('i');
  expandCollapseIcon.setAttribute('data-lucide', isExpanded ? 'chevron-down' : 'chevron-right');
  expandCollapseIcon.className = 'expand-collapse-icon';
  expandCollapseIcon.style.marginRight = '8px';
  
  // Add filename
  const fileNameSpan = document.createElement('span');
  fileNameSpan.textContent = file.path;
  
  fileHeaderLeft.appendChild(expandCollapseIcon);
  fileHeaderLeft.appendChild(fileNameSpan);
  
  // Right side with external link icon
  const fileHeaderRight = document.createElement('div');
  fileHeaderRight.className = 'file-header-right';
  
  const openFileIcon = document.createElement('i');
  openFileIcon.setAttribute('data-lucide', 'external-link');
  fileHeaderRight.appendChild(openFileIcon);
  
  // Add both sides to header
  fileHeader.appendChild(fileHeaderLeft);
  fileHeader.appendChild(fileHeaderRight);
  
  // Add click handler to expand/collapse when clicking on left side
  fileHeaderLeft.addEventListener('click', (event) => {
    // Toggle expanded state for this file
    if (appState.expandedFiles.has(file.path)) {
      appState.expandedFiles.delete(file.path);
    } else {
      appState.expandedFiles.add(file.path);
    }
    
    // Toggle visibility of content
    const hunksContainer = fileElement.querySelector('.diff-hunks');
    const binaryContent = fileElement.querySelector('.binary-file-content');
    const content = hunksContainer || binaryContent;
    
    if (content) {
      const isNowExpanded = isFileExpanded(file.path);
      content.style.display = isNowExpanded ? 'block' : 'none';
      
      // Update icon
      expandCollapseIcon.setAttribute('data-lucide', isNowExpanded ? 'chevron-down' : 'chevron-right');
      
      // Refresh icon
      if (lucideIcons) {
        lucideIcons.createIcons({ elements: [expandCollapseIcon] });
      } else if (window.lucide) {
        window.lucide.createIcons({ elements: [expandCollapseIcon] });
      }
    }
    
    // Prevent event from bubbling up to the entire header
    event.stopPropagation();
  });
  
  // Add click handler to open file when clicking on right side
  fileHeaderRight.addEventListener('click', async (event) => {
    try {
      await window.api.openFile(file.path);
      event.stopPropagation();
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
    
    // Apply initial expand/collapse state
    if (!isExpanded) {
      binaryContent.style.display = 'none';
    }
    
    fileElement.appendChild(binaryContent);
    return fileElement;
  }
  
  // Create diff hunks container
  const hunksContainer = document.createElement('div');
  hunksContainer.className = 'diff-hunks';
  
  // Apply initial expand/collapse state
  if (!isExpanded) {
    hunksContainer.style.display = 'none';
  }
  
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

// Helper to check if a file is currently expanded
function isFileExpanded(filePath) {
  if (appState.allFilesExpanded) {
    // If all files are expanded, this file is expanded unless it's in the expandedFiles set
    return !appState.expandedFiles.has(filePath);
  } else {
    // If all files are collapsed, this file is expanded only if it's in the expandedFiles set
    return appState.expandedFiles.has(filePath);
  }
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