import { MouseEvent } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '../auth/session';

const navItems = [
  ['/', '首页'],
  ['/workspace', '工作台'],
  ['/reports', '研究中心'],
] as const;

export function BrandBar() {
  const location = useLocation();
  const session = useSession();

  const guardWorkspace = (event: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (to !== '/workspace' || session.isAuthenticated) return;
    event.preventDefault();
    session.openAuth('login', '登录后即可使用 MRI 分析工作台。');
  };

  return (
    <header className="brand-bar">
      <div className="brand-brand">
        <NavLink to="/" className="brand-logo-wrap" style={{ display: 'block' }}>
          <img className="brand-logo" src="/assets/brand/logo.webp" alt="NeuroEvo-AD Logo" />
          <span className="brand-logo-ring" aria-hidden="true"></span>
        </NavLink>
        <div className="brand-text">
          <span className="brand-title">NeuroEvo-AD</span>
          <span className="brand-subtitle">脑影智析平台</span>
        </div>
      </div>

      <nav className="brand-nav" aria-label="主导航">
        {navItems.map(([to, label]) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={(event) => guardWorkspace(event, to)}
              className={`brand-nav-item${isActive ? ' is-active' : ''}`}
            >
              {label}
              <span className="brand-nav-underline"></span>
            </NavLink>
          );
        })}
      </nav>

      <div className="brand-actions">
        <button className="brand-icon-btn" type="button" aria-label="搜索" onClick={session.openSearch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="16.5" y1="16.5" x2="21" y2="21"></line>
          </svg>
        </button>
        <button className="brand-icon-btn has-dot" type="button" aria-label="通知" onClick={session.openNotifications}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className={`brand-notif-dot${session.unreadNotifications ? '' : ' is-read'}`} aria-hidden="true"></span>
        </button>
        <div className="brand-divider" aria-hidden="true"></div>
        <button className="brand-user-btn" type="button" aria-label="用户菜单" onClick={session.openAccount}>
          <span className="brand-user-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"></path>
            </svg>
          </span>
          <span className="brand-user-info">
            <span className="brand-user-name">{session.user?.name ?? '访客'}</span>
            <span className="brand-user-role">{session.user?.role ?? '游客浏览'}</span>
          </span>
          <svg className="brand-user-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </header>
  );
}
