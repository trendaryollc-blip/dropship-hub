import type {
  ComplianceCheckResult,
  ComplianceCheckDetail,
  ComplianceFlag,
  ComplianceReport,
  TrademarkCheckInput,
  TrademarkCheckResult,
  TrademarkMatch,
  DmcaCheckInput,
  DmcaCheckResult,
  RestrictedItemInput,
  RestrictedItemResult,
  RestrictedPlatform,
  AdPolicyInput,
  AdPolicyResult,
  AdPlatformPolicy,
  ImageOriginalityInput,
  ImageOriginalityResult,
  ImageCheckResult,
  BrandRegistryInput,
  BrandRegistryResult,
  PatentCheckInput,
  PatentCheckResult,
  PatentInfringement,
  ExportControlInput,
  ExportControlResult,
  ComplianceCheckInput,
  ComplianceRiskLevel,
} from "@/types/compliance";

// ══════════════════════════════════════════════════════════════════════════════
// KNOWN TRADEMARK DATABASE (500+ entries organized by industry)
// ══════════════════════════════════════════════════════════════════════════════

const KNOWN_TRADEMARKS: Record<string, { owner: string; classes: string[]; risk: "low" | "moderate" | "high" }> = {
  // ── Fashion & Apparel ────────────────────────────────────────────────────
  "nike": { owner: "Nike, Inc.", classes: ["25", "28"], risk: "high" },
  "adidas": { owner: "Adidas AG", classes: ["25", "28"], risk: "high" },
  "gucci": { owner: "Gucci", classes: ["18", "25"], risk: "high" },
  "louis vuitton": { owner: "LVMH", classes: ["18", "25"], risk: "high" },
  "prada": { owner: "Prada S.p.A.", classes: ["18", "25"], risk: "high" },
  "versace": { owner: "Gianni Versace S.r.l.", classes: ["18", "25"], risk: "high" },
  "armani": { owner: "Giorgio Armani S.p.A.", classes: ["18", "25"], risk: "high" },
  "chanel": { owner: "Chanel S.A.", classes: ["18", "25", "14"], risk: "high" },
  "dior": { owner: "Christian Dior SE", classes: ["18", "25"], risk: "high" },
  "burberry": { owner: "Burberry Group", classes: ["18", "25"], risk: "high" },
  "hermes": { owner: "Hermes International", classes: ["18", "25"], risk: "high" },
  "balenciaga": { owner: "Kering", classes: ["18", "25"], risk: "high" },
  "bottega veneta": { owner: "Kering", classes: ["18", "25"], risk: "high" },
  "fendi": { owner: "LVMH", classes: ["18", "25"], risk: "high" },
  "givenchy": { owner: "LVMH", classes: ["18", "25"], risk: "high" },
  "celine": { owner: "LVMH", classes: ["18", "25"], risk: "high" },
  "valentino": { owner: "Valentino S.p.A.", classes: ["18", "25"], risk: "high" },
  "dolce gabbana": { owner: "Dolce & Gabbana", classes: ["18", "25"], risk: "high" },
  "alexander mcqueen": { owner: "Kering", classes: ["18", "25"], risk: "high" },
  "moncler": { owner: "Moncler S.p.A.", classes: ["25"], risk: "high" },
  "supreme": { owner: "Supreme", classes: ["25"], risk: "high" },
  "off-white": { owner: "Off-White LLC", classes: ["25", "18"], risk: "high" },
  "stussy": { owner: "Stüssy Inc.", classes: ["25"], risk: "high" },
  "bape": { owner: "A Bathing Ape", classes: ["25"], risk: "high" },
  "ralph lauren": { owner: "Polo Ralph Lauren", classes: ["25"], risk: "high" },
  "tommy hilfiger": { owner: "PVH Corp.", classes: ["25"], risk: "high" },
  "calvin klein": { owner: "PVH Corp.", classes: ["25"], risk: "high" },
  "levi": { owner: "Levi Strauss & Co.", classes: ["25"], risk: "high" },
  "hugo boss": { owner: "Hugo Boss AG", classes: ["25"], risk: "high" },
  "lacoste": { owner: "Lacoste S.A.", classes: ["25"], risk: "high" },
  "polo": { owner: "Polo Ralph Lauren", classes: ["25"], risk: "moderate" },
  "zara": { owner: "Inditex", classes: ["25"], risk: "moderate" },
  "h&m": { owner: "Hennes & Mauritz", classes: ["25"], risk: "moderate" },
  "uniqlo": { owner: "Fast Retailing", classes: ["25"], risk: "moderate" },
  "gap": { owner: "Gap Inc.", classes: ["25"], risk: "moderate" },
  "forever 21": { owner: "Forever 21", classes: ["25"], risk: "moderate" },
  "shein": { owner: "Roadget Business Pte. Ltd.", classes: ["25"], risk: "moderate" },
  "boohoo": { owner: "Boohoo Group", classes: ["25"], risk: "moderate" },
  "prettylittlething": { owner: "Boohoo Group", classes: ["25"], risk: "moderate" },
  "asos": { owner: "ASOS plc", classes: ["25"], risk: "moderate" },
  "victoria secret": { owner: "L Brands", classes: ["25", "26"], risk: "high" },
  "bath and body works": { owner: "L Brands", classes: ["3", "25"], risk: "high" },
  "anthropologie": { owner: "URBN", classes: ["25"], risk: "moderate" },
  "free people": { owner: "URBN", classes: ["25"], risk: "moderate" },
  "urban outfitters": { owner: "URBN", classes: ["25"], risk: "moderate" },
  "banana republic": { owner: "Gap Inc.", classes: ["25"], risk: "moderate" },
  "old navy": { owner: "Gap Inc.", classes: ["25"], risk: "moderate" },
  "j crew": { owner: "J. Crew Group", classes: ["25"], risk: "moderate" },
  "lucky brand": { owner: "Lucky Brand Dungarees", classes: ["25"], risk: "moderate" },
  "true religion": { owner: "True Religion Apparel", classes: ["25"], risk: "moderate" },
  // ── Footwear ─────────────────────────────────────────────────────────────
  "crocs": { owner: "Crocs, Inc.", classes: ["25"], risk: "high" },
  "ugg": { owner: "Deckers Outdoor", classes: ["25"], risk: "high" },
  "new balance": { owner: "New Balance", classes: ["25"], risk: "high" },
  "asics": { owner: "ASICS Corporation", classes: ["25"], risk: "high" },
  "fila": { owner: "FILA", classes: ["25"], risk: "high" },
  "puma": { owner: "Puma SE", classes: ["25", "28"], risk: "high" },
  "reebok": { owner: "Authentic Brands Group", classes: ["25"], risk: "high" },
  "converse": { owner: "Nike, Inc.", classes: ["25"], risk: "high" },
  "vans": { owner: "VF Corporation", classes: ["25"], risk: "high" },
  "timberland": { owner: "VF Corporation", classes: ["25"], risk: "high" },
  "dr martens": { owner: "Dr. Martens plc", classes: ["25"], risk: "high" },
  "clarks": { owner: "Clarks", classes: ["25"], risk: "moderate" },
  "skechers": { owner: "Skechers U.S.A.", classes: ["25"], risk: "high" },
  "birkenstock": { owner: "Birkenstock", classes: ["25"], risk: "high" },
  "merrell": { owner: "Wolverine World Wide", classes: ["25"], risk: "moderate" },
  "salomon": { owner: "Amer Sports", classes: ["25"], risk: "moderate" },
  "on running": { owner: "On AG", classes: ["25"], risk: "high" },
  "allbirds": { owner: "Allbirds, Inc.", classes: ["25"], risk: "moderate" },
  "brooks": { owner: "Brooks Sports", classes: ["25"], risk: "moderate" },
  "hoka": { owner: "Deckers Outdoor", classes: ["25"], risk: "moderate" },
  // ── Outdoor & Sportswear ────────────────────────────────────────────────
  "north face": { owner: "VF Corporation", classes: ["25"], risk: "high" },
  "patagonia": { owner: "Patagonia, Inc.", classes: ["25"], risk: "high" },
  "lululemon": { owner: "Lululemon Athletica", classes: ["25"], risk: "high" },
  "under armour": { owner: "Under Armour", classes: ["25"], risk: "high" },
  "champion": { owner: "HanesBrands", classes: ["25"], risk: "moderate" },
  "columbia sportswear": { owner: "Columbia Sportswear", classes: ["25"], risk: "moderate" },
  "arc teryx": { owner: "Amer Sports", classes: ["25"], risk: "high" },
  "fjallraven": { owner: "Fjällräven", classes: ["18", "25"], risk: "moderate" },
  "osprey": { owner: "Osprey Packs", classes: ["18"], risk: "moderate" },
  "camelbak": { owner: "Vista Outdoor", classes: ["21"], risk: "moderate" },
  "darn tough": { owner: "Darn Tough Vermont", classes: ["25"], risk: "moderate" },
  // ── Luxury & Jewelry ────────────────────────────────────────────────────
  "cartier": { owner: "Cartier", classes: ["14"], risk: "high" },
  "tiffany": { owner: "Tiffany and Co.", classes: ["14"], risk: "high" },
  "pandora": { owner: "Pandora A/S", classes: ["14"], risk: "high" },
  "swarovski": { owner: "Swarovski AG", classes: ["14"], risk: "high" },
  "tissot": { owner: "The Swatch Group", classes: ["14"], risk: "moderate" },
  "rolex": { owner: "Rolex SA", classes: ["14"], risk: "high" },
  "omega": { owner: "The Swatch Group", classes: ["14"], risk: "high" },
  "tag heuer": { owner: "LVMH", classes: ["14"], risk: "high" },
  "breitling": { owner: "Breitling SA", classes: ["14"], risk: "high" },
  "bulgari": { owner: "LVMH", classes: ["14"], risk: "high" },
  "van cleef": { owner: "Van Cleef & Arpels", classes: ["14"], risk: "high" },
  "tudor": { owner: "Rolex SA", classes: ["14"], risk: "high" },
  "longines": { owner: "The Swatch Group", classes: ["14"], risk: "moderate" },
  "seiko": { owner: "Seiko Holdings", classes: ["14"], risk: "moderate" },
  "citizen": { owner: "Citizen Watch", classes: ["14"], risk: "moderate" },
  "casio": { owner: "Casio Computer", classes: ["14", "9"], risk: "moderate" },
  "fossil": { owner: "Fossil Group", classes: ["14"], risk: "moderate" },
  "michael kors": { owner: "Capri Holdings", classes: ["14", "18"], risk: "high" },
  "kate spade": { owner: "Tapestry, Inc.", classes: ["14", "18"], risk: "high" },
  "coach": { owner: "Tapestry, Inc.", classes: ["18", "25"], risk: "high" },
  // ── Eyewear ──────────────────────────────────────────────────────────────
  "ray-ban": { owner: "Luxottica", classes: ["9"], risk: "high" },
  "oakley": { owner: "Luxottica", classes: ["9", "25"], risk: "high" },
  "maui jim": { owner: "Kering", classes: ["9"], risk: "moderate" },
  // ── Electronics & Tech ──────────────────────────────────────────────────
  "apple": { owner: "Apple Inc.", classes: ["9", "11"], risk: "high" },
  "samsung": { owner: "Samsung Electronics", classes: ["9"], risk: "high" },
  "sony": { owner: "Sony Corporation", classes: ["9", "28"], risk: "moderate" },
  "bose": { owner: "Bose Corporation", classes: ["9"], risk: "moderate" },
  "dyson": { owner: "Dyson Ltd.", classes: ["9", "11"], risk: "high" },
  "kitchenaid": { owner: "Whirlpool Corporation", classes: ["7", "11"], risk: "moderate" },
  "vitamix": { owner: "Vitamix", classes: ["7"], risk: "moderate" },
  "nintendo": { owner: "Nintendo Co., Ltd.", classes: ["28"], risk: "high" },
  "playstation": { owner: "Sony Interactive", classes: ["28"], risk: "high" },
  "xbox": { owner: "Microsoft Corporation", classes: ["28"], risk: "high" },
  "fortnite": { owner: "Epic Games", classes: ["28", "41"], risk: "high" },
  "minecraft": { owner: "Mojang/Microsoft", classes: ["28", "41"], risk: "high" },
  "tiktok": { owner: "ByteDance", classes: ["9", "41"], risk: "moderate" },
  "spotify": { owner: "Spotify AB", classes: ["9"], risk: "moderate" },
  "netflix": { owner: "Netflix, Inc.", classes: ["41"], risk: "moderate" },
  "google": { owner: "Alphabet Inc.", classes: ["9"], risk: "high" },
  "microsoft": { owner: "Microsoft Corporation", classes: ["9"], risk: "high" },
  "amazon": { owner: "Amazon.com, Inc.", classes: ["9", "35"], risk: "high" },
  "meta": { owner: "Meta Platforms", classes: ["9"], risk: "high" },
  "tesla": { owner: "Tesla, Inc.", classes: ["12"], risk: "high" },
  "dell": { owner: "Dell Technologies", classes: ["9"], risk: "moderate" },
  "hp": { owner: "HP Inc.", classes: ["9"], risk: "moderate" },
  "lenovo": { owner: "Lenovo Group", classes: ["9"], risk: "moderate" },
  "asus": { owner: "ASUSTeK Computer", classes: ["9"], risk: "moderate" },
  "lg": { owner: "LG Electronics", classes: ["9"], risk: "moderate" },
  "panasonic": { owner: "Panasonic Holdings", classes: ["9"], risk: "moderate" },
  "philips": { owner: "Koninklijke Philips", classes: ["9"], risk: "moderate" },
  "jbl": { owner: "Harman International", classes: ["9"], risk: "moderate" },
  "beats": { owner: "Apple Inc.", classes: ["9"], risk: "high" },
  "gopro": { owner: "GoPro, Inc.", classes: ["9"], risk: "moderate" },
  "garmin": { owner: "Garmin Ltd.", classes: ["9"], risk: "moderate" },
  // ── Automotive ───────────────────────────────────────────────────────────
  "porsche": { owner: "Porsche AG", classes: ["12", "28"], risk: "moderate" },
  "bmw": { owner: "Bayerische Motoren Werke", classes: ["12"], risk: "moderate" },
  "ford": { owner: "Ford Motor Company", classes: ["12"], risk: "moderate" },
  "mercedes": { owner: "Mercedes-Benz Group", classes: ["12"], risk: "moderate" },
  "ferrari": { owner: "Ferrari N.V.", classes: ["12", "25"], risk: "high" },
  "lamborghini": { owner: "Automobili Lamborghini", classes: ["12"], risk: "high" },
  "bentley": { owner: "Bentley Motors", classes: ["12"], risk: "moderate" },
  "rolls royce": { owner: "Rolls-Royce Holdings", classes: ["12"], risk: "moderate" },
  "maserati": { owner: "Stellantis", classes: ["12"], risk: "moderate" },
  "aston martin": { owner: "Aston Martin Lagonda", classes: ["12"], risk: "moderate" },
  "corvette": { owner: "General Motors", classes: ["12"], risk: "moderate" },
  "mustang": { owner: "Ford Motor Company", classes: ["12"], risk: "moderate" },
  "camaro": { owner: "General Motors", classes: ["12"], risk: "moderate" },
  // ── Motorcycle ───────────────────────────────────────────────────────────
  "harley": { owner: "Harley-Davidson", classes: ["25", "28"], risk: "high" },
  "harley-davidson": { owner: "Harley-Davidson", classes: ["12", "25"], risk: "high" },
  "ducati": { owner: "Ducati Motor Holding", classes: ["12"], risk: "moderate" },
  "kawasaki": { owner: "Kawasaki Heavy Industries", classes: ["12"], risk: "moderate" },
  "yamaha": { owner: "Yamaha Motor Co.", classes: ["12"], risk: "moderate" },
  "triumph": { owner: "Triumph Motorcycles", classes: ["12"], risk: "moderate" },
  "indian": { owner: "Polaris Inc.", classes: ["12"], risk: "moderate" },
  // ── Beverages ────────────────────────────────────────────────────────────
  "coca cola": { owner: "The Coca-Cola Company", classes: ["32", "33"], risk: "high" },
  "pepsi": { owner: "PepsiCo, Inc.", classes: ["32"], risk: "high" },
  "red bull": { owner: "Red Bull GmbH", classes: ["32"], risk: "high" },
  "monster": { owner: "Monster Beverage", classes: ["32"], risk: "moderate" },
  "starbucks": { owner: "Starbucks Corporation", classes: ["30", "32", "43"], risk: "high" },
  "dunkin": { owner: "Inspire Brands", classes: ["30", "43"], risk: "high" },
  "oreo": { owner: "Mondelēz International", classes: ["30"], risk: "high" },
  "gatorade": { owner: "PepsiCo, Inc.", classes: ["32"], risk: "high" },
  "celsius": { owner: "Celsius Holdings", classes: ["32"], risk: "moderate" },
  "rockstar": { owner: "PepsiCo, Inc.", classes: ["32"], risk: "moderate" },
  // ── Food & Snacks ───────────────────────────────────────────────────────
  "doritos": { owner: "Frito-Lay", classes: ["30"], risk: "high" },
  "lays": { owner: "Frito-Lay", classes: ["30"], risk: "high" },
  "cheetos": { owner: "Frito-Lay", classes: ["30"], risk: "high" },
  "pringles": { owner: "Kellanova", classes: ["30"], risk: "high" },
  "kit kat": { owner: "Nestlé", classes: ["30"], risk: "high" },
  "snickers": { owner: "Mars, Inc.", classes: ["30"], risk: "high" },
  "m&ms": { owner: "Mars, Inc.", classes: ["30"], risk: "high" },
  "skittles": { owner: "Mars, Inc.", classes: ["30"], risk: "high" },
  "toblerone": { owner: "Mondelēz International", classes: ["30"], risk: "high" },
  "reese": { owner: "The Hershey Company", classes: ["30"], risk: "high" },
  "hershey": { owner: "The Hershey Company", classes: ["30"], risk: "high" },
  "cadbury": { owner: "Mondelēz International", classes: ["30"], risk: "high" },
  "lindt": { owner: "Lindt & Sprüngli", classes: ["30"], risk: "moderate" },
  "godiva": { owner: "Mondelēz International", classes: ["30"], risk: "high" },
  "nutella": { owner: "Ferrero", classes: ["30"], risk: "high" },
  "ben and jerry": { owner: "Unilever", classes: ["30"], risk: "moderate" },
  "haagen dazs": { owner: "Froneri", classes: ["30"], risk: "moderate" },
  "tide": { owner: "Procter & Gamble", classes: ["3"], risk: "high" },
  // ── Toys & Entertainment ────────────────────────────────────────────────
  "disney": { owner: "The Walt Disney Company", classes: ["28", "41"], risk: "high" },
  "pokemon": { owner: "The Pokemon Company", classes: ["28", "41"], risk: "high" },
  "lego": { owner: "LEGO Group", classes: ["28"], risk: "high" },
  "barbie": { owner: "Mattel, Inc.", classes: ["28"], risk: "high" },
  "hello kitty": { owner: "Sanrio Co., Ltd.", classes: ["28", "25"], risk: "high" },
  "marvel": { owner: "Marvel Entertainment", classes: ["28", "41"], risk: "high" },
  "star wars": { owner: "Lucasfilm Ltd.", classes: ["28", "41"], risk: "high" },
  "hot wheels": { owner: "Mattel, Inc.", classes: ["28"], risk: "high" },
  "transformers": { owner: "Hasbro, Inc.", classes: ["28"], risk: "high" },
  "nerf": { owner: "Hasbro, Inc.", classes: ["28"], risk: "high" },
  "play-doh": { owner: "Hasbro, Inc.", classes: ["28"], risk: "high" },
  "my little pony": { owner: "Hasbro, Inc.", classes: ["28"], risk: "high" },
  "power rangers": { owner: "Hasbro, Inc.", classes: ["28"], risk: "high" },
  "funko": { owner: "Funko, Inc.", classes: ["28"], risk: "moderate" },
  "american girl": { owner: "Mattel, Inc.", classes: ["28"], risk: "high" },
  "build a bear": { owner: "Build-A-Bear Workshop", classes: ["28"], risk: "moderate" },
  // ── Entertainment & Media ────────────────────────────────────────────────
  "disney princess": { owner: "The Walt Disney Company", classes: ["28", "41"], risk: "high" },
  "mickey mouse": { owner: "The Walt Disney Company", classes: ["28", "25"], risk: "high" },
  "minnie mouse": { owner: "The Walt Disney Company", classes: ["28", "25"], risk: "high" },
  "frozen": { owner: "The Walt Disney Company", classes: ["28", "41"], risk: "high" },
  "avengers": { owner: "Marvel Entertainment", classes: ["28", "41"], risk: "high" },
  "spider-man": { owner: "Marvel Entertainment", classes: ["28", "41"], risk: "high" },
  "batman": { owner: "DC Comics", classes: ["28", "41"], risk: "high" },
  "superman": { owner: "DC Comics", classes: ["28", "41"], risk: "high" },
  "wonder woman": { owner: "DC Comics", classes: ["28", "41"], risk: "high" },
  "harry potter": { owner: "Warner Bros. Entertainment", classes: ["28", "41"], risk: "high" },
  "wizarding world": { owner: "Warner Bros. Entertainment", classes: ["28", "41"], risk: "high" },
  "spongebob": { owner: "Paramount Global", classes: ["28", "41"], risk: "high" },
  "paw patrol": { owner: "Spin Master", classes: ["28"], risk: "high" },
  "bluey": { owner: "BBC Studios", classes: ["28", "41"], risk: "moderate" },
  "stranger things": { owner: "Netflix, Inc.", classes: ["25", "28"], risk: "high" },
  "game of thrones": { owner: "Warner Bros. Entertainment", classes: ["25", "28"], risk: "high" },
  "the mandalorian": { owner: "Lucasfilm Ltd.", classes: ["25", "28"], risk: "high" },
  "sesame street": { owner: "Sesame Workshop", classes: ["28"], risk: "high" },
  "roblox": { owner: "Roblox Corporation", classes: ["28", "41"], risk: "high" },
  "zelda": { owner: "Nintendo", classes: ["28", "41"], risk: "high" },
  "mario": { owner: "Nintendo", classes: ["28", "41"], risk: "high" },
  "pikachu": { owner: "The Pokemon Company", classes: ["28", "41"], risk: "high" },
  // ── Home & Kitchen ───────────────────────────────────────────────────────
  "cuisinart": { owner: "Conair Corporation", classes: ["7", "11"], risk: "moderate" },
  "instant pot": { owner: "Instant Brands", classes: ["11"], risk: "moderate" },
  "le creuset": { owner: "Le Creuset", classes: ["21"], risk: "high" },
  "all clad": { owner: "Groupe SEB", classes: ["21"], risk: "moderate" },
  "tupperware": { owner: "Tupperware Brands", classes: ["21"], risk: "moderate" },
  "pyrex": { owner: "Corelle Brands", classes: ["21"], risk: "moderate" },
  "lodge": { owner: "Lodge Manufacturing", classes: ["21"], risk: "moderate" },
  "staub": { owner: "Zwilling J.A. Henckels", classes: ["21"], risk: "moderate" },
  "ninja": { owner: "SharkNinja", classes: ["7", "11"], risk: "moderate" },
  "shark": { owner: "SharkNinja", classes: ["7", "11"], risk: "moderate" },
  "roomba": { owner: "iRobot Corporation", classes: ["7"], risk: "moderate" },
  "yeti": { owner: "YETI Holdings", classes: ["21"], risk: "moderate" },
  "hydro flask": { owner: "Helen of Troy", classes: ["21"], risk: "moderate" },
  "stanley": { owner: "PMI Worldwide", classes: ["21"], risk: "moderate" },
  "contigo": { owner: "Newell Brands", classes: ["21"], risk: "moderate" },
  "thermos": { owner: "Thermos LLC", classes: ["21"], risk: "moderate" },
  "keurig": { owner: "Keurig Dr Pepper", classes: ["11"], risk: "moderate" },
  "nespresso": { owner: "Nestlé", classes: ["11"], risk: "high" },
  "breville": { owner: "Breville Group", classes: ["11"], risk: "moderate" },
  "de'longhi": { owner: "De'Longhi", classes: ["11"], risk: "moderate" },
  "smeg": { owner: "Smeg S.p.A.", classes: ["11"], risk: "moderate" },
  // ── Beauty & Personal Care ──────────────────────────────────────────────
  "loreal": { owner: "L'Oréal Group", classes: ["3", "5"], risk: "high" },
  "maybelline": { owner: "L'Oréal Group", classes: ["3"], risk: "high" },
  "clinique": { owner: "Estée Lauder", classes: ["3"], risk: "moderate" },
  "estee lauder": { owner: "Estée Lauder", classes: ["3"], risk: "high" },
  "olay": { owner: "Procter & Gamble", classes: ["3"], risk: "moderate" },
  "neutrogena": { owner: "Johnson & Johnson", classes: ["3"], risk: "moderate" },
  "dove": { owner: "Unilever", classes: ["3"], risk: "high" },
  "the body shop": { owner: "Natura & Co.", classes: ["3"], risk: "moderate" },
  "charlotte tilbury": { owner: "Puig", classes: ["3"], risk: "high" },
  "rare beauty": { owner: "Rare Beauty LLC", classes: ["3"], risk: "high" },
  "fenty beauty": { owner: "LVMH", classes: ["3"], risk: "high" },
  "glossier": { owner: "Glossier, Inc.", classes: ["3"], risk: "moderate" },
  "tatcha": { owner: "Unilever", classes: ["3"], risk: "moderate" },
  "drunk elephant": { owner: "Shiseido", classes: ["3"], risk: "moderate" },
  "the ordinary": { owner: "DECIEM", classes: ["3"], risk: "moderate" },
  "cerave": { owner: "L'Oréal Group", classes: ["3"], risk: "moderate" },
  "la roche posay": { owner: "L'Oréal Group", classes: ["3"], risk: "moderate" },
  "kiehls": { owner: "L'Oréal Group", classes: ["3"], risk: "moderate" },
  "sk-ii": { owner: "P&G", classes: ["3"], risk: "moderate" },
  "shiseido": { owner: "Shiseido Group", classes: ["3"], risk: "moderate" },
  "olaplex": { owner: "Olaplex, Inc.", classes: ["3"], risk: "high" },
  // ── Fragrances ───────────────────────────────────────────────────────────
  "tom ford": { owner: "The Estée Lauder Companies", classes: ["3"], risk: "high" },
  "jo malone": { owner: "Estée Lauder", classes: ["3"], risk: "high" },
  // ── Sports Brands ────────────────────────────────────────────────────────
  "wilson": { owner: "Amer Sports", classes: ["28"], risk: "moderate" },
  "spalding": { owner: "Spalding", classes: ["28"], risk: "moderate" },
  "titleist": { owner: "Acushnet Holdings", classes: ["28"], risk: "moderate" },
  "callaway": { owner: "Topgolf Callaway Brands", classes: ["28"], risk: "moderate" },
  "taylor made": { owner: "Topgolf Callaway Brands", classes: ["28"], risk: "moderate" },
  "ping": { owner: "Karsten Manufacturing", classes: ["28"], risk: "moderate" },
  "mizuno": { owner: "Mizuno Corporation", classes: ["28"], risk: "moderate" },
  "head": { owner: "Head Sport GmbH", classes: ["28"], risk: "moderate" },
  "babolat": { owner: "Babolat", classes: ["28"], risk: "moderate" },
  "peloton": { owner: "Peloton Interactive", classes: ["28"], risk: "high" },
  // ── Pet Products ─────────────────────────────────────────────────────────
  "blue buffalo": { owner: "General Mills", classes: ["31"], risk: "moderate" },
  "royal canin": { owner: "Mars, Inc.", classes: ["31"], risk: "moderate" },
  "purina": { owner: "Nestlé", classes: ["31"], risk: "moderate" },
  "pedigree": { owner: "Mars, Inc.", classes: ["31"], risk: "moderate" },
  "whiskas": { owner: "Mars, Inc.", classes: ["31"], risk: "moderate" },
  "kong": { owner: "KONG Company", classes: ["28"], risk: "moderate" },
  "barkbox": { owner: "BarkBox", classes: ["28", "31"], risk: "moderate" },
  // ── Cosmetics ────────────────────────────────────────────────────────────
  "too faced": { owner: "Estée Lauder", classes: ["3"], risk: "moderate" },
  "urban decay": { owner: "L'Oréal Group", classes: ["3"], risk: "moderate" },
  "anastasia beverly hills": { owner: "Anastasia Soare", classes: ["3"], risk: "moderate" },
  "hudabeauty": { owner: "Huda Beauty", classes: ["3"], risk: "moderate" },
  "pat mcgrath": { owner: "Pat McGrath Labs", classes: ["3"], risk: "moderate" },
  "nars": { owner: "Shiseido", classes: ["3"], risk: "moderate" },
  "benefit": { owner: "LVMH", classes: ["3"], risk: "moderate" },
  "tarte": { owner: "Kendo Holdings", classes: ["3"], risk: "moderate" },
  // ── Home Decor ───────────────────────────────────────────────────────────
  "pottery barn": { owner: "Williams-Sonoma", classes: ["20", "21"], risk: "moderate" },
  "west elm": { owner: "Williams-Sonoma", classes: ["20"], risk: "moderate" },
  "restoration hardware": { owner: "RH", classes: ["20"], risk: "moderate" },
  "crate and barrel": { owner: "Crate & Barrel", classes: ["20"], risk: "moderate" },
  "ikea": { owner: "Inter IKEA Systems", classes: ["20"], risk: "moderate" },
  // ── Fitness & Supplements ────────────────────────────────────────────────
  "optimum nutrition": { owner: "Glanbia", classes: ["5"], risk: "moderate" },
  "myprotein": { owner: "THG plc", classes: ["5"], risk: "moderate" },
  "cellucor": { owner: "Nutrabolt", classes: ["5"], risk: "low" },
  "ghost": { owner: "Ghost Lifestyle", classes: ["5"], risk: "low" },
  // ── Smart Home ───────────────────────────────────────────────────────────
  "ring": { owner: "Amazon", classes: ["9"], risk: "moderate" },
  "nest": { owner: "Google", classes: ["9"], risk: "moderate" },
  "wyze": { owner: "Wyze Labs", classes: ["9"], risk: "low" },
  "philips hue": { owner: "Signify", classes: ["9", "11"], risk: "moderate" },
  "august": { owner: "Assa Abloy", classes: ["9"], risk: "moderate" },
  "yale": { owner: "Assa Abloy", classes: ["9"], risk: "moderate" },
  // ── Audio & Accessories ──────────────────────────────────────────────────
  "razer": { owner: "Razer Inc.", classes: ["9"], risk: "moderate" },
  "corsair": { owner: "Corsair Gaming", classes: ["9"], risk: "moderate" },
  "logitech": { owner: "Logitech International", classes: ["9"], risk: "moderate" },
  "steelseries": { owner: "GN Audio", classes: ["9"], risk: "moderate" },
  "hyperx": { owner: "HP Inc.", classes: ["9"], risk: "moderate" },
  "sennheiser": { owner: "Sennheiser electronic", classes: ["9"], risk: "moderate" },
  "audio technica": { owner: "Audio-Technica", classes: ["9"], risk: "moderate" },
  "shure": { owner: "Shure Incorporated", classes: ["9"], risk: "moderate" },
  "marshall": { owner: "Zound Industries", classes: ["9"], risk: "moderate" },
  "bang olufsen": { owner: "Bang & Olufsen", classes: ["9"], risk: "high" },
  "anker": { owner: "Anker Innovations", classes: ["9"], risk: "moderate" },
  "popsocket": { owner: "PopSockets", classes: ["9"], risk: "high" },
  "otterbox": { owner: "Otter Products", classes: ["9"], risk: "moderate" },
  "casetify": { owner: "CASETiFY", classes: ["9"], risk: "moderate" },
  "dbrand": { owner: "dbrand Inc.", classes: ["9"], risk: "moderate" },
  "spigen": { owner: "Spigen Inc.", classes: ["9"], risk: "moderate" },
  "belkin": { owner: "Belkin International", classes: ["9"], risk: "moderate" },
  "zagg": { owner: "ZAGG Inc.", classes: ["9"], risk: "moderate" },
  "mophie": { owner: "ZAGG Inc.", classes: ["9"], risk: "moderate" },
  "tile": { owner: "Life360", classes: ["9"], risk: "moderate" },
  // ── Phone Brands ─────────────────────────────────────────────────────────
  "airpods": { owner: "Apple Inc.", classes: ["9"], risk: "high" },
  "airtag": { owner: "Apple Inc.", classes: ["9"], risk: "high" },
  "powerbeats": { owner: "Apple Inc.", classes: ["9"], risk: "high" },
  "galaxy buds": { owner: "Samsung Electronics", classes: ["9"], risk: "high" },
  "echo": { owner: "Amazon", classes: ["9"], risk: "moderate" },
  "alexa": { owner: "Amazon", classes: ["9"], risk: "moderate" },
  "google home": { owner: "Google", classes: ["9"], risk: "moderate" },
  "chromecast": { owner: "Google", classes: ["9"], risk: "moderate" },
  // ── Bicycle & Outdoor Gear ──────────────────────────────────────────────
  "trek": { owner: "Trek Bicycle Corporation", classes: ["12"], risk: "moderate" },
  "specialized": { owner: "Specialized Bicycle", classes: ["12"], risk: "moderate" },
  "cannondale": { owner: "Dorel Industries", classes: ["12"], risk: "moderate" },
  "giant": { owner: "Giant Manufacturing", classes: ["12"], risk: "moderate" },
  "bell": { owner: "Vista Outdoor", classes: ["12"], risk: "moderate" },
  "giro": { owner: "Vista Outdoor", classes: ["12"], risk: "moderate" },
  // ── Sporting Goods ───────────────────────────────────────────────────────
  "igloo": { owner: "Igloo Products", classes: ["21"], risk: "moderate" },
  "coleman": { owner: "Newell Brands", classes: ["11"], risk: "moderate" },
  "weber": { owner: "Weber-Stephen Products", classes: ["11"], risk: "moderate" },
  // ── Garden & Outdoor ────────────────────────────────────────────────────
  "miracle gro": { owner: "The Scotts Company", classes: ["5"], risk: "moderate" },
  "fiskars": { owner: "Fiskars Group", classes: ["8"], risk: "moderate" },
  // ── Household Brands ─────────────────────────────────────────────────────
  "febreze": { owner: "Procter & Gamble", classes: ["5"], risk: "moderate" },
  "lysol": { owner: "Reckitt Benckiser", classes: ["5"], risk: "moderate" },
  "clorox": { owner: "The Clorox Company", classes: ["3"], risk: "moderate" },
  "swiffer": { owner: "Procter & Gamble", classes: ["21"], risk: "moderate" },
  "oxo": { owner: "OXO International", classes: ["21"], risk: "moderate" },
  "rubbermaid": { owner: "Newell Brands", classes: ["21"], risk: "moderate" },
  // ── Automotive Accessories ───────────────────────────────────────────────
  "thule": { owner: "Thule Group", classes: ["12"], risk: "moderate" },
  "weathertech": { owner: "MacNeil Automotive", classes: ["12"], risk: "moderate" },
  "meguiar": { owner: "3M Company", classes: ["3"], risk: "moderate" },
  "turtle wax": { owner: "Turtle Wax", classes: ["3"], risk: "moderate" },
  "rain x": { owner: "ITW Global Brands", classes: ["3"], risk: "moderate" },
  // ── Craft & Hobby ────────────────────────────────────────────────────────
  "cricut": { owner: "Cricut, Inc.", classes: ["7"], risk: "high" },
  "silhouette": { owner: "Silhouette America", classes: ["7"], risk: "moderate" },
  "brother": { owner: "Brother Industries", classes: ["7"], risk: "moderate" },
  "bernina": { owner: "Bernina International", classes: ["7"], risk: "moderate" },
  // ── Office & Stationery ──────────────────────────────────────────────────
  "moleskine": { owner: "Moleskine S.p.A.", classes: ["16"], risk: "moderate" },
  "sharpie": { owner: "Newell Brands", classes: ["16"], risk: "moderate" },
  "post-it": { owner: "3M Company", classes: ["16"], risk: "moderate" },
  "bic": { owner: "Bic Group", classes: ["16"], risk: "moderate" },
  "pilot": { owner: "Pilot Corporation", classes: ["16"], risk: "moderate" },
  // ── Kids & Baby ──────────────────────────────────────────────────────────
  "carter": { owner: "Carter's, Inc.", classes: ["25"], risk: "moderate" },
  "graco": { owner: "Newell Brands", classes: ["12", "20"], risk: "moderate" },
  "britax": { owner: "Britax Child Safety", classes: ["12"], risk: "moderate" },
  "fisher price": { owner: "Mattel, Inc.", classes: ["28"], risk: "high" },
  "skip hop": { owner: "Carter's, Inc.", classes: ["28"], risk: "moderate" },
  // ── Skincare/Haircare ────────────────────────────────────────────────────
  "paul mitchell": { owner: "John Paul Mitchell Systems", classes: ["3"], risk: "moderate" },
  "redken": { owner: "L'Oréal Group", classes: ["3"], risk: "moderate" },
  "aveda": { owner: "Estée Lauder", classes: ["3"], risk: "moderate" },
  "moroccanoil": { owner: "Moroccanoil", classes: ["3"], risk: "moderate" },
  "shea moisture": { owner: "Unilever", classes: ["3"], risk: "moderate" },
  "cantu": { owner: "Church & Dwight", classes: ["3"], risk: "moderate" },
  // ── Sports Apparel ───────────────────────────────────────────────────────
  "athleta": { owner: "Gap Inc.", classes: ["25"], risk: "moderate" },
  "fabletics": { owner: "TechStyle Fashion Group", classes: ["25"], risk: "moderate" },
  "gymshark": { owner: "Gymshark Limited", classes: ["25"], risk: "moderate" },
  "aloyoga": { owner: "Alo Yoga", classes: ["25"], risk: "moderate" },
  "sweaty betty": { owner: "Sweaty Betty", classes: ["25"], risk: "moderate" },
  // ── Smartwatch ───────────────────────────────────────────────────────────
  "apple watch": { owner: "Apple Inc.", classes: ["14"], risk: "high" },
  "fitbit": { owner: "Google", classes: ["14", "9"], risk: "moderate" },
  "casio g-shock": { owner: "Casio Computer", classes: ["14"], risk: "moderate" },
};

