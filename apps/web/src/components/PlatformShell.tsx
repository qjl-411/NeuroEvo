import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

type PlatformShellProps = PropsWithChildren<{
  title: string;
  eyebrow: string;
  description: string;
}>;

const navItems = [
  ['/', '首页'],
  ['/workspace', '分析工作台'],
  ['/evidence', '模型证据'],
  ['/reports', '报告中心'],
] as const;

export function PlatformShell({ title, eyebrow, description, children }: PlatformShellProps) {
  return (
    <div className="platform-page">
      <header className="platform-header">
        <NavLink className="platform-brand" to="/">
          <img src="/assets/brand/logo.webp" alt="" />
          <span><strong>NeuroEvo-AD</strong><small>脑影智析平台</small></span>
        </NavLink>
        <nav className="platform-nav" aria-label="平台导航">
          {navItems.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'is-active' : undefined}>{label}</NavLink>
          ))}
        </nav>
        <span className="prototype-badge">RESEARCH PROTOTYPE</span>
      </header>
      <main className="platform-main">
        <section className="page-heading">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </section>
        {children}
      </main>
    </div>
  );
}
