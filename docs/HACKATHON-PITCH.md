# Hacky Tracky Arsenal + Schrödinger Scan

**Target:** FIND EVIL! (SANS) / Security track  
**Tagline:** *A vulnerability isn't a fact until you observe it from the right angle.*

---

## 60-Second Pitch Deck (6 slides × ~10s)

### Slide 1 — Problem (0:00–0:10)

**Headline:** Your security tools disagree. And you don't know why.

**Speaker notes:**  
Pentesters run DNS checks, port scans, and HTTP probes from one machine. They get one answer. But attackers see a different internet — split DNS, bot-only pages, filtered ports. **False negatives kill you.** One scan = one reality. Real targets exist in superposition.

---

### Slide 2 — Insight (0:10–0:20)

**Headline:** CVE is not a fact. It's a superposition.

**Speaker notes:**  
The same domain can look secure from your laptop and vulnerable from a resolver in another country, or from Googlebot vs Chrome. **Observation changes the outcome.** We built a defender that measures from three vantage points before you "collapse" the finding.

---

### Slide 3 — Solution (0:20–0:35)

**Headline:** Hacky Tracky Arsenal + Schrödinger Scan

**Bullets:**

- **Arsenal PWA** — installable lab control panel for 15 security tools (WPScan, masscan, SecLists, resolvers…)
- **Schrödinger Scan** — one target, 3 observers: DNS resolvers · User-Agent · Network vs Web
- **Quantum Matrix** — findings classified as Collapsed / Quantum / Absent

**Speaker notes:**  
We replaced a bash menu with a PWA you can pin on your phone. Then we added recon that doesn't ask "is it vulnerable?" but **"from which angle?"**

---

### Slide 4 — Wow Moment (0:35–0:45)

**Headline:** Live demo — `example.com` splits across resolvers

**Speaker notes:**  
Watch 30 DNS resolvers race. Chrome gets 200. Googlebot gets something else. Port 443 is open but HTTP is silent. **Amber = Quantum.** That's your real attack surface — not the green checkmark from one scan.

---

### Slide 5 — Tech (0:45–0:55)

**Headline:** Built for defenders, not script kiddies

**Stack:** React PWA · Node/Express · SSE live streams · 17k resolver list · whitelisted scripts only · localhost-first

**Speaker notes:**  
No arbitrary command execution. Bearer auth. Offline arsenal status. Job queue with live logs. **Defensive recon for authorized targets only.**

---

### Slide 6 — Ask (0:55–1:00)

**Headline:** Observe before you exploit.

**CTA:** `./start.sh` · Arsenal tab · Schrödinger tab

---

## FIND EVIL! Alignment

> **FIND EVIL!** challenges builders to create defenders that respond in seconds. **Schrödinger Scan** is an observation-layer defender: it collapses uncertainty before exploitation by measuring the same target from DNS, User-Agent, and network/web vantages simultaneously. **Arsenal PWA** ensures the defender's toolkit is always current, visible, and operable from any device in the lab. Together they answer: *"Is this actually vulnerable — or did we only look from one angle?"*

**Authorized use only.** Scan targets you own or have written permission to test.
