import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/session';
import sceneMarkup from '../landing/scene.html?raw';
import { initLandingScene } from '../landing/index.js';
import '../landing/landing-scene.css';

export function HomePage() {
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => initLandingScene(), []);

  useEffect(() => {
    const userName = document.querySelector<HTMLElement>('.brand-user-name');
    const userRole = document.querySelector<HTMLElement>('.brand-user-role');
    if (userName) userName.textContent = session.user?.name ?? '访客';
    if (userRole) userRole.textContent = session.user?.role ?? '游客浏览';
    const dot = document.querySelector<HTMLElement>('.brand-notif-dot');
    dot?.classList.toggle('is-read', !session.unreadNotifications);
  }, [session.user, session.unreadNotifications]);

  useEffect(() => {
    const handleRoute = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const actionTarget = element?.closest<HTMLElement>('[data-shell-action]');
      const action = actionTarget?.dataset.shellAction;
      if (action) {
        event.preventDefault();
        if (action === 'search') session.openSearch();
        else if (action === 'notifications') session.openNotifications();
        else if (action === 'account') session.openAccount();
        return;
      }

      const target = element?.closest<HTMLElement>('[data-app-route]');
      const route = target?.dataset.appRoute;
      if (!route) return;
      event.preventDefault();
      if (route === '/workspace' && !session.isAuthenticated) {
        session.openAuth('login', '登录后即可使用 MRI 分析工作台。');
        return;
      }
      navigate(route);
    };

    document.addEventListener('click', handleRoute);
    return () => document.removeEventListener('click', handleRoute);
  }, [navigate, session]);

  return <div dangerouslySetInnerHTML={{ __html: sceneMarkup }} />;
}
