export type Language = 'ar' | 'en';

export interface Translations {
  // Navigation & Tabs
  listenNow: string;
  search: string;
  library: string;
  favorites: string;
  settings: string;
  all: string;
  music: string;
  podcasts: string;

  // Header & Greetings
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  peacefulNight: string;
  brandSub: string;
  importFolder: string;
  importMusic: string;
  quickSearch: string;
  sleepTimer: string;
  equalizer: string;
  storageManager: string;
  profile: string;
  offlineReady: string;

  // Home "Listen Now"
  heroListenNow: string;
  heroPlayNow: string;
  recentlyPlayed: string;
  topArtists: string;
  curatedGenres: string;
  jumpBackIn: string;
  madeForYou: string;
  likedSongsCard: string;
  likedSongsCount: string;
  songs: string;
  durationHoursMins: string;
  swipeToExplore: string;

  // Player & Controls
  play: string;
  pause: string;
  next: string;
  previous: string;
  shuffle: string;
  shuffleOn: string;
  repeatAll: string;
  repeatOne: string;
  repeatOff: string;
  vocalIsolation: string;
  vocalIsolationOn: string;
  vocalIsolationOff: string;
  syncedLyrics: string;
  karaokeMode: string;
  queue: string;
  queueTitle: string;
  upNext: string;
  clearQueue: string;
  nowPlaying: string;
  swipeArtworkHint: string;
  swipeDownToClose: string;
  realtimeWaveform: string;
  analogWarmth: string;
  spatial3D: string;
  autoMixActive: string;

  // Settings Modal
  settingsTitle: string;
  languageAndDisplay: string;
  languageLabel: string;
  arabicLanguage: string;
  englishLanguage: string;
  ambientGlowLabel: string;
  ambientGlowSub: string;
  proAudioTitle: string;
  autoMixTransition: string;
  autoMixSub: string;
  crossfadeDuration: string;
  storageTitle: string;
  storageUsed: string;
  rescanLibrary: string;
  clearCache: string;
  clearCacheConfirm: string;
  aboutTitle: string;
  aboutSub: string;
  versionLabel: string;
  close: string;

  // Search & Library
  searchPlaceholder: string;
  clearSearch: string;
  noTracksFound: string;
  importCta: string;
  dragDropPrompt: string;
  dragDropSub: string;
  tracksFound: string;
  filterByArtist: string;
  sortBy: string;
  titleSort: string;
  artistSort: string;
  durationSort: string;
  addToQueue: string;
  playNext: string;
  addedToPlayNext: string;
  autoplayQueue: string;
  favoriteAdded: string;
  favoriteRemoved: string;

  // Sleep Timer
  sleepTimerTitle: string;
  off: string;
  minutes: string;
  endOfTrack: string;
  timerActive: string;
  // Sync Party & DJ Features
  syncParty: string;
  hostParty: string;
  joinParty: string;
  roomCode: string;
  enterRoomCode: string;
  partyActive: string;
  listenersCount: string;
  leaveParty: string;
  copyInviteLink: string;
  linkCopied: string;
  shareInvite: string;
  liveSynced: string;
  connectingParty: string;
  noActiveParty: string;
  partyHostDesc: string;
  partyJoinDesc: string;
  inviteFriends: string;
  syncPartyTip: string;
  smartHarmonicMix: string;
  harmonicMixDesc: string;
  quickStudio: string;
  speed: string;
  waveform: string;
  djDrops: string;

  // Phase 4: Edge Cases & Offline Continuity
  trackCorruptedSkipping: string;
  circuitBreakerTriggered: string;
  offlineFallbackActive: string;
  directoryPermissionPrompt: string;
  grantDirectoryAccess: string;
  directoryAccessRestored: string;
  unavailableTrack: string;

  // Real Auth & Spotify Queue
  signIn: string;
  signUp: string;
  signOut: string;
  createAccount: string;
  continueAsGuest: string;
  emptyLibraryTitle: string;
  emptyLibrarySub: string;
  importLocalSongs: string;
  exploreAndSearch: string;
  nextInQueue: string;
  nextFromContext: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    // Navigation & Tabs
    listenNow: 'استمع الآن',
    search: 'بحث',
    library: 'مكتبتك',
    favorites: 'المفضلة',
    settings: 'الإعدادات',
    all: 'الكل',
    music: 'الموسيقى',
    podcasts: 'البودكاست',

