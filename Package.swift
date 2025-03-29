// swift-tools-version: 5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "pr-preview-watcher",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .executable(name: "PRPreviewWatcher", targets: ["PRPreviewWatcher"])
    ],
    dependencies: [
        // No external dependencies for now
    ],
    targets: [
        .executableTarget(
            name: "PRPreviewWatcher",
            dependencies: [],
            resources: [
                .copy("Resources/Fonts")
            ]),
        .testTarget(
            name: "PRPreviewWatcherTests",
            dependencies: ["PRPreviewWatcher"]),
    ]
)
