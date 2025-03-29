import Foundation
import SwiftUI

@MainActor
class AppState: ObservableObject {
    @Published var repositoryPath: String = ""
    @Published var currentBranch: String = ""
    @Published var targetBranch: String = ""
    @Published var availableBranches: [String] = []
    @Published var diffContent: [DiffFile] = []
    @Published var isLoading: Bool = false
    @Published var autoRefreshEnabled: Bool = true
    @Published var errorMessage: String?
    
    private var fileWatcher: FileWatcher?
    private var refreshTimer: Timer?
    private let defaults = UserDefaults.standard
    
    init() {
        loadSavedState()
        setupAutoRefresh()
    }
    
    private func loadSavedState() {
        repositoryPath = defaults.string(forKey: "repositoryPath") ?? ""
        targetBranch = defaults.string(forKey: "targetBranch") ?? "main"
        autoRefreshEnabled = defaults.bool(forKey: "autoRefreshEnabled")
        
        if !repositoryPath.isEmpty {
            Task {
                await loadRepository()
            }
        }
    }
    
    private func saveState() {
        defaults.set(repositoryPath, forKey: "repositoryPath")
        defaults.set(targetBranch, forKey: "targetBranch")
        defaults.set(autoRefreshEnabled, forKey: "autoRefreshEnabled")
    }
    
    func selectRepository() async {
        // This would use NSOpenPanel in a real macOS app
        // For now, we'll simulate it with a placeholder
        
        // Simulate repository selection
        let newPath = "/path/to/repository"
        
        if await validateRepository(path: newPath) {
            repositoryPath = newPath
            saveState()
            await loadRepository()
        } else {
            errorMessage = "Selected directory is not a valid Git repository."
        }
    }
    
    private func validateRepository(path: String) async -> Bool {
        // Check if .git directory exists
        let gitDirURL = URL(fileURLWithPath: path).appendingPathComponent(".git")
        return FileManager.default.fileExists(atPath: gitDirURL.path)
    }
    
    private func loadRepository() async {
        isLoading = true
        defer { isLoading = false }
        
        // Get current branch
        currentBranch = await GitService.getCurrentBranch(at: repositoryPath) ?? "unknown"
        
        // Get available branches
        availableBranches = await GitService.getAllBranches(at: repositoryPath)
        
        // Load diff
        await refreshDiff()
        
        // Setup file watching if needed
        setupFileWatcher()
    }
    
    func refreshDiff() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            diffContent = try await GitService.getDiff(
                repositoryPath: repositoryPath,
                targetBranch: targetBranch
            )
            errorMessage = nil
        } catch {
            errorMessage = "Failed to generate diff: \(error.localizedDescription)"
        }
    }
    
    func setTargetBranch(_ branch: String) {
        targetBranch = branch
        saveState()
        Task {
            await refreshDiff()
        }
    }
    
    func toggleAutoRefresh() {
        autoRefreshEnabled.toggle()
        saveState()
        setupAutoRefresh()
    }
    
    private func setupAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
        fileWatcher?.stop()
        fileWatcher = nil
        
        if autoRefreshEnabled && !repositoryPath.isEmpty {
            // Set up file watcher
            setupFileWatcher()
            
            // Set up periodic refresh timer (every 2 minutes)
            refreshTimer = Timer.scheduledTimer(withTimeInterval: 120, repeats: true) { [weak self] _ in
                Task { [weak self] in
                    await self?.refreshDiff()
                }
            }
        }
    }
    
    private func setupFileWatcher() {
        guard autoRefreshEnabled && !repositoryPath.isEmpty else { return }
        
        fileWatcher = FileWatcher(path: repositoryPath)
        fileWatcher?.onFileChange = { [weak self] in
            Task { [weak self] in
                // Debounce using a short delay
                try? await Task.sleep(nanoseconds: 500_000_000) // 500ms
                await self?.refreshDiff()
            }
        }
        fileWatcher?.start()
    }
    
    func openFile(at path: String) {
        let fullPath = URL(fileURLWithPath: repositoryPath).appendingPathComponent(path)
        NSWorkspace.shared.open(fullPath)
    }
}