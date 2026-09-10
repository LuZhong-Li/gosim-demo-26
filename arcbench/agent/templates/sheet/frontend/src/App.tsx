import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SheetPage from './pages/SheetPage';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Sheets Clone
        </Link>
        <nav>
          <Link to="/">Workbooks</Link>
        </nav>
      </header>
      <main className="page wide">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workbooks/:id" element={<SheetPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
