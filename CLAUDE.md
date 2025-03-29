# PullPreview - Development Guidelines

## Build, Run & Test Commands
- Install dependencies: `npm install`
- Start application: `npm start`
- Development mode with hot reload: `npm run dev`
- Build application: `npm run build`
- Package application: `npm run pack`
- Generate macOS icons: `npm run generate-icons`

## Code Style Guidelines
- **Architecture**: Follow a clean separation between main process and renderer process
- **Formatting**: Use consistent indentation (2 spaces) and semicolons
- **Naming**: Use descriptive camelCase for variables/functions, PascalCase for components
- **Imports**: Group imports by type - Node built-ins first, then npm packages, then local imports
- **Error Handling**: Use try/catch blocks with specific error messages, log errors with console.error
- **UI/UX**: Support both Light and Dark mode across all platforms
- **Font**: Use Hack monospaced font for diff displays with fallback to system font
- **Git**: Create focused commits with descriptive messages, use feature branches
- **Performance**: Keep Git operations and file system monitoring efficient with proper debouncing
- **Documentation**: Add comments for complex logic and document public interfaces