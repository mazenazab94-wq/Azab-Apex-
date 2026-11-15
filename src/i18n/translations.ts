import {
  CharacterCategory,
  DrivingDifficulty,
  KartClass,
  Language,
  PowerUpType,
  TimeOfDay,
  TrackTheme,
  WeatherCondition,
} from '../types/game';

export interface Translations {
  gameTitle: string;
  loadingTitle: string;
  loadingSub: string;
  back: string;
  saveAndExit: string;
  save: string;
  coins: string;
  level: string;
  // Main Menu exact items
  menuPlay: string;
  menuMultiplayer: string;
  menuPrivateRoom: string;
  menuSelectCar: string;
  menuGarage: string;
  menuSelectTrack: string;
  menuChampionships: string;
  menuProfile: string;
  menuSettings: string;
  menuCharacters: string;
  menuLeaderboards: string;
  menuTimeTrial: string;
  menuPractice: string;
  menuTournament: string;
  menuSplitScreen: string;
  menuTutorial: string;
  controlsQuickHint: string;
  racersCount: string;
  // Categories & Classes
  all: string;
  categories: Record<CharacterCategory, string>;
  kartClasses: Record<KartClass, string>;
  themes: Record<TrackTheme, string>;
  difficulties: Record<DrivingDifficulty, string>;
  timesOfDay: Record<TimeOfDay, string>;
  weathers: Record<WeatherCondition, string>;
  trackDiffs: Record<'Easy' | 'Medium' | 'Hard' | 'Extreme', string>;
  // Stats
  speed: string;
  acceleration: string;
  handling: string;
  drift: string;
  weight: string;
  // Garage
  garageTitle: string;
  garageHint: string;
  tabChassis: string;
  tabPaint: string;
  tabDecals: string;
  tabWheels: string;
  tabTires: string;
  tabSpoilers: string;
  tabEngine: string;
  tabExhaust: string;
  unlocked: string;
  ready: string;
  active: string;
  select: string;
  unlockFor: string;
  needCoins: string;
  // Tracks
  tracksTitle: string;
  tracksSub: string;
  shortcutIntel: string;
  personalBest: string;
  raceThisTrack: string;
  setActiveTrack: string;
  lapsLabel: string;
  championshipTitle: string;
  championshipSub: string;
  roundLabel: string;
  startCup: string;
  bonusCoins: string;
  // Characters
  rosterTitle: string;
  rosterSub: string;
  appearanceSkin: string;
  selectDriver: string;
  previewVoice: string;
  // Multiplayer & Private Room
  mpTitle: string;
  privateRoomTitle: string;
  connected: string;
  connecting: string;
  reconnecting: string;
  leaveRoom: string;
  createRoom: string;
  createPrivateRoom: string;
  createPublicRoom: string;
  quickPublicMatch: string;
  joinByCode: string;
  enterCodePlaceholder: string;
  join: string;
  openPublicLobbies: string;
  noPublicLobbies: string;
  refresh: string;
  roomCodeLabel: string;
  copyInvite: string;
  copiedInvite: string;
  playersList: string;
  selectCarBtn: string;
  selectTrackLabel: string;
  startRaceBtn: string;
  readyUp: string;
  readyState: string;
  waitingState: string;
  hostLabel: string;
  kickPlayer: string;
  lockRoom: string;
  unlockRoom: string;
  roomLockedLabel: string;
  maxPlayersLabel: string;
  fillAiLabel: string;
  aiSlot: string;
  openSlot: string;
  lobbyChat: string;
  presetChatLabel: string;
  // Items
  items: Record<PowerUpType, { name: string; desc: string }>;
  // HUD
  positionLabel: string;
  lapLabel: string;
  speedUnit: string;
  nitroMeter: string;
  driftTier: string;
  currentItem: string;
  noItem: string;
  useItemBtn: string;
  rivalsLabel: string;
  conditionLabel: string;
  wrongWay: string;
  targetAhead: string;
  crashingBanner: string;
  recoveringBanner: string;
  goBanner: string;
  finalLapBanner: string;
  finishBanner: string;
  pauseTitle: string;
  resumeRace: string;
  restartRace: string;
  exitToMenu: string;
  // Results
  resultsTitle: string;
  victoryTitle: string;
  finishedPos: string;
  eliminatedTitle: string;
  raceTimeLabel: string;
  pointsEarnedLabel: string;
  rewardsLabel: string;
  rematchBtn: string;
  returnToRoomBtn: string;
  nextRaceBtn: string;
  pitCrewTitle: string;
  getTipBtn: string;
  analyzingBtn: string;
  // Profile & Leaderboards
  profileHubTitle: string;
  profileTab: string;
  challengesTab: string;
  achievementsTab: string;
  leaderboardsTab: string;
  displayName: string;
  friendTagLabel: string;
  winsLabel: string;
  totalRacesLabel: string;
  driftsLabel: string;
  friendsListTitle: string;
  addFriendPlaceholder: string;
  addBtn: string;
  noFriendsYet: string;
  onlineLabel: string;
  offlineLabel: string;
  claimedLabel: string;
  claimBtn: string;
  trackRecordsTitle: string;
  topWinsTitle: string;
  noRecordsYet: string;
  // Settings & Tutorial
  settingsTitle: string;
  languageLabel: string;
  drivingDifficultyLabel: string;
  timeOfDayLabel: string;
  weatherLabel: string;
  audioCameraTitle: string;
  muteAll: string;
  masterVol: string;
  musicVol: string;
  sfxVol: string;
  cameraFov: string;
  showMinimap: string;
  mobileTitle: string;
  enableTouchHud: string;
  steerMode: string;
  modeButtons: string;
  modeDrag: string;
  modeTilt: string;
  layoutPreset: string;
  presetStandard: string;
  presetLeft: string;
  buttonSize: string;
  steerOffset: string;
  actionOffset: string;
  tutorialTitle: string;
  tutorialDesktopTitle: string;
  tutorialDriftTitle: string;
  tutorialItemsTitle: string;
  tutorialCrashTitle: string;
  tutorialDesktopLines: string[];
  tutorialDriftDesc: string;
  tutorialCrashDesc: string;
  // Section Organization & Race Setup
  recoverToTrack: string;
  raceSetupTitle: string;
  raceSetupSub: string;
  raceModeLabel: string;
  racerCountLabel: string;
  startRaceNow: string;
  singleRaceMode: string;
  chooseTrackBtn: string;
  menuGarageAndDriver: string;
  menuTracksAndCups: string;
  driversTab: string;
  garageTabLabel: string;
  tracksTab: string;
  cupsTab: string;
  publicPlayTab: string;
  privatePlayTab: string;
  tutorialTab: string;
  settingsGeneralTab: string;
  soloLabel: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  ar: {
    gameTitle: 'Azab Apex للسباقات',
    loadingTitle: 'Azab Apex للسباقات',
    loadingSub: 'جاري تحميل محرك السباق ثلاثي الأبعاد والطقس الواقعي والمرآب...',
    back: 'رجوع',
    saveAndExit: 'حفظ وخروج',
    save: 'حفظ',
    coins: 'عملة',
    level: 'المستوى',
    menuPlay: 'اللعب',
    menuMultiplayer: 'اللعب الجماعي',
    menuPrivateRoom: 'غرفة خاصة',
    menuSelectCar: 'اختيار السيارة',
    menuGarage: 'المرآب',
    menuSelectTrack: 'اختيار المضمار',
    menuChampionships: 'البطولات',
    menuProfile: 'الملف الشخصي',
    menuSettings: 'الإعدادات',
    menuCharacters: 'اختيار السائق',
    menuLeaderboards: 'لوحة المتصدرين',
    menuTimeTrial: 'سباق الزمن',
    menuPractice: 'وضع التدريب',
    menuTournament: 'دوري الإقصاء',
    menuSplitScreen: 'شاشة مقسمة (لاعبان)',
    menuTutorial: 'دليل اللعب',
    controlsQuickHint: 'WASD القيادة · Shift الانجراف · Space القفز · E استخدام الأداة',
    racersCount: '8 متسابقين',
    all: 'الكل',
    categories: {
      speed: 'السرعة القصوى',
      acceleration: 'التسارع',
      handling: 'التحكم والانعطاف',
      balanced: 'متوازن',
      power: 'القوة والتحمل',
    },
    kartClasses: {
      classic: 'كلاسيكية',
      sports: 'رياضية خارقة',
      hover: 'مستقبلية',
      monster: 'وحش دفع رباعي',
      offroad: 'طرق وعرة',
      lightweight: 'خفيفة سريعة',
      heavy: 'مدرعة ثقيلة',
    },
    themes: {
      tropical: 'جزر استوائية',
      temple: 'معابد قديمة',
      desert: 'صحراء وطرق سريعة',
      snow: 'جبال ثلجية',
      volcano: 'حلبة بركانية',
      cyber: 'مدينة مستقبلية',
      haunted: 'غابة غامضة',
      jungle: 'أدغال كثيفة',
      ocean: 'مضمار محيطي',
      space: 'مدار فضائي',
    },
    difficulties: {
      easy: 'سهل',
      medium: 'متوسط',
      pro: 'محترف',
    },
    timesOfDay: {
      day: 'نهار مشرق',
      sunset: 'غروب ذهبي',
      night: 'سباق ليلي',
    },
    weathers: {
      clear: 'سماء صافية',
      rain: 'مطر وطريق مبلل',
    },
    trackDiffs: {
      Easy: 'سهل',
      Medium: 'متوسط',
      Hard: 'صعب',
      Extreme: 'احترافي',
    },
    speed: 'السرعة',
    acceleration: 'التسارع',
    handling: 'التحكم',
    drift: 'الانجراف',
    weight: 'الوزن',
    garageTitle: 'المرآب الواقعي ثلاثي الأبعاد',
    garageHint: 'اسحب في منتصف الشاشة لتدوير السيارة ومعاينة التفاصيل',
    tabChassis: 'الهيكل والسيارة (32)',
    tabPaint: 'الطلاء المعدني (16)',
    tabDecals: 'الملصقات',
    tabWheels: 'الجنوط',
    tabTires: 'الإطارات',
    tabSpoilers: 'الجناح الخلفي',
    tabEngine: 'ترقية المحرك',
    tabExhaust: 'لهب العادم',
    unlocked: 'متاح',
    ready: 'جاهز',
    active: 'مُجهز',
    select: 'اختيار',
    unlockFor: 'فتح مقابل',
    needCoins: 'تحتاج إلى',
    tracksTitle: 'اختيار المضمار',
    tracksSub: '16 مضماراً واقعياً · اختصارات، منصات قفز، أمطار وإضاءة ديناميكية',
    shortcutIntel: 'معلومة الاختصار',
    personalBest: 'أفضل توقيت شخصي',
    raceThisTrack: 'ابدأ السباق على هذا المضمار',
    setActiveTrack: 'تعيين كمضمار نشط',
    lapsLabel: 'لفات',
    championshipTitle: 'البطولات الكبرى',
    championshipSub: 'سلسلة من 4 سباقات متتالية مع نقاط تراكمية ومكافآت كبرى',
    roundLabel: 'الجولة',
    startCup: 'بدء البطولة',
    bonusCoins: 'مكافأة إضافية',
    rosterTitle: 'اختيار السائق',
    rosterSub: '24 سائقاً بقدرات وتصميمات ثلاثية الأبعاد وأصوات مميزة',
    appearanceSkin: 'مظهر البدلة',
    selectDriver: 'اختيار السائق',
    previewVoice: 'سماع الصوت',
    mpTitle: 'اللعب الجماعي عبر الإنترنت',
    privateRoomTitle: 'غرفة سباق خاصة',
    connected: 'متصل بالخادم',
    connecting: 'جاري الاتصال...',
    reconnecting: 'جاري إعادة الاتصال...',
    leaveRoom: 'مغادرة الغرفة',
    createRoom: 'إنشاء غرفة',
    createPrivateRoom: 'إنشاء غرفة خاصة للأصدقاء',
    createPublicRoom: 'إنشاء غرفة عامة',
    quickPublicMatch: 'بحث تلقائي عن سباق عام',
    joinByCode: 'الانضمام برمز الغرفة',
    enterCodePlaceholder: 'أدخل الرمز مثلاً NX4K9P',
    join: 'انضمام',
    openPublicLobbies: 'الغرف العامة المفتوحة',
    noPublicLobbies: 'لا توجد غرف عامة مفتوحة حالياً. أنشئ غرفة جديدة أو استخدم البحث التلقائي!',
    refresh: 'تحديث',
    roomCodeLabel: 'رمز الغرفة الخاصة',
    copyInvite: 'نسخ رابط الدعوة',
    copiedInvite: 'تم نسخ الرابط!',
    playersList: 'قائمة اللاعبين',
    selectCarBtn: 'تغيير السيارة في المرآب',
    selectTrackLabel: 'اختيار المضمار',
    startRaceBtn: 'بدء السباق',
    readyUp: 'أنا جاهز',
    readyState: 'جاهز',
    waitingState: 'بانتظار الاستعداد',
    hostLabel: 'المضيف',
    kickPlayer: 'طرد',
    lockRoom: 'قفل الغرفة',
    unlockRoom: 'فتح الغرفة',
    roomLockedLabel: 'الغرفة مقفلة',
    maxPlayersLabel: 'الحد الأقصى للاعبين',
    fillAiLabel: 'إكمال المقاعد الفارغة بمنافسين ذكاء اصطناعي',
    aiSlot: 'متسابق ذكاء اصطناعي',
    openSlot: 'مقعد فارغ',
    lobbyChat: 'محادثة الغرفة الآمنة',
    presetChatLabel: 'رسائل سريعة جاهزة',
    items: {
      nitro_surge: { name: 'شاحن التوربو', desc: 'يزيد سرعة السيارة بشكل مؤقت ومفاجئ' },
      seeker_pulse: { name: 'قذيفة الطاقة', desc: 'تستهدف أقرب منافس أمامك وتصيبه بدقة' },
      slick_trap: { name: 'بقعة الزيت', desc: 'تترك منطقة منزلقة خلفك تعيق الملاحقين' },
      aegis_dome: { name: 'الدرع الواقي', desc: 'يحمي السيارة من الهجمات والاصطدامات' },
      chrono_field: { name: 'نبضة كهرومغناطيسية', desc: 'تشوش تحكم وسرعة السيارات القريبة مؤقتاً' },
      overdrive_core: { name: 'موجة السرعة', desc: 'موجة طاقة تدفعك وتؤثر على المنافسين القريبين' },
      repair_kit: { name: 'حقيبة الإصلاح', desc: 'تستعيد حالة السيارة وتزيل الدخان والأضرار' },
      nitro_charge: { name: 'شحنة نيترو', desc: 'تمنح تسارعاً إضافياً فورياً وتشحن العداد' },
    },
    positionLabel: 'المركز',
    lapLabel: 'اللفة',
    speedUnit: 'كم/س',
    nitroMeter: 'عداد النيترو',
    driftTier: 'مستوى الانجراف',
    currentItem: 'الأداة الحالية',
    noItem: 'لا توجد أداة',
    useItemBtn: 'استخدام الأداة',
    rivalsLabel: 'المنافسون',
    conditionLabel: 'حالة السيارة',
    wrongWay: 'اتجاه خاطئ! استدر فوراً',
    targetAhead: 'هدف مقفل',
    crashingBanner: 'حادث! جاري التوقف المؤقت...',
    recoveringBanner: 'عودة إلى المسار وحماية مؤقتة',
    goBanner: 'انطلق بأقصى سرعة!',
    finalLapBanner: 'اللفة الأخيرة!',
    finishBanner: 'خط النهاية!',
    pauseTitle: 'إيقاف السباق مؤقتاً',
    resumeRace: 'متابعة السباق',
    restartRace: 'إعادة السباق',
    exitToMenu: 'العودة للقائمة الرئيسية',
    resultsTitle: 'نتائج السباق الرسمية',
    victoryTitle: 'المركز الأول! فوز مستحق',
    finishedPos: 'المركز النهائي',
    eliminatedTitle: 'خروج من جولة الإقصاء',
    raceTimeLabel: 'وقت السباق',
    pointsEarnedLabel: 'النقاط المكتسبة',
    rewardsLabel: 'المكافآت',
    rematchBtn: 'إعادة السباق',
    returnToRoomBtn: 'العودة إلى الغرفة',
    nextRaceBtn: 'السباق التالي',
    pitCrewTitle: 'تحليل مهندس السباق الذكي',
    getTipBtn: 'عرض نصيحة المسار',
    analyzingBtn: 'جاري التحليل...',
    profileHubTitle: 'الملف الشخصي ولوحة المتصدرين',
    profileTab: 'الملف والأصدقاء',
    challengesTab: 'التحديات اليومية',
    achievementsTab: 'الإنجازات',
    leaderboardsTab: 'لوحة المتصدرين',
    displayName: 'اسم المتسابق',
    friendTagLabel: 'رمز الصديق الخاص بك',
    winsLabel: 'الانتصارات',
    totalRacesLabel: 'إجمالي السباقات',
    driftsLabel: 'الانجرافات الناجحة',
    friendsListTitle: 'قائمة الأصدقاء',
    addFriendPlaceholder: 'أدخل رمز الصديق مثلاً APEX#4821',
    addBtn: 'إضافة',
    noFriendsYet: 'لا يوجد أصدقاء مضافون بعد. شارك رمزك أو رابط الغرفة الخاصة!',
    onlineLabel: 'متصل',
    offlineLabel: 'غير متصل',
    claimedLabel: 'تم الاستلام',
    claimBtn: 'استلام المكافأة',
    trackRecordsTitle: 'أرقام المضمار القياسية',
    topWinsTitle: 'أكثر المتسابقين فوزاً',
    noRecordsYet: 'لا توجد أرقام مسجلة على هذا المضمار بعد.',
    settingsTitle: 'الإعدادات والتحكم',
    languageLabel: 'لغة اللعبة',
    drivingDifficultyLabel: 'صعوبة القيادة',
    timeOfDayLabel: 'وقت السباق (إضاءة)',
    weatherLabel: 'حالة الطقس',
    audioCameraTitle: 'الصوت والكاميرا والبيئة',
    muteAll: 'كتم جميع الأصوات',
    masterVol: 'مستوى الصوت العام',
    musicVol: 'صوت الموسيقى',
    sfxVol: 'صوت المحرك والمؤثرات',
    cameraFov: 'زاوية الكاميرا',
    showMinimap: 'إظهار خريطة المضمار',
    mobileTitle: 'التحكم باللمس للهواتف',
    enableTouchHud: 'تفعيل أزرار اللمس على الشاشة',
    steerMode: 'طريقة التوجيه',
    modeButtons: 'أزرار يمين/يسار',
    modeDrag: 'سحب الشاشة',
    modeTilt: 'إمالة الجهاز',
    layoutPreset: 'توزيع الأزرار',
    presetStandard: 'قياسي (التوجيه يسار)',
    presetLeft: 'أعسر (التوجيه يمين)',
    buttonSize: 'حجم الأزرار',
    steerOffset: 'إزاحة أزرار التوجيه',
    actionOffset: 'إزاحة أزرار التسارع',
    tutorialTitle: 'دليل القيادة والأدوات',
    tutorialDesktopTitle: '1. تحكم الحاسوب وذراع التحكم والشاشة المقسمة',
    tutorialDriftTitle: '2. نظام الانجراف والتوربو المتدرج',
    tutorialItemsTitle: '3. ترسانة الأدوات القتالية (8 أدوات)',
    tutorialCrashTitle: '4. نظام الحوادث والاستعادة التلقائية',
    tutorialDesktopLines: [
      'القيادة والتوجيه: W/A/S/D أو الأسهم (ويدعم ذراع التحكم Gamepad تلقائياً).',
      'الانجراف: استمر بالضغط على Shift أثناء الانعطاف لشحن شرارة التوربو.',
      'القفز: Spacebar للقفز على المنحدرات.',
      'إطلاق الأداة: E أو F أو زر استخدام الأداة على الشاشة.',
      'الاستعادة الفورية للمسار: اضغط R أو زر (استعادة للمسار) إذا علقت بين الحدود.',
      'لاعبان (شاشة مقسمة): اللاعب 1 بـ WASD، اللاعب 2 بالأسهم + Enter للأداة.',
    ],
    tutorialDriftDesc:
      'عند الانجراف بالضغط على Shift تتدرج الشرارة من الأصفر إلى البرتقالي ثم البنفسجي، وعند الإفلات تحصل على دفعة سرعة قوية.',
    tutorialCrashDesc:
      'عند الخروج عن المضمار أو التوقف عند الحدود، تعود السيارة سريعاً وبانسيابية لمنتصف المسار مع الحفاظ على لفتك ومركزك، كما يمكنك الضغط على R للعودة الفورية في أي لحظة.',
    recoverToTrack: 'عودة للمسار (R)',
    raceSetupTitle: 'مركز السباق والإعداد',
    raceSetupSub: 'اختر وضع السباق، عدد المتسابقين، والمضمار ثم انطلق مباشرة',
    raceModeLabel: 'وضع السباق',
    racerCountLabel: 'عدد المتسابقين',
    startRaceNow: 'انطلاق السباق الآن',
    singleRaceMode: 'سباق قياسي',
    chooseTrackBtn: 'تغيير المضمار',
    menuGarageAndDriver: 'المرآب والسائق',
    menuTracksAndCups: 'المضامير والبطولات',
    driversTab: 'السائقون (24)',
    garageTabLabel: 'السيارات والتخصيص',
    tracksTab: 'المضامير (16)',
    cupsTab: 'البطولات (4)',
    publicPlayTab: 'اللعب العام',
    privatePlayTab: 'غرفة خاصة',
    tutorialTab: 'دليل اللعب',
    settingsGeneralTab: 'الإعدادات',
    soloLabel: 'متسابق واحد (زمن)',
  },
  en: {
    gameTitle: 'Azab Apex Racing',
    loadingTitle: 'Azab Apex Racing',
    loadingSub: 'Initializing Realistic 3D Engine, Weather & Garage...',
    back: 'Back',
    saveAndExit: 'Save & Exit',
    save: 'Save',
    coins: 'Coins',
    level: 'Level',
    menuPlay: 'Play',
    menuMultiplayer: 'Multiplayer',
    menuPrivateRoom: 'Private Room',
    menuSelectCar: 'Select Car',
    menuGarage: 'Garage',
    menuSelectTrack: 'Select Track',
    menuChampionships: 'Championships',
    menuProfile: 'Profile',
    menuSettings: 'Settings',
    menuCharacters: 'Drivers',
    menuLeaderboards: 'Leaderboards',
    menuTimeTrial: 'Time Trial',
    menuPractice: 'Practice',
    menuTournament: 'Tournament',
    menuSplitScreen: '2P Split-Screen',
    menuTutorial: 'How to Play',
    controlsQuickHint: 'WASD Drive · Shift Drift · Space Jump · E Use Item',
    racersCount: '8 Racers',
    all: 'All',
    categories: {
      speed: 'Top Speed',
      acceleration: 'Acceleration',
      handling: 'Handling',
      balanced: 'Balanced',
      power: 'Heavy Power',
    },
    kartClasses: {
      classic: 'Classic',
      sports: 'Supercar',
      hover: 'Futuristic',
      monster: 'Monster 4x4',
      offroad: 'Off-Road',
      lightweight: 'Lightweight',
      heavy: 'Armored Heavy',
    },
    themes: {
      tropical: 'Tropical Island',
      temple: 'Ancient Temple',
      desert: 'Desert Highway',
      snow: 'Snowy Mountain',
      volcano: 'Volcano Circuit',
      cyber: 'Futuristic City',
      haunted: 'Haunted Forest',
      jungle: 'Jungle Track',
      ocean: 'Ocean Circuit',
      space: 'Space Orbital',
    },
    difficulties: {
      easy: 'Easy',
      medium: 'Medium',
      pro: 'Professional',
    },
    timesOfDay: {
      day: 'Bright Day',
      sunset: 'Golden Sunset',
      night: 'Night Race',
    },
    weathers: {
      clear: 'Clear Sky',
      rain: 'Rain & Wet Road',
    },
    trackDiffs: {
      Easy: 'Easy',
      Medium: 'Medium',
      Hard: 'Hard',
      Extreme: 'Extreme',
    },
    speed: 'Speed',
    acceleration: 'Acceleration',
    handling: 'Handling',
    drift: 'Drift',
    weight: 'Weight',
    garageTitle: 'Realistic 3D Vehicle Garage',
    garageHint: 'Drag center viewport to orbit and inspect vehicle details',
    tabChassis: 'Vehicles (32)',
    tabPaint: 'Metallic Paint (16)',
    tabDecals: 'Stickers',
    tabWheels: 'Rims',
    tabTires: 'Tires',
    tabSpoilers: 'Spoilers',
    tabEngine: 'Engine Tuning',
    tabExhaust: 'Exhaust Flame',
    unlocked: 'Unlocked',
    ready: 'Ready',
    active: 'Equipped',
    select: 'Select',
    unlockFor: 'Unlock for',
    needCoins: 'Need',
    tracksTitle: 'Select Track',
    tracksSub: '16 detailed circuits · Shortcuts, jump ramps, rain & dynamic lighting',
    shortcutIntel: 'Shortcut Tip',
    personalBest: 'Personal Best',
    raceThisTrack: 'Race on This Track',
    setActiveTrack: 'Set Active Track',
    lapsLabel: 'Laps',
    championshipTitle: 'Championships',
    championshipSub: '4-race Grand Prix series with cumulative points & bonus rewards',
    roundLabel: 'Round',
    startCup: 'Start Cup',
    bonusCoins: 'Bonus Coins',
    rosterTitle: 'Driver Selection',
    rosterSub: '24 original drivers with unique stats, suits & voices',
    appearanceSkin: 'Suit Skin',
    selectDriver: 'Select Driver',
    previewVoice: 'Preview Voice',
    mpTitle: 'Online Multiplayer',
    privateRoomTitle: 'Private Friends Room',
    connected: 'Connected',
    connecting: 'Connecting...',
    reconnecting: 'Reconnecting...',
    leaveRoom: 'Leave Room',
    createRoom: 'Create Room',
    createPrivateRoom: 'Create Private Room',
    createPublicRoom: 'Create Public Room',
    quickPublicMatch: 'Public Quick Match',
    joinByCode: 'Join by Room Code',
    enterCodePlaceholder: 'Enter code e.g. NX4K9P',
    join: 'Join',
    openPublicLobbies: 'Open Public Lobbies',
    noPublicLobbies: 'No public lobbies open right now. Create one or use Quick Match!',
    refresh: 'Refresh',
    roomCodeLabel: 'Private Room Code',
    copyInvite: 'Copy Invite Link',
    copiedInvite: 'Copied!',
    playersList: 'Players List',
    selectCarBtn: 'Change Car in Garage',
    selectTrackLabel: 'Select Track',
    startRaceBtn: 'Start Race',
    readyUp: 'Ready Up',
    readyState: 'Ready',
    waitingState: 'Waiting',
    hostLabel: 'Host',
    kickPlayer: 'Kick',
    lockRoom: 'Lock Room',
    unlockRoom: 'Unlock Room',
    roomLockedLabel: 'Room Locked',
    maxPlayersLabel: 'Max Players',
    fillAiLabel: 'Fill empty slots with AI racers',
    aiSlot: 'AI Racer',
    openSlot: 'Open Slot',
    lobbyChat: 'Safe Lobby Chat',
    presetChatLabel: 'Quick Preset Messages',
    items: {
      nitro_surge: { name: 'Turbo Boost', desc: 'Temporarily boosts top speed' },
      seeker_pulse: { name: 'Energy Projectile', desc: 'Locks onto rival ahead and strikes' },
      slick_trap: { name: 'Oil Trap', desc: 'Leaves a slippery hazard on track' },
      aegis_dome: { name: 'Protective Shield', desc: 'Absorbs incoming attacks & impacts' },
      chrono_field: { name: 'EMP Pulse', desc: 'Disrupts nearby opponents controls & speed' },
      overdrive_core: { name: 'Speed Wave', desc: 'Surges speed and waves nearby racers' },
      repair_kit: { name: 'Repair Kit', desc: 'Restores vehicle condition and clears smoke' },
      nitro_charge: { name: 'Nitro Charge', desc: 'Instant extra acceleration & nitro fill' },
    },
    positionLabel: 'Position',
    lapLabel: 'Lap',
    speedUnit: 'KM/H',
    nitroMeter: 'Nitro Meter',
    driftTier: 'Drift Tier',
    currentItem: 'Current Item',
    noItem: 'Empty',
    useItemBtn: 'Use Item',
    rivalsLabel: 'Rivals',
    conditionLabel: 'Condition',
    wrongWay: 'Wrong Way! Turn Around',
    targetAhead: 'Target Locked',
    crashingBanner: 'Crash! Recovering...',
    recoveringBanner: 'Back on Track · Shield Active',
    goBanner: 'GO! FULL THROTTLE!',
    finalLapBanner: 'FINAL LAP!',
    finishBanner: 'FINISH!',
    pauseTitle: 'Race Paused',
    resumeRace: 'Resume Race',
    restartRace: 'Restart Race',
    exitToMenu: 'Main Menu',
    resultsTitle: 'Official Race Results',
    victoryTitle: '1st Place Victory!',
    finishedPos: 'Finished Position',
    eliminatedTitle: 'Eliminated',
    raceTimeLabel: 'Race Time',
    pointsEarnedLabel: 'Points Earned',
    rewardsLabel: 'Rewards',
    rematchBtn: 'Race Again',
    returnToRoomBtn: 'Return to Room',
    nextRaceBtn: 'Next Race',
    pitCrewTitle: 'AI Race Engineer Brief',
    getTipBtn: 'Get Setup & Line Tip',
    analyzingBtn: 'Analyzing...',
    profileHubTitle: 'Profile & Leaderboards',
    profileTab: 'Profile & Friends',
    challengesTab: 'Daily Challenges',
    achievementsTab: 'Achievements',
    leaderboardsTab: 'Leaderboards',
    displayName: 'Driver Name',
    friendTagLabel: 'Your Friend Tag',
    winsLabel: 'Wins',
    totalRacesLabel: 'Total Races',
    driftsLabel: 'Successful Drifts',
    friendsListTitle: 'Friends List',
    addFriendPlaceholder: 'Enter Friend Tag e.g. APEX#4821',
    addBtn: 'Add',
    noFriendsYet: 'No friends yet. Share your Friend Tag or a Private Room invite!',
    onlineLabel: 'Online',
    offlineLabel: 'Offline',
    claimedLabel: 'Claimed',
    claimBtn: 'Claim Reward',
    trackRecordsTitle: 'Track Time Records',
    topWinsTitle: 'Top Wins',
    noRecordsYet: 'No records set on this track yet.',
    settingsTitle: 'Settings & Controls',
    languageLabel: 'Language',
    drivingDifficultyLabel: 'Driving Difficulty',
    timeOfDayLabel: 'Time of Day',
    weatherLabel: 'Weather',
    audioCameraTitle: 'Audio, Camera & Environment',
    muteAll: 'Mute All Audio',
    masterVol: 'Master Volume',
    musicVol: 'Music Volume',
    sfxVol: 'Engine & SFX Volume',
    cameraFov: 'Camera FOV',
    showMinimap: 'Show Track Mini-Map',
    mobileTitle: 'Mobile Touch Controls',
    enableTouchHud: 'Enable On-Screen Touch Controls',
    steerMode: 'Steering Mode',
    modeButtons: 'L/R Buttons',
    modeDrag: 'Touch Slide',
    modeTilt: 'Tilt Gyro',
    layoutPreset: 'Layout Preset',
    presetStandard: 'Standard (Steer Left)',
    presetLeft: 'Left-Handed (Steer Right)',
    buttonSize: 'Button Size',
    steerOffset: 'Steer Horizontal Offset',
    actionOffset: 'Actions Horizontal Offset',
    tutorialTitle: 'Driving & Items Tutorial',
    tutorialDesktopTitle: '1. PC Keyboard, Gamepad & Split-Screen',
    tutorialDriftTitle: '2. Controlled Drifting & Turbo Tiers',
    tutorialItemsTitle: '3. Racing Items Arsenal (8 Items)',
    tutorialCrashTitle: '4. Crash, Fall & Track Respawn System',
    tutorialDesktopLines: [
      'Drive / Steer: W/A/S/D or Arrows (Gamepad controllers supported automatically).',
      'Drift: Hold Shift while turning to charge boost sparks.',
      'Jump: Spacebar off ramps for extra air.',
      'Use Item: Press E, F, or click the HUD Use Item button.',
      'Instant Track Recovery: Press R or click Back to Track if near barriers.',
      '2P Split-Screen: P1 uses WASD, P2 uses Arrows + Enter for item.',
    ],
    tutorialDriftDesc:
      'Hold Shift while steering into corners to charge Yellow, Orange, and Purple turbo tiers, then release Shift to boost.',
    tutorialCrashDesc:
      'Sliding against barriers or falling off elevated sections automatically glides or snaps you smoothly back onto the track preserving your lap and position, or press R anytime for instant recovery.',
    recoverToTrack: 'Track Reset (R)',
    raceSetupTitle: 'Race Setup Hub',
    raceSetupSub: 'Choose race mode, racer count, and track before hitting the grid',
    raceModeLabel: 'Race Mode',
    racerCountLabel: 'Number of Racers',
    startRaceNow: 'Start Race Now',
    singleRaceMode: 'Standard Race',
    chooseTrackBtn: 'Change Track',
    menuGarageAndDriver: 'Garage & Driver',
    menuTracksAndCups: 'Tracks & Cups',
    driversTab: 'Drivers (24)',
    garageTabLabel: 'Cars & Tuning',
    tracksTab: 'Tracks (16)',
    cupsTab: 'Championships (4)',
    publicPlayTab: 'Public Match',
    privatePlayTab: 'Private Room',
    tutorialTab: 'How to Play',
    settingsGeneralTab: 'Settings',
    soloLabel: 'Solo (Time Trial)',
  },
};

