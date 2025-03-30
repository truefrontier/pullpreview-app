# PR Preview Watcher Roadmap

## Current Development Priorities
- [x] Add sorting dropdown 
  - Default to file last modified
  - A-Z ↑ and ↓
- [x] Add expand/collapse for diff files
- [x] Move toggle refresh to settings modal

### Persistence Improvements
- [x] Add keyboard shortcuts
  - Settings available on `⌘.`
- [x] Add new window `⌘N`
  - Removed Change Folder button
- [ ] Add new tab `⌘T`

### Feature Additions
- [ ] ~~Stage/unstage changes directly in the app~~ (Removed)

## Future Enhancements

These items are planned for future releases based on the project specification:

- Configurable refresh intervals
- Support for multiple repository windows or tabs
- Syntax highlighting within diff content based on file type
- Improved binary file diff display

# Changelog

## [Unreleased]
- Added sorting dropdown with options for Last Modified, A-Z, and Z-A
- Re-enabled expand/collapse functionality for diff files
- Added keyboard shortcuts for application menu, new window, and settings
- Removed Change Folder button, added File menu with Open Repository option
- Removed stage/unstage functionality for a cleaner interface
- Moved auto-refresh toggle from toolbar to settings modal
- Added persistence for repository path and target branch between sessions
- Added settings modal with option to select preferred code editor
- Fixed repository loading UX to show proper loading state
- Improved file expansion/collapse behavior in diff view
- Fixed settings persistence across app sessions
- Added persistence for file expansion state across repositories
- Fixed "Expand All" button error and improved error handling for icon updates
- Fixed error when saving file expansion state with undefined repository path
- Improved settings persistence reliability with additional null checks and error handling
- Moved collapse icon to far right and made entire file header sections clickable