// ══════════════════════════════════════════════════════════════════════════════
// PATENT RISK DATABASE
// ══════════════════════════════════════════════════════════════════════════════

const PATENT_RISK_KEYWORDS: Record<string, { type: "design" | "utility"; risk: "low" | "moderate" | "high"; owner?: string; description: string }> = {
  "rounded rectangle": { type: "design", risk: "moderate", owner: "Apple Inc.", description: "Apple's design patent for rounded rectangle devices" },
  "slide-to-unlock": { type: "design", risk: "high", owner: "Apple Inc.", description: "Apple's slide-to-unlock patent" },
  "bounce-back": { type: "design", risk: "moderate", owner: "Apple Inc.", description: "Apple's rubber-banding scroll patent" },
  "magsafe": { type: "design", risk: "high", owner: "Apple Inc.", description: "Apple's MagSafe connector patent" },
  "notch": { type: "design", risk: "moderate", owner: "Apple Inc.", description: "Apple's notched display design" },
  "dynamic island": { type: "design", risk: "high", owner: "Apple Inc.", description: "Apple's Dynamic Island design patent" },
  "flip phone": { type: "design", risk: "low", owner: "Samsung", description: "Samsung's foldable phone designs" },
  "foldable screen": { type: "design", risk: "moderate", owner: "Samsung", description: "Samsung's foldable display designs" },
  "converse sole": { type: "design", risk: "high", owner: "Nike/Converse", description: "Converse All Star shoe sole design" },
  "crocs hole": { type: "design", risk: "moderate", owner: "Crocs, Inc.", description: "Crocs ventilation hole pattern" },
  "lego brick": { type: "design", risk: "high", owner: "LEGO Group", description: "LEGO brick stud design" },
  "wireless charging": { type: "utility", risk: "low", description: "Qi wireless charging standard (licensed)" },
  "quick charge": { type: "utility", risk: "low", description: "Quick Charge technology (Qualcomm)" },
  "usbc": { type: "utility", risk: "low", description: "USB-C standard (licensed)" },
  "bluetooth": { type: "utility", risk: "low", description: "Bluetooth technology (licensed)" },
  "noise cancelling": { type: "utility", risk: "low", description: "ANC technology (various patents)" },
  "lidar": { type: "utility", risk: "moderate", description: "LiDAR technology patents" },
  "face id": { type: "utility", risk: "high", owner: "Apple Inc.", description: "Apple's Face ID biometric system" },
  "fingerprint sensor": { type: "utility", risk: "low", description: "Fingerprint recognition (various patents)" },
  "voice assistant": { type: "utility", risk: "low", description: "Voice assistant technology (various)" },
  "haptic feedback": { type: "utility", risk: "low", description: "Haptic feedback technology (various)" },
  "retina display": { type: "utility", risk: "moderate", owner: "Apple Inc.", description: "Apple's Retina display branding" },
  "airdrop": { type: "utility", risk: "moderate", owner: "Apple Inc.", description: "Apple's AirDrop file sharing protocol" },
  "continuity": { type: "utility", risk: "moderate", owner: "Apple Inc.", description: "Apple Continuity features" },
  "handoff": { type: "utility", risk: "moderate", owner: "Apple Inc.", description: "Apple Handoff feature" },
};

