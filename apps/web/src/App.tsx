import { Navigate, Route, Routes } from 'react-router-dom';
import { EvidencePage } from './pages/EvidencePage';
import { HomePage } from './pages/HomePage';
import { ReportsPage } from './pages/ReportsPage';
import { WorkspacePage } from './pages/WorkspacePage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/evidence" element={<EvidencePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
