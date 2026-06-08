#!/usr/bin/env node
/**
 * TBG cold-email engine — permit signal fetcher (free, no key).
 *
 * Pulls recent building permits and returns SCORED project signals. These are the
 * "hot project" hooks: who is building what, where, how big, how recent. They do NOT
 * include the builder's contact (the free feeds don't carry it) — the daily-run
 * playbook enriches each project to a contactable builder/developer via web lookup.
 *
 * Reliable structured source: City of Seattle Open Data (Socrata, dataset 76t5-zqzr).
 * King County + Snohomish County are pulled in the playbook via their public permit
 * portals (their tabular APIs are inconsistent), then merged with these.
 *
 * Usage:  node automation/fetch-permits.mjs [days]      (default 3)
 * Output: JSON array on stdout, highest score first.
 */

const DAYS = parseInt(process.argv[2] || "3", 10);
const SINCE = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);

// Framing-relevant project types get the most weight (new wood-frame work).
const TYPE_WEIGHT = (permitclass = "", typedesc = "") => {
  const c = permitclass.toLowerCase(), t = typedesc.toLowerCase();
  const isNew = t.includes("new");
  if (c.includes("multifamily") && isNew) return 100;
  if (c.includes("commercial") && isNew) return 80;
  if ((c.includes("single family") || c.includes("duplex") || c.includes("townhouse")) && isNew) return 70;
  if (c.includes("multifamily")) return 55;
  if (c.includes("commercial")) return 45;
  if (isNew) return 50;
  return 20; // alterations / additions
};

function score(p) {
  const cost = parseFloat(p.estprojectcost || 0) || 0;
  const units = parseFloat(p.housingunitsadded || p.housingunits || 0) || 0;
  const typeW = TYPE_WEIGHT(p.permitclass, p.permittypedesc);
  // recency: newer = hotter (0..40)
  const ds = p.issueddate || p.applieddate || SINCE;
  const ageDays = Math.max(0, (Date.now() - new Date(ds).getTime()) / 864e5);
  const recency = Math.max(0, 40 - ageDays * 4);
  // size: log-scaled $ (0..60) + units bonus
  const sizeScore = Math.min(60, Math.log10(Math.max(1, cost)) * 9) + Math.min(40, units * 4);
  return Math.round(typeW + recency + sizeScore);
}

function hook(p) {
  const units = parseFloat(p.housingunitsadded || 0) || 0;
  const cost = parseFloat(p.estprojectcost || 0) || 0;
  const addr = [p.originaladdress1, p.originalcity].filter(Boolean).join(", ");
  const bits = [];
  if (units > 0) bits.push(`${units}-unit`);
  bits.push((p.permitclass || "project").toLowerCase());
  if (p.permittypedesc) bits.push(`(${p.permittypedesc.toLowerCase()})`);
  let h = `${bits.join(" ")} at ${addr}`;
  if (cost) h += ` (~$${Math.round(cost).toLocaleString()})`;
  return h;
}

async function seattle() {
  const where = encodeURIComponent(
    `permittypemapped='Building' AND (applieddate >= '${SINCE}' OR issueddate >= '${SINCE}')`
  );
  const url = `https://data.seattle.gov/resource/76t5-zqzr.json?$where=${where}&$limit=400&$order=applieddate DESC`;
  const r = await fetch(url, { headers: { "User-Agent": "TBG-SDR/1.0" } });
  if (!r.ok) throw new Error(`Seattle API ${r.status}`);
  const rows = await r.json();
  return rows
    .filter((p) => {
      const t = (p.permittypedesc || "").toLowerCase();
      const c = (p.permitclass || "").toLowerCase();
      // keep new construction + meaningful additions; drop trivial / non-structural
      if (/demolition|grading|sign|mechanical|boiler|electrical|plumbing/.test(t)) return false;
      return /new/.test(t) || /multifamily|commercial|townhouse/.test(c);
    })
    .map((p) => ({
      source: "Seattle",
      permit: p.permitnum,
      projectType: p.permitclass,
      work: p.permittypedesc,
      description: (p.description || "").trim().slice(0, 160),
      units: parseFloat(p.housingunitsadded || 0) || 0,
      value: parseFloat(p.estprojectcost || 0) || 0,
      address: [p.originaladdress1, p.originalcity, p.originalstate, p.originalzip].filter(Boolean).join(", "),
      appliedDate: (p.applieddate || "").slice(0, 10),
      issuedDate: (p.issueddate || "").slice(0, 10),
      status: p.statuscurrent,
      detailUrl: p.link?.url || "",
      hook: hook(p),
      score: score(p),
    }));
}

(async () => {
  const out = [];
  try {
    out.push(...(await seattle()));
  } catch (e) {
    console.error("Seattle fetch failed:", e.message);
  }
  out.sort((a, b) => b.score - a.score);
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  console.error(`\n[fetch-permits] ${out.length} Seattle project signals since ${SINCE}. King + Snohomish are added by the playbook via their county portals.`);
})();
