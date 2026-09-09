import { dictionaries } from './data/dictionaries.ts';
import { traces } from './data/traces.ts';
export interface Session { traceId: string; stepIndex: number; selectedEntryId: string; playing: boolean }
export interface ExplorerState { dictionaryId: string; sessions: Record<string, Session> }
export type Action = { type: 'dictionary'; id: string } | { type: 'entry'; id: string } | { type: 'trace'; id: string } | { type: 'seek'; index: number } | { type: 'toggle' | 'pause' | 'restart' | 'tick' };
export const initialState: ExplorerState = {
  dictionaryId: dictionaries[0].id,
  sessions: Object.fromEntries(dictionaries.map(dictionary => {
    const trace = traces.find(item => item.dictionaryId === dictionary.id)!;
    return [dictionary.id, { traceId: trace.id, stepIndex: 0, selectedEntryId: trace.steps[0].relatedEntryIds[0], playing: false }];
  })),
};
export function explorerReducer(state: ExplorerState, action: Action): ExplorerState {
  const current = state.sessions[state.dictionaryId];
  const trace = traces.find(item => item.id === current.traceId)!;
  const update = (session: Session): ExplorerState => ({ ...state, sessions: { ...state.sessions, [state.dictionaryId]: session } });
  const seek = (index: number, playing = false): ExplorerState => {
    if (!Number.isInteger(index) || index < 0 || index >= trace.steps.length) return state;
    return update({ ...current, stepIndex: index, selectedEntryId: trace.steps[index].relatedEntryIds[0], playing: playing && index < trace.steps.length - 1 });
  };
  switch (action.type) {
    case 'dictionary':
      if (!state.sessions[action.id]) return state;
      return { dictionaryId: action.id, sessions: { ...state.sessions, [state.dictionaryId]: { ...current, playing: false }, [action.id]: { ...state.sessions[action.id], playing: false } } };
    case 'entry':
      if (!dictionaries.find(item => item.id === state.dictionaryId)!.entries.some(entry => entry.id === action.id)) return state;
      return update({ ...current, selectedEntryId: action.id, playing: false });
    case 'trace': {
      const next = traces.find(item => item.id === action.id && item.dictionaryId === state.dictionaryId);
      return next ? update({ traceId: next.id, stepIndex: 0, selectedEntryId: next.steps[0].relatedEntryIds[0], playing: false }) : state;
    }
    case 'seek': return seek(action.index);
    case 'toggle': return current.playing ? update({ ...current, playing: false }) : seek(current.stepIndex === trace.steps.length - 1 ? 0 : current.stepIndex, true);
    case 'pause': return current.playing ? update({ ...current, playing: false }) : state;
    case 'restart': return seek(0);
    case 'tick': return current.playing ? seek(current.stepIndex + 1, true) : state;
  }
}