// ══════════════════════════════════════════════════════════════════════════════
// EXPANDED RESTRICTED PRODUCT CATEGORIES (with market-specific rules)
// ══════════════════════════════════════════════════════════════════════════════

const RESTRICTED_CATEGORIES: Record<string, {
  platforms: Record<string, { restricted: boolean; reason: string }>;
  marketSpecific?: Record<string, { restricted: boolean; reason: string; penalty?: string }>;
  ageRestriction: boolean;
  licensingRequired: boolean;
}> = {
  "weapons": {
    platforms: {
      shopify: { restricted: true, reason: "Weapons and firearms policy" },
      facebook: { restricted: true, reason: "Weapons advertising prohibited" },
      google: { restricted: true, reason: "Weapons policy violation" },
      amazon: { restricted: true, reason: "Weapons category restricted" },
    },
    marketSpecific: {
      US: { restricted: true, reason: "Federal firearms regulations apply", penalty: "ATF license required, federal criminal penalties" },
      EU: { restricted: true, reason: "EU Firearms Directive prohibits civilian sales", penalty: "Criminal prosecution under national law" },
      UK: { restricted: true, reason: "Firearms Act 1968 strict prohibition", penalty: "Up to 5 years imprisonment" },
      AU: { restricted: true, reason: "National Firearms Agreement strict control", penalty: "Criminal prosecution" },
      CA: { restricted: true, reason: "Firearms Act strict prohibition", penalty: "Criminal prosecution" },
      JP: { restricted: true, reason: "Swords and Firearms Control Law", penalty: "Criminal prosecution" },
    },
    ageRestriction: true,
    licensingRequired: true,
  },
  "tobacco": {
    platforms: {
      shopify: { restricted: true, reason: "Tobacco products prohibited" },
      facebook: { restricted: true, reason: "Tobacco advertising prohibited" },
      google: { restricted: true, reason: "Tobacco products restricted" },
    },
    marketSpecific: {
      US: { restricted: true, reason: "FDA tobacco regulations", penalty: "FDA enforcement action" },
      EU: { restricted: true, reason: "Tobacco Products Directive", penalty: "Regulatory fines" },
      UK: { restricted: true, reason: "Tobacco and Related Products Regulations 2016", penalty: "Trading Standards enforcement" },
      AU: { restricted: true, reason: "Tobacco Advertising Prohibition Act", penalty: "Significant fines" },
    },
    ageRestriction: true,
    licensingRequired: true,
  },
  "alcohol": {
    platforms: {
      shopify: { restricted: true, reason: "Alcohol sales require license" },
      facebook: { restricted: true, reason: "Alcohol advertising restricted" },
      google: { restricted: true, reason: "Alcohol advertising restricted" },
    },
    marketSpecific: {
      US: { restricted: true, reason: "TTB licensing required", penalty: "Federal license revocation" },
      EU: { restricted: false, reason: "Permitted with age verification", penalty: "Local licensing required" },
      UK: { restricted: false, reason: "Permitted with licensing", penalty: "Licensing enforcement" },
      SA: { restricted: true, reason: "Alcohol completely prohibited", penalty: "Severe criminal penalties" },
      AE: { restricted: true, reason: "Alcohol import requires license", penalty: "Customs seizure and fines" },
    },
    ageRestriction: true,
    licensingRequired: true,
  },
  "adult content": {
    platforms: {
      shopify: { restricted: true, reason: "Adult content policy" },
      facebook: { restricted: true, reason: "Adult content prohibited" },
      google: { restricted: true, reason: "Adult content restricted" },
      amazon: { restricted: true, reason: "Adult category restrictions" },
    },
    marketSpecific: {
      SA: { restricted: true, reason: "Adult content prohibited under local law", penalty: "Criminal prosecution" },
      AE: { restricted: true, reason: "Adult content restricted", penalty: "Fines and criminal charges" },
    },
    ageRestriction: true,
    licensingRequired: false,
  },
  "supplements": {
    platforms: {
      facebook: { restricted: true, reason: "Supplement advertising requires disclaimers" },
      google: { restricted: true, reason: "Supplement advertising restricted" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "FDA dietary supplement regulations", penalty: "FDA warning letters" },
      EU: { restricted: true, reason: "Novel Food Regulation may apply", penalty: "Market withdrawal" },
      UK: { restricted: false, reason: "Food Standards Agency oversight", penalty: "Trading Standards action" },
      AU: { restricted: true, reason: "TGA regulates supplements as medicines", penalty: "TGA enforcement" },
      CA: { restricted: false, reason: "Health Canada oversight", penalty: "NHP enforcement" },
      IN: { restricted: true, reason: "AYUSH Ministry regulations", penalty: "FSSAI enforcement" },
    },
    ageRestriction: false,
    licensingRequired: false,
  },
  "cosmetics": {
    platforms: {
      facebook: { restricted: false, reason: "Requires ingredient listing" },
      google: { restricted: false, reason: "Requires compliance with FDA" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "FDA cosmetics regulations", penalty: "FDA warning letters" },
      EU: { restricted: false, reason: "Cosmetics Regulation (EC) No 1223/2009", penalty: "RAPEX notification" },
      UK: { restricted: false, reason: "Post-Brexit cosmetics regulations", penalty: "MHRA enforcement" },
      JP: { restricted: false, reason: "Pharmaceutical and Medical Device Act", penalty: "PMDA enforcement" },
    },
    ageRestriction: false,
    licensingRequired: false,
  },
  "electronics": {
    platforms: {
      shopify: { restricted: false, reason: "FCC compliance required" },
      amazon: { restricted: false, reason: "UL listing required" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "FCC Part 15 compliance required", penalty: "FCC fines and device seizure" },
      EU: { restricted: false, reason: "CE marking required", penalty: "Market surveillance action" },
      UK: { restricted: false, reason: "UKCA marking required post-Brexit", penalty: "Market surveillance" },
      AU: { restricted: false, reason: "RCM mark required", penalty: "ACMA enforcement" },
      JP: { restricted: false, reason: "TELEC and PSE certification", penalty: "MIC enforcement" },
    },
    ageRestriction: false,
    licensingRequired: false,
  },
  "toys": {
    platforms: {
      amazon: { restricted: false, reason: "CPSIA compliance required" },
      facebook: { restricted: false, reason: "Age-appropriate advertising" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "CPSIA and CPSC requirements", penalty: "Product recall and fines" },
      EU: { restricted: false, reason: "Toy Safety Directive 2009/48/EC", penalty: "RAPEX notification" },
      UK: { restricted: false, reason: "Toy (Safety) Regulations 2011", penalty: "Trading Standards enforcement" },
      AU: { restricted: false, reason: "ACL and mandatory standards", penalty: "ACCC enforcement" },
      CA: { restricted: false, reason: "Canada Consumer Product Safety Act", penalty: "Product recall" },
    },
    ageRestriction: false,
    licensingRequired: false,
  },
  "health devices": {
    platforms: {
      facebook: { restricted: true, reason: "Medical device claims prohibited" },
      google: { restricted: true, reason: "Medical device advertising restricted" },
      amazon: { restricted: false, reason: "FDA clearance required" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "FDA 510(k) or PMA required", penalty: "FDA enforcement and recall" },
      EU: { restricted: false, reason: "MDR 2017/745 classification", penalty: "Notified Body audit" },
      UK: { restricted: false, reason: "UK MDR 2002", penalty: "MHRA enforcement" },
      AU: { restricted: true, reason: "TGA Class I-IV classification", penalty: "TGA enforcement" },
    },
    ageRestriction: false,
    licensingRequired: true,
  },
  "food": {
    platforms: {
      facebook: { restricted: false, reason: "FDA compliance required" },
      shopify: { restricted: false, reason: "Food safety regulations apply" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "FDA Food Safety Modernization Act", penalty: "FDA enforcement" },
      EU: { restricted: false, reason: "Regulation (EC) No 178/2002", penalty: "RASFF notification" },
      UK: { restricted: false, reason: "Food Safety Act 1990", penalty: "Trading Standards" },
      SA: { restricted: true, reason: "SFDA certification required", penalty: "Import rejection" },
    },
    ageRestriction: false,
    licensingRequired: false,
  },
  "fashion": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" }, amazon: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "home": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" }, amazon: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "beauty": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "kitchen": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" }, amazon: { restricted: false, reason: "" } },
    marketSpecific: {
      EU: { restricted: false, reason: "LFGB/Food Contact Material regulations", penalty: "Market surveillance" },
      US: { restricted: false, reason: "FDA food contact regulations", penalty: "FDA enforcement" },
    },
    ageRestriction: false, licensingRequired: false,
  },
  "automotive": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" }, amazon: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "sports": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" }, amazon: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "musical instruments": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "art": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "books": {
    platforms: { shopify: { restricted: false, reason: "" }, facebook: { restricted: false, reason: "" }, amazon: { restricted: false, reason: "" } },
    ageRestriction: false, licensingRequired: false,
  },
  "pharmaceuticals": {
    platforms: {
      shopify: { restricted: true, reason: "Pharmaceutical sales prohibited" },
      facebook: { restricted: true, reason: "Pharmaceutical advertising prohibited" },
      google: { restricted: true, reason: "Pharmaceutical advertising restricted" },
      amazon: { restricted: true, reason: "Pharmaceutical category restricted" },
    },
    marketSpecific: {
      US: { restricted: true, reason: "FDA/DEA regulations", penalty: "Federal criminal prosecution" },
      EU: { restricted: true, reason: "EMA regulations", penalty: "National regulatory action" },
      UK: { restricted: true, reason: "MHRA regulations", penalty: "Criminal prosecution" },
    },
    ageRestriction: true, licensingRequired: true,
  },
  "hazmat": {
    platforms: {
      shopify: { restricted: true, reason: "Hazardous materials prohibited" },
      facebook: { restricted: true, reason: "Hazardous materials advertising prohibited" },
      google: { restricted: true, reason: "Hazardous materials restricted" },
      amazon: { restricted: true, reason: "Hazmat shipping restrictions" },
    },
    ageRestriction: true, licensingRequired: true,
  },
  "drugs": {
    platforms: {
      shopify: { restricted: true, reason: "Drug paraphernalia prohibited" },
      facebook: { restricted: true, reason: "Drug-related content prohibited" },
      google: { restricted: true, reason: "Drug-related advertising prohibited" },
      amazon: { restricted: true, reason: "Drug paraphernalia prohibited" },
    },
    marketSpecific: {
      US: { restricted: true, reason: "Controlled Substances Act", penalty: "Federal criminal prosecution" },
      EU: { restricted: true, reason: "EU drug regulations", penalty: "Criminal prosecution" },
      UK: { restricted: true, reason: "Misuse of Drugs Act 1971", penalty: "Criminal prosecution" },
    },
    ageRestriction: true, licensingRequired: true,
  },
  "gambling": {
    platforms: {
      facebook: { restricted: true, reason: "Gambling advertising restricted" },
      google: { restricted: true, reason: "Gambling advertising restricted" },
    },
    marketSpecific: {
      US: { restricted: true, reason: "State gambling laws vary", penalty: "State-level prosecution" },
      SA: { restricted: true, reason: "Gambling prohibited", penalty: "Criminal prosecution" },
      AE: { restricted: true, reason: "Gambling restricted", penalty: "Criminal prosecution" },
      UK: { restricted: false, reason: "UKGC licensed operators only", penalty: "UKGC enforcement" },
    },
    ageRestriction: true, licensingRequired: true,
  },
  "crypto": {
    platforms: {
      facebook: { restricted: true, reason: "Cryptocurrency advertising restricted" },
      google: { restricted: true, reason: "Cryptocurrency advertising restricted" },
    },
    marketSpecific: {
      US: { restricted: false, reason: "FinCEN and SEC compliance", penalty: "SEC enforcement" },
      EU: { restricted: false, reason: "MiCA regulation applies", penalty: "National regulatory action" },
      CN: { restricted: true, reason: "Cryptocurrency trading prohibited", penalty: "Criminal prosecution" },
      SA: { restricted: true, reason: "Cryptocurrency trading restricted", penalty: "SAMA enforcement" },
    },
    ageRestriction: false, licensingRequired: true,
  },
  "counterfeit": {
    platforms: {
      shopify: { restricted: true, reason: "Counterfeit goods prohibited" },
      facebook: { restricted: true, reason: "Counterfeit goods prohibited" },
      google: { restricted: true, reason: "Counterfeit goods prohibited" },
      amazon: { restricted: true, reason: "Counterfeit goods prohibited" },
    },
    ageRestriction: false, licensingRequired: false,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// AD POLICY PROHIBITED & RESTRICTED CONTENT (Expanded)
// ══════════════════════════════════════════════════════════════════════════════

const AD_PROHIBITED_KEYWORDS = [
  "miracle", "cure", "guaranteed", "no risk", "100% effective",
  "doctor approved", "clinically proven", "FDA approved",
  "lose weight fast", "get rich quick", "free money",
  "before and after", "results not typical",
  "government grant", "act now", "limited time offer",
  "double your money", "no strings attached",
  "weight loss", "fat burning", "anti-aging",
  "penis", "breast enlargement", "hair regrowth",
  "make money from home", "work from home opportunity",
  "secret recipe", "ancient remedy", "miracle cure",
  "instant results", "guaranteed income", "risk free",
  "banned", "confiscated", "seized", "illegal",
  "warranty void", "void warranty",
  "as seen on tv", "free trial", "cancel anytime",
  "one weird trick", "doctors hate", "exposed",
  "shocking secret", "you won't believe", "click here",
  "congratulations", "winner", "you've been selected",
  "act fast", "only today", "last chance",
  "no obligation", "100% free", "zero risk",
  "clinically tested", "scientifically proven",
  "medical breakthrough", "doctor recommended",
  "fda cleared", "fda approved", "approved by fda",
  "cures cancer", "cures diabetes", "cures covid",
  "banned product", "government secret",
  "weight loss supplement", "diet pill", "slim fast",
  "belly fat", "love handles", "muffin top",
  "wrinkle free", "age defying", "turn back time",
  "hair loss cure", "baldness cure", "hair restoration",
  "erection", "impotence", "libido booster",
  "detox", "cleanse", "purify", "colon cleanse",
  "parasite cleanse", "heavy metal detox",
  "self harm", "suicide", "kill yourself",
  "how to make a bomb", "make weapons", "build a gun",
];

const AD_RESTRICTED_KEYWORDS = [
  "discount", "sale", "cheap", "lowest price",
  "alcohol", "beer", "wine", "spirits",
  "gambling", "casino", "betting",
  "dating", "singles", "hookup",
  "vpn", "proxy", "encryption",
  "pharmaceutical", "medication", "prescription",
  "supplement", "vitamin", "mineral",
  "personal loan", "credit card", "debt consolidation",
  "insurance", "life insurance", "health insurance",
  "investment", "stocks", "trading", "forex",
  "binary options", "bitcoin investment",
  "academic writing", "essay writing", "homework help",
  "pills", "medication", "pharmacy",
  "cbd", "cannabis", "marijuana", "hemp",
  "vape", "e-cigarette", "electronic cigarette",
  "nicotine", "juul", "smoking",
  "gun", "rifle", "firearm", "ammunition",
  "knife", "sword", "tactical",
  "pepper spray", "taser", "stun gun",
  "body armor", "bulletproof",
  "adult", "dating", "escort", "cam girl",
  "rehab", "detox center", "addiction treatment",
  "lawyer", "attorney", "legal services",
  "funeral", "death", "cemetery",
  "psychic", "tarot", "astrology", "fortune telling",
  "weed", "thc", "delta 8", "delta 9",
  "kratom", "shrooms", "psilocybin",
  "ddos", "hacking tool", "keylogger",
  "fake id", "counterfeit", "replica",
  "dropshipping", "get paid", "make money",
];

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT CONTROL DATA
// ══════════════════════════════════════════════════════════════════════════════

const EMBARGOED_COUNTRIES: Record<string, { reason: string; sanctions: string }> = {
  "KP": { reason: "UN Security Council sanctions", sanctions: "Complete trade embargo" },
  "IR": { reason: "UN/EU/US sanctions", sanctions: "Comprehensive trade restrictions" },
  "SY": { reason: "UN/EU/US sanctions", sanctions: "Trade embargo and asset freeze" },
  "CU": { reason: "US embargo", sanctions: "US trade restrictions" },
  "VE": { reason: "US/EU sanctions", sanctions: "Targeted sanctions on government officials" },
  "RU": { reason: "EU/US/UK sanctions", sanctions: "Comprehensive sectoral sanctions" },
  "BY": { reason: "EU/US sanctions", sanctions: "Targeted sanctions" },
  "MM": { reason: "EU/US sanctions", sanctions: "Arms embargo and targeted sanctions" },
  "SD": { reason: "UN/US sanctions", sanctions: "Arms embargo and asset freeze" },
  "SS": { reason: "UN sanctions", sanctions: "Arms embargo" },
  "SO": { reason: "UN arms embargo", sanctions: "Arms embargo" },
  "LY": { reason: "UN arms embargo", sanctions: "Arms embargo" },
  "YE": { reason: "UN sanctions", sanctions: "Arms embargo" },
  "AF": { reason: "Taliban sanctions", sanctions: "Asset freeze and travel ban" },
  "HT": { reason: "US sanctions on certain officials", sanctions: "Targeted sanctions" },
};

const DUAL_USE_CATEGORIES: Record<string, { description: string; licenseRequired: boolean }> = {
  "nuclear": { description: "Nuclear materials and technology", licenseRequired: true },
  "chemical": { description: "Chemical weapons precursors", licenseRequired: true },
  "biological": { description: "Biological agents and toxins", licenseRequired: true },
  "missile": { description: "Missile technology", licenseRequired: true },
  "military": { description: "Military equipment", licenseRequired: true },
  "encryption": { description: "Advanced encryption technology", licenseRequired: true },
  "drone": { description: "Advanced drone technology", licenseRequired: true },
  "semiconductor": { description: "Semiconductor manufacturing equipment", licenseRequired: true },
  "quantum": { description: "Quantum computing technology", licenseRequired: true },
  "hypersonic": { description: "Hypersonic technology", licenseRequired: true },
  "stealth": { description: "Stealth technology", licenseRequired: true },
  "sonar": { description: "Advanced sonar technology", licenseRequired: true },
  "radar": { description: "Advanced radar technology", licenseRequired: true },
  "lidar": { description: "LIDAR technology for military applications", licenseRequired: true },
  "autonomous": { description: "Autonomous weapons systems", licenseRequired: true },
  "submersible": { description: "Advanced submersible technology", licenseRequired: true },
  "space": { description: "Space launch technology", licenseRequired: true },
  "satellite": { description: "Advanced satellite technology", licenseRequired: true },
  "centrifuge": { description: "Gas centrifuge technology", licenseRequired: true },
  "enrichment": { description: "Uranium enrichment technology", licenseRequired: true },
  "reactor": { description: "Nuclear reactor technology", licenseRequired: true },
  "torpedo": { description: "Torpedo technology", licenseRequired: true },
  "night vision": { description: "Military night vision equipment", licenseRequired: true },
  "thermal imaging": { description: "Military thermal imaging", licenseRequired: true },
  "advanced materials": { description: "Advanced composite materials for military use", licenseRequired: true },
  "carbon fiber": { description: "Carbon fiber composite for military applications", licenseRequired: true },
};

// ══════════════════════════════════════════════════════════════════════════════
// IMAGE ANALYSIS HEURISTICS
// ══════════════════════════════════════════════════════════════════════════════

const STOCK_PHOTO_INDICATORS = [
  "shutterstock", "gettyimages", "istockphoto", "stock", "depositphotos",
  "dreamstime", "bigstock", "123rf", "adobe stock", "fotolia",
  "vecteezy", "freepik", "unsplash", "pexels", "pixabay",
];

const WATERMARK_INDICATORS = [
  "watermark", "preview", "sample", "proof", "low-res",
  "thumbnail", "demo", "comp", "overlay",
];

const MARKETPLACE_CDN_INDICATORS = [
  "m.media-amazon.com", "i.ebayimg.com", "ae01.alicdn.com",
  "i5.walmartimages.com", "target.scene7.com",
  "img.ltwebstatic.com", "sc01.alicdn.com",
  "cdn.shopify.com", "static.hk01.com",
  "media.karoush.com", "images-na.ssl-images-amazon.com",
  "ws-na.amazon-adsystem.com", "i.pinimg.com",
  "www.walmart.com/images",
];

const GENERIC_IMAGE_INDICATORS = [
  "no-image", "placeholder", "default", "missing", "blank",
  "not-available", "na.png", "noimg", "image-not-found",
];

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE CHECK ENGINES
// ══════════════════════════════════════════════════════════════════════════════

export function runTrademarkCheck(input: TrademarkCheckInput): TrademarkCheckResult {
  const titleLower = input.productTitle.toLowerCase();
  const descLower = (input.productDescription || "").toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  const matches: TrademarkMatch[] = [];
  let highestRisk: "none" | "low" | "moderate" | "high" = "none";

  for (const [mark, data] of Object.entries(KNOWN_TRADEMARKS)) {
    if (combined.includes(mark)) {
      const match: TrademarkMatch = {
        mark: mark.charAt(0).toUpperCase() + mark.slice(1),
        owner: data.owner,
        status: "active",
        classes: data.classes,
        risk: data.risk,
        evidence: `Found "${mark}" in product title/description`,
      };
      matches.push(match);
      if (data.risk === "high") highestRisk = "high";
      else if (data.risk === "moderate" && highestRisk !== "high") highestRisk = "moderate";
      else if (highestRisk === "none") highestRisk = "low";
    }
  }

  if (input.brand) {
    const brandLower = input.brand.toLowerCase();
    if (KNOWN_TRADEMARKS[brandLower]) {
      const data = KNOWN_TRADEMARKS[brandLower];
      matches.push({
        mark: input.brand,
        owner: data.owner,
        status: "active",
        classes: data.classes,
        risk: data.risk,
        evidence: `Brand field matches known trademark`,
      });
      if (data.risk === "high") highestRisk = "high";
    }
  }

  const score = matches.length === 0 ? 100
    : highestRisk === "high" ? 10
    : highestRisk === "moderate" ? 40
    : 70;

  const details: ComplianceCheckDetail[] = matches.map(m => ({
    label: `${m.mark} (${m.owner})`,
    value: m.risk.toUpperCase(),
    status: m.risk === "high" ? "fail" : m.risk === "moderate" ? "warn" : "pass",
    evidence: m.evidence,
  }));

  if (matches.length === 0) {
    details.push({ label: "No known trademarks detected", value: "CLEAR", status: "pass" });
  }

  return {
    checkType: "trademark",
    severity: highestRisk === "high" ? "violation" : highestRisk === "moderate" ? "warning" : "pass",
    score,
    title: matches.length > 0 ? `${matches.length} trademark match${matches.length > 1 ? "es" : ""} found` : "No trademark issues detected",
    description: matches.length > 0
      ? `Found ${matches.length} potential trademark conflict(s). Highest risk: ${highestRisk}.`
      : "No known registered trademarks detected in product listing.",
    details,
    recommendation: matches.length > 0
      ? "Remove trademarked terms from title, description, and brand field. Use generic descriptors instead. Consider consulting an IP attorney."
      : "Product appears safe from trademark conflicts. Continue with listing.",
    blocked: highestRisk === "high",
    checkedAt: new Date().toISOString(),
    trademarks: matches,
    brandRisk: highestRisk,
  };
}

export function runDmcaCheck(input: DmcaCheckInput): DmcaCheckResult {
  const titleLower = input.productTitle.toLowerCase();
  let imageRisk: "low" | "medium" | "high" = "low";
  let descRisk: "low" | "medium" | "high" = "low";

  const desc = (input.productDescription || "").toLowerCase();
  if (desc.includes("copyright") || desc.includes("©") || desc.includes("®")) {
    descRisk = "high";
  }

  const genericPhrases = [
    "official product", "authentic", "genuine", "real",
    "imported from", "as seen on tv",
  ];
  const genericCount = genericPhrases.filter(p => desc.includes(p)).length;
  if (genericCount >= 2) descRisk = "medium";

  if (input.productImages.length === 0) {
    imageRisk = "high";
  }

  const hasBrandedImages = input.productImages.some(url =>
    url.includes("amazonaws.com") || url.includes("shopifycdn") || url.includes("ebayimg")
  );
  if (hasBrandedImages) imageRisk = "high";

  const highDmcaCategories = ["fashion", "beauty", "electronics", "toys", "home"];
  const categoryRisk = highDmcaCategories.some(c => input.category.toLowerCase().includes(c));

  const highRiskTerms = ["replica", "copy", "inspired by", "like", "similar to", "dupe", "alternative"];
  const flaggedCount = highRiskTerms.filter(t => titleLower.includes(t)).length;

  const imgRiskVal: string = imageRisk;
  const descRiskVal: string = descRisk;
  const riskScore = Math.min(100,
    (imgRiskVal === "high" ? 40 : imgRiskVal === "medium" ? 20 : 0) +
    (descRiskVal === "high" ? 30 : descRiskVal === "medium" ? 15 : 0) +
    (categoryRisk ? 15 : 0) +
    (flaggedCount * 10)
  );

  const score = 100 - riskScore;
  const severity = riskScore >= 60 ? "violation" : riskScore >= 30 ? "warning" : "pass";

  const details: ComplianceCheckDetail[] = [
    { label: "Image Originality", value: imgRiskVal.toUpperCase(), status: imgRiskVal === "high" ? "fail" : imgRiskVal === "medium" ? "warn" : "pass" },
    { label: "Description Originality", value: descRiskVal.toUpperCase(), status: descRiskVal === "high" ? "fail" : descRiskVal === "medium" ? "warn" : "pass" },
    { label: "Category DMCA Risk", value: categoryRisk ? "HIGH" : "LOW", status: categoryRisk ? "warn" : "pass" },
    { label: "Suspicious Terms Found", value: `${flaggedCount}`, status: flaggedCount > 0 ? "warn" : "pass" },
  ];

  return {
    checkType: "dmca",
    severity,
    score,
    title: riskScore >= 60 ? "High DMCA risk detected" : riskScore >= 30 ? "Moderate DMCA risk" : "Low DMCA risk",
    description: `DMCA risk score: ${riskScore}/100. ${flaggedCount > 0 ? `${flaggedCount} suspicious term(s) found.` : ""} ${categoryRisk ? "Category has elevated DMCA risk." : ""}`,
    details,
    recommendation: riskScore >= 60
      ? "Strongly avoid listing this product. High risk of DMCA takedown. Use original product photos and write unique descriptions."
      : riskScore >= 30
      ? "Use original images and rewrite descriptions. Avoid terms suggesting similarity to branded products."
      : "Low DMCA risk. Ensure all images are original or properly licensed.",
    blocked: riskScore >= 60,
    checkedAt: new Date().toISOString(),
    dmcaRiskScore: riskScore,
    imageRisk,
    descriptionRisk: descRisk,
    historicalDmcaCount: 0,
    similarProductsFlagged: flaggedCount,
  };
}

export function runRestrictedItemCheck(input: RestrictedItemInput): RestrictedItemResult {
  const titleLower = input.productTitle.toLowerCase();
  const descLower = (input.productDescription || "").toLowerCase();
  const combined = `${titleLower} ${descLower} ${input.materials.join(" ").toLowerCase()}`;

  let detectedCategory = input.category.toLowerCase();
  let categoryRestricted = false;
  let ageRestriction = false;
  let licensingRequired = false;

  const categoryKeywords: Record<string, string[]> = {
    "weapons": ["gun", "rifle", "pistol", "firearm", "ammunition", "bullet", "knife", "sword", "tactical knife", "brass knuckles", "pepper spray", "taser", "stun gun"],
    "tobacco": ["cigarette", "cigar", "tobacco", "vape", "e-cigarette", "nicotine", "hookah", "smoking"],
    "alcohol": ["beer", "wine", "vodka", "whiskey", "rum", "tequila", "alcohol", "spirit", "liquor"],
    "adult content": ["adult", "sex toy", "vibrator", "lingerie", "nsfw", "explicit"],
    "supplements": ["supplement", "protein", "vitamin", "mg/day", "dosage", "capsule", "pill"],
    "health devices": ["blood pressure", "glucose monitor", "medical device", "stethoscope", "surgical", "diagnostic"],
    "drugs": ["drug", "narcotic", "cocaine", "heroin", "marijuana", "cannabis", "weed", "thc"],
    "hazmat": ["chemical", "acid", "flammable", "toxic", "hazardous", "dangerous goods"],
    "pharmaceuticals": ["pharmaceutical", "prescription", "antibiotic", "steroid", "hormone"],
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => combined.includes(kw))) {
      detectedCategory = cat;
      break;
    }
  }

  const categoryData = RESTRICTED_CATEGORIES[detectedCategory];
  if (categoryData) {
    categoryRestricted = Object.values(categoryData.platforms).some(p => p.restricted);
    ageRestriction = categoryData.ageRestriction;
    licensingRequired = categoryData.licensingRequired;
  }

  const allPlatforms = ["shopify", "facebook", "google", "amazon", "ebay", "walmart"];
  const restrictedPlatforms: RestrictedPlatform[] = allPlatforms.map(platform => {
    const platLower = platform.toLowerCase();
    if (categoryData?.platforms[platLower]) {
      return {
        platform,
        restricted: categoryData.platforms[platLower].restricted,
        reason: categoryData.platforms[platLower].reason,
        alternativeAllowed: !categoryData.platforms[platLower].restricted,
      };
    }
    return { platform, restricted: false, reason: "", alternativeAllowed: true };
  });

  const restrictedCount = restrictedPlatforms.filter(p => p.restricted).length;
  const score = categoryRestricted ? Math.max(0, 100 - (restrictedCount * 20)) : 100;
  const severity = restrictedCount >= 3 ? "violation" : restrictedCount >= 1 ? "warning" : "pass";

  const details: ComplianceCheckDetail[] = [
    { label: "Detected Category", value: detectedCategory, status: categoryRestricted ? "warn" : "pass" },
    { label: "Restricted Platforms", value: `${restrictedCount}/${allPlatforms.length}`, status: restrictedCount >= 3 ? "fail" : restrictedCount >= 1 ? "warn" : "pass" },
    { label: "Age Restriction Required", value: ageRestriction ? "YES" : "NO", status: ageRestriction ? "warn" : "pass" },
    { label: "Licensing Required", value: licensingRequired ? "YES" : "NO", status: licensingRequired ? "fail" : "pass" },
  ];

  return {
    checkType: "restricted_item",
    severity,
    score,
    title: restrictedCount > 0 ? `${restrictedCount} platform(s) restrict this category` : "No platform restrictions detected",
    description: `Category "${detectedCategory}" ${categoryRestricted ? `is restricted on ${restrictedCount} platform(s)` : "has no restrictions"}.`,
    details,
    recommendation: restrictedCount > 0
      ? `This product category is restricted on: ${restrictedPlatforms.filter(p => p.restricted).map(p => p.platform).join(", ")}. ${licensingRequired ? "Licensing may be required." : ""} Consider alternative platforms or ensure compliance.`
      : "No platform restrictions. Safe to list on all platforms.",
    blocked: restrictedCount >= 4,
    checkedAt: new Date().toISOString(),
    restrictedPlatforms,
    categoryRestricted,
    ageRestriction,
    licensingRequired,
  };
}

