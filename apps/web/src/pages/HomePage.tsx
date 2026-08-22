import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sceneMarkup from '../landing/scene.html?raw';
import { initLandingScene } from '../landing/index.js';
import '../landing/landing-scene.css';

export function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const cleanupScene = initLandingScene();

    const handleRoute = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-app-route]') : null;
      const route = target?.dataset.appRoute;
      if (!route) return;
      event.preventDefault();
      navigate(route);
    };

    document.addEventListener('click', handleRoute);
    return () => {
      document.removeEventListener('click', handleRoute);
      cleanupScene();
    };
  }, [navigate]);

  return <div dangerouslySetInnerHTML={{ __html: sceneMarkup }} />;
}
