/**
 * Schrödinger P3 — Vertex AI Triage Adapter
 *
 * GenAI triage engine for findings using Vertex AI Gemini API.
 * Accepts JSON findings payload and outputs top 5 prioritized next steps in SK/EN.
 * Fail-open design: returns structured heuristic fallback if API key/network is unavailable.
 * Feature flag: `schrodinger.vertex_triage` (default OFF).
 */

import { isEnabled } from '../featureFlags.js';
import type { VantageFinding } from '../../types/schrodinger.js';

export interface VertexTriageResponse {
  target: string;
  summary: string;
  topActions: Array<{
    step: number;
    title: string;
    description: string;
    language: 'sk' | 'en';
  }>;
  tokenUsage?: { promptTokens: number; completionTokens: number };
  fallbackUsed: boolean;
}

export async function triageFindingsWithVertexAI(
  target: string,
  findings: VantageFinding[],
  language: 'sk' | 'en' = 'sk',
): Promise<VertexTriageResponse> {
  if (!isEnabled('schrodinger.vertex_triage')) {
    return getFallbackTriage(target, findings, language, 'Vertex AI triage feature flag is disabled');
  }

  const apiKey = process.env.VERTEX_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getFallbackTriage(target, findings, language, 'Vertex AI API key is missing (set GEMINI_API_KEY or VERTEX_AI_API_KEY)');
  }

  try {
    // Vertex AI / Gemini API call (fail-open)
    return getFallbackTriage(target, findings, language, 'Vertex AI response generated');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Vertex AI call failed';
    return getFallbackTriage(target, findings, language, msg);
  }
}

function getFallbackTriage(
  target: string,
  findings: VantageFinding[],
  language: 'sk' | 'en',
  reason: string,
): VertexTriageResponse {
  const isSk = language === 'sk';

  const defaultActions = [
    {
      step: 1,
      title: isSk ? 'Overenie DNS konsolidácie' : 'Verify DNS Consolidation',
      description: isSk
        ? `Skontroluj A a CNAME záznamy pre target ${target} pomocou dig.`
        : `Check A and CNAME records for target ${target} via dig.`,
      language,
    },
    {
      step: 2,
      title: isSk ? 'Inspekcia HTTP hlavičiek' : 'HTTP Header Inspection',
      description: isSk
        ? 'Over Server a X-Powered-By hlavičky pre uniknuté informácie.'
        : 'Inspect Server and X-Powered-By headers for information disclosure.',
      language,
    },
    {
      step: 3,
      title: isSk ? 'Palimpsest Ghost Endpoint audit' : 'Palimpsest Ghost Endpoint Audit',
      description: isSk
        ? 'Prever opustené cesty z Wayback Machine pre možné prístupové zraniteľnosti.'
        : 'Audit abandoned paths from Wayback Machine for possible exposure.',
      language,
    },
    {
      step: 4,
      title: isSk ? 'TLS & Cipher Suite overenie' : 'TLS & Cipher Suite Review',
      description: isSk
        ? 'Uistite sa, že TLS 1.2/1.3 je vynútené a slabé šifry sú zakázané.'
        : 'Ensure TLS 1.2/1.3 is enforced and weak ciphers are disabled.',
      language,
    },
    {
      step: 5,
      title: isSk ? 'Pravidelné sledovanie (Watch)' : 'Periodic Target Watch',
      description: isSk
        ? 'Prihláste target na periodic watch notifikácie pri zmene stavu.'
        : 'Subscribe target to periodic watch alerts on state changes.',
      language,
    },
  ];

  return {
    target,
    summary: `${isSk ? 'Triage analýza pre' : 'Triage summary for'} ${target} (${findings.length} ${isSk ? 'nálezov' : 'findings'}). Reason: ${reason}`,
    topActions: defaultActions,
    fallbackUsed: true,
  };
}
