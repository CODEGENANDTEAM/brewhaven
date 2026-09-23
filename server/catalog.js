// The Brew Haven menu. This file is the source of truth for prices:
// the server always charges what is written here, whatever the browser sends.
//
// Every database gets a copy of these products when it starts up (init()),
// so if you change a price here, the next deploy updates all three databases.
//
// Prices are in paise (1 rupee = 100 paise) and are whole numbers, because
// adding up decimals like 0.1 + 0.2 gives rounding errors in JavaScript.

export const CURRENCY = "INR";
export const STORE_NAME = "Brew Haven";

export const CATALOG = [
  {
    id: "ethiopia-yirgacheffe",
    position: 1,
    name: "Ethiopia Yirgacheffe",
    description: "Light roast whole beans with notes of jasmine, lemon and honey. 250 g.",
    price: 64900,
    emoji: "☕",
    category: "Beans",
  },
  {
    id: "chikmagalur-estate",
    position: 2,
    name: "Chikmagalur Estate",
    description: "Medium roast single estate Arabica from Karnataka. Chocolate and caramel. 250 g.",
    price: 54900,
    emoji: "🫘",
    category: "Beans",
  },
  {
    id: "monsooned-malabar",
    position: 3,
    name: "Monsooned Malabar",
    description: "Dark roast with low acidity and a bold, earthy body. Great for espresso. 250 g.",
    price: 59900,
    emoji: "🌧️",
    category: "Beans",
  },
  {
    id: "house-decaf",
    position: 4,
    name: "House Decaf",
    description: "Swiss Water decaf with a smooth, nutty cup. All the taste, none of the jitters. 250 g.",
    price: 49900,
    emoji: "🌙",
    category: "Beans",
  },
  {
    id: "pour-over-kit",
    position: 5,
    name: "Pour Over Kit",
    description: "Ceramic dripper, 100 paper filters and a glass server for two cups.",
    price: 189900,
    emoji: "🫖",
    category: "Brew gear",
  },
  {
    id: "french-press",
    position: 6,
    name: "French Press",
    description: "600 ml borosilicate glass press with a stainless steel filter.",
    price: 149900,
    emoji: "🧉",
    category: "Brew gear",
  },
  {
    id: "brew-haven-mug",
    position: 7,
    name: "Brew Haven Mug",
    description: "Stoneware mug with our logo. 350 ml, dishwasher safe.",
    price: 39900,
    emoji: "🍵",
    category: "Merch",
  },
  {
    id: "canvas-tote",
    position: 8,
    name: "Canvas Tote",
    description: "Sturdy cotton tote that fits two bags of beans and a laptop.",
    price: 29900,
    emoji: "👜",
    category: "Merch",
  },
];

// Quick lookup by id, used when pricing an order.
export function findProduct(id) {
  return CATALOG.find((product) => product.id === id) || null;
}

// The shape the API sends to the browser (no "position" field).
export function toPublicProduct({ id, name, description, price, emoji, category }) {
  return { id, name, description, price, emoji, category };
}
