# PR Preview Watcher - Development Guidelines

## Build, Run & Test Commands
- Build project: `swift build`
- Run application: `swift run`
- Run all tests: `swift test`
- Run single test: `swift test --filter TestSuiteName.testMethodName`
- Lint: `swiftlint`
- Format code: `swiftformat .`

## Code Style Guidelines
- **Architecture**: Follow MVVM pattern with SwiftUI
- **Formatting**: Use SwiftFormat with default settings
- **Naming**: Use descriptive camelCase for variables/methods, CapitalCase for types
- **Imports**: Group imports alphabetically, Foundation/SwiftUI first, then others
- **Error Handling**: Use async/await with do-catch blocks, never force-unwrap optionals
- **Types**: Always specify types for properties and function returns
- **Comments**: Document public interfaces with /// documentation comments
- **UI/UX**: Support both Light and Dark mode, respect macOS design guidelines
- **Git**: Create focused commits with descriptive messages, use feature branches
- **Concurrency**: Run Git operations on background threads using Swift Concurrency
- **Font**: Use Hack monospaced font for diff displays with fallback to system font