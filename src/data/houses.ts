import current from './newton-current-houses.json' with { type: 'json' };
import operational from './newton-operational-houses.json' with { type: 'json' };
import type { House, Structure } from '../houses.ts';

/**
 * Law-houses exported from the VDfirst engine by tools/export_houses.py. The site does not
 * detect laws. Titles are display labels: "Newton I" is the source file's own heading;
 * "Newton II" is the project's usual name for the second law, which the source does not head.
 */
export const houseExports = { 'newton-current': current, 'newton-operational': operational };
const structure = (exported: typeof current | typeof operational): Structure => ({ definitions: exported.definitions, headwordDegrees: exported.headword_degrees });
export const housesByDictionary: Record<string, { houses: House[]; titles: (string | undefined)[]; structure: Structure }> = {
  'newton-current': { houses: current.houses as unknown as House[], titles: ['Newton I', 'Newton II'], structure: structure(current) },
  'newton-operational': { houses: operational.houses as unknown as House[], titles: ['Newton I', 'Newton II'], structure: structure(operational) },
};
