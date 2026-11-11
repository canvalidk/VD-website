import type { Dictionary } from '../data/dictionaries';
import { dictionaries } from '../data/dictionaries';
import { countSentence, dictionaryName } from './format';

/**
 * "According to [dictionary]": every claim on the page is made according to this dictionary.
 * With onChange it is a select; without, the name is plain text (the Traces page, where the trace decides).
 */
export default function AccordingTo({ dictionary, onChange }: { dictionary: Dictionary; onChange?: (id: string) => void }) {
  return <div className="according-to">
    {onChange
      ? <label>According to <select className="vd-select" value={dictionary.id} onChange={event => onChange(event.target.value)}>{dictionaries.map(item => <option key={item.id} value={item.id}>{dictionaryName(item)}</option>)}</select></label>
      : <p className="according-label">According to <span className="according-name">{dictionaryName(dictionary)}</span></p>}
    <p className="according-count">{countSentence(dictionary)}</p>
  </div>;
}
