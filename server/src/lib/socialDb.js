/**
 * SQLite social store — used when DATABASE_URL is not configured (e.g. on
 * static-free hosts like AI Studio). Mirrors the Prisma/PostgreSQL feature
 * set so ratings, follows, gamification, submissions and tickets work
 * everywhere. Response shapes are identical in both modes.
 */
import { db } from '../db.js';
export { db };

let ready = false;

export function ensureSocialTables() {
  if (ready) return;
  ready = true;
  db.exec(`
CREATE TABLE IF NOT EXISTS social_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  episode INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_key, slug, episode)
);
CREATE TABLE IF NOT EXISTS social_follows (
  follower_key TEXT NOT NULL,
  following_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_key, following_key)
);
CREATE TABLE IF NOT EXISTS social_stats (
  user_key TEXT PRIMARY KEY,
  total_watch_time_min INTEGER NOT NULL DEFAULT 0,
  total_read_time_min INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS social_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  requirement_threshold INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS social_user_badges (
  user_key TEXT NOT NULL,
  badge_id INTEGER NOT NULL,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_key, badge_id)
);
CREATE TABLE IF NOT EXISTS social_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS social_profiles (
  user_key TEXT PRIMARY KEY,
  banner_url TEXT,
  theme_preference TEXT,
  frame_style TEXT DEFAULT 'default',
  ornament TEXT DEFAULT 'none',
  banner_style TEXT DEFAULT 'off'
);
CREATE TABLE IF NOT EXISTS social_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  admin_reply TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS social_referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_key TEXT NOT NULL,
  referred_username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS social_library_items (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  type TEXT NOT NULL, -- MANGA, MANHWA, NOVEL, BOOK
  poster TEXT NOT NULL,
  banner TEXT,
  chapters_count INTEGER NOT NULL DEFAULT 1,
  author TEXT,
  rating REAL DEFAULT 9.0,
  description_ar TEXT,
  description_en TEXT,
  status TEXT DEFAULT 'ONGOING',
  genres TEXT,
  release_year INTEGER
);
`);
  // profile customization columns on the auth users table
  for (const col of [
    'banner_url TEXT',
    'theme_preference TEXT',
    'frame_style TEXT',
    'ornament TEXT',
    'banner_style TEXT',
    'vip_status TEXT',
    'referral_code TEXT'
  ]) {
    try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch { /* exists */ }
  }
  for (const col of [
    'frame_style TEXT',
    'ornament TEXT',
    'banner_style TEXT DEFAULT \'off\''
  ]) {
    try { db.exec(`ALTER TABLE social_profiles ADD COLUMN ${col}`); } catch { /* exists */ }
  }
  for (const col of [
    'category TEXT',
    'admin_reply TEXT',
    'updated_at TEXT'
  ]) {
    try { db.exec(`ALTER TABLE social_tickets ADD COLUMN ${col}`); } catch { /* exists */ }
  }

  // seed badges once
  const c = db.prepare('SELECT COUNT(*) AS c FROM social_badges').get().c;
  if (!c) {
    const ins = db.prepare('INSERT INTO social_badges (name, icon_url, requirement_threshold) VALUES (?, ?, ?)');
    ins.run('First Steps', '/assets/badge1.png', 10);
    ins.run('Marathon Watcher', '/assets/badge2.png', 120);
    ins.run('Binge Lord', '/assets/badge3.png', 600);
    ins.run('Legend of BLACK X', '/assets/badge4.png', 1500);
    ins.run('VIP Basic', '/assets/badge_vip.png', 0);
  }

  // Clean up legacy fabricated items (mock manga, manhwa, novels, books)
  db.exec("DELETE FROM social_library_items WHERE id LIKE 'manga_%' OR id LIKE 'manhwa_%' OR id LIKE 'novel_%' OR id LIKE 'book_%' OR type IN ('NOVEL', 'BOOK')");

  // Seed authentic trending Manga & Manhwa catalog powered by MangaLik
  const libCount = db.prepare('SELECT COUNT(*) AS c FROM social_library_items').get()?.c || 0;
  if (libCount === 0) {
    const insLib = db.prepare(`
      INSERT OR REPLACE INTO social_library_items 
        (id, title_ar, title_en, type, poster, banner, chapters_count, author, rating, description_ar, description_en, status, genres, release_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // TRENDING MANHWA (المانهو الكورية الرائجة)
    insLib.run(
      'solo-leveling',
      'سولو ليفلينج (ارتقاء المستوى الفردي)',
      'Solo Leveling',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Solo-Leveling-1.jpg',
      'https://ssolo.mangalik.net/manga2/arb4/data/manga_5ed13172a2b6e/138ea303a5e63f21e112fa1ace1e1a15/image-01.jpg',
      205,
      'Chugong / DUBU (REDICE Studio)',
      9.9,
      'قبل 10 سنوات، بعد ظهور الباب الذي يربط العالم الحقيقي بعالم الوحوش، يتحول سونغ جين وو من أضعف صياد في العالم إلى حاكم الظلال الأعظم بعد حصوله على نظام ترقية فردي.',
      'Sung Jinwoo awakens a mysterious quest log that allows him to level up without limits in a world infested by dungeon gates.',
      'COMPLETED',
      JSON.stringify(['أكشن', 'فانتازيا', 'أبراج', 'نظام', 'قوة خارقة', 'سحر']),
      2018
    );

    insLib.run(
      'omniscient-readers-viewpoint',
      'وجهة نظر القارئ العليم (Omniscient Reader)',
      "Omniscient Reader's Viewpoint",
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/1-2-193x278-1.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/05/1-2-193x278-1.jpg',
      220,
      'Sing Shong / Sleepy-C (REDICE Studio)',
      9.9,
      'في اللحظة التي ظن فيها أن العالم قد دمر، ظهر عالم جديد. كيم دوكجا القارئ الوحيد لرواية نهاية العالم يجد أن أحداثها أصبحت حقيقة واقعية وهو الوحيد الذي يعرف نهايتها.',
      'An ordinary office worker who was the sole reader of an apocalyptic web novel suddenly sees the story become bloody reality.',
      'ONGOING',
      JSON.stringify(['أكشن', 'إثارة', 'فانتازيا', 'سيناريو', 'أبوكاليبس', 'وحوش']),
      2020
    );

    insLib.run(
      'solo-swordmaster',
      'سيد السيف المنفرد (Solo Swordmaster)',
      'Solo Swordmaster',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2026/09/b207545cacdb3f27b56270eac54a3b86-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2026/09/b207545cacdb3f27b56270eac54a3b86-193x278.jpg',
      25,
      'MangaLik Studios',
      9.8,
      'في عصرٍ يستمدّ فيه الجميع قوتهم من الكوكبات، هناك رجلٌ واحد لا يؤمن سوى بالسيف. آخر سياف، ريمون أشفيلدر، يثبت أن السيف أقوى من كل المهارات.',
      'In an age where everyone relies on constellations and divine skills, one lone swordsman climbs the peak solely through his blade.',
      'ONGOING',
      JSON.stringify(['أكشن', 'سحر', 'مغامرة', 'خيالي', 'سيافة']),
      2024
    );

    insLib.run(
      'nano-machine',
      'نانو ماشين (Nano Machine)',
      'Nano Machine',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/06/Nano-machine.png',
      'https://io.mangalik.net/wp-content/uploads/2020/06/Nano-machine.png',
      210,
      'Jeolmu Hyeon / Geum Gangbulgoe',
      9.8,
      'تشيون يو وون، الابن غير الشرعي لسيد الطائفة الشيطانية المحاصر بالمؤامرات، يتلقى حقنة غامضة من آلات النانو الدقيقة من نسله القادم من المستقبل تغير مصيره للأبد.',
      'An illegitimate prince of the Demonic Cult is injected with future nanomachines that reconstruct his body and martial capabilities.',
      'ONGOING',
      JSON.stringify(['فنون قتالية', 'موريم', 'خيال علمي', 'أكشن', 'انتقام']),
      2020
    );

    insLib.run(
      'magic-emperor',
      'الإمبراطور الشيطاني (Magic Emperor / Demonic Emperor)',
      'Magic Emperor',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Demonic-Emperor-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Demonic-Emperor-193x278.jpg',
      550,
      'Ye Xiao / Wuer Manhua',
      9.8,
      'تشو يي-فان، إمبراطور السحر والشياطين الأسطوري، يتعرض للخيانة ويُقتل ليعود للحياة بجسد خادم ضعيف من عائلة نبيلة منحدرة ويصعد مجدداً للقمة بدهاء لا يعرف الرحمة.',
      'The Demonic Emperor Zhuo Yifan is betrayed and reincarnated into the fragile body of a loyal family servant, plotting his supreme revenge.',
      'ONGOING',
      JSON.stringify(['فنون قتالية', 'تناسخ', 'دهاء', 'سحر', 'أكشن']),
      2019
    );

    insLib.run(
      'return-of-the-mount-hua-sect',
      'عودة طائفة جبل هوا (Return of the Mount Hua Sect)',
      'Return of the Mount Hua Sect',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2021/03/Return_of_the_Mount_Hua_Sect-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2021/03/Return_of_the_Mount_Hua_Sect-193x278.jpg',
      135,
      'Biga / LICO Studio',
      9.9,
      'تشونغ ميونغ، قديس سيف زهر البرقوق الأسطوري الذي أطاح بزعيم الطائفة الشيطانية، يستيقظ بعد قرن كامل ليجد طائفته العظيمة في حالة دمار وإفلاس، فيقرر إعادتها لمجدها.',
      'Chung Myung awakens 100 years into the future to find his beloved Mount Hua Sect fallen into ruins, swearing to restore it to glory.',
      'ONGOING',
      JSON.stringify(['موريم', 'كوميديا', 'سيافة', 'أكشن', 'تاريخي']),
      2021
    );

    insLib.run(
      'the-beginning-after-the-end',
      'البداية بعد النهاية (The Beginning After The End)',
      'The Beginning After The End',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/The-Beginning-After-the-End-2-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/05/The-Beginning-After-the-End-2-193x278.jpg',
      180,
      'TurtleMe / Fuyuki23',
      9.8,
      'الملك غراي، حاكم يمتلك القوة والثروة ولكن قلبه فارغ من المشاعر، يتجسد في عالم سحري مليء بالوحوش كـ آرثر ليوين، محاولاً حماية عائلته واكتشاف معنى الحياة الحقيقي.',
      'King Grey reincarnates into a world of magic and monsters as Arthur Leywin, seeking to correct the mistakes of his past life.',
      'ONGOING',
      JSON.stringify(['سحر', 'إيسيكاي', 'مغامرة', 'أكشن', 'فانتازيا']),
      2018
    );

    insLib.run(
      'lookism',
      'المظهر (Lookism)',
      'Lookism',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/11/Lookism-193x278.png',
      'https://io.mangalik.net/wp-content/uploads/2020/11/Lookism-193x278.png',
      500,
      'Park Tae-jun (PTJ Comics)',
      9.8,
      'بارك هيونغ سوك، فتى يتعرض للتنمر الشديد بسبب مظهره ووزنه، يستيقظ فجأة ليكتشف أنه حصل على جسد ثانٍ مثالي فائق الوسامة والقوة، ويبدأ حياة مزدوجة تغير كل شيء.',
      'A bullied high schooler mysteriously awakens with an alternate, extraordinarily attractive and athletic body.',
      'ONGOING',
      JSON.stringify(['دراما', 'أكشن', 'قتالات شوارع', 'عصابات', 'حياة مدرسية']),
      2014
    );

    insLib.run(
      'eleceed',
      'إليكيد (Eleceed)',
      'Eleceed',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2020/07/Eleceed-1-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/07/Eleceed-1-193x278.jpg',
      290,
      'Son Je-ho / ZHENA',
      9.9,
      'سيو جيوو، فتى طيب القلب يمتلك سرعة خارقة، ينقذ قطاً سميناً مصاباً يتبين أنه كادين، أحد أقوى الموقظين في العالم متخفياً في جسد قطة هرباً من أعدائه.',
      'A kind-hearted boy with lightning reflex powers takes in an injured fat cat who turns out to be a legendary awakened warrior in disguise.',
      'ONGOING',
      JSON.stringify(['قوى خارقة', 'كوميديا', 'أكشن', 'صداقة', 'حيوانات أليفة']),
      2018
    );

    insLib.run(
      'pick-me-up',
      'بيك مي أب: غاشا لا نهائية (Pick Me Up)',
      'Pick Me Up : Infinite Gacha',
      'MANHWA',
      'https://io.mangalik.net/wp-content/uploads/2022/12/19608928871162963660-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2022/12/19608928871162963660-193x278.jpg',
      95,
      'Hermod / Ntreev (Redice)',
      9.8,
      'لوكي، اللاعب المصنف رقم 1 عالمياً في لعبة الهاتف المستحيلة Pick Me Up، يُسحب فجأة إلى داخل اللعبة نفسها كبطل نجمة واحدة من الدرجة الأدنى، وعليه النجاة عبر أقصى المعارك.',
      'The worlds top-ranked mobile gacha master is transported into the lethal game as a bottom-tier 1-star hero unit.',
      'ONGOING',
      JSON.stringify(['ألعاب', 'غاشا', 'بقاء', 'أكشن', 'استراتيجية']),
      2022
    );

    // TRENDING MANGA (المانجا اليابانية الرائجة)
    insLib.run(
      'one-piece',
      'ون بيس (One Piece)',
      'One Piece',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/One-Piece-1-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/05/One-Piece-1-193x278.jpg',
      1160,
      'Eiichiro Oda (إييتشيرو أودا)',
      9.9,
      'القوة والشهرة والثروة. مونكي دي لوفي وطاقم قبعة القش يبحرون في الغراند لاين بحثاً عن الكنز الأسطوري ون بيس ليصبح لوفي ملك القراصنة القادم.',
      'Monkey D. Luffy embarks on an epic voyage to the Grand Line to find the legendary treasure One Piece and become King of the Pirates.',
      'ONGOING',
      JSON.stringify(['أكشن', 'مغامرات', 'كوميديا', 'شونين', 'قراصنة', 'خيال']),
      1997
    );

    insLib.run(
      'jujutsu-kaisen',
      'جوجوتسو كايسن (Jujutsu Kaisen)',
      'Jujutsu Kaisen',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/11/Jujutsu-Kaisen-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/11/Jujutsu-Kaisen-193x278.jpg',
      270,
      'Gege Akutami (غيغي أكوتامي)',
      9.8,
      'يوجي إيتادوري يبتلع إصبع ملك اللعنات الأسطوري ريومن سوكونا لحماية أصدقائه، ويدخل مدرسة جوجوتسو لقتال الأرواح الملعونة والتصدي لنهاية العالم المحتومة.',
      'Yuji Itadori swallows a cursed talisman—the finger of Ryomen Sukuna—and is thrown into the deadly realm of Jujutsu Sorcerers.',
      'COMPLETED',
      JSON.stringify(['شونين', 'لعنات', 'خارق للطبيعة', 'قتال', 'سحر']),
      2018
    );

    insLib.run(
      'chainsaw-man',
      'رجل المنشار (Chainsaw Man)',
      'Chainsaw Man',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Chainsaw-Man-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Chainsaw-Man-193x278.jpg',
      175,
      'Tatsuki Fujimoto (تاتسوكي فوجيموتو)',
      9.8,
      'دينجي، شاب يعيش في فقر مدقع ويسدد ديون والده بالصيد مع كلب المنشار بوتشيتا، يولد من جديد كهجين شيطان المنشار وينضم لقسم السلامة العامة لمقاتلة شياطين العالم.',
      'Denji is betrayed and killed, but makes a pact with his pet devil Pochita to be reborn as Chainsaw Man.',
      'ONGOING',
      JSON.stringify(['شياطين', 'خيال مظلم', 'رعب', 'أكشن', 'كوميديا سوداء']),
      2018
    );

    insLib.run(
      'blue-lock',
      'بلو لوك (Blue Lock)',
      'Blue Lock',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2021/01/Blue-Lock-193x278.png',
      'https://io.mangalik.net/wp-content/uploads/2021/01/Blue-Lock-193x278.png',
      275,
      'Muneyuki Kaneshiro / Yusuke Nomura',
      9.7,
      'بعد إقصاء اليابان من كأس العالم، يطلق الاتحاد مشروع بلو لوك لجمع 300 مهاجم شاب وحبسهم في منشأة قاسية لاختيار مهاجم واحد أناني يقود اليابان للمجد العالمي.',
      'Japan creates Blue Lock, an intense prison-like training academy to forge the worlds ultimate, most egoistic striker.',
      'ONGOING',
      JSON.stringify(['رياضة', 'كرة قدم', 'نفسي', 'تنافس', 'شونين']),
      2018
    );

    insLib.run(
      'kingdom',
      'المملكة (Kingdom)',
      'Kingdom',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/06/kingdom-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/06/kingdom-193x278.jpg',
      810,
      'Yasuhisa Hara (ياسوهيسا هارا)',
      9.9,
      'في حقبة الممالك المتحاربة في الصين القديمة، يسعى الفتى شين ليصبح أعظم جنرال تحت السماء، متعاوناً مع الملك الشاب إي سي لتوحيد الصين بأكملها تحت راية واحدة.',
      'In Warring States era China, orphan Xin strives to become the greatest general under the heavens and unify China with King Zheng.',
      'ONGOING',
      JSON.stringify(['تاريخي', 'حروب', 'استراتيجية', 'سينين', 'أكشن']),
      2006
    );

    insLib.run(
      'berserk',
      'بيرسيرك (Berserk)',
      'Berserk',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/10/berserk-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/10/berserk-193x278.jpg',
      375,
      'Kentaro Miura (كينتارو ميورا)',
      9.9,
      'غاتس المحارب الأسود يسعى للانتقام من صديقه السابق غريفيث وفرقة صقر الجحيم وسط عالم مظلم مليء بالشياطين والحروب الدامية وتضحيات الكسوف الأسطورية.',
      'Guts, known as the Black Swordsman, seeks bloody vengeance against Griffith across a brutal, demon-infested dark fantasy world.',
      'ONGOING',
      JSON.stringify(['خيال مظلم', 'أكشن', 'دراما', 'عسكري', 'سينين']),
      1989
    );

    insLib.run(
      'hunter-x-hunter',
      'القناص (Hunter X Hunter)',
      'Hunter X Hunter',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2021/07/Hunter_X_Hunter_Vol_33_Manga-1879209_1024x1024-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2021/07/Hunter_X_Hunter_Vol_33_Manga-1879209_1024x1024-193x278.jpg',
      405,
      'Yoshihiro Togashi (يوشيهيرو توغاشي)',
      9.9,
      'غون فريكس ينطلق في رحلة خطيرة لاجتياز اختبار الصيادين المحترفين والبحث عن والده جين، متعرفاً على كيلوا وكورابيكا ويوريو في معارك ذكاء ونين معقدة.',
      'Gon Freecss aspires to become a certified Hunter in order to track down his father, mastering the intricate combat art of Nen.',
      'ONGOING',
      JSON.stringify(['شونين', 'مغامرات', 'نين', 'قتال', 'استراتيجية']),
      1998
    );

    insLib.run(
      'bleach',
      'بليتش (Bleach)',
      'Bleach',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2021/06/Bleachanime-193x278.png',
      'https://io.mangalik.net/wp-content/uploads/2021/06/Bleachanime-193x278.png',
      686,
      'Tite Kubo (تايت كوبو)',
      9.7,
      'إيتشيغو كوروساكي يكتسب قوى حاصد الأرواح شينيغامي من روكيا كوتشيكي، متحملاً واجب حماية البشر من الهولو والقتال في مجتمع الأرواح وحرب الكوينشي ألف عام.',
      'Ichigo Kurosaki gains the powers of a Soul Reaper from Rukia Kuchiki, defending the Living World and Soul Society from ancient evils.',
      'COMPLETED',
      JSON.stringify(['شونين', 'أرواح', 'سيوف', 'خوارق', 'أكشن']),
      2001
    );

    insLib.run(
      'black-clover',
      'بلاك كلوفر (Black Clover)',
      'Black Clover',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Black-Clover-2-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/05/Black-Clover-2-193x278.jpg',
      370,
      'Yūki Tabata (يوكي تاباتا)',
      9.7,
      'أستا، فتى ولد بدون ذرة واحدة من السحر في عالم يحكمه السحر بالكامل، يحصل على غريموار الورقة الخماسية بسيف مضاد للسحر ويسعى ليصبح إمبراطور السحر القادم.',
      'Asta, born without an ounce of magical energy in a world where magic is everything, receives a five-leaf clover Anti-Magic Grimoire.',
      'ONGOING',
      JSON.stringify(['سحر', 'شونين', 'عزيمة', 'أكشن', 'فرسان السحر']),
      2015
    );

    insLib.run(
      'boruto',
      'بوروتو (Boruto: Two Blue Vortex)',
      'Boruto',
      'MANGA',
      'https://io.mangalik.net/wp-content/uploads/2020/06/Boruto-193x278.jpg',
      'https://io.mangalik.net/wp-content/uploads/2020/06/Boruto-193x278.jpg',
      90,
      'Masashi Kishimoto / Mikio Ikemoto',
      9.6,
      'بوروتو أوزوماكي يدخل عهد الدوامتين الزرقاوين بعد تبادل مصيره مع كواكي ومطاردته من قرية كونوها، ليعود بقوى نينجا خارقة للتصدي لعشيرة الأوتسوتسوكي وشجرة التشاكرا.',
      'Boruto returns as a rogue shinobi in Two Blue Vortex, defending the ninja realm from Otsutsuki divine trees.',
      'ONGOING',
      JSON.stringify(['نينجا', 'شونين', 'قوى خارقة', 'أكشن']),
      2016
    );
  }
}

/** Plain SQLite rows for the social features. */
export const social = {
  upsertRating(userKey, slug, episode, score, title) {
    ensureSocialTables();
    db.prepare(`
      INSERT INTO social_ratings (user_key, slug, episode, score, title)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_key, slug, episode) DO UPDATE SET
        score = excluded.score, title = COALESCE(excluded.title, social_ratings.title),
        updated_at = datetime('now')
    `).run(userKey, slug, episode, score, title ?? null);
  },
  getRating(userKey, slug, episode) {
    ensureSocialTables();
    return db.prepare('SELECT score FROM social_ratings WHERE user_key = ? AND slug = ? AND episode = ?')
      .get(userKey, slug, episode) || null;
  },
  follow(followerKey, followingKey) {
    ensureSocialTables();
    db.prepare('INSERT OR IGNORE INTO social_follows (follower_key, following_key) VALUES (?, ?)')
      .run(followerKey, followingKey);
  },
  unfollow(followerKey, followingKey) {
    ensureSocialTables();
    db.prepare('DELETE FROM social_follows WHERE follower_key = ? AND following_key = ?')
      .run(followerKey, followingKey);
  },
  isFollowing(followerKey, followingKey) {
    ensureSocialTables();
    const row = db.prepare('SELECT 1 FROM social_follows WHERE follower_key = ? AND following_key = ?')
      .get(followerKey, followingKey);
    return Boolean(row);
  },
  getNetwork(userKey) {
    ensureSocialTables();
    const followers = db.prepare('SELECT follower_key FROM social_follows WHERE following_key = ?').all(userKey).map(r => r.follower_key);
    const following = db.prepare('SELECT following_key FROM social_follows WHERE follower_key = ?').all(userKey).map(r => r.following_key);
    return { followers, following };
  },
  getLibraryItems(type, query = '') {
    ensureSocialTables();
    let sql = 'SELECT * FROM social_library_items';
    const conditions = [];
    const params = [];
    if (type && type !== 'ALL') {
      conditions.push('type = ?');
      params.push(type.toUpperCase());
    }
    if (query && query.trim()) {
      conditions.push('(title_ar LIKE ? OR title_en LIKE ? OR author LIKE ?)');
      const q = `%${query.trim()}%`;
      params.push(q, q, q);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY rating DESC';
    return db.prepare(sql).all(...params).map(r => ({
      ...r,
      genres: JSON.parse(r.genres || '[]')
    }));
  },
  getLibraryItem(id) {
    ensureSocialTables();
    const r = db.prepare('SELECT * FROM social_library_items WHERE id = ?').get(id);
    if (!r) return null;
    return {
      ...r,
      genres: JSON.parse(r.genres || '[]')
    };
  },
  getStats(userKey) {
    ensureSocialTables();
    return db.prepare('SELECT * FROM social_stats WHERE user_key = ?').get(userKey) || null;
  },
  upsertStats(userKey, field, delta) {
    ensureSocialTables();
    db.prepare(`
      INSERT INTO social_stats (user_key, ${field}) VALUES (?, ?)
      ON CONFLICT(user_key) DO UPDATE SET ${field} = ${field} + excluded.${field}
    `).run(userKey, delta);
    return this.getStats(userKey);
  },
  setLevel(userKey, level) {
    ensureSocialTables();
    db.prepare('UPDATE social_stats SET current_level = ? WHERE user_key = ?').run(level, userKey);
  },
  badges() {
    ensureSocialTables();
    return db.prepare('SELECT * FROM social_badges ORDER BY requirement_threshold ASC').all();
  },
  userBadges(userKey) {
    ensureSocialTables();
    return db.prepare(`
      SELECT b.name, b.icon_url FROM social_user_badges ub
      JOIN social_badges b ON b.id = ub.badge_id
      WHERE ub.user_key = ? ORDER BY ub.awarded_at ASC
    `).all(userKey);
  },
  awardBadge(userKey, badgeId) {
    ensureSocialTables();
    db.prepare('INSERT OR IGNORE INTO social_user_badges (user_key, badge_id) VALUES (?, ?)').run(userKey, badgeId);
  },
  submitCreator(userKey, videoUrl) {
    ensureSocialTables();
    db.prepare("INSERT INTO social_submissions (user_key, video_url, status) VALUES (?, ?, 'PENDING')")
      .run(userKey, videoUrl);
  },
  createTicket(userKey, subject, message, category = 'general') {
    ensureSocialTables();
    const r = db.prepare("INSERT INTO social_tickets (user_key, subject, message, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'OPEN', datetime('now'), datetime('now'))")
      .run(userKey, subject, message, category);
    return String(r.lastInsertRowid);
  },
  getTickets(userKey, isAdmin = false) {
    ensureSocialTables();
    if (isAdmin) {
      return db.prepare('SELECT * FROM social_tickets ORDER BY created_at DESC').all();
    }
    return db.prepare('SELECT * FROM social_tickets WHERE user_key = ? ORDER BY created_at DESC').all(userKey);
  },
  replyTicket(ticketId, adminReply, status = 'RESOLVED') {
    ensureSocialTables();
    db.prepare(`
      UPDATE social_tickets
      SET admin_reply = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(adminReply, status, Number(ticketId));
    return db.prepare('SELECT * FROM social_tickets WHERE id = ?').get(Number(ticketId));
  },
  getReferrals(userKey) {
    ensureSocialTables();
    const rows = db.prepare('SELECT referred_username, created_at FROM social_referrals WHERE referrer_key = ? ORDER BY created_at DESC').all(userKey);
    const count = rows.length;
    const isVipUnlocked = count >= 3;
    if (isVipUnlocked) {
      try {
        db.prepare("UPDATE users SET vip_status = 'VIP Basic' WHERE id = ? OR username = ?").run(userKey, userKey);
      } catch {}
    }
    return {
      count,
      target: 3,
      isVipUnlocked,
      referrals: rows
    };
  },
  addReferral(referrerKey, referredUsername) {
    ensureSocialTables();
    const exists = db.prepare('SELECT id FROM social_referrals WHERE referrer_key = ? AND referred_username = ?')
      .get(referrerKey, referredUsername);
    if (!exists) {
      db.prepare('INSERT INTO social_referrals (referrer_key, referred_username) VALUES (?, ?)')
        .run(referrerKey, referredUsername);
    }
    return this.getReferrals(referrerKey);
  },
  customizeUser(userId, data = {}) {
    ensureSocialTables();
    const bannerUrl = data.bannerUrl !== undefined ? data.bannerUrl : data.banner_url;
    const themePreference = data.themePreference !== undefined ? data.themePreference : data.theme_preference;
    const frameStyle = data.frameStyle !== undefined ? data.frameStyle : data.frame_style;
    const ornament = data.ornament !== undefined ? data.ornament : data.ornament;
    const bannerStyle = data.bannerStyle !== undefined ? data.bannerStyle : data.banner_style;

    const key = String(userId);
    const cur = db.prepare('SELECT * FROM social_profiles WHERE user_key = ?').get(key) || {};
    const b = bannerUrl !== undefined ? bannerUrl : cur.banner_url ?? null;
    const t = themePreference !== undefined ? themePreference : cur.theme_preference ?? null;
    const f = frameStyle !== undefined ? frameStyle : cur.frame_style ?? 'default';
    const o = ornament !== undefined ? ornament : cur.ornament ?? 'none';
    const bs = bannerStyle !== undefined ? bannerStyle : cur.banner_style ?? 'off';

    db.prepare(`
      INSERT INTO social_profiles (user_key, banner_url, theme_preference, frame_style, ornament, banner_style)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_key) DO UPDATE SET
        banner_url = excluded.banner_url,
        theme_preference = excluded.theme_preference,
        frame_style = excluded.frame_style,
        ornament = excluded.ornament,
        banner_style = excluded.banner_style
    `).run(key, b ?? null, t ?? null, f ?? 'default', o ?? 'none', bs ?? 'off');

    try {
      const sets = []; const args = [];
      if (bannerUrl !== undefined) { sets.push('banner_url = ?'); args.push(bannerUrl); }
      if (themePreference !== undefined) { sets.push('theme_preference = ?'); args.push(themePreference); }
      if (frameStyle !== undefined) { sets.push('frame_style = ?'); args.push(frameStyle); }
      if (ornament !== undefined) { sets.push('ornament = ?'); args.push(ornament); }
      if (bannerStyle !== undefined) { sets.push('banner_style = ?'); args.push(bannerStyle); }
      if (sets.length) { args.push(key); db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
    } catch { /* legacy table optional */ }
    return 1;
  },
  getUserProfile(userKey) {
    ensureSocialTables();
    return db.prepare('SELECT * FROM social_profiles WHERE user_key = ?').get(String(userKey)) || {};
  }
};

/* ------------------------- shared leveling rules ------------------------- */
export const MINUTES_PER_LEVEL = 100;

export function levelFromMinutes(totalMinutes) {
  return Math.floor(Math.max(0, totalMinutes) / MINUTES_PER_LEVEL) + 1;
}

export function progressPercentage(totalMinutes) {
  const t = Math.max(0, totalMinutes);
  return Math.round(((t % MINUTES_PER_LEVEL) / MINUTES_PER_LEVEL) * 1000) / 10;
}

export function getLevelRank(level) {
  const lvl = Number(level) || 1;
  if (lvl >= 50) return { titleAr: 'إمبراطور المانجا والأنمي', titleEn: 'Shadow Emperor', color: '#ec4899', icon: '👑' };
  if (lvl >= 30) return { titleAr: 'سينسي الأنمي والمانجا', titleEn: 'Anime Sensei', color: '#8b5cf6', icon: '⚡' };
  if (lvl >= 20) return { titleAr: 'نخبة الشينوبي', titleEn: 'Elite Shinobi', color: '#22d3ee', icon: '🗡️' };
  if (lvl >= 10) return { titleAr: 'أوتاكو معتمد', titleEn: 'Certified Otaku', color: '#a3e635', icon: '⭐' };
  if (lvl >= 5)  return { titleAr: 'متابع نشط', titleEn: 'Active Watcher', color: '#fb923c', icon: '🔥' };
  return { titleAr: 'مبتدئ الأنمي', titleEn: 'Novice Scout', color: '#60a5fa', icon: '🌱' };
}

export function awardBadgesSqlite(userKey, totalMinutes) {
  for (const badge of social.badges()) {
    if (badge.requirement_threshold <= totalMinutes) social.awardBadge(userKey, badge.id);
  }
}
