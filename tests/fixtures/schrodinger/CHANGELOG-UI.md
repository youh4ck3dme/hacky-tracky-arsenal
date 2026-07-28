# Schrödinger P1 — čo user uvidí v UI

## Headline

- **risk_score 0–100** v Quantum Matrix (badge vpravo) a v riadku statusu po dokončení (`risk N/100`).
- Mode badge: `mode mock/dig` (a `· DoH` ak je zapnuté).

## 4 stĺpce (vantage columns)

Každý stĺpec má:

| Element | Popis |
|--------|--------|
| Názov | napr. `DNS Resolvers (3)`, `User-Agent HTTP (5)`, `Network vs Web (quick)`, `Time · Palimpsest (…)` |
| Score badge | číslo vpravo hore (consistency DNS / lokálne skóre) |
| Count chips | `N coll` · `N qnt` · `N tmp` · `N abs` · `N total` |
| Finding rows | label + Collapsed/Quantum/Temporal/Absent badge + detail |

### DNS

- Consistency score finding
- Multi-record summary (A/AAAA/CNAME/MX/TXT/NS best-effort)
- Split-horizon → **Quantum** badge
- Notice (amber): mock režim / dig missing auto-fallback

### User-Agent

- 5 klientov: Chrome, Chrome mobile, Googlebot, curl, Safari iOS
- Paths: `/`, `/robots.txt`, `/wp-admin`, `/.well-known/security.txt`
- Meta v detaily: status, redirects, server, length, title, **body hash** (nie cookies)
- Divergence status/hash → **UA response divergence** quantum

### Network vs Web

- Port profile `quick` alebo `web` v názve stĺpca
- Quantum: *Port open, HTTP silent* / *HTTP responds, ports filtered*

### Time · Palimpsest

- Timeline slider (bez zmeny kotiev)
- Ghost paths → temporal

## Quantum Matrix

- Observation summary s počtami + risk
- Každé rule finding: severity, weight, **next_actions** (šípky)
- Prázdny stav: „Čakám na klasifikáciu findingov...“

## Error / empty stavy (SK)

| Situácia | UI |
|----------|-----|
| dig chýba (strict dig mode) | červený box + hint o dnsutils / mock |
| Allowlist deny | červený box + hint `SCHRODINGER_ALLOWLIST` |
| SSRF block | červený box + hint o súkromnej IP |
| Notices (mock DNS) | jantárový box pod statusom |
| Žiadne vantage | sivý empty state o `SCHRODINGER_VANTAGES` |

## Shadow Diff / iPhone

- Shadow Diff panel a notifikácie bez zmeny kontraktu
- iPhone integrity kotvy (nav, Scan, placeholder) zachované
