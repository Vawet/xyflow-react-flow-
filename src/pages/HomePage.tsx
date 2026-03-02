import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-header">
        <h1 className="home-title">Canvas Performance Test</h1>
        <p className="home-subtitle">Compare DOM vs GPU rendering for large-scale node graphs</p>
      </div>
      <div className="home-cards">
        <Link to="/react-flow" className="home-card">
          <div className="card-icon rf-icon">RF</div>
          <h2>React Flow</h2>
          <p>DOM-based rendering via @xyflow/react. Nodes are HTML elements with CSS styling.</p>
          <div className="card-tags">
            <span>DOM</span>
            <span>HTML/CSS</span>
            <span>SVG Edges</span>
          </div>
          <div className="card-limit">Up to 2,000 nodes</div>
        </Link>
        <Link to="/pixi" className="home-card">
          <div className="card-icon pixi-icon">PX</div>
          <h2>PixiJS v8</h2>
          <p>GPU-accelerated Canvas rendering. Nodes drawn via WebGPU/WebGL with manual viewport.</p>
          <div className="card-tags">
            <span>WebGPU</span>
            <span>WebGL</span>
            <span>Canvas</span>
          </div>
          <div className="card-limit">Up to 5,000 nodes</div>
        </Link>
      </div>
    </div>
  );
}
