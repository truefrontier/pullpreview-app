# PR Preview Watcher Roadmap

## Current Development Priorities
- [x] Add sorting dropdown 
  - Default to file last modified
  - A-Z ↑ and ↓
- [x] Add expand/collapse for diff files


### Persistence Improvements
- [x] Add keyboard shortcuts
  - Settings available on `⌘,`
- [x] Add new window `⌘N`
  - Removed Change Folder button
- [ ] Add new tab `⌘T`

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