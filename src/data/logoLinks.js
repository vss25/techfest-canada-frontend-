/* Official websites for every logo on the site, keyed by the logo's CMS name
   (case, spaces and punctuation ignored). Used whenever a logo has no
   "Website URL" saved in the CMS. A URL saved in the admin panel always wins.
   Checked October 2026. */

export const LOGO_LINKS = {
  "1000daysout": "https://www.1000daysout.com/",
  accenture: "https://www.accenture.com/",
  adp: "https://www.adp.ca/",
  aicollective: "https://www.aicollective.com/",
  amazon: "https://www.aboutamazon.ca/",
  bdc: "https://www.bdc.ca/",
  branksome: "https://www.branksome.on.ca/",
  broadcom: "https://www.broadcom.com/",
  canadiancybersecuritynetwork: "https://canadiancybersecuritynetwork.com/",
  cbc: "https://www.cbc.ca/",
  christy: "https://thechristyclarkshow.com/",
  cia: "https://www.cia.gov/",
  constellar: "https://constellar.co/",
  csa: "https://canadastartups.co/",
  dell: "https://www.dell.com/en-ca",
  dhl: "https://www.dhl.com/ca-en/home.html",
  docwithoutborder: "https://www.doctorswithoutborders.ca/",
  ford: "https://www.ford.ca/",
  foresight: "https://www.foresightcac.com/",
  fusion: "https://www.fusioncollective.net/",
  fusioncollective: "https://www.fusioncollective.net/",
  globalaffairscanada: "https://www.international.gc.ca/",
  go: "https://www.priv.gc.ca/",                       // Office of the Privacy Commissioner of Canada
  hackensack: "https://www.hackensackmeridianhealth.org/",
  helaba: "https://www.helaba.com/",
  hexaware: "https://hexaware.com/",
  iapp: "https://iapp.org/",
  ibm: "https://www.ibm.com/ca-en",
  india: "https://www.india.gov.in/",                  // Government of India emblem
  intlseawaysinc: "https://www.intlseas.com/",
  iris: "https://www.irissoftware.com/",
  jpmorgan: "https://www.jpmorganchase.com/",
  kpmg: "https://kpmg.com/ca/en.html",
  kraken: "https://www.kraken.com/ca",
  lawrenceharvey: "https://www.lawrenceharvey.com/",
  magnainternational: "https://www.magna.com/",
  marsh: "https://www.marsh.com/",
  mcd: "https://www.mcdonalds.com/ca/en-ca.html",
  mcdonalds: "https://www.mcdonalds.com/ca/en-ca.html",
  metafundwe: "https://metafundwe.com/",
  nationalassociationofcorporatedirectors: "https://www.nacdonline.org/",
  nejm: "https://www.nejmgroup.org/",
  nvidia: "https://www.nvidia.com/en-us/",
  nyu: "https://www.nyu.edu/",
  oci: "https://www.oc-innovation.ca/",                // Ontario Centre of Innovation
  oqd: "https://openquantumdesign.org/",
  osif: "https://www.osfi-bsif.gc.ca/",                // OSFI
  pint: "https://www.pinterest.com/",
  pinterest: "https://www.pinterest.com/",
  publichealthagencyofcanada: "https://www.canada.ca/en/public-health.html",
  rockwellautomation: "https://www.rockwellautomation.com/en-ca.html",
  rtmnexus: "https://retailtechmedianexus.com/",
  schneider: "https://www.se.com/ca/en/",
  scotiabank: "https://www.scotiabank.com/",
  sparrow: "https://sparrowbioacoustics.com/",
  temasek: "https://www.temasek.com.sg/",
  terranova: "https://www.terranovadefense.com/",
  tmobile: "https://www.t-mobile.com/",
  vast: "https://www.vastdata.com/",
  vm: "https://www.vmware.com/",
  vmware: "https://www.vmware.com/",
  wef: "https://www.weforum.org/",
  wellsfargo: "https://www.wellsfargo.com/",
  worktangoinc: "https://www.worktango.com/",
  xanadu: "https://www.xanadu.ai/",
};

export const logoKey = (name) => String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** The link for a logo: the CMS "Website URL" if set, else the official site above. */
export function logoHref(item) {
  const own = String(item?.url || item?.website || "").trim();
  if (own) return /^https?:\/\//i.test(own) ? own : `https://${own}`;
  return LOGO_LINKS[logoKey(item?.name)] || "";
}
