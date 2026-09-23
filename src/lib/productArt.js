// How each product LOOKS in the shop: its roast ticket number, the swatch or
// line drawing, and the spec rows (origin, process, roast...).
//
// This is presentation only. Names, prices and descriptions still come from
// the API (server/catalog.js is the source of truth), so a product that is not
// listed here still shows up, with a generic ticket (see artFor below).

// The roast scale, lightest to darkest. `tone` is the swatch colour.
export const ROAST_SCALE = [
  { id: "green", label: "Green", tone: "#9AA35B" },
  { id: "cinnamon", label: "Cinnamon", tone: "#B5733F" },
  { id: "city", label: "City", tone: "#7A4A2A" },
  { id: "full-city", label: "Full city", tone: "#4B2C1A" },
  { id: "espresso", label: "Espresso", tone: "#1E1410" },
];

// glyph: "bean" draws a coffee bean filled with the roast tone,
// the others are line drawings in components/Glyph.jsx.
const ART = {
  "ethiopia-yirgacheffe": {
    glyph: "bean",
    roast: "cinnamon",
    unit: "250 g",
    specs: [
      ["Origin", "Gedeo, Yirgacheffe · ET"],
      ["Process", "Washed"],
      ["Altitude", "1,900–2,100 m"],
      ["Notes", "Jasmine, lemon, honey"],
    ],
  },
  "chikmagalur-estate": {
    glyph: "bean",
    roast: "city",
    unit: "250 g",
    specs: [
      ["Origin", "Chikmagalur, Karnataka · IN"],
      ["Process", "Washed, single estate"],
      ["Altitude", "1,200 m"],
      ["Notes", "Cacao, caramel, hazelnut"],
    ],
  },
  "monsooned-malabar": {
    glyph: "bean",
    roast: "espresso",
    unit: "250 g",
    specs: [
      ["Origin", "Malabar Coast · IN"],
      ["Process", "Monsooned, 12 weeks"],
      ["Body", "Heavy, low acidity"],
      ["Notes", "Cedar, dark cacao, spice"],
    ],
  },
  "house-decaf": {
    glyph: "bean",
    roast: "full-city",
    unit: "250 g",
    specs: [
      ["Origin", "Karnataka · IN"],
      ["Process", "Swiss Water decaf"],
      ["Caffeine", "99.9% removed"],
      ["Notes", "Toasted nut, jaggery"],
    ],
  },
  "pour-over-kit": {
    glyph: "cone",
    specs: [
      ["Material", "Ceramic, borosilicate"],
      ["Capacity", "2 cups"],
      ["Includes", "100 paper filters"],
    ],
  },
  "french-press": {
    glyph: "press",
    specs: [
      ["Material", "Borosilicate, steel"],
      ["Capacity", "600 ml"],
      ["Filter", "Stainless mesh"],
    ],
  },
  "brew-haven-mug": {
    glyph: "mug",
    specs: [
      ["Material", "Stoneware"],
      ["Capacity", "350 ml"],
      ["Care", "Dishwasher safe"],
    ],
  },
  "canvas-tote": {
    glyph: "tote",
    specs: [
      ["Material", "Cotton canvas"],
      ["Capacity", "2 bags + a laptop"],
    ],
  },
};

// Tasting notes for the marquee band under the hero.
export const TASTING_NOTES = [
  "Jasmine",
  "Bergamot",
  "Jaggery",
  "Stone fruit",
  "Cacao nib",
  "Lemon zest",
  "Wild honey",
  "Cedar",
  "Toasted hazelnut",
];

// The ticket for one product. `index` is its place in the list (0-based),
// used for the big 01–08 number. Unknown ids get a plain ticket built from
// the category, so a new product in the catalog never breaks the shop.
export function artFor(product, index) {
  const art = ART[product.id];
  const number = String(index + 1).padStart(2, "0");
  if (!art) {
    const isBeans = product.category === "Beans";
    return {
      number,
      glyph: isBeans ? "bean" : "generic",
      roast: isBeans ? "city" : null,
      roastIndex: isBeans ? 2 : -1,
      unit: "",
      specs: product.category ? [["Category", product.category]] : [],
    };
  }
  const roastIndex = art.roast ? ROAST_SCALE.findIndex((step) => step.id === art.roast) : -1;
  return { number, unit: "", roast: null, ...art, roastIndex };
}
