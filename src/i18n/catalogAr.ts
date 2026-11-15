import { CharacterDef, KartDef, Language } from '../types/game';

export const CHARACTERS_AR: Record<string, { name: string; title: string; quote: string }> = {
  blaze_vex: { name: 'بليز فيكس', title: 'ثعلب السرعة الشمسية', quote: 'شاهد غبار عادمي وأنا أتجاوزك!' },
  volt_dash: { name: 'فولت داش', title: 'روبوت الدوائر الفائقة', quote: 'رفع طاقة المحركات إلى 140%!' },
  nova_lynx: { name: 'نوفا لينكس', title: 'صيادة السديم', quote: 'انعدام مقاومة، أقصى سرعة ممكنة.' },
  razor_fang: { name: 'ريزور فانج', title: 'طوربيد المحيطات', quote: 'الدواسة حتى النهاية ولا تراجع!' },
  turbo_rex: { name: 'توربو ريكس', title: 'عداء العصر الجوراسي', quote: 'لا شيء يستطيع إيقاف اندفاعي!' },
  pip_sprout: { name: 'بيب سبراوت', title: 'مغامر الأدغال', quote: 'ارمش بعينيك وستجدني قد عبرت المنعطف!' },
  zippy_fox: { name: 'زيبي فيكسن', title: 'شرارة الصحراء', quote: 'من الصفر إلى القمة قبل أن يضيء الضوء الأخضر!' },
  sparky_bot: { name: 'سباركي-9', title: 'الدينامو الصغير', quote: 'عزم دوران فوري جاهز للانطلاق!' },
  lulu_pop: { name: 'لولو بوب', title: 'مذنبة النجوم', quote: 'الجاذبية اختيارية عندما تفعّل التوربو!' },
  nibbles_claw: { name: 'نيبلز', title: 'لص الأنفاق السريع', quote: 'حجم خفيف، انطلاقة صاروخية!' },
  drift_yuki: { name: 'دريفت يوكي', title: 'ملكة المنعطفات الحادة', quote: 'كل منعطف هو لوحة فنية لدخان الإطارات.' },
  aero_wren: { name: 'أيرو رين', title: 'صقر السماء', quote: 'أنحت الهواء بزوايا حادة ودقيقة!' },
  glide_finn: { name: 'غلايد فين', title: 'ساحر البحيرة', quote: 'الخطوط السلسة تهزم القوة العمياء دائماً.' },
  silk_viper: { name: 'سيلك فايبر', title: 'ظل المعبد', quote: 'أتجاوزهم قبل أن يبدأوا في تدوير المقود.' },
  breeze_kai: { name: 'بريز كاي', title: 'طيار الانسيابية', quote: 'أدق نقطة ارتكاز على الحلبة بأكملها!' },
  ace_carter: { name: 'آيس كارتر', title: 'بطل الجائزة الكبرى', quote: 'دقة، عزيمة، وشجاعة كاملة عند المنعطف.' },
  sunny_coco: { name: 'ساني كوكو', title: 'بطلة الجزر الاستوائية', quote: 'الشمس مشرقة والنيترو جاهز، هيا بنا!' },
  echo_nova: { name: 'إيكو-إكس', title: 'مبعوث المدار', quote: 'المسار المحسوب: منصة التتويج بنسبة 100%.' },
  captain_jax: { name: 'الكابتن جاكس', title: 'قائد القراصنة', quote: 'لا يوجد اختصار صعب على هذا الطاقم!' },
  terra_maya: { name: 'تيرا مايا', title: 'كشافة الأدغال', quote: 'على الأسفلت أو التراب، المضمار ملكي.' },
  titan_kong: { name: 'تايتان كونغ', title: 'محطم الأدغال', quote: 'اقترب من مصدّي وسترتد خارج المسار!' },
  magma_golem: { name: 'ماغما غوليم', title: 'عملاق البراكين', quote: 'مصنوع من حمم البركان، كتلة لا تتوقف.' },
  iron_rhino: { name: 'آيرون راينو', title: 'المدرعة الفولاذية', quote: 'افتح المسار أو استعد للارتطام!' },
  frost_bear: { name: 'فروست كودياك', title: 'مقاتل الجليد', quote: 'أعصاب باردة كالفولاذ وزخم كالانهيار الجليدي!' },
};

export const SKIN_NAMES_AR: Record<string, string> = {
  classic: 'الطراز الأصلي',
  turbo: 'الذهبي الخارق',
  cobalt: 'الشبح الكوبالت',
  carbon: 'الأوبسيديان الاحترافي',
};

