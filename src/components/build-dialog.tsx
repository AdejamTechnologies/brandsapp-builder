import { useState } from "react"
import {
  composePage, generatePage, INDUSTRIES, MOODS, parseDoc,
  type ComposeContent, type Doc, type Industry, type Mood,
} from "@brandsapp/builder-core"

import { Button } from "./ui/button"
import { Dialog, DialogFooter } from "./ui/dialog"
import { Input } from "./ui/input"
import { Select } from "./ui/select"
import { cn } from "../lib/utils"

/**
 * Build a page from constraints, using one of the two engines.
 *
 * SECTIONS runs a fixed plan for the chosen industry — the same bands in the same
 * order every time. Predictable, and the right choice when a brand needs to look
 * like the rest of its category.
 *
 * COMPOSE decides the bands from the content it is given. Feed it photographs and
 * it builds a visual page; feed it none and it builds a typographic one. Two
 * brands with different material get structurally different pages instead of the
 * same skeleton with the words swapped.
 *
 * Both emit ordinary documents, so whatever comes out is editable exactly like a
 * page built by hand — the engine is a starting point, not a mode you stay in.
 */

const STOCK: Record<Industry, string[]> = {
  retail: ["1441984904996-e0b6ba687e04", "1483985988355-763728e1935b", "1445205170230-053b83016050", "1472851294608-062f824d29cc"],
  services: ["1521737604893-d14cc237f11d", "1552664730-d307ca884978", "1560250097-0b93528c311a", "1454165804606-c3d57bc86b40"],
  food: ["1504674900247-0877df9cc836", "1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0", "1467003909585-2f8a72700288"],
  fitness: ["1534438327276-14e5300c3a48", "1571019613454-1cb2f99b2d8b", "1517836357463-d25dfeac3438", "1541534741688-6078c6bfb5c5"],
  beauty: ["1596462502278-27bfdc403348", "1522335789203-aabd1fc54bc9", "1560750588-73207b1ef5b8", "1487412720507-e7ab37603c6f"],
}

/** What COMPOSE is handed. Toggling a source off genuinely removes those bands. */
const SOURCES = [
  { key: "images", label: "Photography" },
  { key: "features", label: "Features" },
  { key: "quotes", label: "Quotes" },
  { key: "stats", label: "Numbers" },
  { key: "prices", label: "Pricing" },
  { key: "faqs", label: "FAQs" },
  { key: "logos", label: "Logos" },
] as const
type SourceKey = (typeof SOURCES)[number]["key"]

function contentFor(brand: string, intro: string, industry: Industry, on: Set<SourceKey>): ComposeContent {
  return {
    brand,
    tagline: "Introducing",
    intro,
    ...(on.has("images") ? { images: STOCK[industry] } : {}),
    ...(on.has("features")
      ? {
          features: [
            { title: "Clear from the start", body: "You know what it costs and when it lands." },
            { title: "Built to last", body: "Sensible defaults, nothing to unpick later." },
            { title: "Properly supported", body: "Real people answer, and they know your account." },
          ],
        }
      : {}),
    ...(on.has("quotes")
      ? { quotes: [{ text: "They rebuilt the whole thing in a fortnight.", who: "Ada Obi, Founder" }, { text: "It has not needed touching since.", who: "Tunde A., Operations" }] }
      : {}),
    ...(on.has("stats") ? { stats: [{ value: "12", label: "years" }, { value: "480", label: "projects" }, { value: "98%", label: "would recommend" }] } : {}),
    ...(on.has("prices")
      ? {
          prices: [
            { name: "Starter", price: "₦5,000", features: ["Everything to launch", "One editor"] },
            { name: "Growth", price: "₦15,000", features: ["Five editors", "Priority support"] },
            { name: "Scale", price: "₦50,000", features: ["Unlimited editors", "A named contact"] },
          ],
        }
      : {}),
    ...(on.has("faqs")
      ? { faqs: [{ q: "How long does it take?", a: "Most projects go live within two to three weeks." }, { q: "Can I edit it myself?", a: "Yes — every part of the page, with no code." }] }
      : {}),
    ...(on.has("logos") ? { logos: ["Northwind", "Aurora", "Kestrel", "Lantern"] } : {}),
  }
}

export function BuildDialog({ onBuild, onClose }: { onBuild: (doc: Doc) => void; onClose: () => void }) {
  const [engine, setEngine] = useState<"compose" | "sections">("compose")
  const [brand, setBrand] = useState("Kestrel")
  const [intro, setIntro] = useState("A short line that says what you do and who it is for.")
  const [mood, setMood] = useState<Mood>("calm")
  const [industry, setIndustry] = useState<Industry>("services")
  const [seed, setSeed] = useState(1)
  const [on, setOn] = useState<Set<SourceKey>>(() => new Set<SourceKey>(["images", "features", "quotes", "stats", "faqs"]))

  const toggle = (k: SourceKey) =>
    setOn((s) => {
      const next = new Set(s)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const run = () => {
    if (engine === "sections") {
      const { doc } = generatePage({ brand, intro, mood, industry, seed })
      onBuild(parseDoc(doc))
    } else {
      const { doc } = composePage({ content: contentFor(brand, intro, industry, on), mood, seed })
      onBuild(parseDoc(doc))
    }
    onClose()
  }

  return (
    <Dialog open onClose={onClose} title="Build a page">
      <div className="mb-3 inline-flex rounded-lg bg-muted p-0.5">
        {(["compose", "sections"] as const).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEngine(e)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              engine === e ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
        {engine === "compose"
          ? "Bands are chosen from the content you supply — remove a source and those bands disappear."
          : "A fixed plan for the industry: the same bands, in the same order, every time."}
      </p>

      <Row label="brand">
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
      </Row>
      <Row label="intro">
        <Input value={intro} onChange={(e) => setIntro(e.target.value)} />
      </Row>
      <Row label="mood">
        <Select value={mood} onValueChange={(v) => setMood(v as Mood)} options={MOODS.map((m) => ({ value: m, label: m }))} />
      </Row>
      <Row label="industry">
        <Select
          value={industry}
          onValueChange={(v) => setIndustry(v as Industry)}
          options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
        />
      </Row>
      <Row label="seed">
        <Input type="number" value={String(seed)} onChange={(e) => setSeed(Number(e.target.value) || 1)} />
      </Row>

      {engine === "compose" && (
        <>
          <div className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Content</div>
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  on.has(s.key) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={run}>Build page</Button>
      </DialogFooter>
    </Dialog>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-1 items-center gap-2">{children}</div>
    </div>
  )
}