export const TRACK_NAMES_AR: Record<string, { name: string; subtitle: string; shortcut: string }> = {
  coco_bay: {
    name: 'خليج جوز الهند',
    subtitle: 'شواطئ استوائية وممرات خشبية وقفزات بحرية',
    shortcut: 'استخدم منحدر الشاطئ في المنعطف الرابع لتجاوز الخور!',
  },
  sunspire_ruins: {
    name: 'أطلال معبد الشمس',
    subtitle: 'أعمدة حجرية أثرية وبندولات متحركة',
    shortcut: 'اعبر قوس الساحة الداخلية خلف البندول المتأرجح.',
  },
  mojave_mirage: {
    name: 'سراب الصحراء السريع',
    subtitle: 'طرق سريعة بين الصخور الحمراء والمنحدرات',
    shortcut: 'اقفز من هضبة الوادي لاختصار المنعطف الحاد.',
  },
  frostpeak_summit: {
    name: 'قمة الصقيع الجبلية',
    subtitle: 'قمم جليدية وغابات صنوبر ومنحدرات ثلجية',
    shortcut: 'اسلك منحدر التوربو العلوي فوق الحافة الثلجية.',
  },
  caldera_inferno: {
    name: 'فوهة البركان الملتهبة',
    subtitle: 'أنهار حمم منصهرة وجسور بازلتية حارة',
    shortcut: 'اقفز فوق فجوة الجسر البركاني باستخدام دفعة النيترو!',
  },
  neo_tokyo: {
    name: 'طوكيو المستقبلية السريعة',
    subtitle: 'ناطحات سحاب مضيئة وجسور نيون سريعة',
    shortcut: 'مر عبر مسار التسريع المضيء في الطابق العلوي.',
  },
  hollowood_hollow: {
    name: 'وادي الغابة الغامضة',
    subtitle: 'أشجار عتيقة وضباب كثيف وجسور خشبية',
    shortcut: 'اسلك المسار الجانبي السريع بمحاذاة الجسر.',
  },
  emerald_canopy: {
    name: 'مظلة الأدغال الزمردية',
    subtitle: 'غابات مطيرة كثيفة وشلالات ومنحدرات طبيعية',
    shortcut: 'اقفز فوق منحدر الجذع المرتفع عند منعطف النهر.',
  },
  coral_speedway: {
    name: 'حلبة الشعاب المرجانية',
    subtitle: 'جسور ساحلية زجاجية ورذاذ أمواج المحيط',
    shortcut: 'استخدم المنصة العائمة في الخط الخلفي للمضمار.',
  },
  orbital_starway: {
    name: 'طريق النجوم المداري',
    subtitle: 'حلقات كويكبات ومسارات طاقة عالية الارتفاع',
    shortcut: 'اضرب منصة التسريع الفضائية للعبور فوق الفجوة!',
  },
  pharaoh_dune: {
    name: 'كثبان الفراعنة الذهبية',
    subtitle: 'أهرامات ذهبية ومسلات حجرية ومنعطفات رملية',
    shortcut: 'اقطع المسافة بين المسلتين بعد صعود الهرم.',
  },
  glacier_gorge: {
    name: 'مضيق الأنهار الجليدية',
    subtitle: 'كهوف جليدية عاكسة ومنعطفات حادة متجمدة',
    shortcut: 'انجرف بدقة حول جزيرة القمة المتجمدة.',
  },
  magma_foundry: {
    name: 'مصهر الصهارة الصناعي',
    subtitle: 'ممرات فولاذية وحواجز ليزر وأفران مصهورة',
    shortcut: 'فعّل النيترو لعبور منحدر المصهر الساخن!',
  },
  skyline_metro: {
    name: 'مترو الأفق الحضري',
    subtitle: 'جسور معلقة نهارية وشوارع مدينة حديثة',
    shortcut: 'ادخل مسار الجسر السريع بجانب ساحة المدينة.',
  },
  witching_marsh: {
    name: 'مستنقع الأضواء العائمة',
    subtitle: 'ألواح خشبية فوق المستنقع وجذور متشابكة',
    shortcut: 'اقفز من منحدر الجذور قرب الفطر المضيء.',
  },
  hyperion_station: {
    name: 'محطة هايبريون المدارية',
    subtitle: 'ألواح شمسية مدارية وملفات بلازما فائقة',
    shortcut: 'اربط إنجرافاتك المتتالية عبر الجسرين الشمسيين!',
  },
};

export const PRESET_CHAT_AR: string[] = [
  'جاهز للسباق!',
  'بالتوفيق للجميع!',
  'انتبه من التوربو!',
  'سباق رائع!',
  'سباق إضافي؟',
  'اختر مضماراً أصعب!',
  'أحسنتم جميعاً!',
  'نلتقي عند خط النهاية!',
];

export function getTrackLocalized(
  track: { id: string; name: string; subtitle: string; shortcutNote: string },
  lang: Language
) {
  if (lang === 'ar' && TRACK_NAMES_AR[track.id]) {
    const ar = TRACK_NAMES_AR[track.id];
    return { name: ar.name, subtitle: ar.subtitle, shortcutNote: ar.shortcut };
  }
  return { name: track.name, subtitle: track.subtitle, shortcutNote: track.shortcutNote };
}
