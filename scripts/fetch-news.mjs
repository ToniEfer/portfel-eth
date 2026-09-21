/* Pobiera najnowsze wiadomości o Ethereum z publicznych kanałów RSS
   i zapisuje je do news.json obok aplikacji.

   Uruchamiane przez GitHub Actions po stronie serwera — dzięki temu omijamy
   blokadę CORS, która nie pozwala przeglądarce czytać RSS bezpośrednio.

   Bez zależności zewnętrznych: Node 20+ ma wbudowane fetch.  */

import { writeFileSync, readFileSync, existsSync } from "node:fs";

const OUT = new URL("../news.json", import.meta.url).pathname;
const LIMIT = 6;
const MAX_AGE_DAYS = 21;

const FEEDS = [
  { url: "https://cointelegraph.com/rss/tag/ethereum", name: "Cointelegraph", ethOnly: false },
  { url: "https://decrypt.co/feed",                    name: "Decrypt",       ethOnly: true  },
  { url: "https://cryptoslate.com/feed/",              name: "CryptoSlate",   ethOnly: true  },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", name: "CoinDesk", ethOnly: true  }
];

const MONTHS = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia"
];

/* ---------- pomocnicze ---------- */

function decode(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#8216;|&lsquo;/gi, "'")
    .replace(/&#8220;|&ldquo;|&#8221;|&rdquo;/gi, '"')
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&#8212;|&mdash;/gi, "—")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? decode(m[1]) : "";
}

function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

function plDate(d) {
  return d.getDate() + " " + MONTHS[d.getMonth()];
}

const ETH_RE = /\beth\b|ethereum|ether\b|vitalik|erc-?20|layer ?2|l2\b|staking|glamsterdam|pectra|dencun/i;

/* ---------- pobieranie ---------- */

async function readFeed(feed) {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "portfel-eth/1.0 (+github actions)", "Accept": "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(feed.name + " HTTP " + res.status);

  const xml = await res.text();
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  const items = [];

  for (const b of blocks) {
    const title = tag(b, "title");
    const link = (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1];
    const pub = tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published");
    const desc = tag(b, "description") || tag(b, "content:encoded") || "";
    if (!title || !link) continue;

    const when = new Date(pub);
    if (isNaN(when)) continue;

    const haystack = title + " " + desc;
    if (feed.ethOnly && !ETH_RE.test(haystack)) continue;

    items.push({
      title,
      url: decode(link),
      source: feed.name,
      ts: when.getTime(),
      date: plDate(when),
      body: clip(desc || title, 190)
    });
  }
  return items;
}

/* ---------- główny przebieg ---------- */

const collected = [];
const problems = [];

for (const feed of FEEDS) {
  try {
    const got = await readFeed(feed);
    collected.push(...got);
    console.log(`${feed.name}: ${got.length} pozycji`);
  } catch (e) {
    problems.push(`${feed.name}: ${e.message}`);
    console.log(`${feed.name}: pominięty (${e.message})`);
  }
}

if (!collected.length) {
  console.error("Żaden kanał nie odpowiedział — zostawiam poprzedni news.json bez zmian.");
  console.error(problems.join("\n"));
  process.exit(0);
}

const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
const seen = new Set();
const items = collected
  .filter(i => i.ts >= cutoff && i.ts <= Date.now() + 86400000)
  .sort((a, b) => b.ts - a.ts)
  .filter(i => {
    const key = i.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, LIMIT)
  .map(({ ts, ...rest }) => rest);

if (!items.length) {
  console.error("Kanały odpowiedziały, ale nic nie przeszło filtrów — zostawiam poprzedni plik.");
  process.exit(0);
}

const payload = {
  updated: new Date().toISOString(),
  sources: [...new Set(items.map(i => i.source))],
  items
};

const next = JSON.stringify(payload, null, 2) + "\n";

// nie nadpisujemy, gdy zmienił się wyłącznie znacznik czasu
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    if (JSON.stringify(prev.items) === JSON.stringify(items)) {
      console.log("Bez zmian — nic nie zapisuję.");
      process.exit(0);
    }
  } catch { /* uszkodzony plik — po prostu go nadpiszemy */ }
}

writeFileSync(OUT, next);
console.log(`Zapisano ${items.length} wiadomości do news.json`);