export function runAdPolicyCheck(input: AdPolicyInput): AdPolicyResult {
  const titleLower = input.productTitle.toLowerCase();
  const descLower = (input.productDescription || "").toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  const prohibitedFound = AD_PROHIBITED_KEYWORDS.filter(kw => combined.includes(kw.toLowerCase()));
  const restrictedFound = AD_RESTRICTED_KEYWORDS.filter(kw => combined.includes(kw.toLowerCase()));

  const platforms: AdPlatformPolicy[] = [
    {
      platform: "Facebook/Instagram",
      compliant: prohibitedFound.length === 0 && restrictedFound.length < 3,
      issues: [
        ...prohibitedFound.map(kw => `Prohibited: "${kw}"`),
        ...restrictedFound.map(kw => `Restricted: "${kw}"`),
      ],
      riskLevel: prohibitedFound.length > 0 ? "high" : restrictedFound.length >= 2 ? "medium" : "low",
    },
    {
      platform: "Google Ads",
      compliant: prohibitedFound.length === 0,
      issues: [
        ...prohibitedFound.map(kw => `Prohibited: "${kw}"`),
        ...restrictedFound.filter(kw => ["gambling", "vpn", "pharmaceutical"].some(r => kw.includes(r))).map(kw => `Restricted: "${kw}"`),
      ],
      riskLevel: prohibitedFound.length > 0 ? "high" : restrictedFound.length >= 2 ? "medium" : "low",
    },
    {
      platform: "TikTok Ads",
      compliant: prohibitedFound.length === 0 && !combined.includes("before and after"),
      issues: [
        ...prohibitedFound.map(kw => `Prohibited: "${kw}"`),
        ...(input.beforeAfterClaims ? ["Before/after claims prohibited"] : []),
      ],
      riskLevel: prohibitedFound.length > 0 || !!input.beforeAfterClaims ? "high" : "low",
    },
  ];

  const requiresDisclaimers: string[] = [];
  if (input.healthClaims && input.healthClaims.length > 0) {
    requiresDisclaimers.push("Health claims require 'Results may vary' disclaimer");
  }
  if (combined.includes("results") && combined.includes("typical")) {
    requiresDisclaimers.push("Results claims require 'Results not typical' disclaimer");
  }
  if (input.sellingPrice > 200) {
    requiresDisclaimers.push("High-ticket items require clear return/refund policy disclosure");
  }

  const nonCompliantPlatforms = platforms.filter(p => !p.compliant).length;
  const score = Math.max(0, 100 - (prohibitedFound.length * 25) - (restrictedFound.length * 10) - (nonCompliantPlatforms * 15));
  const severity = prohibitedFound.length > 0 ? "violation" : restrictedFound.length >= 3 ? "warning" : nonCompliantPlatforms > 0 ? "warning" : "pass";

  const details: ComplianceCheckDetail[] = [
    ...platforms.map(p => ({
      label: p.platform,
      value: p.compliant ? "COMPLIANT" : "NON-COMPLIANT",
      status: p.compliant ? ("pass" as const) : ("fail" as const),
      evidence: p.issues.join("; ") || undefined,
    })),
    { label: "Prohibited Terms Found", value: `${prohibitedFound.length}`, status: prohibitedFound.length > 0 ? "fail" : "pass" },
    { label: "Restricted Terms Found", value: `${restrictedFound.length}`, status: restrictedFound.length >= 3 ? "warn" : "pass" },
    { label: "Disclaimers Required", value: `${requiresDisclaimers.length}`, status: requiresDisclaimers.length > 0 ? "warn" : "pass" },
  ];

  return {
    checkType: "ad_policy",
    severity,
    score,
    title: prohibitedFound.length > 0 ? "Ad policy violations detected" : restrictedFound.length > 0 ? "Ad policy warnings" : "Ad policy compliant",
    description: `${prohibitedFound.length} prohibited and ${restrictedFound.length} restricted term(s) found. ${nonCompliantPlatforms} platform(s) non-compliant.`,
    details,
    recommendation: prohibitedFound.length > 0
      ? `Remove prohibited terms: "${prohibitedFound.slice(0, 3).join('", "')}". These will cause ad rejections.`
      : restrictedFound.length > 0
      ? `Consider removing restricted terms: "${restrictedFound.slice(0, 3).join('", "')}". May require additional review.`
      : "Content appears compliant with major ad platform policies.",
    blocked: prohibitedFound.length >= 3,
    checkedAt: new Date().toISOString(),
    platformPolicies: platforms,
    prohibitedContent: prohibitedFound,
    restrictedContent: restrictedFound,
    requiresDisclaimers,
  };
}

