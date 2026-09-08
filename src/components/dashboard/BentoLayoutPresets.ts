export type BentoSpan = 1 | 2 | 3 | 4;
export type BentoRowSpan = 1 | 2 | 3;

export interface BentoLayoutItem {
  id: string;
  colSpan: BentoSpan;
  rowSpan: BentoRowSpan;
  visible: boolean;
}

export type BentoLayout = BentoLayoutItem[];

export interface LayoutPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  layout: BentoLayout;
}

const sectionIds = [
  "hero",
  "kpi",
  "fulfillment",
  "daily-pick",
  "intelligence",
  "niches",
  "trending",
  "heatmap",
  "suppliers",
  "mission",
] as const;

export const defaultLayout: BentoLayout = sectionIds.map((id) => ({
  id,
  colSpan: id === "hero" || id === "kpi" || id === "niches" || id === "heatmap" ? 4 : 2,
  rowSpan: id === "fulfillment" || id === "daily-pick" || id === "intelligence" ? 2 : 1,
  visible: true,
}));

export const layoutPresets: LayoutPreset[] = [
  {
    id: "executive",
    label: "Executive Overview",
    description: "Revenue and AI insights front and center",
    icon: "Crown",
    layout: [
      { id: "hero", colSpan: 4, rowSpan: 1, visible: true },
      { id: "kpi", colSpan: 4, rowSpan: 1, visible: true },
      { id: "fulfillment", colSpan: 2, rowSpan: 2, visible: true },
      { id: "daily-pick", colSpan: 2, rowSpan: 2, visible: true },
      { id: "intelligence", colSpan: 2, rowSpan: 2, visible: true },
      { id: "trending", colSpan: 2, rowSpan: 2, visible: true },
      { id: "niches", colSpan: 4, rowSpan: 1, visible: true },
      { id: "heatmap", colSpan: 4, rowSpan: 1, visible: true },
      { id: "suppliers", colSpan: 2, rowSpan: 1, visible: true },
      { id: "mission", colSpan: 2, rowSpan: 1, visible: true },
    ],
  },
  {
    id: "product-scout",
    label: "Product Scout",
    description: "Focus on products and niches",
    icon: "Search",
    layout: [
      { id: "hero", colSpan: 4, rowSpan: 1, visible: true },
      { id: "kpi", colSpan: 4, rowSpan: 1, visible: true },
      { id: "daily-pick", colSpan: 2, rowSpan: 2, visible: true },
      { id: "trending", colSpan: 2, rowSpan: 2, visible: true },
      { id: "niches", colSpan: 4, rowSpan: 1, visible: true },
      { id: "heatmap", colSpan: 4, rowSpan: 1, visible: true },
      { id: "fulfillment", colSpan: 2, rowSpan: 2, visible: true },
      { id: "intelligence", colSpan: 2, rowSpan: 2, visible: true },
      { id: "suppliers", colSpan: 2, rowSpan: 1, visible: true },
      { id: "mission", colSpan: 2, rowSpan: 1, visible: true },
    ],
  },
  {
    id: "financial-focus",
    label: "Financial Focus",
    description: "Revenue, profit, and cost analysis",
    icon: "DollarSign",
    layout: [
      { id: "hero", colSpan: 4, rowSpan: 1, visible: true },
      { id: "kpi", colSpan: 4, rowSpan: 1, visible: true },
      { id: "fulfillment", colSpan: 2, rowSpan: 2, visible: true },
      { id: "daily-pick", colSpan: 2, rowSpan: 2, visible: true },
      { id: "intelligence", colSpan: 2, rowSpan: 2, visible: true },
      { id: "niches", colSpan: 4, rowSpan: 1, visible: true },
      { id: "trending", colSpan: 2, rowSpan: 1, visible: true },
      { id: "heatmap", colSpan: 2, rowSpan: 1, visible: true },
      { id: "suppliers", colSpan: 2, rowSpan: 1, visible: true },
      { id: "mission", colSpan: 2, rowSpan: 1, visible: true },
    ],
  },
  {
    id: "command-center",
    label: "Command Center",
    description: "Everything visible at once",
    icon: "LayoutGrid",
    layout: [
      { id: "hero", colSpan: 4, rowSpan: 1, visible: true },
      { id: "kpi", colSpan: 4, rowSpan: 1, visible: true },
      { id: "fulfillment", colSpan: 2, rowSpan: 2, visible: true },
      { id: "daily-pick", colSpan: 2, rowSpan: 2, visible: true },
      { id: "intelligence", colSpan: 2, rowSpan: 2, visible: true },
      { id: "trending", colSpan: 2, rowSpan: 2, visible: true },
      { id: "niches", colSpan: 4, rowSpan: 1, visible: true },
      { id: "heatmap", colSpan: 4, rowSpan: 1, visible: true },
      { id: "suppliers", colSpan: 2, rowSpan: 1, visible: true },
      { id: "mission", colSpan: 2, rowSpan: 1, visible: true },
    ],
  },
];
