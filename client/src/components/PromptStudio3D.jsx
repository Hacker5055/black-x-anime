import React, { useState } from 'react';
import { pushToast } from '../hooks/hooks.js';

export const PROMPTS_3D_COLLECTION = [
  {
    id: 'mj-royal-flame',
    category: 'midjourney',
    categoryAr: 'ميدجورني (Midjourney v6.1)',
    categoryEn: 'Midjourney v6.1',
    titleAr: 'إطار لهب التنين الملكي ثلاثي الأبعاد 3D',
    titleEn: '3D Royal Dragon Flame Avatar Frame',
    icon: '🔥',
    prompt: '/imagine prompt: A 3D luxury circular avatar frame, mythical royal dragon coiled around the ring, vibrant swirling flames, floating incandescent embers, polished obsidian and ruby gold metal, octane render, unreal engine 5, ray tracing, transparent black background, volumetric lighting, hyper-detailed, 8k resolution, isometric perspective --ar 1:1 --v 6.1 --stylize 250 --no background',
    motionPrompt: 'Continuous 360-degree slow rotation of golden dragon ring, living breathing flames flickering outward, floating embers orbiting in seamless 3D loop, high fps, cinematic particle effect --loop',
    params: '--v 6.1 --ar 1:1 --stylize 250 --no background',
    tags: ['Dragon', 'Flame', 'Gold & Ruby', '3D Octane']
  },
  {
    id: 'mj-cyber-neon',
    category: 'midjourney',
    categoryAr: 'ميدجورني (Midjourney v6.1)',
    categoryEn: 'Midjourney v6.1',
    titleAr: 'إطار هولوغرام سايبربانك متحرك 3D',
    titleEn: '3D Holographic Cyberpunk HUD Frame',
    icon: '⚡',
    prompt: '/imagine prompt: Floating 3D holographic sci-fi circular UI frame, neon cyan and magenta glowing energy rings, rotating concentric tech glyphs, floating futuristic data particles, glassmorphism bevel with chromatic aberration, hard surface modeling, Octane render, isolated on pure black --ar 1:1 --v 6.1 --stylize 300 --no human, no background',
    motionPrompt: 'Holographic glitch pulse, inner rings counter-rotating smoothly, floating blue and pink digital sparks drifting towards camera, 60fps seamless loop, sci-fi interface animation',
    params: '--v 6.1 --ar 1:1 --stylize 300 --no human',
    tags: ['Cyberpunk', 'Hologram', 'HUD 3D', 'Neon Glow']
  },
  {
    id: 'mj-shadow-monarch',
    category: 'midjourney',
    categoryAr: 'ميدجورني (Midjourney v6.1)',
    categoryEn: 'Midjourney v6.1',
    titleAr: 'هالة ملك الظلال البنفسجية الحية 3D',
    titleEn: '3D Shadow Monarch Dark Aura Ornament',
    icon: '👑',
    prompt: '/imagine prompt: Solo Leveling inspired 3D avatar ornament frame, ethereal dark purple shadowy mist surging from the base, floating obsidian shadow crystals, glowing violet runic circular crest, menacing ethereal energy tendrils, dramatic rim lighting, dark fantasy art, 8k, Unreal Engine 5 render --ar 1:1 --v 6.1 --stylize 350 --no background',
    motionPrompt: 'Dark purple shadow mist fluid simulation swirling upwards, glowing runes pulsing softly with dark magic, seamless 4k loop, fluid dynamics',
    params: '--v 6.1 --ar 1:1 --stylize 350',
    tags: ['Shadow', 'Solo Leveling', 'Purple Aura', 'Crystals']
  },
  {
    id: 'mj-imperial-gold',
    category: 'midjourney',
    categoryAr: 'ميدجورني (Midjourney v6.1)',
    categoryEn: 'Midjourney v6.1',
    titleAr: 'التاج الإمبراطوري الذهبي مع هالة ملائكية 3D',
    titleEn: '3D Imperial Golden Crown & Halo',
    icon: '⚜️',
    prompt: '/imagine prompt: Majestic 3D imperial royal crown hovering above a golden circular filigree frame, adorned with glowing sapphire gems, celestial orbiting light sparkles, polished 24k mirror gold, baroque details, cinematic lighting, 8k product render, transparent isolated background --ar 1:1 --v 6.1 --stylize 200 --no background',
    motionPrompt: 'Floating crown bobbing gently in zero-gravity, light glints sweeping across gold surfaces, orbiting sparkle particles in circular 3D path, perfect seamless loop',
    params: '--v 6.1 --ar 1:1 --stylize 200',
    tags: ['Imperial', 'Gold 24k', 'Crown', 'Luxury']
  },
  {
    id: 'mj-sakura-blossom',
    category: 'midjourney',
    categoryAr: 'ميدجورني (Midjourney v6.1)',
    categoryEn: 'Midjourney v6.1',
    titleAr: 'دوامة بتلات الساكورا الزجاجية 3D',
    titleEn: '3D Sakura Vortex Glass Ornament',
    icon: '🌸',
    prompt: '/imagine prompt: Floating 3D circular avatar ring made of translucent rose quartz crystal, swirling vortex of realistic cherry blossom sakura petals spiraling around it, gentle pink luminescence, floating dewdrops, springtime anime aesthetic, soft depth of field, Octane render, isolated on dark background --ar 1:1 --v 6.1 --stylize 180 --no background',
    motionPrompt: 'Wind spiral vortex blowing pink sakura petals around the circle in 3D orbit, gentle petal flutter, glowing soft light, 60fps loop',
    params: '--v 6.1 --ar 1:1 --stylize 180',
    tags: ['Sakura', 'Petals', 'Rose Quartz', 'Anime Aesthetic']
  },
  {
    id: 'mj-prismatic-diamond',
    category: 'midjourney',
    categoryAr: 'ميدجورني (Midjourney v6.1)',
    categoryEn: 'Midjourney v6.1',
    titleAr: 'ماسة كريستالية كاسرة للضوء 3D',
    titleEn: '3D Prismatic Refractive Diamond Ring',
    icon: '💎',
    prompt: '/imagine prompt: Ultra luxury 3D avatar frame sculpted from iridescent prismatic diamond crystal, refractive rainbow caustics dispersion, floating geometric facet shards orbiting the outer perimeter, high-end jewelry render, cinematic studio lighting, Octane render, 8k, isolated transparent --ar 1:1 --v 6.1 --stylize 220 --no background',
    motionPrompt: 'Slow 3D rotation with sparkling rainbow light reflections passing through diamond facets, floating crystal shards shifting slightly in space, infinite loop',
    params: '--v 6.1 --ar 1:1 --stylize 220',
    tags: ['Diamond', 'Prismatic', 'Caustics', 'Crystal 3D']
  },
  {
    id: 'video-runway-luma',
    category: 'video',
    categoryAr: 'رنواي ولوما (Runway Gen-3 / Luma AI)',
    categoryEn: 'Runway Gen-3 / Luma Dream Machine',
    titleAr: 'برومبت تحريك الفيديو لعمل لوب 3D لا نهائي (Seamless 60fps)',
    titleEn: 'Seamless 3D Video Loop Motion Prompt',
    icon: '🎬',
    prompt: 'Cinematic 3D loop animation of this circular ornament. Smooth 360-degree rotation along Z-axis, volumetric particle emission, glowing breathing pulsation, zero camera motion, perfectly seamless loop start and end frames, high frame rate, crisp focus, isolated dark background.',
    motionPrompt: 'Prompt Camera: Static camera, zoom 1.0. Motion: Orbit particles speed 3, element pulsation speed 2. Loop: ON.',
    params: 'Motion Slider: 4 | Camera: Static | Loop: Checked',
    tags: ['Video Loop', '60fps', 'Runway Gen-3', 'Luma AI']
  },
  {
    id: 'spline-threejs',
    category: 'spline',
    categoryAr: 'سبلاين وثري جي إس (Spline 3D & Three.js)',
    categoryEn: 'Spline 3D & WebGL Three.js',
    titleAr: 'برومبت ومواصفات مجسم سبلاين التفاعلي (Interactive WebGL)',
    titleEn: 'Spline 3D Scene Specification & Shader Prompt',
    icon: '🌐',
    prompt: 'Create a 3D avatar frame scene in Spline / Three.js: Torus geometry with radius 1.2, tube 0.08. Material: Glass / Physical Material with Transmission: 0.9, Roughness: 0.1, IOR: 1.5, Emissive color #22d3ee at intensity 2.5. Add 3 orbiting point lights rotating on elliptical path with Mouse Follow Gyro interaction (rotateX, rotateY on pointermove).',
    motionPrompt: 'Three.js Shader: MeshPhysicalMaterial + BloomPass (UnrealBloomPass strength: 1.4, radius: 0.8, threshold: 0.2).',
    params: 'Geometry: Torus | Material: Glass + Emissive | Interaction: Mouse LookAt',
    tags: ['Spline 3D', 'Three.js', 'WebGL', 'Interactive']
  },
  {
    id: 'blender-nodes',
    category: 'blender',
    categoryAr: 'بلندر (Blender 3D Geometry Nodes)',
    categoryEn: 'Blender 3D Geometry Nodes',
    titleAr: 'برومبت توليد نظام الجسيمات في بلندر (Geometry Nodes Particle Ring)',
    titleEn: 'Blender Geometry Nodes Procedural Orbit Prompt',
    icon: '🎨',
    prompt: 'In Blender 4.2+: Add Curve Circle > Geometry Nodes modifier > Curve to Mesh with Profile Star/Circle. Add Point Instance node with 64 IcoSpheres. Set Position with Math Sine/Cosine based on Scene Time Frame to produce infinite wave ripple. Eevee Next Raytracing enabled, Emission shader with strength 8.0, Bloom and Ambient Occlusion on.',
    motionPrompt: 'Render settings: Frame rate 60fps, 120 frames total, Output: WebM with Alpha Transparency or PNG Sequence.',
    params: 'Eevee Next | 60 FPS | Alpha Transparent RGBA',
    tags: ['Blender 4.2', 'Geometry Nodes', 'Eevee Next', 'Procedural']
  },
  {
    id: 'banner-3d-cyberpunk',
    category: 'banner',
    categoryAr: 'بانرات 3D (3D Anime Panoramic Banners)',
    categoryEn: '3D Anime Banners',
    titleAr: 'بانر أنمي سايبربانك ثلاثي الأبعاد فائق العرض (16:9)',
    titleEn: '3D Panoramic Cyberpunk Anime Header Banner',
    icon: '🖼️',
    prompt: '/imagine prompt: Ultra-wide 16:9 cinematic anime profile header banner, futuristic Neo-Tokyo skyline at midnight with towering neon holographic billboards, flying spinners, rain-slicked wet glass with glowing reflections, lone cyberpunk protagonist standing on rooftop overlooking the city, purple cyan and magenta atmospheric depth, Makoto Shinkai meets Ghost in the Shell, 8k resolution --ar 16:9 --v 6.1 --stylize 250',
    motionPrompt: 'Subtle neon signs flickering, gentle rain falling, flying air vehicles slowly passing across background, atmospheric fog movement, continuous cinematic loop',
    params: '--ar 16:9 --v 6.1 --stylize 250',
    tags: ['Banner', '16:9', 'Neo Tokyo', 'Anime Skyline']
  }
];

