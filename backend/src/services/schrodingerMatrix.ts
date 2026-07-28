/**
 * Quantum Matrix classification.
 * Prefer rules-as-data via classifyMatrixWithRules; classifyMatrix kept for unit tests.
 */
export {
  classifyMatrix,
  classifyMatrixWithRules,
  loadRules,
  defaultRulesPath,
  ruleFires,
} from './schrodinger/rules/engine.js';
export type { SchrodingerRule, RulesDocument } from './schrodinger/rules/engine.js';
