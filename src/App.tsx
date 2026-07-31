import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { SyncProvider } from './hooks/useSync';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import HomePage from './pages/HomePage';
import ExamPage from './pages/ExamPage';
import ResumePage from './pages/ResumePage';
import CertificatePage from './pages/CertificatePage';
import ExperiencePage from './pages/ExperiencePage';
import ProjectPage from './pages/ProjectPage';
import SnippetPage from './pages/SnippetPage';
import JobsPage from './pages/JobsPage';
import './styles/theme.css';

function App() {
  return (
    <ThemeProvider>
      <SyncProvider>
        <HashRouter>
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/exam/*" element={<ExamPage />} />
                <Route path="/resume" element={<ResumePage />} />
                <Route path="/resume/certificates" element={<CertificatePage />} />
                <Route path="/resume/experiences" element={<ExperiencePage />} />
                <Route path="/resume/projects" element={<ProjectPage />} />
                <Route path="/resume/snippets" element={<SnippetPage />} />
                <Route path="/jobs/*" element={<JobsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <TabBar />
          </div>
        </HashRouter>
      </SyncProvider>
    </ThemeProvider>
  );
}

export default App;
