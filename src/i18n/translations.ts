export type Language = 'ar' | 'en';

export interface Translations {
  // Navigation & Tabs
  listenNow: string;
  search: string;
  library: string;
  favorites: string;
  settings: string;
  premium: string;
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
  favoriteAdded: string;
  favoriteRemoved: string;

  // Sleep Timer
  sleepTimerTitle: string;
  off: string;
  minutes: string;
  endOfTrack: string;
  timerActive: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    // Navigation & Tabs
    listenNow: 'استمع الآن',
    search: 'بحث',
    library: 'مكتبتك',
    favorites: 'المفضلة',
    settings: 'الإعدادات',
    premium: 'بريميوم',
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
    favoriteAdded: 'تمت الإضافة إلى المفضلة',
    favoriteRemoved: 'تمت الإزالة من المفضلة',

    // Sleep Timer
    sleepTimerTitle: 'مؤقت النوم الذكي',
    off: 'إيقاف',
    minutes: 'دقيقة',
    endOfTrack: 'في نهاية الأغنية الحالية',
    timerActive: 'مؤقت النوم نشط',
  },

  en: {
    // Navigation & Tabs
    listenNow: 'Listen Now',
    search: 'Search',
    library: 'Library',
    favorites: 'Favorites',
    settings: 'Settings',
    premium: 'Premium',
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
    favoriteAdded: 'Added to favorites',
    favoriteRemoved: 'Removed from favorites',

    // Sleep Timer
    sleepTimerTitle: 'Smart Sleep Timer',
    off: 'Off',
    minutes: 'min',
    endOfTrack: 'At end of current track',
    timerActive: 'Sleep Timer Active',
  },
};
