import Foundation
import CarPlay
import MediaPlayer

/**
 * AURA.WAV Apple CarPlay Scene Delegate
 * Manages the native in-car user interface across touchscreens, rotary dials, and steering wheel buttons.
 */
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    static weak var shared: CarPlaySceneDelegate?
    var interfaceController: CPInterfaceController?
    
    // In-Car Tabs
    private var rootTabBar: CPTabBarTemplate?
    private var libraryListTemplate: CPListTemplate?
    private var favoritesListTemplate: CPListTemplate?
    
    // Track storage for CarPlay lists
    private var currentLibraryTracks: [[String: Any]] = []
    private var currentFavoritesTracks: [[String: Any]] = []
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didConnect interfaceController: CPInterfaceController) {
        CarPlaySceneDelegate.shared = self
        self.interfaceController = interfaceController
        
        setupRemoteCommandCenter()
        setupCarPlayUI()
    }
    
    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didDisconnectInterfaceController interfaceController: CPInterfaceController) {
        CarPlaySceneDelegate.shared = nil
        self.interfaceController = nil
    }
    
    // MARK: - CarPlay UI Setup
    
    private func setupCarPlayUI() {
        // Tab 1: Library (المكتبة الموسيقية)
        libraryListTemplate = CPListTemplate(title: "المكتبة", sections: [
            CPListSection(items: buildListItems(from: currentLibraryTracks))
        ])
        libraryListTemplate?.tabTitle = "المكتبة"
        libraryListTemplate?.tabImage = UIImage(systemName: "music.note.list")
        
        // Tab 2: Favorites (المفضلة)
        favoritesListTemplate = CPListTemplate(title: "المفضلة", sections: [
            CPListSection(items: buildListItems(from: currentFavoritesTracks))
        ])
        favoritesListTemplate?.tabTitle = "المفضلة"
        favoritesListTemplate?.tabImage = UIImage(systemName: "heart.fill")
        
        var tabs: [CPTemplate] = []
        if let lib = libraryListTemplate { tabs.append(lib) }
        if let fav = favoritesListTemplate { tabs.append(fav) }
        
        // Root Tab Bar Template
        rootTabBar = CPTabBarTemplate(templates: tabs)
        if let root = rootTabBar {
            interfaceController?.setRootTemplate(root, animated: true, completion: nil)
        }
        
        // Connect to Now Playing Template
        setupNowPlaying()
    }
    
    private func buildListItems(from tracks: [[String: Any]]) -> [CPListItem] {
        if tracks.isEmpty {
            let emptyItem = CPListItem(text: "لا توجد أغانٍ محملة حالياً", detailText: "أضف مساراتك من تطبيق AURA.WAV على الآيفون")
            emptyItem.isEnabled = false
            return [emptyItem]
        }
        
        return tracks.map { track in
            let title = track["title"] as? String ?? "Unknown Title"
            let artist = track["artist"] as? String ?? "Unknown Artist"
            let trackId = track["id"] as? String ?? ""
            
            let item = CPListItem(text: title, detailText: artist)
            item.accessoryType = .none
            item.handler = { [weak self] _, completion in
                // Notify web player via CarPlayBridgePlugin
                NotificationCenter.default.post(name: NSNotification.Name("CarPlayPlayTrack"), object: nil, userInfo: ["trackId": trackId])
                
                // Show Now Playing Template
                if let nowPlaying = self?.interfaceController {
                    nowPlaying.pushTemplate(CPNowPlayingTemplate.shared, animated: true, completion: nil)
                }
                completion()
            }
            return item
        }
    }
    
    // MARK: - Now Playing Template
    
    private func setupNowPlaying() {
        let nowPlaying = CPNowPlayingTemplate.shared
        nowPlaying.isUpNextButtonEnabled = true
        nowPlaying.isAlbumArtistButtonEnabled = false
    }
    
    // MARK: - Update from Web Layer
    
    func updateLibrary(tracks: [[String: Any]]) {
        self.currentLibraryTracks = tracks
        let items = buildListItems(from: tracks)
        libraryListTemplate?.updateSections([CPListSection(items: items)])
    }
    
    func updateFavorites(tracks: [[String: Any]]) {
        self.currentFavoritesTracks = tracks
        let items = buildListItems(from: tracks)
        favoritesListTemplate?.updateSections([CPListSection(items: items)])
    }
    
    // MARK: - Steering Wheel Remote Controls
    
    private func setupRemoteCommandCenter() {
        let commandCenter = MPRemoteCommandCenter.shared()
        
        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { _ in
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayAction"), object: nil, userInfo: ["action": "play"])
            return .success
        }
        
        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { _ in
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayAction"), object: nil, userInfo: ["action": "pause"])
            return .success
        }
        
        commandCenter.togglePlayPauseCommand.isEnabled = true
        commandCenter.togglePlayPauseCommand.addTarget { _ in
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayAction"), object: nil, userInfo: ["action": "togglePlay"])
            return .success
        }
        
        commandCenter.nextTrackCommand.isEnabled = true
        commandCenter.nextTrackCommand.addTarget { _ in
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayAction"), object: nil, userInfo: ["action": "next"])
            return .success
        }
        
        commandCenter.previousTrackCommand.isEnabled = true
        commandCenter.previousTrackCommand.addTarget { _ in
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayAction"), object: nil, userInfo: ["action": "previous"])
            return .success
        }
    }
}