    // Header & Greetings
    goodMorning: 'صباح الخير',
    goodAfternoon: 'مساء الخير',
    goodEvening: 'مساء الخير',
    peacefulNight: 'ليلة سعيدة وموسيقى هادئة',
    brandSub: 'مشغل الموسيقى الفاخر',
    importFolder: 'استيراد مجلد',
    importMusic: 'استيراد',
    quickSearch: 'بحث سريع',
    sleepTimer: 'مؤقت النوم',
    equalizer: 'المعادل الصوتي',
    storageManager: 'إدارة التخزين والمكتبة',
    profile: 'الملف الشخصي',
    offlineReady: 'أوفلاين 100%',

    // Home "Listen Now"
    heroListenNow: 'استمع الآن',
    heroPlayNow: 'تشغيل الآن',
    recentlyPlayed: 'المشغلة مؤخراً',
    topArtists: 'كبار الفنانين',
    curatedGenres: 'التصنيفات والأنواع',
    jumpBackIn: 'تابع الاستماع',
    madeForYou: 'مخصصة لذوقك',
    likedSongsCard: 'أغانيك المفضلة',
    likedSongsCount: 'مسار مفضل',
    songs: 'أغنية',
    durationHoursMins: 'س و د',
    swipeToExplore: 'اسحب للتصفح السريع',

    // Player & Controls
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    next: 'التالي',
    previous: 'السابق',
    shuffle: 'خلط عشوائي',
    shuffleOn: 'الخلط مفعل',
    repeatAll: 'تكرار الكل',
    repeatOne: 'تكرار الأغنية',
    repeatOff: 'إيقاف التكرار',
    vocalIsolation: 'عزل الفوكال',
    vocalIsolationOn: 'عزل الصوت: مشغل',
    vocalIsolationOff: 'كاريوكي',
    syncedLyrics: 'الكلمات المتزامنة',
    karaokeMode: 'وضع الكاريوكي',
    queue: 'قائمة الانتظار',
    queueTitle: 'التالي في قائمة الانتظار',
    upNext: 'التالي مباشرة',
    clearQueue: 'تفريغ القائمة',
    nowPlaying: 'قيد التشغيل الآن',
    swipeArtworkHint: 'اسحب الغلاف يميناً أو يساراً للتخطي',
    swipeDownToClose: 'اسحب للأسفل لتصغير المشغل',
    realtimeWaveform: 'تحليل موجات الصوت الحي',
    analogWarmth: 'دفء أنالوج',
    spatial3D: 'فضاء ثلاثي الأبعاد',
    autoMixActive: 'AutoMix نشط',

    // Settings Modal
    settingsTitle: 'تفضيلات AURA.WAV',
    languageAndDisplay: 'اللغة والمظهر البصري',
    languageLabel: 'لغة الواجهة والتطبيق',
    arabicLanguage: 'العربية (Arabic)',
    englishLanguage: 'English (US)',
    ambientGlowLabel: 'التوهج المحيطي المتفاعل (Ambient Aura)',
    ambientGlowSub: 'إضاءة خلفية ناعمة تتنفس بألوان غلاف الأغنية',
    proAudioTitle: 'المحرك الصوتي الاحترافي (Pro Audio DSP)',
    autoMixTransition: 'انتقال AutoMix الذكي',
    autoMixSub: 'مزج الأغاني تلقائياً دون انقطاع بأسلوب الـ DJ',
    crossfadeDuration: 'مدة التلاشي والانتقال',
    storageTitle: 'إدارة التخزين المحلي والمكتبة',
    storageUsed: 'المساحة المستخدمة حالياً',
    rescanLibrary: 'إعادة فحص وتحديث المجلد',
    clearCache: 'مسح الذاكرة المؤقتة بالكامل',
    clearCacheConfirm: 'هل أنت متأكد من مسح جميع الملفات المخزنة محلياً؟',
    aboutTitle: 'عن مشغل AURA.WAV',
    aboutSub: 'مشغل ويب PWA صوتي فائق السرعة، خالٍ تماماً من الإعلانات ويعمل دون إنترنت.',
    versionLabel: 'الإصدار 2.0 (Apple Music iOS Edition)',
    close: 'إغلاق',

