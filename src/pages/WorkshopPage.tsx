/**
 * The workshop: local builds only, never in production. A home for quick iteration on the dictionaries
 * and, later, a trace doer driving the engine. Nothing here is published.
 *
 * The grid reuses the Dictionary page's columns (index, network, inspector), so a later tool can take
 * the same position here that its counterpart has there. For now one reserved slip spans all three.
 */
export default function WorkshopPage() {
  return <div className="page workshop-page">
    <h1 id="page-title" tabIndex={-1} className="page-title">Workshop</h1>
    <p className="vd-voice page-lead">Local builds only. Nothing here is published.</p>
    <div className="workshop-grid">
      <div className="workshop-slot"><p className="vd-label">Reserved for local tools.</p></div>
    </div>
  </div>;
}
