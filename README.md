**Project Title:** PR Preview Watcher

**Version:** 1.0

**1. Overview & Vision**

PR Preview Watcher is a native macOS desktop application designed to streamline the developer workflow by providing a real-time, local preview of Git differences. It allows developers to visualize changes between their current working branch (including uncommitted modifications) and a selected target branch *before* creating a formal pull request. The application aims to offer a minimal, modern, and intuitive interface that mimics the core diff-viewing experience of platforms like GitHub/GitLab but operates entirely locally.

**2. Target Platform & Technology**

* **OS:** macOS 13.0 (Ventura) or later.
* **Technology:**
    * **Primary:** Native macOS using **Swift** and **SwiftUI**. This is strongly preferred for optimal performance, system integration, and adherence to macOS design principles.
    * **Alternative (Less Preferred):** Electron.js could be considered if cross-platform potential becomes a future priority, but native is the target for V1.
* **Architecture:** Standard macOS application architecture (e.g., MVVM with SwiftUI).

**3. Core Features**

* **3.1. Repository Selection & Validation:**
    * On first launch or when no repository is active, present a standard macOS folder selection dialog.
    * Validate the selected folder contains a `.git` directory.
    * Display a user-friendly error message and re-prompt if the selection is not a valid Git repository root.
    * Persist the path of the last successfully opened repository (`UserDefaults`) for quicker access on subsequent launches.

* **3.2. Branch Selection:**
    * Upon valid repository selection, display the main application window.
    * Automatically detect and display the *current* active branch (`git rev-parse --abbrev-ref HEAD`). Update this if the branch changes externally (detected via refresh/watch).
    * Provide a clear UI element (e.g., dropdown) to select the *target* branch for comparison.
    * Populate the target branch list with local and remote-tracking branches (`git branch -a`), clearly distinguishing them (e.g., `main`, `develop`, `origin/main`). Fetching may be required (`git fetch --prune`) initially or periodically to ensure the list is up-to-date.
    * Persist the selected target branch per repository (`UserDefaults`).

* **3.3. Git Diff Preview Display:**
    * Generate and display the diff between the **current working tree** (including staged and unstaged changes) of the active branch and the **HEAD** of the selected *target* branch. (Command equivalent: `git diff <selected_target_branch> --`).
    * Present the diff in a clear, scrollable view:
        * List changed files.
        * Show additions (+) and deletions (-) with distinct visual cues (e.g., background colors - light green/red).
        * Include context lines for readability.
        * Use the **Hack** monospaced font (currently at the root of this project; feel free to move) for the diff view content. The app should attempt to locate Hack in the system's font directory; if not found, it should fall back gracefully to a default system monospaced font (e.g., Menlo) and perhaps notify the user. Consider bundling the font if system detection is unreliable.

* **3.4. Refresh Mechanism (Automatic & Manual):**
    * Include an "Auto-Refresh" toggle switch (persisted state via `UserDefaults`).
    * **Auto-Refresh ON:**
        * **Local Changes:** Monitor the repository directory using macOS FSEvents API. Upon detecting changes (file saves, deletions, etc.), re-generate the diff after a short debounce period (e.g., 500ms-1s) to prevent excessive updates.
        * **Remote Changes:** Periodically (e.g., every 1-5 minutes, configurable or fixed) run `git fetch <remote> <target_branch>` for the target branch in the background. If the fetched commit hash differs from the last known hash, re-generate the diff. Provide subtle visual feedback during fetch.
    * **Auto-Refresh OFF:**
        * Display a manual "Refresh" button.
        * Clicking "Refresh" triggers both a local diff regeneration and a remote `git fetch` check for the target branch, then updates the view. Provide visual feedback during refresh.

* **3.5. Open File in External Editor:**
    * Make file paths/names listed in the diff view interactive (e.g., clickable headers above each file's diff).
    * On click, construct the absolute file path (Repo Root + Relative Path from diff) and use `NSWorkspace.shared.open()` (or SwiftUI equivalent) to open the file in the system's default application for that file type.

**4. UI/UX Design**

* **Aesthetic:** Minimal, clean, and modern, adhering to contemporary macOS design guidelines.
* **Color Scheme:** Full support for macOS **Light and Dark Modes**, automatically adapting to the system appearance setting. Use standard system colors and materials where appropriate.
* **Layout:**
    * Single primary window.
    * Clear header displaying repository path, current branch, and selected target branch.
    * Prominently placed Auto-Refresh toggle and Manual Refresh button (conditional visibility).
    * Main area dedicated to the scrollable diff view.
* **Diff View Styling:**
    * Use the **Hack** font (or fallback) for diff text.
    * Employ distinct but non-jarring background colors for added (+) and removed (-) lines, consistent with typical diff viewer conventions (e.g., light green/red). Ensure good contrast in both Light and Dark modes.
* **Feedback:** Provide clear visual indicators for loading states (e.g., fetching, calculating diff), success, errors, and empty states (e.g., "No differences found"). Use non-modal notifications or status bar text where appropriate.

**5. Technical Requirements**

* **Git Interaction:**
    * Option A (Recommended): Execute `git` CLI commands via `Process` asynchronously. Requires robust parsing of stdout/stderr and assumes `git` is in the user's PATH.
    * Option B: Integrate a Swift Git library (e.g., `SwiftGit2`). Adds dependency but offers more structured interaction.
    * All Git operations must run on background threads (GCD, Swift Concurrency) to keep the UI responsive.
* **File System Monitoring:** Use FSEvents API directly or via a reliable wrapper. Implement debouncing for change events.
* **Diff Parsing/Rendering:** Parse raw `git diff` output. Use `AttributedString` in SwiftUI for basic styling (colors) or investigate dedicated diff rendering views if needed for performance with very large diffs.
* **Font Handling:** Implement logic to detect the Hack font. If bundling, ensure proper font registration.
* **Performance:** Optimize for large repositories and large diffs. Consider virtualization or lazy loading for the diff view if performance becomes an issue. Async operations are critical.
* **Persistence:** Use `UserDefaults` for storing repository path, target branch selections (per repo), and the auto-refresh toggle state.
* **Error Handling:** Gracefully handle potential errors: invalid repo, Git command failures, network errors during fetch, file permission issues, file not found on open, missing Hack font. Display clear, non-technical error messages to the user.

**6. Edge Cases**

* Repository in a conflicted state. (Diff command might fail; report error).
* Repository with submodules (V1 likely ignores submodule changes unless explicitly included in diff).
* Newly initialized repository with no commits or branches.
* Binary file changes (Diff output is different; display simply "Binary file changed" or similar).

**7. Deliverables**

* Source code repository (e.g., GitHub) with README (setup, build, run instructions).
* Packaged macOS application (.app bundle, potentially within a .dmg installer).

**8. Testing Strategy**

* **Unit Tests:** For Git output parsing, diff logic, state management.
* **Integration Tests:** Simulating user flows (selecting repo, branches, refresh).
* **Manual Testing:** Across different macOS versions (Ventura+), various repository sizes/states, different file types, light/dark modes, with/without Hack font installed, network connectivity variations.

**9. Future Enhancements (Post-V1)**

* Side-by-side diff view option.
* Support for comparing arbitrary commits/tags.
* Ability to stage/unstage changes directly.
* Configurable refresh intervals.
* Support for multiple repository windows or tabs.
* Syntax highlighting within the diff content based on file type.
* Handling of Git LFS objects.