    // Search & Library
    searchPlaceholder: 'ابحث عن أغانٍ، فنانين، أو ألبومات...',
    clearSearch: 'مسح البحث',
    noTracksFound: 'لم يتم العثور على أي مسارات مطابقة',
    importCta: 'استيراد مجلد الموسيقى',
    dragDropPrompt: 'أفلت مجلد الأغاني أو الملفات هنا',
    dragDropSub: 'سيتم استيراد كافة المسارات وقراءة الأغلفة فوراً بدون إنترنت',
    tracksFound: 'مسار صوتي',
    filterByArtist: 'تصفية حسب الفنان',
    sortBy: 'ترتيب حسب',
    titleSort: 'العنوان',
    artistSort: 'الفنان',
    durationSort: 'المدة',
    addToQueue: 'إضافة لقائمة الانتظار',
    playNext: 'تشغيل تالياً',
    addedToPlayNext: 'تمت الإضافة للتشغيل التالي',
    autoplayQueue: 'التشغيل التلقائي من المكتبة',
    favoriteAdded: 'تمت الإضافة إلى المفضلة',
    favoriteRemoved: 'تمت الإزالة من المفضلة',

    // Sleep Timer
    sleepTimerTitle: 'مؤقت النوم الذكي',
    off: 'إيقاف',
    minutes: 'دقيقة',
    endOfTrack: 'في نهاية الأغنية الحالية',
    timerActive: 'مؤقت النوم نشط',

    // Sync Party & DJ Features
    syncParty: 'جلسة استماع جماعي',
    hostParty: 'إنشاء غرفة استماع',
    joinParty: 'الانضمام لغرفة',
    roomCode: 'رمز الغرفة',
    enterRoomCode: 'أدخل رمز الغرفة (مثال: AURA_8F2B)',
    partyActive: 'جلسة الاستماع نشطة الآن',
    listenersCount: 'مستمع متصل',
    leaveParty: 'إنهاء / مغادرة الجلسة',
    copyInviteLink: 'نسخ رابط الدعوة',
    linkCopied: 'تم نسخ رابط الدعوة بنجاح!',
    shareInvite: 'مشاركة الجلسة',
    liveSynced: 'متزامن حياً',
    connectingParty: 'جاري الاتصال بالجلسة...',
    noActiveParty: 'لا توجد جلسة نشطة حالياً',
    partyHostDesc: 'استضف أصدقاءك واستمعوا معاً لنفس الموسيقى بنفس اللحظة دون أي تأخير.',
    partyJoinDesc: 'أدخل رمز الغرفة لمزامنة المشغل مع المضيف فوراً.',
    inviteFriends: 'دعوة الأصدقاء للاستماع',
    syncPartyTip: 'تعتمد المزامنة على توقيت حقيقي عالي الدقة وتصحيح الانجراف الزمني التلقائي.',
    smartHarmonicMix: 'توليد ميكس هارموني ذكي',
    harmonicMixDesc: 'ترتيب الأغاني تلقائياً وفق عجلة Camelot ومطابقة سرعة الـ BPM',
    quickStudio: 'استوديو DJ السريع',
    speed: 'السرعة',
    waveform: 'الموجة',
    djDrops: 'مؤثرات DJ',

