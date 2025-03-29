import SwiftUI

enum FontError: Error {
    case fontNotFound
    case registrationFailed
}

class FontManager {
    static let shared = FontManager()
    private var isRegistered = false
    
    private init() {}
    
    func registerFonts() throws {
        guard !isRegistered else { return }
        
        let fontNames = ["Hack-Regular", "Hack-Bold", "Hack-Italic", "Hack-BoldItalic"]
        
        for fontName in fontNames {
            guard let fontURL = Bundle.module.url(forResource: fontName, withExtension: "ttf", subdirectory: "Resources/Fonts") else {
                throw FontError.fontNotFound
            }
            
            guard let fontDataProvider = CGDataProvider(url: fontURL as CFURL) else {
                throw FontError.registrationFailed
            }
            
            guard let font = CGFont(fontDataProvider) else {
                throw FontError.registrationFailed
            }
            
            var error: Unmanaged<CFError>?
            if !CTFontManagerRegisterGraphicsFont(font, &error) {
                throw FontError.registrationFailed
            }
        }
        
        isRegistered = true
    }
    
    func monospaceFont(size: CGFloat = 13, weight: Font.Weight = .regular) -> Font {
        if isHackAvailable() {
            return Font.custom("Hack", size: size)
                .weight(weight)
        } else {
            return Font.system(size: size, design: .monospaced)
                .weight(weight)
        }
    }
    
    private func isHackAvailable() -> Bool {
        if let fontNames = CTFontManagerCopyAvailableFontFamilyNames() as? [String] {
            return fontNames.contains { $0.contains("Hack") }
        }
        return false
    }
}