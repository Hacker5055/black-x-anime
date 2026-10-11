# زخارف وإطارات وبانرات ثلاثية الأبعاد للملفات الشخصية — 3D Ornaments

> مجسّمات حيّة (Three.js r180) تلتفّ حول الصورة الشخصية وفوق بانر الملف، تتفاعل مع الماوس
> بنعومة نابضة، مع **بديل CSS كامل** لمن لا يملك WebGL، وحزمة برومبتات مُهندَسة لـ
> Midjourney / Runway / Luma لإنتاج أصول قابلة للدمج فعلًا في الويب.

| العنصر | الملف |
| --- | --- |
| محرّك Three.js (بدون React) | `client/src/ornaments/core/engine.js` |
| كتالوج الإعدادات الجاهزة + طبقات الجودة | `client/src/ornaments/core/ornaments.js` |
| حزمة البرومبتات (تكست جاهز للنسخ) | `client/src/ornaments/core/prompts.js` |
| غلاف React: الإطار حول الأفاتار | `client/src/ornaments/OrnamentAvatar.jsx` |
| غلاف React: البانر ثلاثي الأبعاد | `client/src/ornaments/OrnamentBanner.jsx` |
| غلاف React: محرّك الزينة (lazy + fallback) | `client/src/ornaments/Ornament3D.jsx` |
| معرض الاختيار + المعايرة الدقيقة | `client/src/ornaments/OrnamentGallery.jsx` |
| تفضيلات المستخدم (كاش + API) | `client/src/ornaments/useOrnamentPrefs.js` |
| **صفحة عرض مستقلة بلا بناء** | `zellige-3d-lab.html` (في جذر المستودع) |
| اختبار دوّامة المحرّك في Node | `tools/ornament-node-smoke.mjs` |

---

## ١ · تشغيل فوري

```bash
npm install three                 # 0.180.0 — مضافة إلى package.json
npx vite --config client/vite.config.js
# ثم افتح:  http://localhost:3000/zellige-3d-lab.html
```

صفحة `zellige-3d-lab.html` تعمل أيضًا **بدون أي بناء**: تفتحها من المتصفح فتجلب `three`
من CDN عبر `importmap`، وإذا وجدته محليًا في `node_modules` تستخدمه أولًا (نسخة واحدة فقط
من المكتبة في كل الحالتين).

للمعاينة السريعة داخل التطبيق: `/profile` ← تبويب «ملفي الشخصي» ← صندوق
**«مجسّمات وزخارف ثلاثية الأبعاد»**.

---

## ٢ · ما الذي يميّز التنفيذ فعليًا (وليس مجرد حلقة متوهّجة)

1. **الزجاج ينكسر فعلًا خلفه الصورة.** القرص الدائري للأفاتار يُقَصّ بمستوى `THREE.Plane`
   داخل المشهد، وتُترَك حلقة الإطار *غير شفافة* حتى تدخل ممرّ `transmission` الخاص بـ
   `MeshPhysicalMaterial`. النتيجة: الحافة الزجاجية تُظهر الأفاتار مشوّهًا انكساريًا من
   خلفها، ثم يمرّ «شريط» الحلقة أمام الوجه. طبقة CSS مطابِقة (`mask-image: radial-gradient`)
   تُرسم في DOM لتبقى الصورة قابلة للنسخ/الفتح بالنقر ولمن لا يملك WebGL.
2. **الحركة زَنبرية لا خطّية.** كل شيء يمرّ بمخمّد مستقلّ عن معدّل الإطارات:
   `1 - exp(-λ·dt)`، فحركة 144Hz تطابق 60Hz تمامًا. الميل من الماوس، دوران العجلة/السحب،
   نبضة النقر، و«نَفَس» التوهّج — كلها نفس المعادلة.
3. **الحلقات الخارجية ليست `TorusGeometry` عاديًا** في الحلقة الثالثة: حلقة `RingGeometry`
   مع شيدر GLSL يرسم ٣ أنماط (rune / tech-chevron+أشرطة بيانات / filigree) بحركة
   وميض + دوَران بيانات — أي «glyphs دوّارة» المطلوبة في الدليل، لكن بشيدر بدل 168 كائن.