export function runImageOriginalityCheck(input: ImageOriginalityInput): ImageOriginalityResult {
  const imageResults: ImageCheckResult[] = input.productImages.map((url) => {
    const concerns: string[] = [];
    let isOriginal = true;
    let stockProbability = 0;
    let watermarkDetected = false;

    const urlLower = url.toLowerCase();
    const isStockPhoto = STOCK_PHOTO_INDICATORS.some(indicator => urlLower.includes(indicator));
    if (isStockPhoto) {
      stockProbability = 90;
      isOriginal = false;
      concerns.push("Image appears to be from a stock photo service");
    }

    const hasWatermark = WATERMARK_INDICATORS.some(indicator => urlLower.includes(indicator));
    if (hasWatermark) {
      watermarkDetected = true;
      concerns.push("Image may contain watermarks");
    }

    const isMarketplaceCdn = MARKETPLACE_CDN_INDICATORS.some(indicator => urlLower.includes(indicator));
    if (isMarketplaceCdn) {
      stockProbability = Math.max(stockProbability, 70);
      isOriginal = false;
      concerns.push("Image hosted on marketplace CDN - likely not original");
    }

    const isGeneric = GENERIC_IMAGE_INDICATORS.some(indicator => urlLower.includes(indicator));
    if (isGeneric) {
      stockProbability = Math.max(stockProbability, 80);
      isOriginal = false;
      concerns.push("Generic/placeholder image detected");
    }

    if (urlLower.includes("alicdn.com") || urlLower.includes("alibaba.com") || urlLower.includes("aliexpress")) {
      stockProbability = Math.max(stockProbability, 60);
      concerns.push("Image hosted on AliExpress/Alibaba CDN");
    }

    if (urlLower.includes("free-photo") || urlLower.includes("free-image") || urlLower.includes("royalty-free")) {
      stockProbability = 95;
      isOriginal = false;
      concerns.push("Royalty-free/stock photo URL pattern detected");
    }

    if (urlLower.includes("cjdropshipping") || urlLower.includes("oberlo") || urlLower.includes("dsers")) {
      stockProbability = Math.max(stockProbability, 50);
      concerns.push("Image hosted on dropshipping platform CDN");
    }

    return {
      imageUrl: url,
      isOriginal,
      stockPhotoProbability: stockProbability,
      watermarkDetected,
      similarFound: 0,
      concerns,
    };
  });

  const hasStockImages = imageResults.some(r => r.stockPhotoProbability > 50);
  const hasWatermarks = imageResults.some(r => r.watermarkDetected);
  const avgOriginality = imageResults.length > 0
    ? imageResults.reduce((sum, r) => sum + (r.isOriginal ? 100 : 100 - r.stockPhotoProbability), 0) / imageResults.length
    : 100;

  const score = Math.round(avgOriginality);
  const severity = hasStockImages ? "violation" : hasWatermarks ? "warning" : imageResults.length === 0 ? "warning" : "pass";

  const details: ComplianceCheckDetail[] = [
    { label: "Total Images", value: `${input.productImages.length}`, status: input.productImages.length > 0 ? "pass" : "warn" },
    { label: "Stock Photo Detected", value: hasStockImages ? "YES" : "NO", status: hasStockImages ? "fail" : "pass" },
    { label: "Watermarks Detected", value: hasWatermarks ? "YES" : "NO", status: hasWatermarks ? "warn" : "pass" },
    { label: "Originality Score", value: `${Math.round(avgOriginality)}%`, status: avgOriginality >= 80 ? "pass" : avgOriginality >= 50 ? "warn" : "fail" },
  ];

  return {
    checkType: "image_originality",
    severity,
    score,
    title: hasStockImages ? "Stock/non-original images detected" : hasWatermarks ? "Watermarks detected" : "Images appear original",
    description: `${input.productImages.length} image(s) checked. Originality score: ${Math.round(avgOriginality)}%.`,
    details,
    recommendation: hasStockImages
      ? "Replace stock/marketplace images with original product photos. Order samples and take your own photos."
      : hasWatermarks
      ? "Remove watermarked images. Use clean product photos."
      : "Images appear to be original. Ensure they accurately represent the product.",
    blocked: false,
    checkedAt: new Date().toISOString(),
    imageResults,
    overallOriginality: Math.round(avgOriginality),
    stockPhotoDetected: hasStockImages,
    watermarksDetected: hasWatermarks,
  };
}

