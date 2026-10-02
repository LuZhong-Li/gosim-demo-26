import { Link, Route, Routes } from 'react-router-dom';
import WorkbookHomePage from './pages/WorkbookHomePage';
import WorkbookEditorPage from './pages/WorkbookEditorPage';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Sheets
        </Link>
        <nav>
          <Link to="/">Workbooks</Link>
        </nav>
      </header>
      <main className="page">
        <Routes>
          <Route path="/" element={<WorkbookHomePage />} />
          <Route path="/workbooks" element={<WorkbookHomePage />} />
          <Route path="/workbooks/:id" element={<WorkbookEditorPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
