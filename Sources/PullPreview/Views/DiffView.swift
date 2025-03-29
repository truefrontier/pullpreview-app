import SwiftUI

struct DiffView: View {
    @EnvironmentObject private var appState: AppState
    let diffFiles: [DiffFile]
    
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                ForEach(diffFiles) { file in
                    DiffFileView(file: file)
                }
            }
            .padding()
        }
        .background(Color(.textBackgroundColor))
    }
}

struct DiffFileView: View {
    @EnvironmentObject private var appState: AppState
    let file: DiffFile
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Button {
                    appState.openFile(at: file.path)
                } label: {
                    Text(file.path)
                        .font(.system(.headline, design: .monospaced))
                        .foregroundColor(.primary)
                }
                .buttonStyle(.plain)
                
                Spacer()
                
                Image(systemName: "arrow.up.forward.square")
                    .foregroundColor(.secondary)
                    .onTapGesture {
                        appState.openFile(at: file.path)
                    }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(Color(.controlBackgroundColor))
            .cornerRadius(4)
            
            if file.isBinary {
                Text("Binary file changed")
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.textBackgroundColor))
                    .border(Color(.separatorColor), width: 1)
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(file.hunks) { hunk in
                        DiffHunkView(hunk: hunk)
                    }
                }
                .background(Color(.textBackgroundColor))
                .border(Color(.separatorColor), width: 1)
            }
        }
    }
}

struct DiffHunkView: View {
    let hunk: DiffHunk
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("@@ -\(hunk.oldStart),\(hunk.oldCount) +\(hunk.newStart),\(hunk.newCount) @@")
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(.secondary)
                .padding(.vertical, 4)
                .padding(.horizontal, 8)
                .background(Color(.controlBackgroundColor).opacity(0.5))
                .frame(maxWidth: .infinity, alignment: .leading)
            
            ForEach(hunk.lines) { line in
                DiffLineView(line: line)
            }
        }
    }
}

struct DiffLineView: View {
    let line: DiffLine
    
    var body: some View {
        HStack(spacing: 0) {
            Text(line.typeSymbol)
                .font(.system(.body, design: .monospaced))
                .frame(width: 20)
                .foregroundColor(.secondary)
            
            if let lineNumber = line.lineNumber {
                Text("\(lineNumber)")
                    .font(.system(.body, design: .monospaced))
                    .frame(width: 40, alignment: .trailing)
                    .foregroundColor(.secondary)
                    .padding(.trailing, 8)
            } else {
                Text("")
                    .font(.system(.body, design: .monospaced))
                    .frame(width: 40, alignment: .trailing)
                    .padding(.trailing, 8)
            }
            
            Text(line.content)
                .font(.system(.body, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 2)
        .padding(.horizontal, 8)
        .background(
            backgroundColor
                .animation(.easeInOut, value: line.type)
        )
    }
    
    private var backgroundColor: Color {
        switch line.type {
        case .addition:
            return Color.green.opacity(0.2)
        case .deletion:
            return Color.red.opacity(0.2)
        case .context:
            return Color.clear
        }
    }
}