4. **الشرر يصعد فعلاً**: الجسيمات في وضع `rise` لها عمر `life` يُولَّد من `fract()` في
   vertex shader وتُطفَأ بـ `sin(life·π)` فلا يظهر جسيم فجأة ولا يختفي فجأة (لا «pop»).
5. **البانر ليس صورة ثابتة**: طبقة `PlaneGeometry` مُقوّسة تحمل كنفسًا إجرائيًا يُرسم
   مرّة (سماء/نجوم/أفق مبانٍ بنوافذ مضيئة) ثم تُركَّب فوقه الطبقات المتحرّكة فقط
   (لافتات نيون ترتجف، شبكة أرضية تنساب، شقوق أرجوانية، جمر) — ١٥fps رسم كنفس بدل
   رسم كامل كل إطار.
6. **التنزيل الذاتي**: ٣ ثوانٍ تحت 32 إطار/ث → يهبط المحرّك درجة جودة لوحده
   (`cinematic → balanced → lite`) ويطلق `onDegrade` ليُظهر التطبيق إشعارًا.

---

## ٣ · الـ Presets الحالية

### إطارات (9)

| `id` | الاسم | ملاحظة بصرية | bloom |
| --- | --- | --- | --- |
| `royal-flame` | لهب التنين الملكي | obsidian + ذهب ياقوت + أشرطة لهب + جمر صاعد | 0.78 / 0.72 / 0.42 |
| `cyber-neon` | هولوغرام السايبربانك | ٣ حلقات طاقة + scanlines + glyphs تقنية | 1.15 / 0.58 / 0.20 |
| `shadow-monarch` | هالة ملك الظلال | أعمدة ضباب + شظايا أوبسيديان عائمة | 0.96 / 0.80 / 0.16 |
| `imperial-gold` | التاج الذهبي | معدن مصقول + filigree بطيء | 0.62 / 0.62 / 0.50 |
| `sakura-blossom` | أزهار الساكورا | زجاج وردي حليبي + بتلات InstancedMesh | 0.52 / 0.86 / 0.55 |
| `prismatic-diamond` | الماسة الكريستالية | `dispersion: 3.4` + `iridescence` + قزح | 0.90 / 0.64 / 0.28 |
| `aurora-veil` | ستارة الشفق | أشرطة ضوء زمردية/فيروزية | 0.85 / 0.90 / 0.30 |
| `celestial-void` | الفضاء الكوني | مدارات كوكبية مائلة + بريق نجوم | 0.88 / 0.90 / 0.24 |
| `dragon-ascension` | التنين السماوي | شرائط يقين صاعدة + جمر ذهبي | 0.82 / 0.78 / 0.30 |

> **معرّفات مرادَفة:** `resolveOrnamentId()` تخيط معارف المكوّنات الأخرى على الـ presets
> الحقيقية — `'dragon-flame' → 'royal-flame'` (نفس ما يفعله `Avatar3DDecoration`)،
> فلا تُترك أي قيمة محفوظة بلا مجسّم. استخدم `getOrnament(id)` / `resolveOrnament(id, overrides)`
> ولا تحتاج لتذكّر الجدول.

### بانرات (4)

`neon-tokyo` (أفق مديني + لافتات + شبكة) · `shadow-abyss` (شقّ أرجواني) ·
`sakura-dusk` (غروب وبتلات) · `dragon-ember` (جمر صاعد).

كل preset هو كائن بيانات فقط — إضافة زخرفة جديدة لا تتطلّب سطر Three.js واحد:

```js
'frost-ward': {
  id: 'frost-ward', icon: '❄️', labelAr: 'حرّاس الصقيع', labelEn: 'Frost Ward',
  colors: { primary: '#a5f3fc', accent: '#e0f2fe', glow: '#67e8f9' },
  background: 'radial-gradient(circle at 50% 55%, #06232e 0%, #05060d 74%)',
  tilt: 0.24, scrollRotation: 1.1, rim: 1.3,
  bloom: { strength: 0.7, radius: 0.8, threshold: 0.34 },
  rings: [/* … */],
  glyphs: { kind: 'rune', color: '#a5f3fc', radius: 1.26, width: 0.13, spokes: 20 },
  particles: { count: 30, radius: 1.2, size: 0.05, color: '#cffafe', color2: '#fff' },
  css: { border: '#a5f3fc', glowA: '#a5f3fc', glowB: '#67e8f9', anim: 'auroraWave' }
}
```

