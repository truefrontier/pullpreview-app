# PR Preview Watcher Roadmap

## Current Development Priorities

### Usability Improvements
- [ ] Fix repository loading UX
  - Show loading state when reopening a previously saved repository 
  - Remove confusing "select repo" message when loading saved repo data
- [ ] Improve file expansion/collapse behavior
  - Move expand/collapse icon to the right side of the file header
  - Make the entire filepath clickable to open the file (restore original behavior)
  - Fix icon state to properly indicate expanded/collapsed state
  - Fix "Expand All" button (currently shows error: "Cannot read properties of null (reading 'setAttribute')")
  - Rename "Expand All" to "Collapse All" when files are expanded

### Persistence Improvements
- [ ] Persist settings across app sessions
  - Save preferred code editor setting between app restarts
  - Store file expansion state by filename across all repositories
- [ ] Add keyboard shortcuts

### Feature Additions
- [ ] Enable window tabs to open multiple repositories
- [ ] Implement side-by-side diff view (from Future Enhancements)

## Future Enhancements

These items are planned for future releases based on the project specification:

- Compare arbitrary commits/tags
- Stage/unstage changes directly in the app
- Configurable refresh intervals
- Support for multiple repository windows or tabs
- Syntax highlighting within diff content based on file type
- Handling of Git LFS objects
- Improved binary file diff display

# Changelog

## [Unreleased]
- Added expand/collapse functionality for diff files
- Added persistence for repository path and target branch between sessions
- Added settings modal with option to select preferred code editor