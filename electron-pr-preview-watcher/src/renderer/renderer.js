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
  expandCollapseAll: document.getElementById('expand-collapse-all'),
  
  // Settings
  settingsButton: document.getElementById('settings-button'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettings: document.getElementById('close-settings'),
  editorSelect: document.getElementById('editor-select'),
  customEditorPathContainer: document.getElementById('custom-editor-path-container'),
  customEditorPath: document.getElementById('custom-editor-path'),
  browseEditorPath: document.getElementById('browse-editor-path'),
  saveSettings: document.getElementById('save-settings'),
  cancelSettings: document.getElementById('cancel-settings')
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
  
  // Settings
  settings: {
    editorType: 'system', // Default to system editor
    customEditorPath: ''  // Only used if editorType is 'custom'
  }
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
  
  // Show loading state during initial repository load
  elements.emptyState.classList.add('hidden');
  elements.loading.classList.remove('hidden');
  updateStatus('Loading repository...', 'info');
  
  // Initialize UI after a short delay to let IPC events come through
  setTimeout(() => {
    // Only revert to empty state if no repository was loaded
    if (!appState.repositoryLoaded) {
      elements.loading.classList.add('hidden');
      elements.emptyState.classList.remove('hidden');
      updateStatus('Ready', 'info');
    }
  }, 1500); // Allow 1.5 seconds for repository load
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
      
      // Don't do anything if we somehow get an empty branch
      if (!selectedBranch) {
        console.warn('Empty branch selected, ignoring');
        return;
      }
      
      console.log(`User selected branch: ${selectedBranch}`);
      
      // Update application state
      appState.targetBranch = selectedBranch;
      
      // Update UI immediately to hide the "select branch" message
      elements.emptyState.classList.add('hidden');  // Ensure empty state is hidden
      elements.selectBranch.classList.add('hidden');
      elements.loading.classList.remove('hidden');
      elements.noDifferences.classList.add('hidden');
      elements.diffContainer.classList.add('hidden');
      
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
  
  // Hide the expand/collapse all button since we no longer need it
  if (elements.expandCollapseAll) {
    elements.expandCollapseAll.style.display = 'none';
  }
  
  // Settings button - open settings modal
  elements.settingsButton.addEventListener('click', () => {
    // Load current settings into the form
    elements.editorSelect.value = appState.settings.editorType;
    elements.customEditorPath.value = appState.settings.customEditorPath;
    
    // Show/hide custom editor path input based on selection
    elements.customEditorPathContainer.classList.toggle('hidden', elements.editorSelect.value !== 'custom');
    
    // Show the modal
    elements.settingsModal.classList.remove('hidden');
  });
  
  // Close settings modal
  elements.closeSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });
  
  // Cancel settings
  elements.cancelSettings.addEventListener('click', () => {
    elements.settingsModal.classList.add('hidden');
  });
  
  // Editor type select change
  elements.editorSelect.addEventListener('change', () => {
    // Show/hide custom editor path based on selection
    elements.customEditorPathContainer.classList.toggle('hidden', elements.editorSelect.value !== 'custom');
  });
  
  // Browse for custom editor
  elements.browseEditorPath.addEventListener('click', async () => {
    try {
      const result = await window.api.selectEditorPath();
      if (result.success && result.path) {
        elements.customEditorPath.value = result.path;
      }
    } catch (error) {
      showError(`Error selecting editor path: ${error.message}`);
    }
  });
  
  // Save settings
  elements.saveSettings.addEventListener('click', async () => {
    try {
      // Update app state with form values
      appState.settings.editorType = elements.editorSelect.value;
      
      if (appState.settings.editorType === 'custom') {
        appState.settings.customEditorPath = elements.customEditorPath.value.trim();
        
        // Validate custom path is not empty
        if (!appState.settings.customEditorPath) {
          showError('Please enter a path to the custom editor or select a different editor type.');
          return;
        }
      }
      
      // Save settings to main process
      const result = await window.api.saveSettings(appState.settings);
      
      if (result.success) {
        // Close modal
        elements.settingsModal.classList.add('hidden');
        updateStatus('Settings saved successfully', 'success');
      } else if (result.error) {
        showError(result.error);
      }
    } catch (error) {
      showError(`Error saving settings: ${error.message}`);
    }
  });
  
  // Close error toast
  elements.closeError.addEventListener('click', () => {
    elements.errorToast.classList.add('hidden');
  });
  
  // Close modals when clicking outside
  elements.settingsModal.addEventListener('click', (event) => {
    if (event.target === elements.settingsModal) {
      elements.settingsModal.classList.add('hidden');
    }
  });
  
  // Clean up event listeners when window is closed
  window.addEventListener('beforeunload', () => {
    window.api.removeAllListeners();
  });
}

