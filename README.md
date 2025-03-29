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
* The application remembers your last opened repository for convenience

### Branch Selection
* Automatically detects and displays your current active branch
* Select any target branch for comparison from a dropdown menu
* Supports both local and remote-tracking branches

### Git Diff Preview Display
* Real-time display of differences between your working branch and the target branch
* Clear, scrollable view of all changed files
* Visual indicators for additions and deletions with appropriate color coding
* Syntax highlighting using the Hack monospaced font for improved readability

### Auto-Refresh Functionality
* Toggle automatic refresh on or off according to your preference
* When enabled, the diff view updates automatically when:
  * Local files change in your repository
  * Remote changes are detected on the target branch
* Manual refresh button available when auto-refresh is disabled

### External Editor Integration
* Click on any file in the diff view to open it in your default editor
* Seamlessly transition from reviewing changes to making edits

## User Interface

* Modern, clean design that follows desktop application standards
* Full support for both light and dark modes across all platforms
* Clear header showing repository path, current branch, and target branch
* Intuitive controls for auto-refresh and manual refresh options
* Responsive layout that adapts to different window sizes

## Technical Details

* Built with Electron.js for cross-platform compatibility
* Uses simple-git for reliable Git integration
* File system monitoring via chokidar for real-time updates
* Persistence of preferences and recently used repositories
* Graceful error handling for all Git operations and edge cases

## Installation & Usage

### Prerequisites
* Git must be installed and accessible in your PATH
* Node.js 16+ (if building from source)

### Download & Install
Download the latest version for your platform from the releases page.

### Running from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/pull-preview.git

# Install dependencies
cd pull-preview
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
```

## Roadmap

See our [ROADMAP.md](/ROADMAP.md) file for upcoming features and enhancements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
