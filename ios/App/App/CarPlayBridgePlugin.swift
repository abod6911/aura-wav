import Foundation
import Capacitor
import MediaPlayer

/**
 * Capacitor Plugin connecting Web Player Store with Native Apple CarPlay
 */
@objc(CarPlayBridge)
public class CarPlayBridge: CAPPlugin {
    
    override public func load() {
        super.load()
        
        // Listen for user actions from CarPlaySceneDelegate
        NotificationCenter.default.addObserver(self,
                                               selector: #selector(handleCarPlayPlayTrack(_:)),
                                               name: NSNotification.Name("CarPlayPlayTrack"),
                                               object: nil)
        
        NotificationCenter.default.addObserver(self,
                                               selector: #selector(handleCarPlayAction(_:)),
                                               name: NSNotification.Name("CarPlayAction"),
                                               object: nil)
    }
    
    @objc func syncTracks(_ call: CAPPluginCall) {
        guard let tracks = call.getArray("tracks") as? [[String: Any]] else {
            call.reject("Invalid tracks payload")
            return
        }
        
        DispatchQueue.main.async {
            CarPlaySceneDelegate.shared?.updateLibrary(tracks: tracks)
        }
        call.resolve()
    }
    
    @objc func syncFavorites(_ call: CAPPluginCall) {
        guard let tracks = call.getArray("tracks") as? [[String: Any]] else {
            call.reject("Invalid favorites payload")
            return
        }
        
        DispatchQueue.main.async {
            CarPlaySceneDelegate.shared?.updateFavorites(tracks: tracks)
        }
        call.resolve()
    }
    
    @objc func updatePlaybackState(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? ""
        let album = call.getString("album") ?? ""
        let duration = call.getDouble("duration") ?? 0.0
        let currentTime = call.getDouble("currentTime") ?? 0.0
        let isPlaying = call.getBool("isPlaying") ?? false
        
        DispatchQueue.main.async {
            var nowPlayingInfo = [String: Any]()
            nowPlayingInfo[MPMediaItemPropertyTitle] = title
            nowPlayingInfo[MPMediaItemPropertyArtist] = artist
            nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = album
            nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
            nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
            nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
            
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
            MPNowPlayingInfoCenter.default().playbackState = isPlaying ? .playing : .paused
        }
        
        call.resolve()
    }
    
    // MARK: - Notifications from CarPlay UI
    
    @objc private func handleCarPlayPlayTrack(_ notification: Notification) {
        if let trackId = notification.userInfo?["trackId"] as? String {
            notifyListeners("onCarPlayTrackSelected", data: ["trackId": trackId])
        }
    }
    
    @objc private func handleCarPlayAction(_ notification: Notification) {
        if let action = notification.userInfo?["action"] as? String {
            switch action {
            case "play", "pause", "togglePlay":
                notifyListeners("onCarPlayTogglePlay", data: [:])
            case "next":
                notifyListeners("onCarPlayNext", data: [:])
            case "previous":
                notifyListeners("onCarPlayPrevious", data: [:])
            default:
                break
            }
        }
    }
}