---

## ٤ · واجهة `OrnamentEngine`

```js
const engine = await mountOrnament({          // يرجّع null لو لا WebGL — لا try/catch مطلوب
  canvas, container, mode: 'frame',           // أو 'banner'
  ornament: 'cyber-neon',
  quality: 'auto',                             // auto | cinematic | balanced | lite | css
  interactive: true,
  clip: 'over',                                // 'over' = القصّ فوق الأفاتار (انكسار)
  avatarSrc, avatarLabel, avatarColor,
  bloomStrength: 1.15, glassTransmission: 0.9, emissive: 2.5,
  pointerMode: 'auto',       // 'auto' = تتبّع بالماوس بلا سرقة نقرات · 'block' = سحب/عجلة/نبضة
  onStats: ({ fps, tris, calls, dpr }) => hud.update({ fps, tris, calls, dpr }),
  onDegrade: () => toast('انخفضت الجودة للحفاظ على السلاسة')
});

engine.setOptions({ tilt: 0.34, spin: 0.08, bloomStrength: 1.2, particleSpeed: 1.3 });
engine.setOrnament('shadow-monarch');          // إعادة بناء المشهد دون إعادة إنشاء السياق
engine.setBloom(false);                        // إيقاف ممرّ post-processing كاملًا
engine.setAvatar({ src: photoUrl, label: 'K' });// تحديث نسيج الأفاتار
engine.pulse(1.2);                              // نبضة ضوء + دَفعة حجم
const png = engine.toDataURL();                 // لقطة PNG بخلفية شفافة (بطاقات المشاركة)
engine.getStats();                              // { tris, calls, textures, dpr, transmission… }
engine.dispose();                               // تحرير الهندسات/المواد + forceContextLoss
```

### الخيارات القابلة للتجربة حيًّا

| المفتاح | المدى | ما يفعله |
| --- | --- | --- |
| `tilt` | 0 → 0.6 rad | سعة الميل الجيروسكوبية مع الماوس |
| `spin` | 0 → 0.4 rad/s | الدوران الخامل للحلقة |
| `scrollRotation` | 0 → 3 | شحنة عجلة الماوس/السحب |
| `glassTransmission` | 0 → 1 | شفافية الزجاج |
| `glassRoughness` | 0.01 → 0.6 | خشونة (بلور نقي ↔ صقيعي) |
| `glassIor` | 1 → 2.4 | معامل الانكسار (1.52 زجاج، 1.9 ألماس) |
| `emissive` | 0 → 6 | شدّة النواة المضيئة (قبل الـ bloom) |
| `bloomStrength/Radius/Threshold` | 0→2 / 0→1.2 / 0→0.9 | هالة UnrealBloom |
| `particleSpeed` | 0 → 2.5 | مضاعِف سرعة الجسيمات |
| `transmission` | bool | تشغيل/إيقاف ممرّ الانكسار (أغلى بند) |
| `autoRotate` | bool | إيقاف الدوران الخامل (لو البطارية مهمة) |
| `rimColor` / `accentColor` | hex | تلوين ضوء الحافة/الضوء الثانوي — يُستخدم لربط الزخرفة بلون `--live` الخاص بالأنمي المعروض |
| `exposure` | 0.6 → 1.6 | كشف ACES (مفيد مع الصور المولّدة ذات الإضاءة العالية) |

---

## ٥ · الميزانية الحقيقية (محسوبة، لا مُتخيَّلة)

| البند | القيمة |
| --- | --- |
| مثلثات الإطار | ≈ 22k عند `balanced` (168 مقطع × 3 حلقات + شدر واحد) |
| Draw calls | ≤ 12 |
| ممرّات GPU | مشهد + transmission pass واحد + 3 ممرّات bloom + output |
| DPR | مقيَّد بـ 2 / 1.75 / 1.35 حسب الطبقة |
| حزمة JS | `engine-*.js` ≈ 763 KB قبل الضغط / **198 KB gzip** — chunk منفصل يُحمَّل عند الحاجة فقط |
| الإطالة على Jank | تخفيض تلقائي لدرجة الجودة بعد ٣ ثوانٍ تحت 32fps |
| عندما لا يكون العنصر ظاهرًا | إيقاف تام للـ rAF (IntersectionObserver + `visibilitychange`) |