export default function PromptStudio3D({ lang = 'ar' }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  const filters = [
    { id: 'all', labelAr: 'الكل (جميع البرومبتات)', labelEn: 'All Prompts' },
    { id: 'midjourney', labelAr: '✨ ميدجورني 3D', labelEn: 'Midjourney v6.1' },
    { id: 'video', labelAr: '🎬 فيديو وحركة حية (Runway)', labelEn: 'Runway / Video' },
    { id: 'spline', labelAr: '🌐 مجسمات ويب (Spline 3D)', labelEn: 'Spline / Three.js' },
    { id: 'blender', labelAr: '🎨 بلندر 3D (Blender)', labelEn: 'Blender Nodes' },
    { id: 'banner', labelAr: '🖼️ بانرات 3D للبروفايل', labelEn: '3D Banners' }
  ];

  const filteredPrompts = PROMPTS_3D_COLLECTION.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  const handleCopy = (text, id, type = 'prompt') => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${id}-${type}`);
    pushToast(
      lang === 'ar'
        ? '✓ تم نسخ البرومبت بنجاح! جاهز للصق في Midjourney أو الذكاء الاصطناعي'
        : '✓ Prompt copied to clipboard! Ready to paste into Midjourney / AI tool',
      'success'
    );
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  return (
    <div
      className="glass"
      style={{
        borderRadius: '18px',
        padding: '1.5rem',
        marginTop: '1.75rem',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(139, 92, 246, 0.08) 100%)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.6rem' }}>💎</span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              {lang === 'ar' ? 'معمل واستوديو برومبتات الزخارف ثلاثية الأبعاد 3D' : '3D Animated Ornaments Prompt Studio'}
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '99px',
                background: 'rgba(34, 211, 238, 0.2)',
                color: 'var(--cyan)',
                border: '1px solid rgba(34, 211, 238, 0.4)'
              }}
            >
              PROMPTS HUB
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.84rem', color: 'var(--ink-dim)' }}>
            {lang === 'ar'
              ? 'مجموعة برومبتات جاهزة ومُحكمة لعمل زخارف وإطارات وبانرات ثلاثية الأبعاد متحركة وحية عبر Midjourney، Runway، Spline، وBlender بنقرة واحدة.'
              : 'Production-ready prompts to generate living, animated 3D avatar frames, crowns, orbs and banners via Midjourney, Runway, Spline & Blender.'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.65rem', marginBottom: '1.25rem' }}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn--ghost btn--sm ${activeFilter === f.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
            style={{
              fontSize: '0.8rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '99px',
              whiteSpace: 'nowrap',
              borderColor: activeFilter === f.id ? 'var(--cyan)' : 'rgba(255,255,255,0.12)',
              background: activeFilter === f.id ? 'rgba(34, 211, 238, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeFilter === f.id ? '#fff' : 'var(--ink-dim)'
            }}
          >
            {lang === 'ar' ? f.labelAr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Prompt Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.15rem' }}>
        {filteredPrompts.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              padding: '1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            <div>
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800 }}>
                      {lang === 'ar' ? item.titleAr : item.titleEn}
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--cyan)' }}>
                      {lang === 'ar' ? item.categoryAr : item.categoryEn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: 'var(--ink-dim)'
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Prompt Text Box */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  color: '#e2e8f0',
                  lineHeight: '1.45',
                  marginBottom: '0.65rem',
                  maxHeight: '130px',
                  overflowY: 'auto'
                }}
              >
                {item.prompt}
              </div>

              {/* Motion / Animation Loop Prompt */}
              {item.motionPrompt && (
                <div
                  style={{
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px dashed rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    fontSize: '0.74rem',
                    color: '#c4b5fd',
                    marginBottom: '0.85rem'
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.72rem', color: '#a78bfa', marginBottom: '0.2rem' }}>
                    ⚡ {lang === 'ar' ? 'برومبت الحركة والتحريك (Motion Loop):' : 'Motion Loop Prompt:'}
                  </strong>
                  {item.motionPrompt}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                style={{ flex: 1, fontSize: '0.78rem', padding: '0.45rem' }}
                onClick={() => handleCopy(item.prompt, item.id, 'prompt')}
              >
                {copiedId === `${item.id}-prompt` ? (
                  <span>✓ {lang === 'ar' ? 'تم النسخ!' : 'Copied!'}</span>
                ) : (
                  <span>📋 {lang === 'ar' ? 'نسخ برومبت التوليد' : 'Copy Main Prompt'}</span>
                )}
              </button>

              {item.motionPrompt && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
                  onClick={() => handleCopy(item.motionPrompt, item.id, 'motion')}
                  title={lang === 'ar' ? 'نسخ برومبت الحركة' : 'Copy Motion Prompt'}
                >
                  {copiedId === `${item.id}-motion` ? '✓' : '🎬'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Guide & Tips footer */}
      <div
        style={{
          marginTop: '1.25rem',
          padding: '1rem',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.8rem',
          color: 'var(--ink-dim)',
          lineHeight: '1.6'
        }}
      >
        <strong style={{ color: '#fff', display: 'block', marginBottom: '0.25rem' }}>
          💡 {lang === 'ar' ? 'كيفية استخدام هذه البرومبتات في حسابك الشخصي:' : 'How to use these prompts for your profile:'}
        </strong>
        {lang === 'ar' ? (
          <ol style={{ margin: '0.35rem 0 0', paddingInlineStart: '1.2rem' }}>
            <li>انسخ البرومبت وافتحه في <strong>Midjourney</strong> (مع أمر <code>/imagine</code>) للحصول على صورة 3D بخلفية شفافة مفرغة.</li>
            <li>لتحويل الزخرفة إلى شكل <strong>حي متحرك 60fps</strong>، خذ الصورة المولدة إلى <strong>Runway Gen-3</strong> أو <strong>Luma Dream Machine</strong> واستخدم برومبت الحركة المرفق لعمل حلقة مستمرة (Loop).</li>
            <li>احفظ النتيجة بصيغة <strong>WebM</strong> أو <strong>GIF شفاف</strong> أو <strong>PNG</strong>، ثم الصق رابطها أو ارفعها كبانر أو صورة في ملفك الشخصي!</li>
          </ol>
        ) : (
          <ol style={{ margin: '0.35rem 0 0', paddingInlineStart: '1.2rem' }}>
            <li>Copy the prompt and generate with <strong>Midjourney v6.1</strong> using <code>/imagine</code> with transparent background parameter.</li>
            <li>Take the image into <strong>Runway Gen-3</strong> or <strong>Luma Dream Machine</strong> and use the motion loop prompt to create a living 60fps loop.</li>
            <li>Save as transparent WebM/GIF or PNG and attach to your profile banner or avatar!</li>
          </ol>
        )}
      </div>
    </div>
  );
}
