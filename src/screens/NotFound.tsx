import { navigate } from '../lib/router';

export function NotFound() {
  return (
    <div className="screen center-screen">
      <div className="empty">
        <div className="empty-icon">🧭</div>
        <h2>Nothing here</h2>
        <p className="muted">That page doesn’t exist — maybe it moved in an update.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>
          Go home
        </button>
      </div>
    </div>
  );
}
