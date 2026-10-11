/**
 * Account Center — gamification, follow, customization, creator & support
 * features in one glass-styled page (bilingual).
 */
import React from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import {
  GamificationPanel,
  FollowPanel,
  CustomizePanel,
  CreatorPanel,
  SupportPanel
} from '../components/Features.jsx';

export default function Account() {
  const { t } = useI18n();

  return (
    <>
      <header className="section__head" style={{ marginBlockEnd: '1.25rem' }}>
        <div>
          <h1 className="section__title" style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.35rem)' }}>
            ⚙ {t('account.title')}
          </h1>
          <p className="section__sub">{t('account.subtitle')}</p>
        </div>
      </header>

      <div className="fx-grid">
        <GamificationPanel />
        <FollowPanel />
        <CustomizePanel />
        <CreatorPanel />
        <SupportPanel />
      </div>
    </>
  );
}
