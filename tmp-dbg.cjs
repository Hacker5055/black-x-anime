delete process.env.DATABASE_URL;
const social = require('./server/src/lib/socialDb.js');
console.log('customizeUser(20):', social.customizeUser(20, { bannerUrl: 'https://x/b.jpg', themePreference: 'cyber-neon' }));
console.log('customizeUser("20"):', social.customizeUser('20', { bannerUrl: 'y' }));
console.log('getUser(20):', social.getUser(20) ? 'found' : 'null');
