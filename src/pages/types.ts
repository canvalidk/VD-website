import type { Dispatch } from 'react';
import type { Action, ExplorerState } from '../player';
import type { Route } from '../router';

/**
 * State shared by the Dictionary and Traces pages. The explorer reducer lives in App, above the router,
 * so moving between pages keeps each dictionary's selection and each trace's position for the visit.
 */
export interface ExplorerProps {
  route: Route;
  state: ExplorerState;
  dispatch: Dispatch<Action>;
  /** One definition of the selected headword, when an entry (not just a headword) was chosen. */
  selectedSourceId: string | null;
  setSelectedSourceId: (id: string | null) => void;
  selectedClaimId: string | null;
  setSelectedClaimId: (id: string | null) => void;
  /** Bumped to reset the result view when the correction example is reopened. */
  presentationVisit: number;
}
