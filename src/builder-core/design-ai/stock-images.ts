// Moved from lib/pages/stock-images.ts (24 Nov 2026): the partners MCP hands Claude this verified photo list, and main-repo only sees builder-core.
// Curated default stock photography for the AI/template page builder.
//
// Generated pages ship with these images pre-filled so a fresh page shows real
// photography instead of an empty gray gradient. Tenants are expected to swap
// them out later — these are just good-looking defaults, not brand assets.
//
// Sourcing: every URL below was individually verified with
// `curl -sI -o /dev/null -w "%{http_code}"` to return HTTP 200 before being
// committed here.
//   - Hand-picked real photos are served straight from Unsplash's CDN
//     (`images.unsplash.com/photo-<id>`), which falls under the permissive
//     Unsplash License — no attribution required, no api.unsplash.com calls.
//   - A minority of gallery slots (where a second/third relevant Unsplash photo
//     wasn't hand-verified) use Lorem Picsum deterministic seeds instead —
//     also real photography, zero attribution, and guaranteed to resolve.
//     Those slots are flagged `// picsum` inline below.

export type ImageCategory =
  | "food"
  | "beauty"
  | "retail"
  | "services"
  | "fitness"
  | "education"
  | "tech"
  | "creative"
  | "health"
  | "general"
  | "realestate"
  | "agriculture"
  | "hospitality"
  | "entertainment"
  | "media"
  | "freelance"

type CategoryImages = {
  hero: string[]
  gallery: string[]
  team: string[]
}

// ─── URL builders ───────────────────────────────────────────────────────────

/** Real Unsplash photo, sized for a full-bleed landscape hero background. */
function unsplashHero(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`
}

/** Real Unsplash photo, cropped square for a gallery grid tile. */
function unsplashGallery(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=80&auto=format`
}

/** Real Unsplash photo, cropped portrait for a team member avatar. */
function unsplashTeam(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=600&h=800&fit=crop&q=80&auto=format`
}

/** Picsum deterministic seed, square — guaranteed-reliable fallback. */
function picsumGallery(seed: string): string {
  return `https://picsum.photos/seed/${seed}/800/800`
}

// ─── Library ─────────────────────────────────────────────────────────────────
// All `unsplashHero` / `unsplashGallery` / `unsplashTeam` calls below use
// hand-verified real Unsplash photo ids. `picsumGallery` calls (marked
// `// picsum`) are the deterministic-seed fallback for the handful of gallery
// slots where a 3rd-5th relevant Unsplash photo wasn't hand-verified.

