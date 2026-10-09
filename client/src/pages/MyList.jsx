import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import ShowCard, { ContinueCard } from '../components/ShowCard.jsx';
import { LiquidLoader, EmptyState } from '../components/Loading.jsx';
import { pushToast } from '../hooks/hooks.js';

export default function MyList({ onOpenAuth }) {
  const { t, lang, formatNumber } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [favs, setFavs] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('favorites');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    api.get('/api/library/favorites').then((d) => setFavs(d.favorites || [])).catch(() => setFavs([]));
    api.get('/api/library/continue').then((d) => setData(d)).catch(() => setData({ continueWatching: [], history: [] }));
  }, [user]);

  useEffect(() => {
    if (!user) { setFavs([]); setData({ continueWatching: [], history: [] }); return; }
    load();
  }, [user, load]);

  if (authLoading) return <LiquidLoader />;

  if (!user) {
    return (
      <div className="glass" style={{ padding: '2.5rem' }}>
        <EmptyState icon="📺" title={t('dashboard.loginPrompt')} sub={t('auth.demoHint')}>
          <button type="button" className="btn btn--primary" onClick={() => onOpenAuth('login')}>
            <span className="btn__shine" />
            {t('nav.login')}
          </button>
        </EmptyState>
      </div>
    );
  }

  const removeFav = async (s) => {
    if (!window.confirm(t('mylist.removeConfirm'))) return;
    setBusy(true);
    try {
      await api.del(`/api/library/favorites/${s.slug}`);
      setFavs((list) => list.filter((x) => x.slug !== s.slug));
      pushToast(t('toast.favoriteRemoved'), 'success');
    } finally {
      setBusy(false);
    }
  };

  const contItems = data?.continueWatching || [];
  const history = data?.history || [];

  const tabs = [
    { id: 'favorites', label: t('mylist.favorites'), count: favs?.length ?? 0 },
    { id: 'continue', label: t('mylist.continue'), count: contItems.length },
    { id: 'history', label: t('mylist.history'), count: history.length }
  ];

  return (
    <>
      <div className="page-head reveal">
        <h1>♥ {t('mylist.title')}</h1>
        <p>{t('mylist.subtitle')}</p>
      </div>

      <div className="filter-bar glass reveal">
        <div className="filter-bar__group">
          {tabs.map((tb) => (
            <button key={tb.id} type="button" className={`chip ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
              {tb.label}
              <span style={{ opacity: 0.75 }}>({formatNumber(tb.count)})</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'favorites' && (
        favs && favs.length === 0 ? (
          <div className="glass"><EmptyState icon="💜" title={t('mylist.emptyFav')} /></div>
        ) : !favs ? (
          <LiquidLoader />
        ) : (
          <div className="grid-anime">
            {favs.map((s, i) => (
              <div key={s.slug} style={{ position: 'relative' }}>
                <ShowCard show={s} delay={i} />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  style={{ position: 'absolute', top: 10, insetInlineEnd: 10, zIndex: 2 }}
                  onClick={() => removeFav(s)}
                  disabled={busy}
                  title={t('common.cancel')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'continue' && (
        contItems.length === 0 ? (
          <div className="glass"><EmptyState icon="🫧" title={t('mylist.emptyCont')} /></div>
        ) : (
          <div className="cont-row">
            {contItems.map((e, i) => (
              <ContinueCard key={`${e.slug}-${e.episode}`} entry={e} delay={i} />
            ))}
          </div>
        )
      )}

      {tab === 'history' && (
        history.length === 0 ? (
          <div className="glass"><EmptyState icon="🕘" title={t('mylist.emptyHist')} /></div>
        ) : (
          <div className="cont-row">
            {history.map((e, i) => (
              <ContinueCard key={`h-${e.slug}-${e.episode}`} entry={{ ...e, percent: e.completed ? 100 : e.percent }} delay={i} />
            ))}
          </div>
        )
      )}
    </>
  );
}
