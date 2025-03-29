import Foundation

enum GitError: Error {
    case commandFailed(String)
    case invalidOutput
    case invalidRepository
}

struct GitService {
    static func executeGitCommand(_ args: [String], at path: String) async throws -> String {
        let process = Process()
        let pipe = Pipe()
        
        process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
        process.arguments = args
        process.currentDirectoryURL = URL(fileURLWithPath: path)
        process.standardOutput = pipe
        process.standardError = pipe
        
        do {
            try process.run()
            process.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8) ?? ""
            
            if process.terminationStatus != 0 {
                throw GitError.commandFailed(output)
            }
            
            return output
        } catch {
            throw GitError.commandFailed(error.localizedDescription)
        }
    }
    
    static func getCurrentBranch(at path: String) async -> String? {
        do {
            let output = try await executeGitCommand(["rev-parse", "--abbrev-ref", "HEAD"], at: path)
            return output.trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            return nil
        }
    }
    
    static func getAllBranches(at path: String) async -> [String] {
        do {
            // Fetch from remote to ensure branch list is up-to-date
            _ = try? await executeGitCommand(["fetch", "--prune"], at: path)
            
            let output = try await executeGitCommand(["branch", "-a"], at: path)
            
            return output
                .components(separatedBy: .newlines)
                .compactMap { line -> String? in
                    let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else { return nil }
                    
                    // Remove the '*' marker from the current branch
                    let branchName = trimmed.hasPrefix("*") 
                        ? String(trimmed.dropFirst(2)) 
                        : trimmed
                    
                    return branchName
                }
        } catch {
            return []
        }
    }
    
    static func getDiff(repositoryPath: String, targetBranch: String) async throws -> [DiffFile] {
        guard !repositoryPath.isEmpty && !targetBranch.isEmpty else {
            throw GitError.invalidRepository
        }
        
        let output = try await executeGitCommand(["diff", targetBranch, "--"], at: repositoryPath)
        return parseDiffOutput(output)
    }
    
    private static func parseDiffOutput(_ output: String) -> [DiffFile] {
        var diffFiles: [DiffFile] = []
        var currentFile: String?
        var currentHunks: [DiffHunk] = []
        var currentLines: [DiffLine] = []
        var oldStart: Int = 0
        var oldCount: Int = 0
        var newStart: Int = 0
        var newCount: Int = 0
        
        let lines = output.components(separatedBy: .newlines)
        
        for line in lines {
            if line.starts(with: "diff --git") {
                // New file diff
                if let currentFile = currentFile {
                    if !currentLines.isEmpty {
                        currentHunks.append(DiffHunk(
                            oldStart: oldStart,
                            oldCount: oldCount,
                            newStart: newStart,
                            newCount: newCount,
                            lines: currentLines
                        ))
                    }
                    
                    diffFiles.append(DiffFile(path: currentFile, hunks: currentHunks))
                }
                
                // Extract file path
                let components = line.components(separatedBy: " ")
                if components.count >= 4 {
                    // Extract path from "diff --git a/path b/path"
                    let path = String(components[3].dropFirst(2)) // Remove "b/"
                    currentFile = path
                    currentHunks = []
                    currentLines = []
                }
            } else if line.starts(with: "Binary files") {
                if let currentFile = currentFile {
                    diffFiles.append(DiffFile(path: currentFile))
                }
                currentFile = nil
            } else if let hunkHeaderMatch = line.range(of: #"@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@"#, options: .regularExpression) {
                // New hunk
                if !currentLines.isEmpty {
                    currentHunks.append(DiffHunk(
                        oldStart: oldStart,
                        oldCount: oldCount,
                        newStart: newStart,
                        newCount: newCount,
                        lines: currentLines
                    ))
                    currentLines = []
                }
                
                let hunkHeader = String(line[hunkHeaderMatch])
                
                // Simple parsing using regular expressions
                // Extract numbers from something like "@@ -1,2 +3,4 @@"
                let regex = try? NSRegularExpression(pattern: "-([0-9]+),?([0-9]*) \\+([0-9]+),?([0-9]*)")
                
                if let regex = regex, 
                   let match = regex.firstMatch(in: hunkHeader, 
                                              range: NSRange(hunkHeader.startIndex..., in: hunkHeader)) {
                    // Extract oldStart
                    if let range = Range(match.range(at: 1), in: hunkHeader) {
                        oldStart = Int(hunkHeader[range]) ?? 0
                    }
                    
                    // Extract oldCount
                    if let range = Range(match.range(at: 2), in: hunkHeader), !hunkHeader[range].isEmpty {
                        oldCount = Int(hunkHeader[range]) ?? 1
                    }
                    
                    // Extract newStart
                    if let range = Range(match.range(at: 3), in: hunkHeader) {
                        newStart = Int(hunkHeader[range]) ?? 0
                    }
                    
                    // Extract newCount
                    if let range = Range(match.range(at: 4), in: hunkHeader), !hunkHeader[range].isEmpty {
                        newCount = Int(hunkHeader[range]) ?? 1
                    }
                }
            } else if let currentFile = currentFile, !currentFile.isEmpty {
                // Diff line content
                if line.isEmpty { continue }
                
                let lineType: DiffLine.LineType
                let lineNumber: Int?
                
                if line.starts(with: "+") {
                    lineType = .addition
                    lineNumber = newStart
                    newStart += 1
                } else if line.starts(with: "-") {
                    lineType = .deletion
                    lineNumber = oldStart
                    oldStart += 1
                } else {
                    lineType = .context
                    lineNumber = newStart
                    newStart += 1
                    oldStart += 1
                }
                
                let content = String(line.dropFirst(1))
                currentLines.append(DiffLine(type: lineType, content: content, lineNumber: lineNumber))
            }
        }
        
        // Add the last hunk and file if any
        if let currentFile = currentFile, !currentLines.isEmpty {
            currentHunks.append(DiffHunk(
                oldStart: oldStart,
                oldCount: oldCount,
                newStart: newStart,
                newCount: newCount,
                lines: currentLines
            ))
            diffFiles.append(DiffFile(path: currentFile, hunks: currentHunks))
        }
        
        return diffFiles
    }
}