export const KARTS_AR: Record<string, { name: string; description: string }> = {
  apex_classic: { name: 'أبيكس مارك 1', description: 'سيارة سباق متوازنة بهيكل أنبوبي واستجابة حادة.' },
  nitro_sprint: { name: 'نيترو سبرينتر', description: 'سيارة كلاسيكية مزدوجة السحب للخروج السريع من المنعطفات.' },
  retro_comet: { name: 'ريترو كوميت', description: 'تصميم الثمانينيات الكلاسيكي مع لمسات كروم رياضية.' },
  bandit_kart: { name: 'بانديكوت الخاصة', description: 'سيارة رشيقة معدلة لسلاسل الانجراف المتتالية.' },
  crown_gp: { name: 'كراون GP-88', description: 'تحفة السباقات التراثية بلمسات ذهبية على الأسفلت.' },
  valkyrie_gt: { name: 'فالكيري GT', description: 'كوبيه رياضية منخفضة بموزع هواء أمامي هجومي.' },
  phantom_rs: { name: 'فانتوم RS', description: 'سيارة كربون عريضة بثبات فائق في السرعات العالية.' },
  mirage_s7: { name: 'ميراج S7', description: 'سيارة خارقة بمحرك وسطي مخصصة للخطوط المستقيمة الطويلة.' },
  touge_rx: { name: 'توغي RX-9', description: 'آلة شوارع معدلة للانجراف بانسيابية وسهولة تحكم.' },
  solaris_v12: { name: 'سولاريس V12', description: 'سيارة هايبر كار مستوحاة من وحوش الحلبات.' },
  aether_hover: { name: 'إيثر بالس', description: 'مركبة مستقبلية بمضادات جاذبية تنساب فوق العقبات.' },
  nebula_dart: { name: 'سهم السديم', description: 'متسابقة مدارية بمقدمة إبرية ومقاومة هواء شبه معدومة.' },
  photon_glider: { name: 'طائرة الفوتون', description: 'جناح بلازما عريض بانعطاف جانبي فوري.' },
  hyperion_mag: { name: 'هايبريون ماغليف', description: 'مركبة كهرومغناطيسية مصممة لحلبات المدن الليلية.' },
  chrono_disc: { name: 'كرونو فيكتور', description: 'معترضة تجريبية رباعية الدفع بتقنية المستقبل.' },
  crush_titan: { name: 'كراش تايتان', description: 'شاحنة وحش مرفوعة تفرض سيطرتها في الاحتكاكات.' },
  goliath_4x4: { name: 'جولياث 4x4', description: 'نظام تعليق فولاذي ثقيل بقدرة تحمل صدمات هائلة.' },
  fang_crawler: { name: 'زاحفة الأنياب', description: 'شاحنة سباق بمصدات مقواة مصممة للتصادمات القوية.' },
  mammoth_rig: { name: 'ماموث الصحراء', description: 'هيكل عالي الخلوص مع قضبان حماية صحراوية.' },
  rex_stomper: { name: 'ريكس ستومبر', description: 'وحش دفع رباعي بامتصاص صدمات عملاق.' },
  dune_raider: { name: 'غازي الكثبان', description: 'باغي رالي تحافظ على سرعتها فوق الرمال والثلوج.' },
  baja_viper: { name: 'باها فايبر', description: 'سيارة رالي طويلة المدى مع مصابيح سقف مزدوجة.' },
  tundra_wolf: { name: 'ذئب التندرا', description: 'هيكل رالي لجميع الأحوال الجوية بتماسك رباعي.' },
  canyon_scout: { name: 'كشاف الوادي', description: 'سيارة مسارات وعرة خفيفة مجهزة للقفزات والاختصارات.' },
  feather_f1: { name: 'ريشة F-Zero', description: 'فورمولا خفيفة مفتوحة العجلات باستجابة توجيه لحظية.' },
  micro_spark: { name: 'شرارة مايكرو', description: 'كبسولة سباق خفيفة تنطلق كالصاروخ عند البداية.' },
  origami_jet: { name: 'نفاثة أوريغامي', description: 'هيكل انسيابي حاد الحواف للمنعطفات المتعرجة الضيقة.' },
  sprint_wasp: { name: 'دبور السرعة', description: 'هيكل رشيق للغاية للمضامير التقنية المعقدة.' },
  anvil_v8: { name: 'سندان V8', description: 'سيارة عضلات مدرعة بزخم سرعة هائل على المستقيمات.' },
  foundry_dozer: { name: 'كاسحة المصهر', description: 'مقدمة فولاذية مدرعة تحافظ على خط سيرها وسط الفوضى.' },
  bastion_tank: { name: 'باستيون GT', description: 'مركبة مدرعة ثقيلة بسحب متواصل لا يتراجع.' },
  volcano_brute: { name: 'وحش البركان', description: 'معترضة ثقيلة مدرعة بحجر الأوبسيديان البركاني.' },
};