export const STOCK_IMAGES: Record<ImageCategory, CategoryImages> = {
  food: {
    hero: [
      unsplashHero("1414235077428-338989a2e8c0"), // pizza close-up
      unsplashHero("1517248135467-4c7edcad34c4"), // restaurant table spread
    ],
    gallery: [
      unsplashGallery("1504674900247-0877df9cc836"), // breakfast spread
      unsplashGallery("1555396273-367ea4eb4db5"), // burger
      unsplashGallery("1467003909585-2f8a72700288"), // plated dish
      unsplashGallery("1544025162-d76694265947"), // steak
      unsplashGallery("1476224203421-9ac39bcb3327"), // coffee
    ],
    team: [
      unsplashTeam("1573497019940-1c28c88b4f3e"), // chef/staff portrait
      unsplashTeam("1500917293891-ef795e70e1f6"), // chef/staff portrait
    ],
  },
  beauty: {
    hero: [
      unsplashHero("1487412720507-e7ab37603c6f"), // spa stones
      unsplashHero("1519415510236-718bdfcd89c8"), // makeup application
    ],
    gallery: [
      unsplashGallery("1522337360788-8b13dee7a37e"), // salon client
      unsplashGallery("1560750588-73207b1ef5b8"), // nail art
      unsplashGallery("1522335789203-aabd1fc54bc9"), // spa treatment
      picsumGallery("ba-beauty-gallery-4"), // picsum
      picsumGallery("ba-beauty-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1568602471122-7832951cc4c5"), // stylist portrait
      unsplashTeam("1544723795-3fb6469f5b39"), // stylist portrait
    ],
  },
  retail: {
    hero: [
      unsplashHero("1441986300917-64674bd600d8"), // retail storefront
      unsplashHero("1472851294608-062f824d29cc"), // clothing rack
    ],
    gallery: [
      unsplashGallery("1441984904996-e0b6ba687e04"), // shopping bags
      unsplashGallery("1483985988355-763728e1935b"), // boutique interior
      unsplashGallery("1445205170230-053b83016050"), // shoe display
      picsumGallery("ba-retail-gallery-4"), // picsum
      picsumGallery("ba-retail-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1607990281513-2c110a25bd8c"), // shop staff portrait
      unsplashTeam("1472099645785-5658abf4ff4e"), // shop staff portrait
    ],
  },
  services: {
    hero: [
      unsplashHero("1521737604893-d14cc237f11d"), // meeting room
      unsplashHero("1552664730-d307ca884978"), // modern office
    ],
    gallery: [
      unsplashGallery("1560250097-0b93528c311a"), // office team at work
      unsplashGallery("1454165804606-c3d57bc86b40"), // business handshake
      picsumGallery("ba-services-gallery-3"), // picsum
      picsumGallery("ba-services-gallery-4"), // picsum
      picsumGallery("ba-services-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1500648767791-00dcc994a43e"), // professional portrait
      unsplashTeam("1517841905240-472988babdf9"), // professional portrait
    ],
  },
  fitness: {
    hero: [
      unsplashHero("1517836357463-d25dfeac3438"), // gym weights
      unsplashHero("1571019613454-1cb2f99b2d8b"), // workout session
    ],
    gallery: [
      unsplashGallery("1534438327276-14e5300c3a48"), // yoga
      unsplashGallery("1517963879433-6ad2b056d712"), // gym training
      unsplashGallery("1571731956672-f2b94d7dd0cb"), // running
      picsumGallery("ba-fitness-gallery-4"), // picsum
      picsumGallery("ba-fitness-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1544005313-94ddf0286df2"), // trainer portrait
      unsplashTeam("1534528741775-53994a69daeb"), // trainer portrait
    ],
  },
  education: {
    hero: [
      unsplashHero("1524995997946-a1c2e315a42f"), // students studying
      unsplashHero("1503676260728-1c00da094a0b"), // classroom
    ],
    gallery: [
      unsplashGallery("1509062522246-3755977927d7"), // books
      unsplashGallery("1523240795612-9a054b0db644"), // graduation
      unsplashGallery("1497633762265-9d179a990aa6"), // library
      picsumGallery("ba-education-gallery-4"), // picsum
      picsumGallery("ba-education-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1519085360753-af0119f7cbe7"), // tutor/instructor portrait
      unsplashTeam("1544716278-ca5e3f4abd8c"), // tutor/instructor portrait
    ],
  },
  tech: {
    hero: [
      unsplashHero("1518770660439-4636190af475"), // circuit board
      unsplashHero("1515879218367-8466d910aaa4"), // laptop with code
    ],
    gallery: [
      unsplashGallery("1519389950473-47ba0277781c"), // team coding
      unsplashGallery("1498050108023-c5249f4df085"), // code on screen
      unsplashGallery("1573164713988-8665fc963095"), // tech team collaborating
      picsumGallery("ba-tech-gallery-4"), // picsum
      picsumGallery("ba-tech-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1531123897727-8f129e1688ce"), // developer portrait
      unsplashTeam("1489424731084-a5d8b219a5bb"), // developer portrait
    ],
  },
  creative: {
    hero: [
      unsplashHero("1513364776144-60967b0f800f"), // camera / photography
      unsplashHero("1542744173-8e7e53415bb0"), // design workspace
    ],
    gallery: [
      unsplashGallery("1513542789411-b6a5d4f31634"), // art studio
      unsplashGallery("1452587925148-ce544e77e70d"), // paint palette
      unsplashGallery("1547891654-e66ed7ebb968"), // art piece
      picsumGallery("ba-creative-gallery-4"), // picsum
      picsumGallery("ba-creative-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1506794778202-cad84cf45f1d"), // creative/designer portrait
      unsplashTeam("1503443207922-dff7d543fd0e"), // creative/designer portrait
    ],
  },
  health: {
    hero: [
      unsplashHero("1512678080530-7760d81faba6"), // stethoscope
      unsplashHero("1579684385127-1ef15d508118"), // medicine
    ],
    gallery: [
      unsplashGallery("1538108149393-fbbd81895907"), // hospital
      unsplashGallery("1584982751601-97dcc096659c"), // doctor with patient
      unsplashGallery("1631217868264-e5b90bb7e133"), // medical equipment
      unsplashGallery("1518152006812-edab29b069ac"), // medical
      picsumGallery("ba-health-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1519244703995-f4e0f30006d5"), // clinician portrait
      unsplashTeam("1607746882042-944635dfe10e"), // clinician portrait
    ],
  },
  general: {
    hero: [
      unsplashHero("1497366216548-37526070297c"), // office building
      unsplashHero("1556761175-5973dc0f32e7"), // team meeting
    ],
    gallery: [
      unsplashGallery("1522071820081-009f0129c71c"), // business generic
      unsplashGallery("1600880292203-757bb62b4baf"), // workspace
      unsplashGallery("1552581234-26160f608093"), // office desk
      picsumGallery("ba-general-gallery-4"), // picsum
      picsumGallery("ba-general-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1580489944761-15a19d654956"), // generic staff portrait
      unsplashTeam("1633332755192-727a05c4013d"), // generic staff portrait
    ],
  },
  realestate: {
    hero: [
      unsplashHero("1568605114967-8130f3a36994"), // house exterior at dusk, lit windows
      unsplashHero("1570129477492-45c003edd2be"), // white house exterior with lawn
    ],
    gallery: [
      unsplashGallery("1512917774080-9991f1c4c750"), // modern house with pool
      unsplashGallery("1600585154340-be6161a56a0c"), // living room interior
      unsplashGallery("1600607687939-ce8a6c25118c"), // living room interior
      unsplashGallery("1582407947304-fd86f028f716"), // house keys with model home
      unsplashGallery("1502672260266-1c1ef2d93688"), // city skyline street
    ],
    team: [
      unsplashTeam("1573496359142-b8d87734a5a2"), // realtor/agent portrait
      unsplashTeam("1618077360395-f3068be8e001"), // realtor/agent portrait
    ],
  },
  agriculture: {
    hero: [
      unsplashHero("1500937386664-56d1dfef3854"), // walking through wheat field at sunset
      unsplashHero("1500382017468-9049fed747ef"), // farm field at sunrise
    ],
    gallery: [
      unsplashGallery("1592982537447-7440770cbfc9"), // aerial crop rows
      unsplashGallery("1622383563227-04401ab4e5ea"), // hands planting seedling in soil
      unsplashGallery("1595855759920-86582396756a"), // fresh asparagus bunch
      unsplashGallery("1488459716781-31db52582fe9"), // fruit and vegetable market stall
      unsplashGallery("1571771894821-ce9b6c11b08e"), // bananas, produce
    ],
    team: [
      unsplashTeam("1601412436009-d964bd02edbc"), // farm owner/staff portrait
      unsplashTeam("1507003211169-0a1dd7228f2d"), // farm owner/staff portrait
    ],
  },
  hospitality: {
    hero: [
      unsplashHero("1566073771259-6a8506099945"), // resort lodge with pool
      unsplashHero("1571003123894-1f0594d2b5d9"), // infinity pool cabanas at dusk
    ],
    gallery: [
      unsplashGallery("1590490360182-c33d57733427"), // hotel room interior
      unsplashGallery("1512918728675-ed5a9ecdebfd"), // bright hotel bedroom
      unsplashGallery("1584132967334-10e028bd69f7"), // wood deck pool with palms
      unsplashGallery("1596436889106-be35e843f974"), // hotel pool with cabanas at sunset
      unsplashGallery("1533777857889-4be7c70b33f7"), // breakfast table
    ],
    team: [
      unsplashTeam("1595152772835-219674b2a8a6"), // hotel staff portrait
      unsplashTeam("1590086782957-93c06ef21604"), // hotel staff portrait
    ],
  },
  entertainment: {
    hero: [
      unsplashHero("1470229722913-7c0e2dbbafd3"), // concert crowd with stage lights
      unsplashHero("1493225457124-a3eb161ffa5f"), // crowd with raised arms and smoke
    ],
    gallery: [
      unsplashGallery("1524368535928-5b5e00ddc76b"), // concert crowd
      unsplashGallery("1501386761578-eac5c94b800a"), // cheering crowd close-up
      unsplashGallery("1470225620780-dba8ba36b745"), // DJ turntable close-up
      unsplashGallery("1508973379184-7517410fb0bc"), // concert crowd, phone raised
    ],
    team: [
      unsplashTeam("1516873240891-4bf014598ab4"), // DJ mid-performance portrait
      unsplashTeam("1471478331149-c72f17e33c73"), // guitarist playing portrait
    ],
  },
  media: {
    hero: [
      unsplashHero("1598488035139-bdbb2231ce04"), // recording studio, mixing desk and guitars
      unsplashHero("1471341971476-ae15ff5dd4ea"), // photo studio with softbox lighting rig
    ],
    gallery: [
      unsplashGallery("1590602847861-f357a9332bbc"), // podcast microphone on boom arm
      unsplashGallery("1516035069371-29a1b244cc32"), // camera with lenses
      unsplashGallery("1495707902641-75cac588d2e9"), // DSLR camera on wood table
      unsplashGallery("1502920917128-1aa500764cbd"), // DSLR camera, white background
      unsplashGallery("1526170375885-4d8ecf77b99f"), // polaroid instant camera
    ],
    team: [
      unsplashTeam("1531384441138-2736e62e0919"), // photographer with camera, portrait
      unsplashTeam("1519345182560-3f2917c472ef"), // on-camera talent portrait
    ],
  },
  freelance: {
    hero: [
      unsplashHero("1499951360447-b19be8fe80f5"), // home office desk with laptop and monitor
      unsplashHero("1554774853-b415df9eeb92"), // working from a laptop at a cafe counter
    ],
    gallery: [
      unsplashGallery("1486312338219-ce68d2c6f44d"), // hands typing on laptop, close-up
      unsplashGallery("1522202176988-66273c2fd55f"), // freelancers working together on laptops
      picsumGallery("ba-freelance-gallery-3"), // picsum
      picsumGallery("ba-freelance-gallery-4"), // picsum
      picsumGallery("ba-freelance-gallery-5"), // picsum
    ],
    team: [
      unsplashTeam("1544725176-7c40e5a71c5e"), // freelancer/consultant portrait
      unsplashTeam("1580894732444-8ecded7900cd"), // freelancer/consultant portrait
    ],
  },
}