// Set up IPC listeners for communication with main process
function setupIpcListeners() {
  // Settings loaded
  window.api.onSettingsLoaded((data) => {
    if (data.settings) {
      console.log('Received settings from main process:', data.settings);
      
      // Update app state
      appState.settings = data.settings;
      
      // Log the current application settings
      console.log('Current app settings after update:', appState.settings);
    }
  });
  
  // Repository loading started
  window.api.onRepositoryLoading((data) => {
    // Show loading state
    elements.emptyState.classList.add('hidden');
    elements.loading.classList.remove('hidden');
    elements.selectBranch.classList.add('hidden');
    elements.noDifferences.classList.add('hidden');
    elements.diffContainer.classList.add('hidden');
    
    // Update status with loading message
    updateStatus(`Loading repository: ${truncatePath(data.path)}...`, 'info');
  });
  
  // Repository loaded
  window.api.onRepositoryLoaded((data) => {
    appState.repositoryLoaded = true;
    appState.repositoryPath = data.path;
    appState.currentBranch = data.currentBranch;
    appState.targetBranch = data.targetBranch;
    appState.branches = data.branches;
    
    // We no longer need to load expanded files state since we've removed the expand/collapse feature
    
    // Hide loading state
    elements.loading.classList.add('hidden');
    
    updateUI();
    updateStatus(`Repository loaded: ${truncatePath(data.path)}`, 'success');
  });
  
  // Repository load failed
  window.api.onRepositoryLoadFailed((data) => {
    // Reset to empty state
    elements.loading.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    
    // Show error message
    showError(data.error || 'Failed to load repository');
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
    
    // Always hide empty state and select branch message
    elements.emptyState.classList.add('hidden');
    elements.selectBranch.classList.add('hidden');
    
    if (diffData && diffData.length > 0) {
      // We have differences to show
      elements.noDifferences.classList.add('hidden');
      elements.diffContainer.classList.remove('hidden');
      updateStatus(`Showing ${diffData.length} changed file${diffData.length === 1 ? '' : 's'}`, 'success');
    } else {
      // No differences found
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
      // First, make sure the dropdown is populated with all available branches
      updateBranchesDropdown();
      
      // Update application state
      appState.targetBranch = data.branch;
      
      // Mark initialization as complete to prevent dropdown resets
      initialLoadComplete = true;
      
      // Update UI to show the selected branch
      updateTargetBranchSelect();
      
      // Add a small delay to ensure the UI is fully updated before loading the diff
      setTimeout(() => {
        // Don't trigger a change event as it would reset UI state
        // Just manually generate the diff using API
        window.api.setTargetBranch(data.branch).then(result => {
          if (result.success) {
            updateStatus(`Loaded saved branch: ${data.branch}`);
          } else if (result.error) {
            showError(result.error);
          }
        }).catch(error => {
          showError(`Error setting target branch: ${error.message}`);
        });
      }, 100);
    }
  });
}

