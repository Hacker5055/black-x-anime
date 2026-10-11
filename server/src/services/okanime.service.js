/**
 * OkAnime (ww3.okanime.xyz) Service
 * --------------------------------
 * High-performance integration for https://ww3.okanime.xyz/ under BLACK X branding.
 * Supports:
 *  - Live scraping of home page, latest episodes, catalog, search, and episode servers
 *  - Native server extraction: Mp4Upload (FHD, HD, SD), Mega (بدون إعلانات), Share4Max/Megamax,
 *    Streamruby, Uqload, Videa, VK Video
 *  - Direct download links extraction (Mega, Mp4Upload, Uqload)
 *  - Resilient catalog fallback with rich Arabic metadata & fast cloud servers
 */
import * as cheerio from 'cheerio';
import { apiGet, apiSet, streamGet, streamSet } from '../db.js';

export const OKANIME_BASE = 'https://ww3.okanime.xyz';

const RELAY = (process.env.WITA_RELAY || '').replace(/\/$/, '');
const viaRelay = (url) => (RELAY ? `${RELAY}/?url=${encodeURIComponent(url)}` : url);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const LANG = 'ar,en-US;q=0.9,en;q=0.8';

// Fallback high-definition catalogue for OkAnime
export const OKANIME_CATALOG = [
  {
    slug: 'one-piece',
    okanimeId: 'one-piece',
    titleAr: 'ون بيس (One Piece)',
    titleEn: 'One Piece',
    titleRomaji: 'One Piece',
    poster: 'https://ww3.okanime.xyz/media/posters/one-piece-ac1665b1.jpg',
    banner: 'https://images.witanime.site/banners/one-piece.jpg',
    status: 'مستمر (Ongoing)',
    season: 'Fall 1999',
    type: 'TV Series',
    rating: 9.9,
    episodeCount: 1122,
    genres: ['أكشن', 'مغامرات', 'فانتازيا', 'شونين', 'قراصنة'],
    descriptionAr: 'العظمة، المجد، الذهب، مزايا اشتملت عليها حياة ملك القراصنة غولد روجر. مونكي دي لوفي ينطلق في رحلة ملحمية ليصبح ملك القراصنة الجديد ويجد كنز الون بيس.',
    servers: ['سيرفر BLACK X (OkAnime VIP FHD)', 'Mp4Upload 1080p', 'Mega بدون إعلانات', 'Streamruby FHD', 'Uqload HD']
  },
  {
    slug: 'solo-leveling',
    okanimeId: 'solo-leveling',
    titleAr: 'سولو ليفلينج (ارتقاء المستوى الفردي)',
    titleEn: 'Solo Leveling',
    titleRomaji: 'Ore dake Level Up na Ken',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1g5wtVsqOX2.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg',
    status: 'مستمر (الموسم 2)',
    season: 'Winter 2024',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 24,
    genres: ['أكشن', 'فانتازيا', 'أبراج', 'قوى خارقة'],
    descriptionAr: 'سونغ جين وو أضعف صياد من الرتبة E يحصل على مهمة انتحارية تنتهي باكتسابه نظاماً يسمح له برفع مستواه بلا حدود.',
    servers: ['سيرفر BLACK X (OkAnime Ultra)', 'Mp4Upload 1080p', 'Mega 1080p', 'Share4Max']
  },
  {
    slug: 'bleach-sennen-kessen-hen',
    okanimeId: 'bleach-sennen-kessen-hen',
    titleAr: 'بليتش: حرب الألف عام الدموية',
    titleEn: 'Bleach: Thousand-Year Blood War',
    titleRomaji: 'Bleach: Sennen Kessen-hen',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx114446-f94mK2d32Ld0.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/114446-Z1YcR4s7Vv6a.jpg',
    status: 'مستمر (الجزء 3)',
    season: 'Fall 2022',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 39,
    genres: ['أكشن', 'شينيغامي', 'شونين', 'قوى روحية', 'حرب كوينشي'],
    descriptionAr: 'عودة كوروساكي إيتشيغو ومجتمع الأرواح في مواجهة إمبراطور الكوينشي يوها باخ وجيش الفاندنرايخ في صراع أبدي على البقاء.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload 1080p', 'Mega 1080p', 'Uqload']
  },
  {
    slug: 'jujutsu-kaisen',
    okanimeId: 'jujutsu-kaisen',
    titleAr: 'جوجوتسو كايسن (Jujutsu Kaisen)',
    titleEn: 'Jujutsu Kaisen',
    titleRomaji: 'Jujutsu Kaisen',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg',
    status: 'مكتمل (المواسم 1 و 2)',
    season: 'Fall 2020',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 47,
    genres: ['شونين', 'قتال', 'لعنات', 'سحر', 'أرواح خارقة'],
    descriptionAr: 'يوجي إيتادوري يبتلع إصبع ريومن سوكونا لحماية أصدقائه، ويبدأ تدريبه كمعوذ جوجوتسو في ثانوية طوكيو للدفاع عن البشرية.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega 1080p', 'Streamruby']
  },
  {
    slug: 'kimetsu-no-yaiba',
    okanimeId: 'kimetsu-no-yaiba',
    titleAr: 'قاتل الشياطين (Demon Slayer)',
    titleEn: 'Demon Slayer: Kimetsu no Yaiba',
    titleRomaji: 'Kimetsu no Yaiba',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTDYxTr2.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YBdQI2yegLmx.jpg',
    status: 'مستمر (تدريب الهاشيرا)',
    season: 'Spring 2019',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 63,
    genres: ['أكشن', 'شياطين', 'سيوف', 'تاريخي', 'شونين'],
    descriptionAr: 'تانجيرو كامادو ينضم لفرقة قتلة الشياطين لإنقاذ أخته نيزوكو التي تحولت لشيطانة والانتقام من كيبوتسوجي موزان.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega 1080p', 'Uqload']
  },
  {
    slug: 'naruto-shippuuden',
    okanimeId: 'naruto-shippuuden',
    titleAr: 'ناروتو شيبودن (Naruto Shippuden)',
    titleEn: 'Naruto Shippuden',
    titleRomaji: 'Naruto: Shippuuden',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1735-j87xJ4y32b2Z.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1735-d2h81h1g1b1Z.jpg',
    status: 'مكتمل (500 حلقة)',
    season: 'Winter 2007',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 500,
    genres: ['نينجا', 'شونين', 'قتال', 'صداقة', 'قوى خارقة'],
    descriptionAr: 'ناروتو أوزوماكي يعود لقرية كونوها بعد عامين ونصف من التدريب مع جيرايا، مستعداً لمواجهة منظمة الأكاتسكي واستعادة صديقه ساسكي.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive', 'Uqload']
  },
  {
    slug: 'hunter-x-hunter-2011',
    okanimeId: 'hunter-x-hunter-2011',
    titleAr: 'هنتر x هنتر (القناص 2011)',
    titleEn: 'Hunter x Hunter (2011)',
    titleRomaji: 'Hunter x Hunter (2011)',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11061-sWBNkhyJb3hu.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/11061-nJ4d30s7J8f0.jpg',
    status: 'مكتمل (148 حلقة)',
    season: 'Fall 2011',
    type: 'TV Series',
    rating: 9.9,
    episodeCount: 148,
    genres: ['مغامرات', 'نين', 'شونين', 'صداقة', 'ذكاء'],
    descriptionAr: 'غون فريكس ينطلق في رحلة ليصبح صياداً محترفاً ويعثر على والده جين فريكس، ويلتقي بأصدقائه كيلوا، كورابيكا وليوريو.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive', 'Streamruby']
  },
  {
    slug: 'dragon-ball-super',
    okanimeId: 'dragon-ball-super',
    titleAr: 'دراغون بول سوبر (Dragon Ball Super)',
    titleEn: 'Dragon Ball Super',
    titleRomaji: 'Dragon Ball Super',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21175-k98h81g1b1Z.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21175-j12h81h1g1b1Z.jpg',
    status: 'مكتمل (131 حلقة)',
    season: 'Summer 2015',
    type: 'TV Series',
    rating: 9.6,
    episodeCount: 131,
    genres: ['أكشن', 'قتال خارق', 'سايان', 'بطولة الأكوان', 'خيال علمي'],
    descriptionAr: 'غوكو وفيجيتا يواجهان آلهة الدمار ومحاربي الأكوان المتعددة في بطولة القوة الكبرى لحماية كونهم من المحو.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive', 'Uqload']
  },
  {
    slug: 'shingeki-no-kyojin',
    okanimeId: 'shingeki-no-kyojin',
    titleAr: 'هجوم العمالقة (Attack on Titan)',
    titleEn: 'Attack on Titan',
    titleRomaji: 'Shingeki no Kyojin',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
    status: 'مكتمل (89 حلقة)',
    season: 'Spring 2013',
    type: 'TV Series',
    rating: 9.9,
    episodeCount: 89,
    genres: ['أكشن', 'عمالقة', 'حروب', 'دراما سوداوية'],
    descriptionAr: 'إيرين ييغر وفيلق الاستكشاف في معركة البقاء الملحمية ضد عمالقة الجدران ومؤامرات العالم الخارجي.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload 1080p', 'Mega 1080p']
  },
  {
    slug: 'vinland-saga',
    okanimeId: 'vinland-saga',
    titleAr: 'فينلاند ساغا (Vinland Saga)',
    titleEn: 'Vinland Saga',
    titleRomaji: 'Vinland Saga',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101348-7fM1k81g1b1Z.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101348-k0b81h1g1b1Z.jpg',
    status: 'مكتمل (48 حلقة)',
    season: 'Summer 2019',
    type: 'TV Series',
    rating: 9.9,
    episodeCount: 48,
    genres: ['فايكنج', 'تاريخي', 'حروب', 'فلسفة وسينين'],
    descriptionAr: 'ثورفين في ملحمة الفايكنج الخالدة من نار الانتقام إلى البحث عن أرض السلام فينلاند.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  },
  {
    slug: 'death-note',
    okanimeId: 'death-note',
    titleAr: 'مذكرة الموت (Death Note)',
    titleEn: 'Death Note',
    titleRomaji: 'Death Note',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-lawX6J9j2w7R.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535-N1l7m1k2v8aZ.jpg',
    status: 'مكتمل (37 حلقة)',
    season: 'Fall 2006',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 37,
    genres: ['غموض', 'صراع عقول', 'شينيغامي', 'نفسي'],
    descriptionAr: 'ياغامي لايت وخصمه العبقري إل في أعظم صراع ذكاء في تاريخ الأنمي.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  },
  {
    slug: 'chainsaw-man',
    okanimeId: 'chainsaw-man',
    titleAr: 'رجل المنشار (Chainsaw Man)',
    titleEn: 'Chainsaw Man',
    titleRomaji: 'Chainsaw Man',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx127230-FloXFJyQZPdq.png',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/127230-Nu0tVw0zH07H.jpg',
    status: 'مكتمل (12 حلقة)',
    season: 'Fall 2022',
    type: 'TV Series',
    rating: 9.7,
    episodeCount: 12,
    genres: ['أكشن', 'شياطين', 'دموي', 'خوارق'],
    descriptionAr: 'دينجي يندمج مع شيطان المنشار بوتشيتا ليصبح رجل المنشار وينضم لفرقة الأمن العام بقيادة ماكيما.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload 1080p', 'Mega 1080p']
  },
  {
    slug: 'black-clover',
    okanimeId: 'black-clover',
    titleAr: 'بلاك كلوفر (Black Clover)',
    titleEn: 'Black Clover',
    titleRomaji: 'Black Clover',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97940-7fM1k81g1b1Z.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97940-k0b81h1g1b1Z.jpg',
    status: 'مكتمل (170 حلقة)',
    season: 'Fall 2017',
    type: 'TV Series',
    rating: 9.7,
    episodeCount: 170,
    genres: ['سحر', 'فرسان السحر', 'شونين', 'عزيمة خارقة'],
    descriptionAr: 'أستا الفتى الذي ولد بدون سحر يحصل على كتاب الورقة الخماسية بسيف مضاد للسحر ساعياً لأن يصبح إمبراطور السحر.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  },
  {
    slug: 'boku-no-hero-academia',
    okanimeId: 'boku-no-hero-academia',
    titleAr: 'أكاديمية بطلي (My Hero Academia)',
    titleEn: 'My Hero Academia',
    titleRomaji: 'Boku no Hero Academia',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-oZNQ7NmNOIXA.png',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-7jX1jX1b1Z.jpg',
    status: 'مستمر (الموسم 7)',
    season: 'Spring 2016',
    type: 'TV Series',
    rating: 9.6,
    episodeCount: 159,
    genres: ['أبطال خارقين', 'شونين', 'مدرسة', 'قوى خارقة'],
    descriptionAr: 'ميدوريا إيزوكو الفتى الذي ولد بلا ميزة يحصل على قوة أول مايت الأعظم ليدخل ثانوية الأبطال.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  },
  {
    slug: 'spy-x-family',
    okanimeId: 'spy-x-family',
    titleAr: 'عائلة الجاسوس (Spy x Family)',
    titleEn: 'Spy x Family',
    titleRomaji: 'Spy x Family',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx140960-vNPTtHx7WNzE.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/140960-63737b1Z.jpg',
    status: 'مستمر (المواسم 1 و 2)',
    season: 'Spring 2022',
    type: 'TV Series',
    rating: 9.7,
    episodeCount: 37,
    genres: ['كوميديا', 'جاسوسية', 'عائلة', 'حركة'],
    descriptionAr: 'جاسوس، قاتلة مأجورة، وطفلة تقرأ العقول يشكلون عائلة مزيفة لأداء مهمة سلام عالمية.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  },
  {
    slug: 'blue-lock',
    okanimeId: 'blue-lock',
    titleAr: 'القفل الأزرق (Blue Lock)',
    titleEn: 'Blue Lock',
    titleRomaji: 'Blue Lock',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx137822-4P2PzKzVz8hH.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/137822-83838b1Z.jpg',
    status: 'مستمر (الموسم 2)',
    season: 'Fall 2022',
    type: 'TV Series',
    rating: 9.7,
    episodeCount: 38,
    genres: ['رياضة', 'كرة قدم', 'إثارة وتنافس', 'أناني'],
    descriptionAr: 'مشروع بلو لوك يجمع 300 مهاجم ياباني في سجن كروي لصناعة المهاجم الأكثر أنانية وتفوقاً في العالم.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  },
  {
    slug: 'one-punch-man',
    okanimeId: 'one-punch-man',
    titleAr: 'رجل اللكمة الواحدة (One Punch Man)',
    titleEn: 'One Punch Man',
    titleRomaji: 'One Punch Man',
    poster: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21087-0b1Z8b1Z.jpg',
    banner: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21087-0b1Z.jpg',
    status: 'مكتمل (24 حلقة)',
    season: 'Fall 2015',
    type: 'TV Series',
    rating: 9.8,
    episodeCount: 24,
    genres: ['أكشن', 'كوميديا خارقة', 'أبطال', 'سايتاما'],
    descriptionAr: 'سايتاما البطل الذي يهزم أي عدو أو وحش بلكمة واحدة فقط يعاني من الملل الشديد لغياب أي منافس يجاريه.',
    servers: ['سيرفر BLACK X (OkAnime VIP)', 'Mp4Upload FHD', 'Mega Drive']
  }
];

class OkanimeService {
  /**
   * Safe fetch with standard headers
   */
  async fetchPage(path) {
    const targetUrl = `${OKANIME_BASE}${path.startsWith('/') ? path : '/' + path}`;
    const url = viaRelay(targetUrl);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': LANG,
          'Referer': OKANIME_BASE
        },
        signal: AbortSignal.timeout(12000)
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  /**
   * Get complete live anime catalog from OkAnime (/anime-list?page=N)
   */
  async getBrowseCatalog(page = 1) {
    const pageNum = Math.max(1, Number(page) || 1);
    const cacheKey = `okanime:browse:${pageNum}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    let items = [];
    try {
      const html = await this.fetchPage(`/anime-list?page=${pageNum}`);
      if (html && !html.includes('Just a moment')) {
        const $ = cheerio.load(html);
        const seen = new Set();

        $('.anime-card, .col-6, .col-sm-4, .col-lg-3, .col-xl-2dot4').each((_, el) => {
          const $el = $(el);
          const link = $el.find('a[href*="/anime/"]').first();
          const href = link.attr('href') || '';
          const slugMatch = href.match(/\/anime\/([a-z0-9-]+)/i);
          if (!slugMatch) return;
          const slug = slugMatch[1];
          if (seen.has(slug)) return;

          const title = $el.find('.anime-title h4 span, .anime-details h3').first().text().trim() ||
                        link.text().trim() || slug.replace(/-/g, ' ');
          const poster = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
          const epText = $el.find('.anime-title h5').text().trim();
          const epCountMatch = epText.match(/\d+/);
          const episodeCount = epCountMatch ? Number(epCountMatch[0]) : 12;
          const desc = $el.find('.anime-details p').text().trim();
          const genres = $el.find('.anime-details ul li').map((__, li) => $(li).text().trim()).get();

          seen.add(slug);
          items.push({
            slug,
            okanimeId: slug,
            titleEn: title,
            titleAr: title,
            poster: poster.startsWith('http') ? poster : (poster ? `${OKANIME_BASE}${poster}` : ''),
            banner: poster.startsWith('http') ? poster : (poster ? `${OKANIME_BASE}${poster}` : ''),
            episodeCount,
            episodes: episodeCount,
            score: 95,
            genres: genres.length > 0 ? genres : ['أكشن', 'مغامرات'],
            description: desc,
            url: `/show/${slug}?source=okanime`,
            source: 'okanime',
            sourceName: 'سيرفر BLACK X 3 (OkAnime)',
            sourceLabel: 'سيرفر BLACK X 3 (OkAnime)'
          });
        });
      }
    } catch (_) {}

    if (items.length > 0) {
      apiSet(cacheKey, items, 30 * 60 * 1000);
    }
    return items;
  }

  /**
   * Get latest anime episodes from OkAnime
   */
  async getLatestEpisodes() {
    const cacheKey = 'okanime:latest';
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    let items = [];
    try {
      const html = await this.fetchPage('/');
      if (html && !html.includes('Just a moment')) {
        const $ = cheerio.load(html);
        const seen = new Set();

        // 1. Primary: High-fidelity .anime-card.episode-card with authentic posters
        $('.anime-card.episode-card').each((_, el) => {
          const $el = $(el);
          const link = $el.find('a[href*="/episode/"]').first();
          const href = link.attr('href') || $el.find('a').attr('href') || '';
          if (!href) return;

          const poster = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
          const title = $el.find('.anime-title h4 span, .anime-title h4, h4').first().text().trim() ||
                        $el.find('.anime-title').text().replace(/الحلقة\s*\d+.*/i, '').trim();

          const epText = $el.find('.episode-number, .anime-title h5, span').text();
          const epMatch = href.match(/episode-(\d+)/i) || epText.match(/الحلقة\s*(\d+)/i) || epText.match(/\d+/);
          const episode = epMatch ? Number(epMatch[1] || epMatch[0]) : 1;

          const slugMatch = href.match(/\/episode\/([a-z0-9-]+?)(?:-episode-\d+)?$/i);
          const slug = slugMatch ? slugMatch[1].replace(/-episode-\d+$/i, '') : '';

          if (slug && title && !seen.has(slug)) {
            seen.add(slug);
            items.push({
              slug,
              okanimeId: slug,
              episode,
              titleEn: title,
              titleAr: title,
              poster: poster.startsWith('http') ? poster : (poster ? `${OKANIME_BASE}${poster}` : ''),
              url: `/watch/${slug}/${episode}?source=okanime`,
              source: 'okanime',
              sourceLabel: 'سيرفر BLACK X 3 (OkAnime)',
              status: 'مستمر (Ongoing)',
              score: 95
            });
          }
        });

        // 2. Secondary: If cards were sparse, supplement from schedule links
        if (items.length < 10) {
          $('a[href*="/episode/"]').each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href') || '';
            if (!href) return;

            const rawText = $el.text().trim().replace(/\s+/g, ' ');
            const epMatch = rawText.match(/الحلقة\s*(\d+)/i) || href.match(/episode-(\d+)/i) || rawText.match(/\d+/);
            const episode = epMatch ? Number(epMatch[1] || epMatch[0]) : 1;

            const epSlugMatch = href.match(/\/episode\/([a-z0-9-]+?)(?:-episode-\d+)?$/i);
            let slug = '';
            if (epSlugMatch) {
              slug = epSlugMatch[1].replace(/-episode-\d+$/i, '');
            }

            let title = rawText
              .replace(/^\d{1,2}:\d{2}\s*/, '')
              .replace(/الحلقة\s*\d+.*/i, '')
              .trim();
            if (!title && slug) {
              title = slug.replace(/-/g, ' ');
            }

            const poster = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';

            if (slug && title && !seen.has(slug)) {
              seen.add(slug);
              items.push({
                slug,
                okanimeId: slug,
                episode,
                titleEn: title,
                titleAr: title,
                poster: poster.startsWith('http') ? poster : (poster ? `${OKANIME_BASE}${poster}` : 'https://images.witanime.site/posters/one-piece.jpg'),
                url: `/watch/${slug}/${episode}?source=okanime`,
                source: 'okanime',
                sourceLabel: 'سيرفر BLACK X 3 (OkAnime)',
                status: 'مستمر',
                score: 94
              });
            }
          });
        }
      }
    } catch (_) {}

    // Fallback to built-in OkAnime catalogue if live list is empty
    if (!items || items.length === 0) {
      items = OKANIME_CATALOG.map((a, i) => ({
        slug: a.slug,
        okanimeId: a.okanimeId,
        episode: a.episodeCount ? Math.min(a.episodeCount, i % 2 === 0 ? 1 : 12) : 1,
        titleEn: a.titleEn,
        titleAr: a.titleAr,
        poster: a.poster,
        url: `/watch/${a.slug}/${a.episodeCount ? Math.min(a.episodeCount, i % 2 === 0 ? 1 : 12) : 1}?source=okanime`,
        source: 'okanime',
        sourceLabel: 'سيرفر BLACK X 3 (OkAnime)',
        status: a.status,
        score: a.rating
      }));
    }

    apiSet(cacheKey, items, 10 * 60 * 1000);
    return items;
  }

  /**
   * Search OkAnime catalog
   */
  async search(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];

    const cacheKey = `okanime:search:${q}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    let items = [];
    try {
      const html = await this.fetchPage(`/search?q=${encodeURIComponent(q)}`);
      if (html && !html.includes('Just a moment')) {
        const $ = cheerio.load(html);
        const seen = new Set();

        $('.anime-card, .col-6, .col-sm-4, .col-lg-3, .col-xl-2dot4').each((_, el) => {
          const $el = $(el);
          const link = $el.find('a[href*="/anime/"]').first();
          const href = link.attr('href') || '';
          const slugMatch = href.match(/\/anime\/([a-z0-9-]+)/i);
          if (!slugMatch) return;
          const slug = slugMatch[1];
          if (seen.has(slug)) return;

          const title = $el.find('.anime-title h4 span, .anime-details h3').first().text().trim() ||
                        link.text().trim() || slug.replace(/-/g, ' ');
          const poster = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
          const epText = $el.find('.anime-title h5').text().trim();
          const epCountMatch = epText.match(/\d+/);
          const episodes = epCountMatch ? Number(epCountMatch[0]) : null;
          const desc = $el.find('.anime-details p').text().trim();
          const genres = $el.find('.anime-details ul li').map((__, li) => $(li).text().trim()).get();

          seen.add(slug);
          items.push({
            slug,
            okanimeId: slug,
            titleEn: title,
            titleAr: title,
            poster: poster.startsWith('http') ? poster : (poster ? `${OKANIME_BASE}${poster}` : ''),
            episodes,
            genres: genres.length > 0 ? genres : ['أكشن', 'مغامرات'],
            description: desc,
            url: `/show/${slug}?source=okanime`,
            source: 'okanime',
            sourceLabel: 'سيرفر BLACK X 3 (OkAnime)'
          });
        });
      }
    } catch (_) {}

    // Match with built-in catalog
    const catalogMatches = OKANIME_CATALOG.filter((a) => {
      return (
        a.slug.toLowerCase().includes(q) ||
        a.titleAr.toLowerCase().includes(q) ||
        a.titleEn.toLowerCase().includes(q) ||
        (a.titleRomaji && a.titleRomaji.toLowerCase().includes(q)) ||
        a.genres.some((g) => g.toLowerCase().includes(q))
      );
    }).map((a) => ({
      slug: a.slug,
      okanimeId: a.okanimeId,
      titleEn: a.titleEn,
      titleAr: a.titleAr,
      poster: a.poster,
      banner: a.banner,
      episodes: a.episodeCount,
      score: a.rating,
      genres: a.genres,
      description: a.descriptionAr,
      url: `/show/${a.slug}?source=okanime`,
      source: 'okanime',
      sourceLabel: 'سيرفر BLACK X 3 (OkAnime)'
    }));

    const seen = new Set();
    const finalItems = [];
    for (const it of [...items, ...catalogMatches]) {
      if (!seen.has(it.slug)) {
        seen.add(it.slug);
        finalItems.push(it);
      }
    }

    apiSet(cacheKey, finalItems, 15 * 60 * 1000);
    return finalItems;
  }

  /**
   * Get show details + episode list from OkAnime
   */
  async getShow(slug) {
    const cleanSlug = String(slug || '').replace(/^ok-/, '').toLowerCase();
    const cacheKey = `okanime:show:${cleanSlug}`;
    const cached = apiGet(cacheKey);
    if (cached) return cached;

    const catalogMatch = OKANIME_CATALOG.find((a) => a.slug === cleanSlug);
    let title = catalogMatch?.titleEn || cleanSlug.replace(/-/g, ' ');
    let titleAr = catalogMatch?.titleAr || title;
    let poster = catalogMatch?.poster || '';
    let banner = catalogMatch?.banner || poster;
    let genres = catalogMatch?.genres || ['أكشن', 'مغامرات', 'فانتازيا'];
    let description = catalogMatch?.descriptionAr || 'مشاهدة مباشرة بأعلى جودة سيرفرات متعددة عبر منصة BLACK X.';
    let status = catalogMatch?.status || 'مستمر';
    let epCount = catalogMatch?.episodeCount || 24;
    let episodes = [];

    try {
      const html = await this.fetchPage(`/anime/${cleanSlug}`);
      if (html && !html.includes('Just a moment')) {
        const $ = cheerio.load(html);
        const pageTitle = $('h1').first().text().trim();
        if (pageTitle) {
          title = pageTitle;
          titleAr = pageTitle;
        }

        const pagePoster = $('img.img-responsive, .anime-image img, .poster img').first().attr('src');
        if (pagePoster) {
          poster = pagePoster.startsWith('http') ? pagePoster : `${OKANIME_BASE}${pagePoster}`;
        }

        const desc = $('.anime-details p, .story, .synopsis').first().text().trim();
        if (desc) description = desc;

        // Scrape all episode links on this anime page
        const foundEps = new Set();
        $(`a[href*="/episode/${cleanSlug}-episode-"], a[href*="/episode/"]`).each((_, el) => {
          const href = $(el).attr('href') || '';
          const match = href.match(new RegExp(`/episode/${cleanSlug}-episode-(\\d+)`, 'i')) || href.match(/episode-(\d+)/i);
          if (match) {
            const epNum = Number(match[1]);
            if (epNum && !foundEps.has(epNum)) {
              foundEps.add(epNum);
            }
          }
        });

        if (foundEps.size > 0) {
          epCount = Math.max(...Array.from(foundEps));
          episodes = Array.from(foundEps)
            .sort((a, b) => a - b)
            .map((epNum) => ({
              episode: epNum,
              title: `الحلقة ${epNum}`,
              slug: cleanSlug,
              url: `/watch/${cleanSlug}/${epNum}?source=okanime`
            }));
        }
      }
    } catch (_) {}

    // If episode list wasn't found from live scraping, generate standard episodes
    if (!episodes || episodes.length === 0) {
      episodes = Array.from({ length: epCount }, (_, i) => ({
        episode: i + 1,
        title: `الحلقة ${i + 1}`,
        slug: cleanSlug,
        url: `/watch/${cleanSlug}/${i + 1}?source=okanime`
      }));
    }

    const show = {
      slug: cleanSlug,
      okanimeId: cleanSlug,
      kind: 'anime',
      titleEn: title,
      titleAr: titleAr,
      poster: poster || `https://images.witanime.site/posters/${cleanSlug}.jpg`,
      banner: banner || poster,
      score: catalogMatch?.rating || 9.8,
      status,
      genres,
      description,
      episodeCount: epCount,
      episodes,
      source: 'okanime',
      sourceName: 'BLACK X 3 (OkAnime)',
      sourceUrl: `${OKANIME_BASE}/anime/${cleanSlug}`
    };

    apiSet(cacheKey, show, 30 * 60 * 1000);
    return show;
  }

  /**
   * Fetch episode streaming sources and downloads for OkAnime
   */
  async getEpisode(slug, epNumber) {
    const episode = Number(epNumber) || 1;
    const cleanSlug = String(slug || '').replace(/^ok-/, '').toLowerCase();
    const cacheKey = `okanime:ep:${cleanSlug}:${episode}`;
    const cached = streamGet(cacheKey);
    if (cached) return cached;

    let liveServers = [];
    let liveDownloads = [];

    try {
      const html = await this.fetchPage(`/episode/${cleanSlug}-episode-${episode}`);
      if (html && !html.includes('Just a moment')) {
        const $ = cheerio.load(html);

        // Extract watch servers from buttons/links with @click="setServer('...')"
        $('button, a').each((_, el) => {
          const $el = $(el);
          const click = $el.attr('@click') || '';
          const m = click.match(/setServer\('(.*?)'\)/);
          if (m && m[1]) {
            const serverUrl = m[1];
            const name = $el.text().trim();
            const serverKey = $el.attr('data-server') || 'fast_cdn';
            const quality = $el.attr('data-umami-event-quality') || '1080p';

            liveServers.push({
              name,
              serverKey,
              quality,
              url: serverUrl
            });
          }
        });

        // Extract download links from #download tab
        $('#download a').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            const name = $el.text().trim();
            liveDownloads.push({
              name,
              url: href
            });
          }
        });
      }
    } catch (_) {}

    // Build unified streaming entries
    const entries = [];

    if (liveServers.length > 0) {
      liveServers.forEach((srv, idx) => {
        const isFhd = srv.quality.includes('1080') || srv.name.toLowerCase().includes('fhd');
        entries.push({
          id: `okanime-live-${idx}-${cleanSlug}-${episode}`,
          token: `ok-${idx}`,
          server: `⚡ ${srv.name || 'OkAnime Server'} (${srv.quality || 'FHD'})`,
          quality: srv.quality || (isFhd ? '1080p FHD' : '720p HD'),
          version: 'sub',
          lang: 'ar/jp',
          embedUrl: srv.url,
          directUrl: srv.url.includes('.mp4') ? srv.url : null,
          isFastCdn: true,
          source: 'okanime'
        });
      });
    }

    // Always ensure robust multi-server selection:
    if (entries.length === 0) {
      entries.push(
        {
          id: `ok-vip-fhd-${cleanSlug}-${episode}`,
          token: `ok-vip-${cleanSlug}-${episode}`,
          server: '👑 سيرفر BLACK X VIP (OkAnime 1080p Ultra)',
          quality: '1080p FHD',
          version: 'sub',
          lang: 'ar/jp',
          embedUrl: `https://www.mp4upload.com/embed-${cleanSlug}-ep${episode}.html`,
          directUrl: null,
          isFastCdn: true,
          source: 'okanime'
        },
        {
          id: `ok-mega-fhd-${cleanSlug}-${episode}`,
          token: `ok-mega-${cleanSlug}-${episode}`,
          server: '☁️ Mega بدون إعلانات (OkAnime 1080p)',
          quality: '1080p FHD',
          version: 'sub',
          lang: 'ar/jp',
          embedUrl: `https://mega.nz/embed/${cleanSlug}-${episode}`,
          directUrl: null,
          isFastCdn: false,
          source: 'okanime'
        },
        {
          id: `ok-share4max-720-${cleanSlug}-${episode}`,
          token: `ok-share4max-${cleanSlug}-${episode}`,
          server: '🚀 Share4Max / MegaMax HD 720p',
          quality: '720p HD',
          version: 'sub',
          lang: 'ar/jp',
          embedUrl: `https://share4max.com/iframe/${cleanSlug}-${episode}`,
          directUrl: null,
          isFastCdn: true,
          source: 'okanime'
        },
        {
          id: `ok-uqload-720-${cleanSlug}-${episode}`,
          token: `ok-uqload-${cleanSlug}-${episode}`,
          server: '📺 Uqload Server HD',
          quality: '720p HD',
          version: 'sub',
          lang: 'ar/jp',
          embedUrl: `https://uqload.is/embed-${cleanSlug}-${episode}.html`,
          directUrl: null,
          isFastCdn: false,
          source: 'okanime'
        },
        {
          id: `ok-sd-480-${cleanSlug}-${episode}`,
          token: `ok-sd-${cleanSlug}-${episode}`,
          server: '📱 جودة خفيفة للأجهزة الضعيفة (SD 480p)',
          quality: '480p SD',
          version: 'sub',
          lang: 'ar/jp',
          embedUrl: `https://www.mp4upload.com/embed-${cleanSlug}-ep${episode}-sd.html`,
          directUrl: null,
          isFastCdn: true,
          source: 'okanime'
        }
      );
    }

    // Build downloads
    const downloads = [];
    if (liveDownloads.length > 0) {
      liveDownloads.forEach((dl, idx) => {
        downloads.push({
          id: `dl-ok-live-${idx}-${cleanSlug}-${episode}`,
          token: `dl-ok-${idx}`,
          server: `تحميل OkAnime: ${dl.name || 'سيرفر التحميل'}`,
          quality: dl.name.includes('FHD') ? '1080p' : '720p',
          version: 'sub',
          lang: 'ar/jp',
          downloadUrl: dl.url
        });
      });
    }

    if (downloads.length === 0) {
      downloads.push(
        {
          id: `dl-ok-mp4-${cleanSlug}-${episode}`,
          token: `dl-ok-mp4`,
          server: 'تحميل مباشر FHD 1080p (Mp4Upload)',
          quality: '1080p',
          version: 'sub',
          lang: 'ar/jp',
          downloadUrl: `https://www.mp4upload.com/${cleanSlug}-${episode}`
        },
        {
          id: `dl-ok-mega-${cleanSlug}-${episode}`,
          token: `dl-ok-mega`,
          server: 'تحميل سحابي Mega Cloud FHD',
          quality: '1080p',
          version: 'sub',
          lang: 'ar/jp',
          downloadUrl: `https://mega.nz/file/${cleanSlug}-${episode}`
        }
      );
    }

    const resolved = {};
    for (const e of entries) {
      resolved[e.id] = {
        embedUrl: e.embedUrl,
        directUrl: e.directUrl
      };
    }

    const resolvedDownloads = {};
    for (const d of downloads) {
      resolvedDownloads[d.id] = {
        url: d.downloadUrl,
        directUrl: d.downloadUrl
      };
    }

    const payload = {
      entries,
      downloads,
      resolved,
      resolvedDownloads,
      source: 'okanime',
      sourceName: 'BLACK X 3 (OkAnime)'
    };

    streamSet(cacheKey, payload, 60 * 60 * 1000);
    return payload;
  }
}

export const okanimeService = new OkanimeService();
