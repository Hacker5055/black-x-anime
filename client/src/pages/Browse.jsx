import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { api } from '../api.js';
import ShowCard, { EpisodeTile } from '../components/ShowCard.jsx';
import { ShowSearch } from '../components/Modals.jsx';
import { SkeletonGrid, EmptyState, LiquidLoader } from '../components/Loading.jsx';

export default function Browse() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [latest, setLatest] = useState(null);
  const [latestError, setLatestError] = useState(false);
  const [query, setQuery] = useState(initialQ);

  const runSearch = useCallback(async (q) => {
    if (!q?.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const d = await api.get(`/api/stream/search?q=${encodeURIComponent(q)}`);
      setResults(d.items || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) runSearch(initialQ);
  }, [initialQ, runSearch]);

  const loadLatest = useCallback(() => {
    setLatest(null);
    setLatestError(false);
    api.get('/api/stream/latest')
      .then((d) => setLatest(d.items || []))
      .catch(() => { setLatest([]); setLatestError(true); });
  }, []);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  return (
    <>
      <div className="page-head reveal">
        <h1>⌕ {t('browse.title')}</h1>
        <p>{t('browse.subtitle')}</p>
      </div>

      <div className="filter-bar glass reveal" style={{ gap: '1rem' }}>
        <form
          style={{ display: 'flex', gap: '0.65rem', flex: 1, flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            const q = e.currentTarget.elements.q.value;
            setQuery(q);
            setSearchParams(q ? { q } : {}, { replace: true });
            runSearch(q);
          }}
        >
          <input
            className="input"
            name="q"
            defaultValue={initialQ}
            placeholder={t('browse.searchPh')}
            style={{ flex: 1, minWidth: '220px' }}
          />
          <button type="submit" className="btn btn--primary">
            <span className="btn__shine" />
            {t('common.search')}
          </button>
        </form>
        <span className="chip" style={{ cursor: 'default' }}>⚡ {t('browse.sourceNote')}</span>
      </div>

      {searching && <LiquidLoader />}

      {results && !searching && (
        <section className="section" style={{ marginBlockStart: '1.25rem' }}>
          <div className="section__head">
            <h2 className="section__title">{t('browse.results', { q: query })}</h2>
          </div>
          {results.length === 0 ? (
            <div className="glass">
              <EmptyState icon="🔍" title={t('browse.empty')} />
            </div>
          ) : (
            <div className="grid-anime">
              {results.map((s, i) => (
                <ShowCard key={`${s.kind}-${s.slug}`} show={s} delay={i} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">🔥 {t('browse.latest')}</h2>
        </div>
        {!latest ? (
          <SkeletonGrid count={8} height={280} />
        ) : latestError || latest.length === 0 ? (
          <div className="glass" style={{ padding: '1.5rem' }}>
            <EmptyState icon="📡" title={t('error.upstream')}>
              <button type="button" className="btn btn--ghost" onClick={loadLatest}>{t('common.retry')}</button>
            </EmptyState>
          </div>
        ) : (
          <div className="grid-episodes">
            {latest.map((it, i) => (
              <EpisodeTile key={`${it.slug}-${it.episode}`} item={it} delay={i} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