// Update just the target branch dropdown
function updateTargetBranchSelect() {
  // Do nothing if we don't have a target branch
  if (!appState.targetBranch) {
    return;
  }
  
  console.log(`Updating target branch dropdown to show: ${appState.targetBranch}`);
  
  // Find if target branch is already in the options
  const options = [...elements.targetBranchSelect.options];
  const targetBranchIndex = options.findIndex(opt => opt.value === appState.targetBranch);
  
  if (targetBranchIndex >= 0) {
    // Option exists, just select it
    elements.targetBranchSelect.selectedIndex = targetBranchIndex;
    console.log(`Selected existing option at index ${targetBranchIndex}`);
  } else if (appState.branches.includes(appState.targetBranch)) {
    // If option doesn't exist in dropdown but branch exists, add it
    const option = document.createElement('option');
    option.value = appState.targetBranch;
    option.textContent = appState.targetBranch;
    option.selected = true;
    elements.targetBranchSelect.appendChild(option);
    console.log(`Added new option for ${appState.targetBranch}`);
  } else {
    console.warn(`Target branch ${appState.targetBranch} is not in available branches list`);
  }
  
  // Double check that something is selected
  if (elements.targetBranchSelect.selectedIndex === -1 && options.length > 0) {
    console.warn('No option selected after update, forcing selection of first option');
    elements.targetBranchSelect.selectedIndex = 0;
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

// This function is no longer needed, but we'll keep an empty version
// to avoid errors in case it's called from elsewhere in the code
function updateExpandCollapseAllButton() {
  // Function intentionally left empty as expand/collapse feature has been removed
}

// Flag to prevent dropdown updates after saved branch is loaded
let initialLoadComplete = false;

// Update UI based on application state
function updateUI() {
  // Update header visibility based on repository loaded state
  elements.header.classList.toggle('hidden', !appState.repositoryLoaded);
  
  // Update header content
  if (appState.repositoryLoaded) {
    elements.repoPath.textContent = appState.repositoryPath;
    elements.currentBranch.textContent = appState.currentBranch;
  }
  
  // Only update branches dropdown during initial load
  // This prevents resetting the dropdown after we've restored a saved selection
  if (!initialLoadComplete) {
    updateBranchesDropdown();
    
    // If we have a target branch already set, mark initialization as complete
    if (appState.targetBranch) {
      console.log(`Initial UI load complete with target branch: ${appState.targetBranch}`);
      initialLoadComplete = true;
    }
  }
  
  // Update auto-refresh toggle
  elements.autoRefreshToggle.checked = appState.autoRefreshEnabled;
  elements.refreshButton.classList.toggle('hidden', appState.autoRefreshEnabled);
  
  // Force hide empty state when repository is loaded
  elements.emptyState.classList.toggle('hidden', appState.repositoryLoaded);
  
  // Update main content visibility
  if (!appState.repositoryLoaded) {
    // No repository loaded - just show empty state
    elements.selectBranch.classList.add('hidden');
    elements.loading.classList.add('hidden');
    elements.noDifferences.classList.add('hidden');
    elements.diffContainer.classList.add('hidden');
  } else {
    // Repository is loaded - ensure empty state is hidden
    elements.emptyState.classList.add('hidden');
    
    // Determine what to show next
    if (!appState.targetBranch) {
      // No target branch selected - show select branch prompt
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
    // Always make sure the empty state is hidden
    elements.emptyState.classList.add('hidden');
    
    // Show loading spinner when loading
    elements.loading.classList.toggle('hidden', !appState.isLoading);
    
    // Show no differences message when appropriate
    elements.noDifferences.classList.toggle('hidden', 
      appState.isLoading || // Hide when loading
      elements.diffContainer.children.length > 0 // Hide when we have diffs to show
    );
    
    // Show diff container when we have content and aren't loading
    elements.diffContainer.classList.toggle('hidden', 
      appState.isLoading || // Hide when loading
      elements.diffContainer.children.length === 0 // Hide when empty
    );
  }
}

// Update branches dropdown
function updateBranchesDropdown() {
  // Clear existing options
  elements.targetBranchSelect.innerHTML = '';
  
  // Save currently selected value to reselect it after rebuilding dropdown
  const previouslySelectedBranch = appState.targetBranch;
  
  // Add a placeholder/prompt option if no branch is selected
  if (!previouslySelectedBranch) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "-- Select a branch --";
    placeholderOption.selected = true;
    placeholderOption.disabled = true;
    elements.targetBranchSelect.appendChild(placeholderOption);
  }
  
  // Check if we have any branches
  if (appState.branches.length === 0) {
    console.warn('No branches available to populate dropdown');
    return;
  }
  
  // Add all available branches
  appState.branches.forEach(branch => {
    const option = document.createElement('option');
    option.value = branch;
    option.textContent = branch;
    option.selected = branch === previouslySelectedBranch;
    elements.targetBranchSelect.appendChild(option);
  });
  
  // Double-check if the selected branch is properly set in the dropdown
  if (previouslySelectedBranch) {
    const options = [...elements.targetBranchSelect.options];
    const selectedIndex = options.findIndex(opt => opt.value === previouslySelectedBranch);
    
    if (selectedIndex >= 0) {
      elements.targetBranchSelect.selectedIndex = selectedIndex;
    } else {
      console.warn(`Could not find selected branch "${previouslySelectedBranch}" in dropdown options`);
    }
  }
}

// Render diff data
function renderDiff(diffData) {
  // Clear current diff container content
  elements.diffContainer.innerHTML = '';
  
  // Always make sure the empty state is hidden
  elements.emptyState.classList.add('hidden');
  
  if (!diffData || diffData.length === 0) {
    // No differences found
    elements.noDifferences.classList.remove('hidden');
    elements.diffContainer.classList.add('hidden');
    return;
  }
  
  // We have differences to show
  elements.noDifferences.classList.add('hidden');
  elements.diffContainer.classList.remove('hidden');
  
  // Create and append file elements
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
  
  // All files are always expanded now
  const isExpanded = true;
  
  // Create file header
  const fileHeader = document.createElement('div');
  fileHeader.className = 'file-header';
  
  // Left side with filename only
  const fileHeaderLeft = document.createElement('div');
  fileHeaderLeft.className = 'file-header-left';
  
  // Add filename
  const fileNameSpan = document.createElement('span');
  fileNameSpan.textContent = file.path;
  fileHeaderLeft.appendChild(fileNameSpan);
  
  // Right side with external link icon only
  const fileHeaderRight = document.createElement('div');
  fileHeaderRight.className = 'file-header-right';
  
  // Add external link icon
  const openFileIcon = document.createElement('i');
  openFileIcon.setAttribute('data-lucide', 'external-link');
  fileHeaderRight.appendChild(openFileIcon);
  
  // No more expand/collapse functionality, so we'll just create an empty element
  const fileHeaderFarRight = document.createElement('div');
  fileHeaderFarRight.className = 'file-header-far-right';
  
  // Add all sections to header
  fileHeader.appendChild(fileHeaderLeft);
  fileHeader.appendChild(fileHeaderRight);
  fileHeader.appendChild(fileHeaderFarRight);
  
  // Add click handler to open file when clicking on left side (the filename area)
  fileHeaderLeft.addEventListener('click', async (event) => {
    try {
      await window.api.openFile(file.path);
    } catch (error) {
      showError(`Error opening file: ${error.message}`);
    }
  });
  
  // We no longer need a click handler for the far right section 
  // since we've removed the expand/collapse functionality
  
  // Add click handler to open file when clicking on the external link icon
  openFileIcon.addEventListener('click', async (event) => {
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

// This function is no longer needed, but we'll keep an empty version
// to avoid errors in case it's called from elsewhere in the code
function isFileExpanded(filePath) {
  // Always return true since we removed expand/collapse functionality
  return true;
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