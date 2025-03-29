import SwiftUI

struct HeaderView: View {
    @EnvironmentObject private var appState: AppState
    
    var body: some View {
        if !appState.repositoryPath.isEmpty {
            VStack(spacing: 8) {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Repository:")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        
                        Text(appState.repositoryPath)
                            .font(.caption)
                            .foregroundColor(.primary)
                    }
                    
                    Spacer()
                    
                    Toggle("Auto-Refresh", isOn: Binding(
                        get: { appState.autoRefreshEnabled },
                        set: { _ in appState.toggleAutoRefresh() }
                    ))
                    .toggleStyle(.switch)
                    
                    if !appState.autoRefreshEnabled {
                        Button {
                            Task {
                                await appState.refreshDiff()
                            }
                        } label: {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                        .buttonStyle(.bordered)
                        .disabled(appState.isLoading)
                    }
                }
                
                HStack {
                    VStack(alignment: .leading) {
                        Text("Current Branch:")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        
                        Text(appState.currentBranch)
                            .bold()
                            .foregroundColor(.primary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing) {
                        Text("Target Branch:")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        
                        Picker("", selection: Binding(
                            get: { appState.targetBranch },
                            set: { appState.setTargetBranch($0) }
                        )) {
                            ForEach(appState.availableBranches, id: \.self) { branch in
                                Text(branch).tag(branch)
                            }
                        }
                        .labelsHidden()
                        .frame(minWidth: 150)
                    }
                }
            }
            .padding()
            .background(Color(.controlBackgroundColor))
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(Color(.separatorColor)),
                alignment: .bottom
            )
        }
    }
}