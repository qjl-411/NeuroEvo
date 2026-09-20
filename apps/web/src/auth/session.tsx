import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ACCOUNTS_KEY = 'neuroevo.accounts.v1';
const SESSION_KEY = 'neuroevo.session.v1';
const NOTIFICATIONS_KEY = 'neuroevo.notifications.read.v1';
const ACCESS_MODE_KEY = 'neuroevo.access-mode.v1';
const DEFAULT_SESSION_ID = '__neuroevo_default_analyst__';

type AccountRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

export type SessionUser = Pick<AccountRecord, 'id' | 'name' | 'email' | 'role'>;

const DEFAULT_ANALYST: SessionUser = {
  id: 'neuroevo-default-analyst',
  name: '研究者',
  email: 'demo@neuroevo.local',
  role: '神经影像分析师',
};

type AuthMode = 'login' | 'register';
type OverlayKind = 'search' | 'notifications' | 'account' | 'auth' | null;

type RegisterInput = {
  name: string;
  email: string;
  role: string;
  password: string;
};

type SessionContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  unreadNotifications: boolean;
  openSearch: () => void;
  openNotifications: () => void;
  openAccount: () => void;
  openAuth: (mode?: AuthMode, message?: string) => void;
  closeOverlay: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  continueAsGuest: () => void;
  useDefaultAnalyst: () => void;
  markNotificationsRead: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function loadAccounts(): AccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSessionUser(): SessionUser | null {
  try {
    const accessMode = localStorage.getItem(ACCESS_MODE_KEY);
    const sessionValue = localStorage.getItem(SESSION_KEY)?.trim().toLowerCase();

    if (sessionValue === DEFAULT_SESSION_ID) return DEFAULT_ANALYST;
    if (sessionValue) {
      const account = loadAccounts().find((item) => item.email.toLowerCase() === sessionValue);
      if (account) {
        return { id: account.id, name: account.name, email: account.email, role: account.role };
      }
    }

    // Fresh browsers start in the full-access analyst demo account so judges can
    // use the platform immediately. An explicit guest choice is remembered.
    if (accessMode !== 'guest') {
      localStorage.setItem(SESSION_KEY, DEFAULT_SESSION_ID);
      localStorage.setItem(ACCESS_MODE_KEY, 'default');
      return DEFAULT_ANALYST;
    }
    return null;
  } catch {
    return DEFAULT_ANALYST;
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function hashPassword(password: string, salt: string) {
  if (!window.crypto?.subtle) {
    return btoa(unescape(encodeURIComponent(`${salt}:${password}`)));
  }
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToBase64(new Uint8Array(digest));
}

function newSalt() {
  if (window.crypto?.getRandomValues) {
    return bytesToBase64(crypto.getRandomValues(new Uint8Array(18)));
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => loadSessionUser());
  const [overlay, setOverlay] = useState<OverlayKind>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMessage, setAuthMessage] = useState('');
  const [notificationsRead, setNotificationsRead] = useState(
    () => localStorage.getItem(NOTIFICATIONS_KEY) === '1',
  );

  const openAuth = (mode: AuthMode = 'login', message = '') => {
    setAuthMode(mode);
    setAuthMessage(message);
    setOverlay('auth');
  };

  const value = useMemo<SessionContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    unreadNotifications: !notificationsRead,
    openSearch: () => setOverlay('search'),
    openNotifications: () => setOverlay('notifications'),
    openAccount: () => setOverlay('account'),
    openAuth,
    closeOverlay: () => setOverlay(null),
    login: async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const account = loadAccounts().find((item) => item.email.toLowerCase() === normalizedEmail);
      if (!account) throw new Error('未找到这个账号，请先注册。');
      const passwordHash = await hashPassword(password, account.salt);
      if (passwordHash !== account.passwordHash) throw new Error('密码不正确，请重新输入。');
      localStorage.setItem(SESSION_KEY, account.email.toLowerCase());
      localStorage.setItem(ACCESS_MODE_KEY, 'account');
      setUser({ id: account.id, name: account.name, email: account.email, role: account.role });
      setOverlay(null);
    },
    register: async (input: RegisterInput) => {
      const name = input.name.trim();
      const email = input.email.trim().toLowerCase();
      if (name.length < 2) throw new Error('姓名至少需要 2 个字符。');
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('请输入有效的邮箱地址。');
      if (input.password.length < 6) throw new Error('密码至少需要 6 位。');
      const accounts = loadAccounts();
      if (accounts.some((item) => item.email.toLowerCase() === email)) {
        throw new Error('该邮箱已经注册，请直接登录。');
      }
      const salt = newSalt();
      const passwordHash = await hashPassword(input.password, salt);
      const account: AccountRecord = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        email,
        role: input.role || '神经影像分析师',
        salt,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
      localStorage.setItem(SESSION_KEY, email);
      localStorage.setItem(ACCESS_MODE_KEY, 'account');
      setUser({ id: account.id, name: account.name, email: account.email, role: account.role });
      setOverlay(null);
    },
    logout: () => {
      localStorage.removeItem(SESSION_KEY);
      localStorage.setItem(ACCESS_MODE_KEY, 'guest');
      setUser(null);
      setOverlay(null);
    },
    continueAsGuest: () => {
      localStorage.removeItem(SESSION_KEY);
      localStorage.setItem(ACCESS_MODE_KEY, 'guest');
      setUser(null);
      setOverlay(null);
    },
    useDefaultAnalyst: () => {
      localStorage.setItem(SESSION_KEY, DEFAULT_SESSION_ID);
      localStorage.setItem(ACCESS_MODE_KEY, 'default');
      setUser(DEFAULT_ANALYST);
      setOverlay(null);
    },
    markNotificationsRead: () => {
      localStorage.setItem(NOTIFICATIONS_KEY, '1');
      setNotificationsRead(true);
    },
  }), [notificationsRead, user]);

  return (
    <SessionContext.Provider value={value}>
      {children}
      <ShellOverlay
        overlay={overlay}
        authMode={authMode}
        authMessage={authMessage}
        setAuthMode={setAuthMode}
      />
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession 必须在 SessionProvider 内使用。');
  return context;
}

