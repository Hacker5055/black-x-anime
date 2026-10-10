import React from 'react';
import AnimeRankingsSection from '../components/AnimeRankingsSection.jsx';

export default function Rankings({ onOpenAuth }) {
  return (
    <div style={{ paddingTop: '1rem', minHeight: '80vh' }}>
      <AnimeRankingsSection onOpenAuth={onOpenAuth} />
    </div>
  );
}
