import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ReactFlowPage from './pages/ReactFlowPage';
import ReactFlowNativePage from './pages/ReactFlowNativePage';
import PixiPage from './pages/PixiPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/react-flow" element={<ReactFlowPage />} />
        <Route path="/react-flow-native" element={<ReactFlowNativePage />} />
        <Route path="/pixi" element={<PixiPage />} />
      </Routes>
    </BrowserRouter>
  );
}