**قاعدة ذهبية:** لا تُشغّل أكثر من ٤ سياقات WebGL حيّة في صفحة واحدة. لذلك معرض الاختيار
يستخدم **سياقًا واحدًا** (المسرح) بينما الباقية ملصقات CSS، والإطارات داخل الخلاصة تُفعَّل
عند الظهور فقط.

---

## ٦ · الدمج في `ProfileDashboard` / `Community`

```jsx
/* الأفاتار بإطاره الحيّ + بديل CSS تلقائي */
<OrnamentAvatar
  src={photoUrl}
  fallbackLabel={displayName?.[0]}
  avatarColor={avatarColor}
  frameStyle={frameStyle}          // 'default' = بدون زينة
  size={110}
  eager                            // للمسرح؛ في الخلاصة استخدم lazy (افتراضي)
  quality={ornamentQuality}        // 'auto' | 'cinematic' | 'balanced' | 'lite' | 'css'
/>

/* بانر الملف الشخصي */
<Ornament3D
  mode="banner"
  ornament={bannerStyle}
  overrides={{ imageOverride: bannerUrl || undefined }}   // صورة AI ← تصبح نسيج المستوي
/>
```

الحفظ: `PUT /api/profile/customize` يقبل الآن `frameStyle`، `ornament`، `bannerStyle`
بالإضافة إلى `bannerUrl` / `themePreference`. القيم تُخزَّن كنصوص معتمة (opaque) حتى تُضاف
زخارف جديدة دون هجرة قاعدة بيانات:

```
prisma/schema.prisma   →  frame_style / ornament / banner_style على جدول users
server/src/lib/socialDb.js (SQLite fallback) → أعمدة في social_profiles + users
```

`GET /api/profile/profile` صار يُرجع `frameStyle` / `ornament` / `bannerStyle` في المسارين
(Postgres و SQLite) — هذا يُصلح كذلك مشكلة أن الإطار المحفوظ كان يختفي بعد إعادة التحميل
عند وجود `DATABASE_URL`.

---

## ٧ · هندسة البرومبتات (لماذا عُدِّلت عن دليلك)

| في دليلك | المشكلة عند الدمج في الويب | ما فعلناه |
| --- | --- | --- |
| `transparent black background` + `--no background` | مصادرة `--no` تتجاوز كلمة `background` نفسها؛ و Midjourney **لا يُخرج ألفا إطلاقًا** | لوح أسود مسطّح `#000000` صريح + مسار ثانٍ بلوحة `#FF00FF` + `ffmpeg chromakey` (كود جاهز في `prompts.js`) |
| `octane render, unreal engine 5, ray tracing, 8k` | كلمات ميتة في v6.1/v7 وقد تُدخل إضاءة بيئة لا نريدها | استُبدلت بجملة إضاءة محدّدة: *rim خلفي + مفتاح 6500K، بدون GI bounce، بدون lens flare، هيلايت تحت 92% لئلّا يحرقها ACES* |
| دوران 360° + zero camera motion | لوب يقطع عند أول إطار لأن أول/آخر إطار مختلفان | «أول إطار = آخر إطار بايت-ببايت» + سرعة زاويّة ثابتة: 5s = دورة كاملة، 10s = دورتان |
| انبعاث جسيمات | الجسيمات تولد/تموت عند حدود الكادر فتظهر قفزة | ولادة/فناء داخل الكادر + إعادة B-seed خارج الرؤية |
| بانر 16:9 مع لافتات | النص فوق البانر يضيع | `safe area`: ترك 26% سفلية و18% يسرى داكنة وهادئة + تدرّج تعتيم مرسوم داخل القوام |
| — | لا يوجد وصف لحجم الملف/الصيغة | مسار VP9 alpha ≤ 400KB + `poster.webp` ≤ 20KB، وقاعدة «مشغّل الفيديو عند hover فقط» |

النصوص الجاهزة للنسخ معروضة في تبويب **② Prompt kit** داخل صفحة المختبر، وهي نفس
المحتوى في `client/src/ornaments/core/prompts.js` (مصدر واحد للحقيقة).

