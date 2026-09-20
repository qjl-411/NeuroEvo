import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAccount, SessionProvider } from './auth/session';
import { EvidencePage } from './pages/EvidencePage';
import { HomePage } from './pages/HomePage';
import { LiteratureSearchPage } from './pages/LiteratureSearchPage';
import { ReportsPage } from './pages/ReportsPage';
import { WorkspacePage } from './pages/WorkspacePage';

export function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/workspace"
          element={<RequireAccount featureName="MRI 分析工作台"><WorkspacePage /></RequireAccount>}
        />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/reports/search"
          element={<RequireAccount featureName="研究文献检索"><LiteratureSearchPage /></RequireAccount>}
        />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}
