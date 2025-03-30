# PullPreview

![PullPreview Logo](/PullPreviewLogo.png)

## Overview

PullPreview is a cross-platform desktop application designed to streamline the developer workflow by providing a real-time, local preview of Git differences. It allows developers to visualize changes between their current working branch (including uncommitted modifications) and a selected target branch *before* creating a formal pull request. The application offers a minimal, modern, and intuitive interface that mimics the core diff-viewing experience of platforms like GitHub/GitLab but operates entirely locally.

## Platform & Technology

* **Supported OS:** macOS, Windows, and Linux
* **Built with:** Electron.js
* **Current version:** 1.0.0

## Features

### Repository Selection & Validation
* Select any Git repository on your file system
* Validation ensures the selected folder contains a valid `.git` directory
* The application remembers your last opened repository and target branch for convenience

### Branch Selection
* Automatically detects and displays your current active branch
* Select any target branch for comparison from a dropdown menu
* Supports both local and remote-tracking branches
* Remembers your last selected target branch between sessions

### Git Diff Preview Display
* Real-time display of differences between your working branch and the target branch
* Clear, scrollable view of all changed files with expandable/collapsible sections
* Visual indicators for additions and deletions with appropriate color coding
* Syntax highlighting using the Hack monospaced font for improved readability
* Supports multiple sort options (Last Modified, A-Z, Z-A)

### Auto-Refresh Functionality
* Configure automatic refresh in settings
* When enabled, the diff view updates automatically when:
  * Local files change in your repository
  * Remote changes are detected on the target branch
* Manual refresh button (or keyboard shortcut ⌘R) available when auto-refresh is disabled

### External Editor Integration
* Click on any file in the diff view to open it in your preferred editor
* Configure your preferred editor in settings (system default, VS Code, Sublime Text, Atom, or custom)
* Seamlessly transition from reviewing changes to making edits

## User Interface

* Modern, clean design that follows desktop application standards
* Full support for both light and dark modes across all platforms
* Clear header showing current branch and target branch
* Responsive layout that adapts to different window sizes
* Keyboard shortcuts for common operations (⌘N for new window, ⌘O for open repository, ⌘R for refresh, ⌘, for settings)

## Technical Details

* Built with Electron.js for cross-platform compatibility
* Uses simple-git for reliable Git integration
* File system monitoring via chokidar for real-time updates
* Persistence of preferences and recently used repositories
* Graceful error handling for all Git operations and edge cases
* Full app state persistence between sessions

## Installation & Usage

### Prerequisites
* Git must be installed and accessible in your PATH
* Node.js 16+ (if building from source)

### Download & Install
Download the latest version for your platform from the releases page.

### Running from Source
```bash
# Clone the repository
git clone https://github.com/truefrontier/pullpreview-app.git

# Install dependencies
cd pullpreview-app
npm install

# Start the application
npm start

# For development with hot reloading
npm run dev
```

### Building from Source
```bash
# Build for your current platform
npm run build

# Package the application
npm run pack

# Generate macOS icons (macOS only)
npm run generate-icons
```

## Keyboard Shortcuts

* **⌘N** - Open new window
* **⌘O** - Open repository
* **⌘R** - Refresh diff
* **⌘,** - Open settings
* **⌘+** / **⌘-** - Zoom in/out

## Roadmap

See our [ROADMAP.md](/ROADMAP.md) file for upcoming features and enhancements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
