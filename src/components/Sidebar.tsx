import React, { useState, useMemo } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Music,
  ListMusic,
  Sliders,
  FolderOpen,
  Settings,
  Radio,
  Users,
  Disc3,
  Pin,
} from 'lucide-react';
import { getAllArtists, getAllAlbums } from '../utils/catalogSelectors';

interface SidebarProps {
  onOpenImport: () => void;
}

type LibraryFilter = 'all' | 'playlists' | 'artists' | 'albums' | 'favorites' | 'tracks';

export const Sidebar: React.FC<SidebarProps> = ({ onOpenImport }) => {
  const { isRTL, dir } = useTranslation();
  const activeTab = usePlayerStore((state) => state.activeTab);
  const navigateTo = usePlayerStore((state) => state.navigateTo);
  const rawTracks = usePlayerStore((state) => state.tracks);
  const catalogTracks = usePlayerStore((state) => state.catalogTracks);
  const tracks = useMemo(() => (rawTracks.length > 0 ? rawTracks : catalogTracks), [rawTracks, catalogTracks]);
  const favorites = usePlayerStore((state) => state.favorites);
  const playlists = usePlayerStore((state) => state.playlists);
  const createPlaylist = usePlayerStore((state) => state.createPlaylist);
  const selectedPlaylistId = usePlayerStore((state) => state.selectedPlaylistId);
  const setSelectedPlaylistId = usePlayerStore((state) => state.setSelectedPlaylistId);
  const setEqualizerOpen = usePlayerStore((state) => state.setEqualizerOpen);
  const setSettingsOpen = usePlayerStore((state) => state.setSettingsOpen);
  const addToast = usePlayerStore((state) => state.addToast);
  const openArtist = usePlayerStore((state) => state.openArtist);
  const openAlbum = usePlayerStore((state) => state.openAlbum);
  const selectedArtistName = usePlayerStore((state) => state.selectedArtistName);
  const selectedAlbumName = usePlayerStore((state) => state.selectedAlbumName);

  const [filter, setFilter] = useState<LibraryFilter>('all');

  const allArtists = useMemo(() => {
    return filter === 'artists' ? getAllArtists(tracks) : [];
  }, [tracks, filter]);

  const allAlbums = useMemo(() => {
    return filter === 'albums' ? getAllAlbums(tracks) : [];
  }, [tracks, filter]);

  const handleCreatePlaylist = async () => {
    const defaultName = isRTL ? `قائمة تشغيل رقم ${playlists.length + 1}` : `My Playlist #${playlists.length + 1}`;
    const name = window.prompt(isRTL ? 'اسم قائمة التشغيل الجديدة:' : 'New playlist name:', defaultName);
    if (name && name.trim()) {
      await createPlaylist(name.trim());
      addToast(isRTL ? `تم إنشاء قائمة "${name.trim()}"` : `Created playlist "${name.trim()}"`, undefined, 'success');
      navigateTo({ tab: 'playlists' });
    }
  };

  return (
    <aside
      className="hidden lg:flex w-72 min-w-[270px] max-w-[280px] h-[100dvh] pb-24 p-2 flex-col gap-2 select-none z-30 shrink-0 bg-[#000000]"
      dir={dir}
    >
      {/* 1. Top Navigation Panel */}
      <div className="bg-[#121212] rounded-xl p-3.5 flex flex-col gap-1 shrink-0">
        {/* Brand Block */}
        <div className="px-2 pt-1 pb-3 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1DB954] flex items-center justify-center text-black font-black shrink-0 shadow-sm">
            <Radio className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white" dir="ltr">
            AURA<span className="text-[#1DB954]">.WAV</span>
          </span>
        </div>

        {/* Main Tabs */}
        <button
          onClick={() => navigateTo({ tab: 'home' })}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'home'
              ? 'text-white font-bold bg-white/[0.06]'
              : 'text-[#B3B3B3] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Home className={`w-5 h-5 shrink-0 ${activeTab === 'home' ? 'text-white' : 'text-[#B3B3B3]'}`} />
          <span>{isRTL ? 'الرئيسية' : 'Home'}</span>
        </button>

        <button
          onClick={() => {
            navigateTo({ tab: 'search' });
            setTimeout(() => document.getElementById('library-search-input')?.focus(), 50);
          }}
          className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'search'
              ? 'text-white font-bold bg-white/[0.06]'
              : 'text-[#B3B3B3] hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Search className={`w-5 h-5 shrink-0 ${activeTab === 'search' ? 'text-white' : 'text-[#B3B3B3]'}`} />
          <span>{isRTL ? 'البحث' : 'Search'}</span>
        </button>
      </div>

      {/* 2. Bottom Library Panel */}
      <div className="bg-[#121212] rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Library Header */}
        <div className="px-4 pt-3.5 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-[#B3B3B3] hover:text-white transition-colors">
            <Library className="w-5 h-5 shrink-0" />
            <span className="text-sm font-bold">{isRTL ? 'مكتبتك' : 'Your Library'}</span>
          </div>
          <button
            onClick={handleCreatePlaylist}
            title={isRTL ? 'إنشاء قائمة تشغيل' : 'Create playlist'}
            className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-2.5 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 scroll-smooth">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              filter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#242424] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {isRTL ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setFilter('playlists')}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              filter === 'playlists'
                ? 'bg-white text-black'
                : 'bg-[#242424] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {isRTL ? 'قوائم التشغيل' : 'Playlists'}
          </button>
          <button
            onClick={() => setFilter('artists')}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              filter === 'artists'
                ? 'bg-white text-black'
                : 'bg-[#242424] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {isRTL ? 'الفنانون' : 'Artists'}
          </button>
          <button
            onClick={() => setFilter('albums')}
            className={`px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              filter === 'albums'
                ? 'bg-white text-black'
                : 'bg-[#242424] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {isRTL ? 'الألبومات' : 'Albums'}
          </button>
        </div>

        {/* Scrollable Library Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5 custom-scrollbar">
          {/* Pinned Item: Liked Songs */}
          {(filter === 'all' || filter === 'favorites') && (
            <button
              onClick={() => navigateTo({ tab: 'favorites' })}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-start transition-colors cursor-pointer group ${
                activeTab === 'favorites' ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
              }`}
            >
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#450AF5] via-[#5E3AE8] to-[#8E8EE5] flex items-center justify-center shrink-0 shadow-sm">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {isRTL ? 'أغانيك المفضلة' : 'Liked Songs'}
                </div>
                <div className="text-[11px] text-[#B3B3B3] truncate flex items-center gap-1.5">
                  <Pin className="w-3 h-3 text-[#1DB954] fill-[#1DB954] shrink-0" />
                  <span>{isRTL ? `قائمة • ${favorites.length} أغنية` : `Playlist • ${favorites.length} songs`}</span>
                </div>
              </div>
            </button>
          )}

          {/* Pinned Item: All Tracks (Library) */}
          {(filter === 'all' || filter === 'tracks') && (
            <button
              onClick={() => navigateTo({ tab: 'library' })}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-start transition-colors cursor-pointer group ${
                activeTab === 'library' ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
              }`}
            >
              <div className="w-12 h-12 rounded-md bg-[#242424] border border-white/[0.06] flex items-center justify-center shrink-0 shadow-sm">
                <Music className="w-5 h-5 text-[#1DB954]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {isRTL ? 'كل الأغاني' : 'All Tracks'}
                </div>
                <div className="text-[11px] text-[#B3B3B3] truncate flex items-center gap-1.5">
                  <span>{isRTL ? `المكتبة • ${tracks.length} أغنية` : `Library • ${tracks.length} tracks`}</span>
                </div>
              </div>
            </button>
          )}

          {/* User Created Playlists */}
          {(filter === 'all' || filter === 'playlists') && (
            <>
              {playlists.map((playlist) => {
                const isSelected = activeTab === 'playlists' && selectedPlaylistId === playlist.id;
                return (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      navigateTo({ tab: 'playlists', playlistId: playlist.id });
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-start transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-md bg-[#242424] border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                      <ListMusic className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1DB954]' : 'text-white'}`}>
                        {playlist.name}
                      </div>
                      <div className="text-[11px] text-[#B3B3B3] truncate">
                        {isRTL ? `قائمة • ${playlist.trackIds.length} أغنية` : `Playlist • ${playlist.trackIds.length} songs`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Artists List */}
          {filter === 'artists' && (
            <>
              {allArtists.map((artist) => {
                const isSelected = activeTab === 'artist' && selectedArtistName === artist.name;
                return (
                  <button
                    key={artist.name}
                    onClick={() => openArtist(artist.name)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-start transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#242424] border border-white/[0.06] overflow-hidden shrink-0">
                      <img
                        src={artist.artworkUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover aspect-square"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1DB954]' : 'text-white'}`}>
                        {artist.name}
                      </div>
                      <div className="text-[11px] text-[#B3B3B3] truncate">
                        {isRTL ? `فنان • ${artist.trackCount} مسار` : `Artist • ${artist.trackCount} tracks`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Albums List */}
          {filter === 'albums' && (
            <>
              {allAlbums.map((album) => {
                const isSelected = activeTab === 'album' && selectedAlbumName === album.name;
                return (
                  <button
                    key={album.name}
                    onClick={() => openAlbum(album.name, album.artist)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-start transition-colors cursor-pointer group ${
                      isSelected ? 'bg-[#282828]' : 'hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-md bg-[#242424] border border-white/[0.06] overflow-hidden shrink-0">
                      <img
                        src={album.artworkUrl}
                        alt={album.name}
                        className="w-full h-full object-cover aspect-square"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1DB954]' : 'text-white'}`}>
                        {album.name}
                      </div>
                      <div className="text-[11px] text-[#B3B3B3] truncate">
                        {isRTL ? `ألبوم • ${album.artist}` : `Album • ${album.artist}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Bottom Utility Bar */}
        <div className="p-2 border-t border-white/[0.06] flex items-center justify-around text-[#B3B3B3] shrink-0">
          <button
            onClick={() => setEqualizerOpen(true)}
            title="المعادل الصوتي (DSP)"
            className="p-2 rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenImport}
            title={isRTL ? 'استيراد مجلد الأغاني' : 'Import Music Folder'}
            className="p-2 rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title={isRTL ? 'الإعدادات' : 'Settings'}
            className="p-2 rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
