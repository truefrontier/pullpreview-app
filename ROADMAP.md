# PR Preview Watcher Roadmap

## Current Development Priorities

### Usability Improvements
- [x] Improve file expansion/collapse behavior
  - Move expand/collapse icon ALL the way to the right side of the file header ✓
  - Make the entire filepath bar is clickable to open the file ✓
  - Fix icon state to properly indicate expanded/collapsed state ✓
  - Fix "Expand All" button (currently shows error: "Cannot read properties of null (reading 'setAttribute')") ✓
  - Initial Default state of expand/collapse button should be Collapse All ✓

### Persistence Improvements
- [x] Persist settings across app sessions
  - Save preferred code editor setting between app restarts
- [x] Store file expansion state by filename across all repositories
- [ ] Add keyboard shortcuts

### Feature Additions
- [ ] Stage/unstage changes directly in the app
	- use a checkbox on the left side of the filename bar to handle the staged state of a the entire file
- [ ] Enable window tabs to open multiple repositories

## Future Enhancements

These items are planned for future releases based on the project specification:

- Configurable refresh intervals
- Support for multiple repository windows or tabs
- Syntax highlighting within diff content based on file type
- Improved binary file diff display

# Changelog

## [Unreleased]
- Added expand/collapse functionality for diff files
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