import Foundation

class FileWatcher {
    private var source: DispatchSourceFileSystemObject?
    private var fileDescriptor: Int32 = -1
    let path: String
    var onFileChange: (() -> Void)?
    
    init(path: String) {
        self.path = path
    }
    
    deinit {
        stop()
    }
    
    func start() {
        // Open the file descriptor
        fileDescriptor = open(path, O_EVTONLY)
        guard fileDescriptor >= 0 else { return }
        
        // Create a dispatch source for monitoring the file system
        let queue = DispatchQueue.global(qos: .default)
        source = DispatchSource.makeFileSystemObjectSource(
            fileDescriptor: fileDescriptor,
            eventMask: [.write, .delete, .rename, .attrib],
            queue: queue
        )
        
        // Set up the event handler
        source?.setEventHandler { [weak self] in
            DispatchQueue.main.async {
                self?.onFileChange?()
            }
        }
        
        // Set up the cancel handler
        source?.setCancelHandler { [weak self] in
            guard let self = self, self.fileDescriptor >= 0 else { return }
            close(self.fileDescriptor)
            self.fileDescriptor = -1
        }
        
        // Start monitoring
        source?.resume()
    }
    
    func stop() {
        source?.cancel()
        source = nil
    }
}