    // Phase 4: Edge Cases & Offline Continuity
    trackCorruptedSkipping: 'تعذر تشغيل المسار، جاري التخطي للتالي تلقائياً...',
    circuitBreakerTriggered: 'تم إيقاف التشغيل مؤقتاً: تعذر تشغيل 3 مسارات متتالية. يرجى التحقق من الملفات أو الشبكة.',
    offlineFallbackActive: 'وضع الأوفلاين نشط — تم تحويل التشغيل إلى المكتبة المحفوظة',
    directoryPermissionPrompt: 'مطلوب تأكيد إذن الوصول لمجلد الموسيقى المحلي',
    grantDirectoryAccess: 'استعادة إذن المجلد',
    directoryAccessRestored: 'تمت استعادة إذن قراءة المجلد بنجاح!',
    unavailableTrack: 'المسار غير متوفر أو تالف',

    // Real Auth & Spotify Queue
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب جديد',
    signOut: 'تسجيل الخروج',
    createAccount: 'إنشاء حساب جديد',
    continueAsGuest: 'متابعة كـ ضيف',
    emptyLibraryTitle: 'مكتبتك الموسيقية فارغة',
    emptyLibrarySub: 'استورد ملفاتك الصوتية من جهازك أو استكشف الأغاني الشائعة والكتالوج العام.',
    importLocalSongs: 'استيراد أغاني من جهازي',
    exploreAndSearch: 'استكشف الأغاني في البحث',
    nextInQueue: 'التالي في قائمة الانتظار',
    nextFromContext: 'التالي من القائمة الحالية',
  },

  en: {
    // Navigation & Tabs
    listenNow: 'Listen Now',
    search: 'Search',
    library: 'Library',
    favorites: 'Favorites',
    settings: 'Settings',
    all: 'All',
    music: 'Music',
    podcasts: 'Podcasts',

    // Header & Greetings
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    peacefulNight: 'Good Night & Relax',
    brandSub: 'Future Audio Experience',
    importFolder: 'Import Folder',
    importMusic: 'Import',
    quickSearch: 'Quick Search',
    sleepTimer: 'Sleep Timer',
    equalizer: 'Equalizer',
    storageManager: 'Storage & Library',
    profile: 'Profile',
    offlineReady: '100% Offline',

    // Home "Listen Now"
    heroListenNow: 'Listen Now',
    heroPlayNow: 'Play Now',
    recentlyPlayed: 'Recently Played',
    topArtists: 'Top Artists',
    curatedGenres: 'Genres & Moods',
    jumpBackIn: 'Jump Back In',
    madeForYou: 'Curated For You',
    likedSongsCard: 'Favorite Songs',
    likedSongsCount: 'favorited tracks',
    songs: 'songs',
    durationHoursMins: 'h m',
    swipeToExplore: 'Swipe to explore',

    // Player & Controls
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    previous: 'Previous',
    shuffle: 'Shuffle',
    shuffleOn: 'Shuffle is on',
    repeatAll: 'Repeat All',
    repeatOne: 'Repeat One',
    repeatOff: 'Repeat Off',
    vocalIsolation: 'Vocal Isolation',
    vocalIsolationOn: 'Vocal Cut: ON',
    vocalIsolationOff: 'Karaoke',
    syncedLyrics: 'Live Synced Lyrics',
    karaokeMode: 'Karaoke Mode',
    queue: 'Queue',
    queueTitle: 'Playing Next',
    upNext: 'Up Next',
    clearQueue: 'Clear Queue',
    nowPlaying: 'Now Playing',
    swipeArtworkHint: 'Swipe artwork left or right to skip',
    swipeDownToClose: 'Swipe down to minimize',
    realtimeWaveform: 'Real-Time Audio Spectrum',
    analogWarmth: 'Analog Warmth',
    spatial3D: '3D Spatial Audio',
    autoMixActive: 'AutoMix Live',

    // Settings Modal
    settingsTitle: 'AURA.WAV Preferences',
    languageAndDisplay: 'Language & Display',
    languageLabel: 'Application Language',
    arabicLanguage: 'العربية (Arabic)',
    englishLanguage: 'English (US)',
    ambientGlowLabel: 'Dynamic Ambient Aura',
    ambientGlowSub: 'Soft reactive illumination reflecting album artwork colors',
    proAudioTitle: 'Pro Audio & DSP Suite',
    autoMixTransition: 'Smart DJ AutoMix',
    autoMixSub: 'Seamless beat-matched crossfading between tracks',
    crossfadeDuration: 'Crossfade Duration',
    storageTitle: 'Offline Storage & Library',
    storageUsed: 'Storage Used',
    rescanLibrary: 'Re-scan Library Folder',
    clearCache: 'Purge Local Storage',
    clearCacheConfirm: 'Are you sure you want to clear all offline stored tracks?',
    aboutTitle: 'About AURA.WAV',
    aboutSub: 'Ultra-responsive offline PWA audiophile player. Zero telemetry, pure music.',
    versionLabel: 'Version 2.0 (Apple Music iOS Edition)',
    close: 'Close',

    // Search & Library
    searchPlaceholder: 'Search tracks, artists, or albums...',
    clearSearch: 'Clear search',
    noTracksFound: 'No matching tracks found',
    importCta: 'Import Music Folder',
    dragDropPrompt: 'Drop music folder or audio files here',
    dragDropSub: 'Instant local offline import with album artwork reading',
    tracksFound: 'audio tracks',
    filterByArtist: 'Filter by artist',
    sortBy: 'Sort by',
    titleSort: 'Title',
    artistSort: 'Artist',
    durationSort: 'Duration',
    addToQueue: 'Add to Queue',
    playNext: 'Play Next',
    addedToPlayNext: 'Added to play next',
    autoplayQueue: 'Autoplay Queue',
    favoriteAdded: 'Added to favorites',
    favoriteRemoved: 'Removed from favorites',

    // Sleep Timer
    sleepTimerTitle: 'Smart Sleep Timer',
    off: 'Off',
    minutes: 'min',
    endOfTrack: 'At end of current track',
    timerActive: 'Sleep Timer Active',

    // Sync Party & DJ Features
    syncParty: 'Sync Party',
    hostParty: 'Host Listening Room',
    joinParty: 'Join Room',
    roomCode: 'Room Code',
    enterRoomCode: 'Enter room code (e.g. AURA_8F2B)',
    partyActive: 'Listening Party Active',
    listenersCount: 'listeners connected',
    leaveParty: 'Leave Party',
    copyInviteLink: 'Copy Invite Link',
    linkCopied: 'Invite link copied to clipboard!',
    shareInvite: 'Share Party',
    liveSynced: 'Live Synced',
    connectingParty: 'Connecting to party...',
    noActiveParty: 'No active listening party',
    partyHostDesc: 'Host your friends and enjoy synchronized hi-fi audio in real-time with zero drift.',
    partyJoinDesc: 'Enter a room code to instantly lock your player clock to the host.',
    inviteFriends: 'Invite Friends to Listen',
    syncPartyTip: 'Playback synchronization is precision clock-locked with auto-drift correction.',
    smartHarmonicMix: 'Smart Harmonic Mix',
    harmonicMixDesc: 'Auto-sort queue by Camelot harmonic keys and BPM tempo matching',
    quickStudio: 'Quick Studio',
    speed: 'Speed',
    waveform: 'Waveform',
    djDrops: 'DJ Drops',

    // Phase 4: Edge Cases & Offline Continuity
    trackCorruptedSkipping: 'Unable to play track, auto-skipping to next...',
    circuitBreakerTriggered: 'Playback paused: 3 consecutive tracks failed. Please check files or network.',
    offlineFallbackActive: 'Offline Mode Active — Switched to cached library',
    directoryPermissionPrompt: 'Permission confirmation required for local music folder',
    grantDirectoryAccess: 'Restore Folder Access',
    directoryAccessRestored: 'Folder read permission restored successfully!',
    unavailableTrack: 'Track unavailable or corrupted',

    // Real Auth & Spotify Queue
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    createAccount: 'Create Account',
    continueAsGuest: 'Continue as Guest',
    emptyLibraryTitle: 'Your Library is Empty',
    emptyLibrarySub: 'Import local audio files from your device or explore and search the global catalog.',
    importLocalSongs: 'Import Local Songs',
    exploreAndSearch: 'Explore & Search',
    nextInQueue: 'Next in Queue',
    nextFromContext: 'Next From Context',
  },
};
