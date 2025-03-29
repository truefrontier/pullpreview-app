// swift-tools-version: 5.5
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "pull-preview",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .executable(name: "PullPreview", targets: ["PullPreview"])
    ],
    dependencies: [
        // No external dependencies for now
    ],
    targets: [
        .executableTarget(
            name: "PullPreview",
            dependencies: [],
            resources: [
                .copy("Resources/Fonts")
            ]),
        .testTarget(
            name: "PullPreviewTests",
            dependencies: ["PullPreview"]),
    ]
)
