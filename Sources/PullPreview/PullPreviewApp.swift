import SwiftUI

struct PullPreviewApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
        .commands {
            CommandMenu("Repository") {
                Button("Open Repository...") {
                    Task {
                        await appState.selectRepository()
                    }
                }
                .keyboardShortcut("O", modifiers: [.command])
                
                Button("Refresh") {
                    Task {
                        await appState.refreshDiff()
                    }
                }
                .keyboardShortcut("R", modifiers: [.command])
                .disabled(appState.repositoryPath.isEmpty)
            }
        }
    }
}