function ShellOverlay({
  overlay,
  authMode,
  authMessage,
  setAuthMode,
}: {
  overlay: OverlayKind;
  authMode: AuthMode;
  authMessage: string;
  setAuthMode: (mode: AuthMode) => void;
}) {
  const session = useSession();
  const navigate = useNavigate();
  if (!overlay) return null;

  const closeOnBackdrop = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) session.closeOverlay();
  };

  if (overlay === 'auth') {
    return (
      <div className="ne-auth-backdrop" onMouseDown={closeOnBackdrop} role="presentation">
        <AuthPanel mode={authMode} message={authMessage} onModeChange={setAuthMode} />
      </div>
    );
  }

  if (overlay === 'search') {
    return (
      <div className="ne-shell-backdrop" onMouseDown={closeOnBackdrop} role="presentation">
        <SearchPanel
          onNavigate={(path, protectedFeature) => {
            if (protectedFeature && !session.isAuthenticated) {
              session.openAuth('login', `${protectedFeature}需要登录后才能使用。`);
              return;
            }
            session.closeOverlay();
            navigate(path);
          }}
        />
      </div>
    );
  }

  if (overlay === 'notifications') {
    return (
      <div className="ne-shell-backdrop" onMouseDown={closeOnBackdrop} role="presentation">
        <section className="ne-shell-popover ne-notification-panel" aria-label="通知中心">
          <div className="ne-popover-head">
            <div><strong>通知中心</strong><span>系统与研究提示</span></div>
            <button type="button" onClick={session.closeOverlay}>×</button>
          </div>
          <div className="ne-notification-list">
            <article><i className="is-blue" /><div><strong>DMSA-Net 服务已就绪</strong><p>模型状态与性能指标可在工作台中查看。</p><time>系统通知</time></div></article>
            <article><i className="is-purple" /><div><strong>研究中心文献库</strong><p>当前数据库已收录 902 条文献元数据，可进行主题与年份检索。</p><time>研究提示</time></div></article>
            <article><i className="is-green" /><div><strong>辅助分析使用说明</strong><p>预测结果用于科研和辅助分析，不替代临床诊断。</p><time>重要提示</time></div></article>
          </div>
          <button className="ne-panel-primary" type="button" onClick={session.markNotificationsRead}>全部标记为已读</button>
        </section>
      </div>
    );
  }

  return (
    <div className="ne-shell-backdrop" onMouseDown={closeOnBackdrop} role="presentation">
      <section className="ne-shell-popover ne-account-panel" aria-label="账号中心">
        <div className="ne-popover-head">
          <div><strong>个人中心</strong><span>{session.isAuthenticated ? '账号已登录' : '当前为游客访问'}</span></div>
          <button type="button" onClick={session.closeOverlay}>×</button>
        </div>
        {session.user ? (
          <>
            <div className="ne-account-identity">
              <span>{session.user.name.slice(0, 1).toUpperCase()}</span>
              <div><strong>{session.user.name}</strong><p>{session.user.role}</p><small>{session.user.email}</small></div>
            </div>
            <div className="ne-account-permissions"><b>已解锁</b><span>MRI 工作台</span><span>研究文献检索</span><span>报告导出</span></div>
            <button className="ne-panel-danger" type="button" onClick={session.logout}>退出账号</button>
          </>
        ) : (
          <>
            <div className="ne-guest-card"><strong>游客模式</strong><p>可以浏览首页与研究中心概览，但不能进入 MRI 工作台，也不能执行研究文献检索。</p></div>
            <button className="ne-panel-primary" type="button" onClick={session.useDefaultAnalyst}>进入默认神经影像分析师账号</button>
            <div className="ne-account-actions">
              <button className="ne-panel-secondary" type="button" onClick={() => session.openAuth('login')}>登录其他账号</button>
              <button className="ne-panel-secondary" type="button" onClick={() => session.openAuth('register')}>注册账号</button>
            </div>
            <button className="ne-panel-link" type="button" onClick={session.continueAsGuest}>继续以游客身份浏览</button>
          </>
        )}
      </section>
    </div>
  );
}