export const PARTS_AR: Record<string, string> = {
  // Wheels
  alloy: 'جنوط ألمنيوم كلاسيكية',
  spoke: 'جنوط توربو 5 أضلاع',
  monster: 'جنوط وحش كبيرة',
  aero: 'أقراص كربون هوائية',
  hover: 'وحدات دفع مستقبلية',
  gold: 'جنوط التاج الذهبية',
  // Tires
  slick: 'إطارات أسفلت ملساء',
  knobby: 'إطارات طرق وعرة',
  ice: 'إطارات جليد مسننة',
  neon: 'إطارات نيون سيبرانية',
  gold_wall: 'إطارات أبيكس الذهبية',
  // Spoilers
  gt: 'جناح GT كربون',
  none: 'بدون جناح (انسيابي)',
  twin: 'زعانف نفاثة مزدوجة',
  monster_spoiler: 'قفص حماية علوي',
  cyber: 'جناح هالة مستقبلي',
  horns: 'قرون اللهب الخلفية',
  // Decals
  stripes: 'خطوط رالي مزدوجة',
  decal_none: 'طلاء لامع صافي',
  lightning: 'صاعقة البرق',
  flames: 'ألسنة لهب النيترو',
  checkered: 'مربعات السباق الكبرى',
  star: 'نجمة القمة',
  cyber_decal: 'شبكة سداسية مستقبلية',
  dragon: 'شعار التنين',
  // Engines
  stock_twin: 'محرك قياسي ثنائي',
  dual_chrome: 'مشعب كروم مزدوج',
  super_v6: 'شاحن سوبر V6',
  plasma_core: 'مفاعل بلازما خارق',
  quad_turbine: 'توربين نيترو رباعي',
  // Exhausts
  standard: 'لهب قياسي برتقالي',
  blue_nitro: 'نيترو أزرق خارق',
  crimson: 'جحيم قرمزي',
  neon_plasma: 'بلازما نيون بنفسجية',
  emerald_ion: 'أيون زمردي أخضر',
};

export const PAINT_COLORS_AR: Record<string, string> = {
  '#EF4444': 'أحمر قرمزي',
  '#2563EB': 'أزرق كوبالت',
  '#F59E0B': 'عنبر شمسي',
  '#06B6D4': 'سماوي كهربائي',
  '#10B981': 'أخضر زمردي',
  '#111827': 'أسود أوبسيديان',
  '#F8FAFC': 'أبيض جليدي',
  '#8B5CF6': 'بنفسجي فائق',
  '#EA580C': 'برتقالي بركاني',
  '#EC4899': 'أرجواني نيون',
  '#84CC16': 'أخضر حمضي',
  '#EAB308': 'ذهبي البطولة',
  '#94A3B8': 'فضي تيتانيوم',
  '#0F766E': 'أزرق بترولي عميق',
  '#312E81': 'نيلي ليلي',
  '#E11D48': 'نحاسي وردي',
};

export function getCharacterLocalized(c: CharacterDef, lang: Language) {
  if (lang === 'ar' && CHARACTERS_AR[c.id]) {
    const ar = CHARACTERS_AR[c.id];
    return { name: ar.name, title: ar.title, quote: ar.quote };
  }
  return { name: c.name, title: c.title, quote: c.quote };
}

export function getKartLocalized(k: KartDef, lang: Language) {
  if (lang === 'ar' && KARTS_AR[k.id]) {
    return KARTS_AR[k.id];
  }
  return { name: k.name, description: k.description };
}

export function getPartLocalized(id: string, fallbackName: string, lang: Language, category?: 'spoiler' | 'decal'): string {
  if (lang !== 'ar') return fallbackName;
  if (category === 'spoiler' && id === 'monster') return PARTS_AR.monster_spoiler;
  if (category === 'decal' && id === 'none') return PARTS_AR.decal_none;
  if (category === 'decal' && id === 'cyber') return PARTS_AR.cyber_decal;
  return PARTS_AR[id] || fallbackName;
}