// ─── Category inference ─────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Array<{
  category: ImageCategory
  keywords: string[]
}> = [
  {
    category: "food",
    keywords: [
      "restaurant",
      "cafe",
      "café",
      "food",
      "bakery",
      "caterer",
      "catering",
      "kitchen",
      "eatery",
      "diner",
    ],
  },
  {
    category: "beauty",
    keywords: [
      "salon",
      "barber",
      "spa",
      "beauty",
      "makeup",
      "cosmetic",
      "skincare",
      "nail",
    ],
  },
  {
    category: "fitness",
    keywords: [
      "gym",
      "fitness",
      "coach",
      "trainer",
      "workout",
      "yoga",
      "pilates",
      "crossfit",
    ],
  },
  {
    category: "education",
    keywords: [
      "course",
      "school",
      "tutor",
      "academy",
      "learn",
      "class",
      "training",
      "university",
      "college",
    ],
  },
  {
    category: "retail",
    keywords: [
      "shop",
      "store",
      "boutique",
      "retail",
      "fashion",
      "clothing",
      "market",
    ],
  },
  {
    category: "health",
    keywords: [
      "clinic",
      "pharmacy",
      "health",
      "hospital",
      "medical",
      "doctor",
      "dental",
      "therapy",
    ],
  },
  {
    category: "tech",
    keywords: [
      "developer",
      "software",
      " it ",
      "saas",
      "startup",
      "app",
      "engineering",
      "code",
      "platform",
    ],
  },
  {
    category: "creative",
    keywords: [
      "photographer",
      "designer",
      "artist",
      "studio",
      "creative",
      "film",
      "media",
      "art",
    ],
  },
  {
    category: "services",
    keywords: [
      "lawyer",
      "accountant",
      "consultant",
      "service",
      "agency",
      "firm",
      "legal",
      "advisory",
    ],
  },
  {
    category: "realestate",
    keywords: [
      "real estate",
      "property",
      "realtor",
      "estate agent",
      "landlord",
      "apartment",
      "rent",
      "lease",
    ],
  },
  {
    category: "agriculture",
    keywords: ["farm", "poultry", "livestock", "crop", "agro", "fishery"],
  },
  {
    category: "hospitality",
    keywords: ["hotel", "lodge", "guesthouse", "shortlet", "resort"],
  },
  {
    category: "entertainment",
    keywords: ["dj", "musician", "comedian", "band", "performer", "event"],
  },
  {
    category: "media",
    keywords: [
      "podcast",
      "videographer",
      "photographer studio",
      "editor",
      "producer",
    ],
  },
  {
    category: "freelance",
    keywords: ["freelancer", "consultant", "virtual assistant", "contractor"],
  },
]

