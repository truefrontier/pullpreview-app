import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState
    
    var body: some View {
        VStack(spacing: 0) {
            HeaderView()
            
            if appState.repositoryPath.isEmpty {
                EmptyStateView()
            } else if !appState.diffContent.isEmpty {
                DiffView(diffFiles: appState.diffContent)
            } else if appState.isLoading {
                LoadingView()
            } else {
                NoDifferencesView()
            }
        }
        .alert(
            "Error",
            isPresented: .constant(appState.errorMessage != nil),
            actions: {
                Button("OK") {
                    appState.errorMessage = nil
                }
            },
            message: {
                if let errorMessage = appState.errorMessage {
                    Text(errorMessage)
                }
            }
        )
    }
}

struct EmptyStateView: View {
    @EnvironmentObject private var appState: AppState
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "folder.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No Repository Selected")
                .font(.title2)
            
            Text("Select a Git repository to view differences")
                .foregroundColor(.secondary)
            
            Button("Open Repository...") {
                Task {
                    await appState.selectRepository()
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.textBackgroundColor))
    }
}

struct LoadingView: View {
    var body: some View {
        VStack {
            ProgressView()
                .scaleEffect(1.5)
                .padding()
            
            Text("Loading diff...")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.textBackgroundColor))
    }
}

struct NoDifferencesView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 60, design: .rounded))
                .foregroundColor(.green)
            
            Text("No Differences Found")
                .font(.title2)
            
            Text("Your branch is up to date with the target branch")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.textBackgroundColor))
    }
}