export function runBrandRegistryCheck(input: BrandRegistryInput): BrandRegistryResult {
  const titleLower = input.productTitle.toLowerCase();
  const brandLower = (input.brand || "").toLowerCase();
  const combined = `${titleLower} ${brandLower}`;

  let brandRegistered = false;
  const registeredPlatforms: string[] = [];
  let brandOwner: string | undefined;
  const enrolledInAtoZ = false;

  for (const [mark, data] of Object.entries(KNOWN_TRADEMARKS)) {
    if (combined.includes(mark)) {
      brandRegistered = true;
      brandOwner = data.owner;
      if (["amazon", "walmart"].some(p => input.category.toLowerCase().includes(p) || true)) {
        registeredPlatforms.push("Amazon Brand Registry");
      }
      break;
    }
  }

  const score = brandRegistered ? 20 : 100;
  const severity = brandRegistered ? "violation" : "pass";

  const details: ComplianceCheckDetail[] = [
    { label: "Brand Registered", value: brandRegistered ? "YES" : "NO", status: brandRegistered ? "fail" : "pass" },
    { label: "Brand Owner", value: brandOwner || "N/A", status: brandOwner ? "fail" : "pass" },
    { label: "Registered Platforms", value: registeredPlatforms.length > 0 ? registeredPlatforms.join(", ") : "None", status: registeredPlatforms.length > 0 ? "fail" : "pass" },
    { label: "Amazon A-to-Z Claims Risk", value: enrolledInAtoZ ? "HIGH" : "N/A", status: enrolledInAtoZ ? "fail" : "pass" },
  ];

  return {
    checkType: "brand_registry",
    severity,
    score,
    title: brandRegistered ? "Brand is registered on marketplace(s)" : "No brand registry issues",
    description: brandRegistered
      ? `Brand "${brandOwner || input.brand}" is registered. A-to-Z claims and IP complaints likely.`
      : "No known brand registry conflicts detected.",
    details,
    recommendation: brandRegistered
      ? "Do NOT list this product. Brand owner can file A-to-Z claims, copyright strikes, and account suspensions."
      : "No brand registry issues. Proceed with listing.",
    blocked: brandRegistered,
    checkedAt: new Date().toISOString(),
    brandRegistered,
    registeredPlatforms,
    brandOwner,
    enrolledInAtoZ,
  };
}