### لو أردت مجسّمًا حقيقيًا لا صورة
`prompts.js` فيه كتلة `mj-to-three-bridge`: still أمامي + ¾ → Meshy/Tripo/Rodin →
`gltf-transform optimize --compress draco --texture-compress webp` → 900KB كحد أقصى،
ويرُكَّب داخل `engine.spinGroup` فيرث التخميد والتوهّج والدوران تلقائيًا.

---

## ٨ · التعايش مع `Avatar3DDecoration` (مكوّن CSS-3D)

أضفت `main` مكوّنًا منفصلًا (`client/src/components/Avatar3DDecoration.jsx`) يبني نفس
الفكرة بطبقات `transform: translateZ` بلا WebGL. القرار في `ProfileDashboard`:

| الحالة | ما يُعرض |
| --- | --- |
| `frameStyle` = preset معروف + مفتاح 3D شغّال | `OrnamentAvatar` (WebGL حقيقي) |
| `frameStyle = 'default'` أو مفتاح 3D مطفأ | `Avatar3DDecoration` (الطبقات CSS، كما هي) |

كذلك: لن يحذف أيٌّ منهما الآخر، وكلاهما يقرأ نفس `frameStyle` المحفوظ، وشبكة الـ CSS
الخاصة به (`avatar-3d-*`, `ornament-3d-ring-*`) والملفات الجديدة (`MangaNovelReader`,
`PromptStudio3D`, `mangaNovel.*`) سليمة كما جاءت من `main`.

## ٩ · الإتاحة والسلوك المحترم

- `prefers-reduced-motion` → الدوران الخامل ×0.15، التخميد ×3.5 (استقرار شبه فوري)، لا وميض، لا نبضات.
- `pointer-events` على الكانفس فقط في وضع تفاعلي؛ النص والأزرار فوق البانر تبقى قابلة للنقر
  (`z-index` أعلى + `pointer-events:none` على الطبقات الزخرفية).
- الإطار زينة: `aria-hidden="true"` على الكانفس والطبقات، والصورة الحقيقية تحتفظ بـ `alt`.
- لا شبكات: خريطة البيئة مبنية إجرائيًا (`RoomEnvironment` + PMREM) — لا `.hdr` خارجي.
- وضع «2D fallback» في صفحة الملف يعطّل 3D بالكامل (بطارية / تقليل استهلاك).

---

## ١٠ · الاختبار

```bash
node tools/ornament-node-smoke.mjs
# ✓ 9 إطارات × 3 طبقات جودة + 4 بانرات × طبقتين، 696 نداء ريندر،
#   إعادة بناء، تبديل preset، bloom on/off، لقطة PNG، dispose — ALL PASS
npx vite build client        # ✓ + يتأكد أن three لم تدخل الحزمة الأساسية
```

المحاكاة في Node تتعمّد كشف: أساليب Three غير الموجودة، ترتيب الباني (مثل `setSize()` قبل
إنشاء الكاميرا — صُحِّح)، ومعرّفات shader الناقصة. أما التحقق البصري النهائي فمتاح في
صفحة المختبر: قِس `hud` (fps / tris / calls / dpr) على جهازك.

---

## ١١ · خارطة الطريق (ما لم يُنفَّذ هنا عمدًا)

1. **نظام قفل** — `imperial-gold` و `prismatic-diamond` كجوائز مستوى (`badge.threshold`
   موجودة أصلًا في `gamification.controller.js`)؛ الفوترة بـ VIP `vip_status`.
2. **أصول GLB** — تنين/تاج حقيقيان بدل الحلقات الإجرائية (المسار موثّق أعلاه).
3. **أصل الـ video loop** — Runway/Luma يخرجان MP4؛ يلزم خط أنابيب `chromakey → vp9 alpha`
   على الـ CDN مع `poster.webp`، والإطار يصبح `<video>` فوق الكانفس بدل نسيج.
4. **أشرطة العضوية** — تدرّج `--live` الحالي (لون الأنمي النشط) يستطيع تغذية `rim` تلقائيًا:
   `engine.setOptions({ rimColor: liveColor })` (سطر واحد إضافي في المحرّك).
5. **مؤثّرات صوتية ناعمة** عند النبضة (اختياري، مع كتم تلقائي إن `prefers-reduced-motion`).