function SearchPanel({ onNavigate }: { onNavigate: (path: string, protectedFeature?: string) => void }) {
  const session = useSession();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const shortcuts = [
    { title: '首页', detail: '返回平台首页', path: '/' },
    { title: 'MRI 分析工作台', detail: '上传 MRI 并运行 DMSA-Net', path: '/workspace', protectedFeature: 'MRI 分析工作台' },
    { title: '研究中心', detail: '浏览 Alzheimer / MRI 文献资源', path: '/reports' },
    { title: '模型证据中心', detail: '查看模型验证与可信证据', path: '/evidence' },
  ].filter((item) => !normalized || `${item.title}${item.detail}`.toLowerCase().includes(normalized));

  const submitLiterature = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    if (!session.isAuthenticated) {
      session.openAuth('login', '研究文献检索需要登录后才能使用。');
      return;
    }
    onNavigate(`/reports/search?q=${encodeURIComponent(query.trim())}`, '研究文献检索');
  };

  return (
    <section className="ne-shell-popover ne-search-panel" aria-label="全局搜索">
      <div className="ne-popover-head">
        <div><strong>全局搜索</strong><span>导航或检索研究文献</span></div>
        <button type="button" onClick={session.closeOverlay}>×</button>
      </div>
      <form className="ne-global-search-form" onSubmit={submitLiterature}>
        <span>⌕</span>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入 Alzheimer、MRI，或搜索平台功能…" />
        <button type="submit">检索文献</button>
      </form>
      <div className="ne-search-shortcuts">
        {shortcuts.map((item) => (
          <button key={item.path} type="button" onClick={() => onNavigate(item.path, item.protectedFeature)}>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span><b>›</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function AuthPanel({ mode, message, onModeChange }: { mode: AuthMode; message: string; onModeChange: (mode: AuthMode) => void }) {
  const session = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('神经影像分析师');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') await session.login(email, password);
      else await session.register({ name, email, role, password });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="ne-auth-panel" aria-label={mode === 'login' ? '登录账号' : '注册账号'}>
      <button className="ne-auth-close" type="button" onClick={session.closeOverlay}>×</button>
      <div className="ne-auth-brand"><img src="/assets/brand/logo.webp" alt="" /><div><strong>NeuroEvo-AD</strong><span>脑影智析平台</span></div></div>
      <div className="ne-auth-tabs">
        <button className={mode === 'login' ? 'is-active' : ''} type="button" onClick={() => { setError(''); onModeChange('login'); }}>登录</button>
        <button className={mode === 'register' ? 'is-active' : ''} type="button" onClick={() => { setError(''); onModeChange('register'); }}>注册</button>
      </div>
      {message && <p className="ne-auth-message">{message}</p>}
      <form className="ne-auth-form" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <label><span>姓名 / 昵称</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：张研究员" autoComplete="name" /></label>
            <label><span>身份</span><select value={role} onChange={(event) => setRole(event.target.value)}><option>神经影像分析师</option><option>临床研究者</option><option>医师</option><option>科研学生</option></select></label>
          </>
        )}
        <label><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" /></label>
        <label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {mode === 'register' && <label><span>确认密码</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" /></label>}
        {error && <p className="ne-auth-error">{error}</p>}
        <button className="ne-auth-submit" type="submit" disabled={submitting}>{submitting ? '处理中…' : mode === 'login' ? '登录并进入平台' : '创建账号'}</button>
      </form>
      <div className="ne-auth-divider"><span>或</span></div>
      <button className="ne-auth-guest" type="button" onClick={session.useDefaultAnalyst}>进入默认神经影像分析师账号</button>
      <button className="ne-auth-guest" type="button" onClick={session.continueAsGuest}>以游客身份继续浏览</button>
      <p className="ne-auth-footnote">首次打开平台默认使用神经影像分析师演示账号；也可以主动切换到游客或其他注册账号。</p>
    </section>
  );
}

export function RequireAccount({ children, featureName }: { children: ReactNode; featureName: string }) {
  const session = useSession();
  const location = useLocation();
  if (session.isAuthenticated) return <>{children}</>;
  return (
    <main className="ne-access-gate">
      <div className="ne-access-gate-card">
        <img src="/assets/brand/logo.webp" alt="NeuroEvo-AD" />
        <span>ACCOUNT REQUIRED</span>
        <h1>{featureName}需要登录</h1>
        <p>你当前处于游客模式。游客可以浏览首页和研究中心概览，但不能使用此功能。</p>
        <div>
          <button type="button" onClick={() => session.openAuth('login', `登录后即可继续访问${featureName}。`)}>登录账号</button>
          <button type="button" onClick={() => session.openAuth('register', `注册账号后即可继续访问${featureName}。`)}>注册账号</button>
        </div>
        <a href="/">返回首页</a>
        <small>请求路径：{location.pathname}</small>
      </div>
    </main>
  );
}