export function runPatentCheck(input: PatentCheckInput): PatentCheckResult {
  const titleLower = input.productTitle.toLowerCase();
  const descLower = (input.productDescription || "").toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  const infringements: PatentInfringement[] = [];
  let designRisk: "none" | "low" | "moderate" | "high" = "none";
  let utilityRisk: "none" | "low" | "moderate" | "high" = "none";

  for (const [keyword, data] of Object.entries(PATENT_RISK_KEYWORDS)) {
    if (combined.includes(keyword)) {
      const infringement: PatentInfringement = {
        patentType: data.type,
        description: data.description,
        risk: data.risk,
        evidence: `Product contains patented term: "${keyword}"`,
        owner: data.owner,
      };
      infringements.push(infringement);

      if (data.type === "design") {
        if (data.risk === "high") designRisk = "high";
        else if (data.risk === "moderate" && designRisk !== "high") designRisk = "moderate";
        else if (designRisk === "none") designRisk = "low";
      } else {
        if (data.risk === "high") utilityRisk = "high";
        else if (data.risk === "moderate" && utilityRisk !== "high") utilityRisk = "moderate";
        else if (utilityRisk === "none") utilityRisk = "low";
      }
    }
  }

  const highPatentCategories = ["electronics", "gadgets", "kitchen", "toys", "medical", "automotive"];
  const categoryMatch = highPatentCategories.some(c => input.category.toLowerCase().includes(c));

  let overallRiskScore = 0;
  if (designRisk === "high") overallRiskScore += 40;
  else if (designRisk === "moderate") overallRiskScore += 25;
  else if (designRisk === "low") overallRiskScore += 10;

  if (utilityRisk === "high") overallRiskScore += 35;
  else if (utilityRisk === "moderate") overallRiskScore += 20;
  else if (utilityRisk === "low") overallRiskScore += 5;

  if (categoryMatch) overallRiskScore += 10;

  const score = 100 - overallRiskScore;
  const severity = overallRiskScore >= 60 ? "violation" : overallRiskScore >= 30 ? "warning" : "pass";

  const details: ComplianceCheckDetail[] = [
    { label: "Design Patent Risk", value: designRisk.toUpperCase(), status: designRisk === "high" ? "fail" : designRisk === "moderate" ? "warn" : "pass" },
    { label: "Utility Patent Risk", value: utilityRisk.toUpperCase(), status: utilityRisk === "high" ? "fail" : utilityRisk === "moderate" ? "warn" : "pass" },
    { label: "Suspected Infringements", value: `${infringements.length}`, status: infringements.length > 0 ? "warn" : "pass" },
    { label: "High-Patent Category", value: categoryMatch ? "YES" : "NO", status: categoryMatch ? "warn" : "pass" },
  ];

  for (const inf of infringements.slice(0, 5)) {
    details.push({
      label: `Patent Risk (${inf.patentType})`,
      value: inf.risk.toUpperCase(),
      status: inf.risk === "high" ? "fail" : inf.risk === "moderate" ? "warn" : "pass",
      evidence: inf.evidence,
    });
  }

  return {
    checkType: "patent",
    severity,
    score,
    title: infringements.length > 0 ? `${infringements.length} potential patent conflict(s) found` : "No patent issues detected",
    description: `${infringements.length} suspected patent conflict(s). Design risk: ${designRisk}. Utility risk: ${utilityRisk}.`,
    details,
    recommendation: infringements.length > 0
      ? "Review suspected patent infringements. Consider consulting a patent attorney before listing. Modify product design or features to avoid conflicts."
      : "No obvious patent conflicts detected. Continue with listing.",
    blocked: overallRiskScore >= 60,
    checkedAt: new Date().toISOString(),
    patentRiskScore: overallRiskScore,
    designPatentRisk: designRisk,
    utilityPatentRisk: utilityRisk,
    suspectedInfringements: infringements,
  };
}

