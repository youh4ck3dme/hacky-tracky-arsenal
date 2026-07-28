/**
 * Schrödinger P2 — Arsenal Tool Bridge
 *
 * Maps finding rule IDs and vantage types to suggested Arsenal modules/tools.
 * CRITICAL SECURITY RULE: NEVER automatically run tools.
 * Suggested tools are presented in UI for manual review and draft job context only.
 */

export interface ToolSuggestion {
  ruleId: string;
  suggestedModule: string;
  displayName: string;
  category: 'dns' | 'web' | 'recon' | 'port';
  reason: string;
  defaultParams?: Record<string, unknown>;
}

const TOOL_MAPPINGS: Record<string, ToolSuggestion> = {
  'dns-wildcard-inconsistency': {
    ruleId: 'dns-wildcard-inconsistency',
    suggestedModule: 'dig',
    displayName: 'Dig DNS Inspect',
    category: 'dns',
    reason: 'Viacero odlišných A-záznamov naznačuje split-horizon DNS alebo GeoDNS CDN.',
  },
  'dns-doh-mismatch': {
    ruleId: 'dns-doh-mismatch',
    suggestedModule: 'dig',
    displayName: 'Dig Trace',
    category: 'dns',
    reason: 'Rozdiel medzi klasickým DNS a DoH resolvermi.',
  },
  'ua-header-leak': {
    ruleId: 'ua-header-leak',
    suggestedModule: 'curl',
    displayName: 'Curl Header Inspection',
    category: 'web',
    reason: 'Server hlavičky odhaľujú presnú verziu alebo vnútorné technológie.',
  },
  'netweb-open-port': {
    ruleId: 'netweb-open-port',
    suggestedModule: 'nmap',
    displayName: 'Nmap Port Scan',
    category: 'port',
    reason: 'Detegované otvorené porty vyžadujú hlbšiu služobnú identifikáciu.',
  },
  'temporal-ghost-path': {
    ruleId: 'temporal-ghost-path',
    suggestedModule: 'ffuf',
    displayName: 'ffuf Directory Fuzzer',
    category: 'recon',
    reason: 'Historicky existujúca cesta (Wayback) bola opustená a môže predstavovať ghost endpoint.',
  },
};

/**
 * Get tool suggestion for a finding based on rule_id or finding ID.
 */
export function getToolSuggestion(ruleId: string): ToolSuggestion | null {
  if (TOOL_MAPPINGS[ruleId]) {
    return TOOL_MAPPINGS[ruleId];
  }

  // Fallback by prefix/category
  if (ruleId.startsWith('dns-')) {
    return {
      ruleId,
      suggestedModule: 'dig',
      displayName: 'Dig Resolver Check',
      category: 'dns',
      reason: 'Odporúčaný DNS prieskumný nástroj.',
    };
  }
  if (ruleId.startsWith('ua-') || ruleId.startsWith('netweb-')) {
    return {
      ruleId,
      suggestedModule: 'curl',
      displayName: 'Curl HTTP Probe',
      category: 'web',
      reason: 'Odporúčaný HTTP verifikačný nástroj.',
    };
  }

  return null;
}