/** Lowercase keyword match against free text to pick a default image category. */
export function inferImageCategory(text: string): ImageCategory {
  const lower = ` ${text.toLowerCase()} `
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) return category
  }
  return "general"
}

// ─── Fill ────────────────────────────────────────────────────────────────────

type PageNode = {
  id: string
  type: string
  props: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
}

type PageDefinitionLike = {
  nodes: PageNode[]
  [key: string]: unknown
}

/** Simple deterministic string hash, used only to vary which hero of the pair gets picked. */
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Pure, SSR-safe fill: returns a NEW page definition with empty hero/gallery/team
 * image slots filled in from the curated stock library. Never overwrites an
 * image the user or AI already set — only fills slots that are empty/missing.
 * Other section types are left untouched.
 */
export function fillStockImages<T extends PageDefinitionLike>(
  definition: T,
  opts: { category?: ImageCategory; text?: string }
): T {
  const category =
    opts.category ?? (opts.text ? inferImageCategory(opts.text) : "general")
  const images = STOCK_IMAGES[category]
  const heroSeed = opts.text ? hashString(opts.text) : 0

  const nodes = definition.nodes.map((node) => {
    if (node.type === "hero") {
      if (!node.props.backgroundImage) {
        const hero =
          images.hero[heroSeed % images.hero.length] ?? images.hero[0]
        return { ...node, props: { ...node.props, backgroundImage: hero } }
      }
      return node
    }

    if (node.type === "gallery") {
      const existing = node.props.images
      const isEmpty = !Array.isArray(existing) || existing.length === 0
      if (isEmpty) {
        return {
          ...node,
          props: {
            ...node.props,
            images: images.gallery.map((url) => ({ url, alt: "" })),
          },
        }
      }
      return node
    }

    if (node.type === "team") {
      const items = node.props.items
      if (!Array.isArray(items) || items.length === 0) return node

      let changed = false
      const newItems = items.map((member: Record<string, any>, i: number) => {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        if (member && !member.image) {
          changed = true
          return { ...member, image: images.team[i % images.team.length] }
        }
        return member
      })
      if (!changed) return node
      return { ...node, props: { ...node.props, items: newItems } }
    }

    return node
  })

  return { ...definition, nodes }
}