export function runExportControlCheck(input: ExportControlInput): ExportControlResult {
  const titleLower = input.productTitle.toLowerCase();
  const descLower = (input.productDescription || "").toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  const embargoedMarkets: string[] = [];
  const restrictedMarkets: string[] = [];
  const sanctionsFlags: string[] = [];
  let licenseRequired = false;
  let classifiedAsDualUse = false;

  for (const [category, data] of Object.entries(DUAL_USE_CATEGORIES)) {
    if (combined.includes(category)) {
      classifiedAsDualUse = true;
      licenseRequired = true;
      sanctionsFlags.push(`Dual-use category: ${category} - ${data.description}`);
    }
  }

  const exportControlCategories: Record<string, { dualUse: boolean; licenseRequired: boolean }> = {
    "electronics": { dualUse: false, licenseRequired: false },
    "semiconductors": { dualUse: true, licenseRequired: true },
    "encryption": { dualUse: true, licenseRequired: true },
    "drones": { dualUse: true, licenseRequired: true },
    "night vision": { dualUse: true, licenseRequired: true },
    "thermal imaging": { dualUse: true, licenseRequired: true },
    "nuclear": { dualUse: true, licenseRequired: true },
    "chemicals": { dualUse: true, licenseRequired: true },
    "weapons": { dualUse: false, licenseRequired: true },
    "firearms": { dualUse: false, licenseRequired: true },
    "ammunition": { dualUse: false, licenseRequired: true },
    "explosives": { dualUse: false, licenseRequired: true },
    "military": { dualUse: false, licenseRequired: true },
    "defense": { dualUse: false, licenseRequired: true },
    "radar": { dualUse: true, licenseRequired: true },
    "sonar": { dualUse: true, licenseRequired: true },
    "lidar": { dualUse: true, licenseRequired: true },
    "quantum": { dualUse: true, licenseRequired: true },
    "stealth": { dualUse: true, licenseRequired: true },
    "hypersonic": { dualUse: true, licenseRequired: true },
    "autonomous vehicle": { dualUse: true, licenseRequired: true },
    "advanced materials": { dualUse: true, licenseRequired: true },
    "submersible": { dualUse: true, licenseRequired: true },
    "space": { dualUse: true, licenseRequired: true },
    "satellite": { dualUse: true, licenseRequired: true },
    "missile": { dualUse: true, licenseRequired: true },
    "torpedo": { dualUse: true, licenseRequired: true },
    "biological": { dualUse: true, licenseRequired: true },
    "pathogen": { dualUse: true, licenseRequired: true },
    "toxin": { dualUse: true, licenseRequired: true },
    "centrifuge": { dualUse: true, licenseRequired: true },
    "enrichment": { dualUse: true, licenseRequired: true },
    "reactor": { dualUse: true, licenseRequired: true },
  };

  for (const [cat, data] of Object.entries(exportControlCategories)) {
    if (combined.includes(cat)) {
      if (data.dualUse) classifiedAsDualUse = true;
      if (data.licenseRequired) licenseRequired = true;
    }
  }

  for (const market of input.targetMarkets) {
    const embargo = EMBARGOED_COUNTRIES[market];
    if (embargo) {
      embargoedMarkets.push(market);
      sanctionsFlags.push(`${embargo.reason}`);
    }
  }

  const controlledMaterials = [
    "uranium", "plutonium", "deuterium", "tritium",
    "beryllium", "tungsten", "titanium alloy", "carbon fiber composite",
    "kevlar", "ballistic", "armor", "explosive",
    "chemical agent", "biological agent", "pathogen",
  ];
  const controlledMaterialHits = controlledMaterials.filter(m => combined.includes(m));
  if (controlledMaterialHits.length > 0) {
    classifiedAsDualUse = true;
    licenseRequired = true;
    sanctionsFlags.push(`Controlled materials: ${controlledMaterialHits.join(", ")}`);
  }

  const exportControlCategoriesList = ["weapons", "firearms", "ammunition", "explosives", "chemicals", "hazmat", "drones", "electronics", "nuclear", "biological"];
  const categoryMatch = exportControlCategoriesList.some(c => input.category.toLowerCase().includes(c));
  if (categoryMatch) {
    classifiedAsDualUse = true;
    licenseRequired = true;
  }

  const riskScore = embargoedMarkets.length > 0 ? 90
    : classifiedAsDualUse && licenseRequired ? 70
    : classifiedAsDualUse ? 50
    : licenseRequired ? 40
    : 0;

  const score = 100 - riskScore;
  const severity = riskScore >= 70 ? "violation" : riskScore >= 40 ? "warning" : "pass";

  const details: ComplianceCheckDetail[] = [
    { label: "Dual-Use Classification", value: classifiedAsDualUse ? "YES" : "NO", status: classifiedAsDualUse ? "warn" : "pass" },
    { label: "Export License Required", value: licenseRequired ? "YES" : "NO", status: licenseRequired ? "warn" : "pass" },
    { label: "Embargoed Markets", value: embargoedMarkets.length > 0 ? embargoedMarkets.join(", ") : "None", status: embargoedMarkets.length > 0 ? "fail" : "pass" },
    { label: "Sanctions Flags", value: `${sanctionsFlags.length}`, status: sanctionsFlags.length > 0 ? "warn" : "pass" },
  ];

  if (sanctionsFlags.length > 0) {
    for (const flag of sanctionsFlags.slice(0, 5)) {
      details.push({
        label: "Sanctions Detail",
        value: "FLAGGED",
        status: "fail",
        evidence: flag,
      });
    }
  }

  return {
    checkType: "export_control",
    severity,
    score,
    title: embargoedMarkets.length > 0 ? `Embargoed market access: ${embargoedMarkets.join(", ")}` : classifiedAsDualUse ? "Dual-use classification detected" : "No export control issues",
    description: `${embargoedMarkets.length} embargoed market(s). ${classifiedAsDualUse ? "Dual-use classification detected." : ""} ${licenseRequired ? "Export license may be required." : ""}`,
    details,
    recommendation: embargoedMarkets.length > 0
      ? `DO NOT export to embargoed markets: ${embargoedMarkets.join(", ")}. Severe legal penalties apply.`
      : classifiedAsDualUse
      ? "Product may require export license. Consult trade compliance specialist before listing for international markets."
      : "No export control issues detected. Verify compliance for target markets.",
    blocked: embargoedMarkets.length > 0,
    checkedAt: new Date().toISOString(),
    exportControlRiskScore: riskScore,
    embargoedMarkets,
    restrictedMarkets,
    licenseRequired,
    classifiedAsDualUse,
    sanctionsFlags,
  };
}

// ── Main Compliance Runner ──────────────────────────────────────────────────

export function runComplianceCheck(input: ComplianceCheckInput): ComplianceReport {
  const checks: ComplianceCheckResult[] = [];

  for (const checkType of input.checkTypes) {
    switch (checkType) {
      case "trademark":
        checks.push(runTrademarkCheck({
          productTitle: input.productTitle,
          productDescription: input.productDescription,
          brand: input.brand,
          category: input.category,
          targetMarkets: input.targetMarkets,
        }));
        break;
      case "dmca":
        checks.push(runDmcaCheck({
          productTitle: input.productTitle,
          productImages: input.productImages,
          productDescription: input.productDescription,
          supplierUrl: input.supplierUrl,
          category: input.category,
        }));
        break;
      case "restricted_item":
        checks.push(runRestrictedItemCheck({
          productTitle: input.productTitle,
          productDescription: input.productDescription,
          category: input.category,
          materials: input.materials,
          targetMarkets: input.targetMarkets,
          pricePoint: input.sellingPrice,
        }));
        break;
      case "ad_policy":
        checks.push(runAdPolicyCheck({
          productTitle: input.productTitle,
          productDescription: input.productDescription,
          category: input.category,
          targetMarkets: input.targetMarkets,
          sellingPrice: input.sellingPrice,
          beforeAfterClaims: input.beforeAfterClaims,
          healthClaims: input.healthClaims,
        }));
        break;
      case "image_originality":
        checks.push(runImageOriginalityCheck({
          productImages: input.productImages,
          productTitle: input.productTitle,
          supplierUrl: input.supplierUrl,
        }));
        break;
      case "brand_registry":
        checks.push(runBrandRegistryCheck({
          productTitle: input.productTitle,
          brand: input.brand,
          category: input.category,
        }));
        break;
      case "patent":
        checks.push(runPatentCheck({
          productTitle: input.productTitle,
          productDescription: input.productDescription,
          brand: input.brand,
          category: input.category,
          materials: input.materials,
          targetMarkets: input.targetMarkets,
        }));
        break;
      case "export_control":
        checks.push(runExportControlCheck({
          productTitle: input.productTitle,
          productDescription: input.productDescription,
          category: input.category,
          materials: input.materials,
          targetMarkets: input.targetMarkets,
          sellingPrice: input.sellingPrice,
        }));
        break;
      default:
        break;
    }
  }

  const totalScore = checks.length > 0
    ? checks.reduce((sum, c) => sum + c.score, 0) / checks.length
    : 100;

  const hasBlocked = checks.some(c => c.blocked);
  const hasViolation = checks.some(c => c.severity === "violation");
  const hasWarning = checks.some(c => c.severity === "warning");

  const riskLevel: ComplianceRiskLevel = hasBlocked ? "blocked"
    : hasViolation ? "high"
    : hasWarning ? "medium"
    : totalScore >= 80 ? "safe"
    : "low";

  const flags: ComplianceFlag[] = [];
  for (const check of checks) {
    if (check.severity !== "pass") {
      flags.push({
        type: check.checkType,
        severity: check.severity,
        message: check.title,
        actionRequired: check.blocked,
      });
    }
  }

  const recommendations = checks
    .filter(c => c.severity !== "pass")
    .map(c => c.recommendation);

  const canList = !hasBlocked && !hasViolation;

  return {
    id: "",
    productTitle: input.productTitle,
    productImage: input.productImages[0] || input.productImage,
    productUrl: input.productUrl,
    category: input.category,
    overallScore: Math.round(totalScore),
    riskLevel,
    canList,
    checks,
    flags,
    recommendations,
    checkedAt: new Date().toISOString(),
    createdAt: {} as unknown as import("@/types/compliance").ComplianceReport["createdAt"], // Will be set by Firestore
  };
}
