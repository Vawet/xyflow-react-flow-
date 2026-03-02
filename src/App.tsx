import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReactFlowPage from './pages/ReactFlowPage';
import PixiPage from './pages/PixiPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/react-flow" element={<ReactFlowPage />} />
        <Route path="/pixi" element={<PixiPage />} />
      </Routes>
    </BrowserRouter>
  );
}
