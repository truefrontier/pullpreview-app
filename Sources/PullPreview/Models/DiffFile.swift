import Foundation

struct DiffFile: Identifiable {
    let id = UUID()
    let path: String
    let isBinary: Bool
    let hunks: [DiffHunk]
    
    // For binary files
    init(path: String) {
        self.path = path
        self.isBinary = true
        self.hunks = []
    }
    
    // For text files
    init(path: String, hunks: [DiffHunk]) {
        self.path = path
        self.isBinary = false
        self.hunks = hunks
    }
}

struct DiffHunk: Identifiable {
    let id = UUID()
    let oldStart: Int
    let oldCount: Int
    let newStart: Int
    let newCount: Int
    let lines: [DiffLine]
}

struct DiffLine: Identifiable {
    enum LineType {
        case context
        case addition
        case deletion
    }
    
    let id = UUID()
    let type: LineType
    let content: String
    let lineNumber: Int?
    
    var typeSymbol: String {
        switch type {
        case .context: return " "
        case .addition: return "+"
        case .deletion: return "-"
        }
    }
}