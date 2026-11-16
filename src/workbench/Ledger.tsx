import { BRACES_SCHEMA, KIND_LABELS, issuedResults, kindDescription, kindLabel, support } from './record.ts';
import type { CandidateKind, Prediction, Snapshot, TraceRecord } from './record.ts';

/**
 * The record's own list of steps, as the engine lists them: every step, unsorted and unpruned,
 * split only by whether the root's result rests on it now. Issued results are listed apart, each
 * with the steps it rested on when it was issued. Sorting into theory and members is a later layer.
 */
export default function Ledger({ record, snapshot }: { record: TraceRecord; snapshot: Snapshot }) {
  const set = snapshot.prediction_set;
  const { current, history } = support(set);
  const issued = issuedResults(set);
  const byId = new Map(set.predictions.map(item => [item.id, item]));
  const schema = set.schema_version;
  return <section className="wk-ledger" aria-labelledby="wk-ledger-title">
    <h2 id="wk-ledger-title">The record</h2>

    {!!issued.length && <div className="wk-ledger-part">
      <h3>Issued {issued.length === 1 ? 'result' : `results (${issued.length})`}</h3>
      <ol className="wk-issued">
        {issued.map(item => <li key={item.id} className="wk-issued-item">
          <p><span className="wk-step-id">{item.id}</span> <span className="vd-string wk-issued-result">{item.result}</span></p>
          <p className="vd-label">rested on {item.prediction_ids.map(id => `${id} (${byId.get(id) ? kindLabel(byId.get(id)!.kind, schema) : 'not listed'})`).join(', ')}{item.dependency_selection_complete ? '' : '; some steps may be missing'}</p>
        </li>)}
      </ol>
    </div>}

    <div className="wk-ledger-part">
      <h3>What the root's result rests on now ({current.length})</h3>
      <StepList steps={current} schema={schema}/>
    </div>
    {!!history.length && <div className="wk-ledger-part">
      <h3>History: not under the result now ({history.length})</h3>
      <StepList steps={history} schema={schema} muted/>
    </div>}

    <details className="wk-details">
      <summary>What the kinds mean</summary>
      <dl className="wk-kinds">{(Object.keys(KIND_LABELS) as CandidateKind[]).map(kind => <div key={kind}>
        <dt>{kindLabel(kind, schema)}</dt><dd>{kindDescription(kind, schema)}.</dd>
      </div>)}</dl>
      {schema >= BRACES_SCHEMA
        ? <p className="vd-label">In the quoted text a bare headword is still to be expanded, and braces stand round one that has been dealt with: expanded, or left unexpanded. A value is a wording said to mean the same as a definition's text, so it is listed as same meaning.</p>
        : <p className="vd-label">This record was made before schema {BRACES_SCHEMA}. In its quoted text an open headword reads in braces, and a supplied input may be a value.</p>}
    </details>
    <details className="wk-details">
      <summary>What this list is not</summary>
      <ul className="vd-voice">{set.limitations.map((line, i) => <li key={i}>{line}</li>)}</ul>
      <p className="vd-label">Every statement is unchecked: the engine records what was done and makes no verdict.</p>
    </details>
    <details className="wk-details">
      <summary>Record identity</summary>
      <dl className="wk-identity">
        <div><dt>Record</dt><dd className="wk-code">{record.record_id}</dd></div>
        <div><dt>Dictionary</dt><dd><span className="vd-string">{record.dictionary.name}</span>, {record.dictionary.entries.length} entries</dd></div>
        <div><dt>Engine fingerprint</dt><dd className="wk-code">{record.producer.engine_sha256}</dd></div>
        <div><dt>Prediction-set schema</dt><dd>{set.schema_version}</dd></div>
      </dl>
    </details>
  </section>;
}

function StepList({ steps, schema, muted = false }: { steps: Prediction[]; schema: number; muted?: boolean }) {
  return <ol className={'wk-steps-list' + (muted ? ' is-history' : '')}>
    {steps.map(step => <li key={step.id} className="wk-step-item">
      <span className="wk-step-id">{step.id}</span>
      <span className="wk-step-kind">{kindLabel(step.kind, schema)}</span>
      <span className="wk-step-statement vd-string">{step.statement}</span>
    </li>)}
  </ol>;
}
