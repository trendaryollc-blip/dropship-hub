# DropShip Hub — Dashboard 10x Implementation Plan

## Overview

Transform the dashboard from a generic glassmorphism design into a distinctive, memorable command center with its own visual identity. The plan is organized into 8 phases, each building on the previous.

---

## Phase 1: Design System Foundation

**Goal:** Replace generic glassmorphism with a layered depth system, upgrade typography, and create semantic color tokens.

### 1.1 — Typography Upgrade

**New fonts:** Replace Space Grotesk with **Cabinet Grotesk** (display) + add **JetBrains Mono** (numerical data).

**Files to modify:**

- `src/app/layout.tsx` — Change Google Font imports from Space Grotesk to Cabinet Grotesk, add JetBrains Mono
- `src/app/globals.css` — Update `--font-display` to Cabinet Grotesk, add `--font-mono` for JetBrains Mono, add `@theme inline` entries
- `src/lib/themes.ts` — No changes needed (fonts are CSS-level)

**New CSS variables in globals.css:**

```css
--font-mono: var(--font-jetbrains-mono);
```

**Tailwind @theme additions:**

```css
--font-mono: var(--font-jetbrains-mono);
```

### 1.2 — Surface Hierarchy System

**Replace single `.glass` with 4 surface levels:**

**File to modify:** `src/app/globals.css`

Replace the single `.glass` class with:

```css
.surface-base    — Background level (no elevation)
.surface-raised  — Cards, panels (current .glass behavior)
.surface-elevated — Modals, dropdowns, floating elements
.surface-floating — Tooltips, command palette, compare bar
```

Each level gets distinct `backdrop-filter`, `border`, and `box-shadow` values.

### 1.3 — Semantic Color Tokens

**File to modify:** `src/app/globals.css`

Add semantic tokens that map to theme colors:

```css
--color-confidence-high, --color-confidence-low
--color-trend-up, --color-trend-down
--color-demand-high, --color-demand-low
--color-status-online, --color-status-busy, --color-status-offline
--color-heat-1 through --color-heat-5
```

**File to modify:** `src/lib/themes.ts`

Add these new fields to the `Theme` interface and populate for all 12 themes.

### 1.4 — Theme Pruning

Keep 5 best themes, remove 7 weak ones:

- **Keep:** crimson-noir, emerald-forest, ocean-teal, obsidian-gold, arctic-white
- **Remove:** ember-glow, royal-purple, golden-rose, royal-amethyst, sakura-neon, arctic-ice, vanilla-latte

**Files to modify:**

- `src/lib/themes.ts` — Remove 7 theme objects, update `themeOrder`
- `src/app/globals.css` — Remove 7 `[data-theme="..."]` blocks
- `src/components/theme/ThemeGallery.tsx` — Update theme list

### 1.5 — New Shared Primitives (Extract from duplicates)

**Create new shared components in `src/components/ui/`:**

| Component             | Replaces                       | Source                                                                                             |
| --------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `Sparkline.tsx`       | 6 local MiniSparkline copies   | RevenueForecast, IntelligenceHub, TrendingProducts, NicheRadarCards, MarketPulseTicker             |
| `ScoreRing.tsx`       | 6 ring variants                | AIDailyPick, TrendingProducts, NicheRadarCards, MarketplaceHeatmap, DailyMission, InlineCalculator |
| `SemiCircleGauge.tsx` | 2 gauge copies                 | IntelligenceHub, MarketplaceHeatmap                                                                |
| `TrendBadge.tsx`      | Inline trend arrows            | Scattered across all components                                                                    |
| `MetricCard.tsx`      | KPIStatCard + AnimatedStatCard | page.tsx, RevenueForecast                                                                          |
| `SectionHeader.tsx`   | SectionLabel                   | page.tsx                                                                                           |
| `AlertCard.tsx`       | 2 alert patterns               | IntelligenceHub, DailyDigest                                                                       |
| `AnimatedCounter.tsx` | useAnimatedCounter hook        | RevenueForecast (convert hook to component)                                                        |

**Each primitive gets:**

- Props interface with JSDoc
- Full test file (`*.test.tsx`)
- Storybook-style documentation comments

### 1.6 — Refactor Existing Components

**Files to modify (replace local duplicates with shared primitives):**

| File                     | Changes                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `RevenueForecast.tsx`    | Replace local MiniSparkline with `<Sparkline />`, replace AnimatedStatCard with `<MetricCard />` |
| `IntelligenceHub.tsx`    | Replace MiniSparkline, SentimentGauge with shared, replace AlertCard with `<AlertCard />`        |
| `TrendingProducts.tsx`   | Replace MiniSparkline, ConfidenceRing with `<ScoreRing />`                                       |
| `NicheRadarCards.tsx`    | Replace MiniSparkline, ScoreRing with shared                                                     |
| `MarketPulseTicker.tsx`  | Replace MiniSparkline with `<Sparkline />`                                                       |
| `MarketplaceHeatmap.tsx` | Replace HeatRing, SentimentGauge with shared                                                     |
| `DailyMission.tsx`       | Replace ProgressRing with `<ScoreRing />`                                                        |
| `InlineCalculator.tsx`   | Replace MiniDonut with `<ScoreRing />` variant                                                   |
| `DailyDigest.tsx`        | Replace AlertItem with `<AlertCard />`                                                           |
| `page.tsx`               | Replace KPIStatCard with `<MetricCard />`, SectionLabel with `<SectionHeader />`                 |

### 1.7 — Testing for Phase 1

**New test files to create:**

- `src/components/ui/Sparkline.test.tsx`
- `src/components/ui/ScoreRing.test.tsx`
- `src/components/ui/SemiCircleGauge.test.tsx`
- `src/components/ui/TrendBadge.test.tsx`
- `src/components/ui/MetricCard.test.tsx`
- `src/components/ui/SectionHeader.test.tsx`
- `src/components/ui/AlertCard.test.tsx`
- `src/components/ui/AnimatedCounter.test.tsx`

**Existing tests to update:**

- `src/__tests__/pages/dashboard-page.test.ts` — Update type references
- All dashboard component test files (update imports to use shared primitives)

**Run:** `npm run test:components` to verify all component tests pass.

---

## Phase 2: Bento Grid Layout

**Goal:** Replace vertical stack with a customizable bento grid (like Linear/Raycast).

### 2.1 — Bento Grid Engine

**Create new file:** `src/components/dashboard/BentoGrid.tsx`

A CSS Grid-based layout engine with:

- Responsive columns: 1 (mobile) → 2 (tablet) → 3-4 (desktop)
- Span classes: `col-span-1`, `col-span-2`, `col-span-3`, `row-span-1`, `row-span-2`
- Drag-and-drop reordering (using `@dnd-kit/core` — install new dependency)
- Resize handles (optional, CSS-only for now)
- Layout persistence to Firestore

**Create new file:** `src/components/dashboard/BentoCard.tsx`

A card wrapper that:

- Applies surface-raised styling
- Has a consistent header (icon + title + action button)
- Supports collapsible state (collapsed = single-line summary)
- Animates between states with Framer Motion

**Create new file:** `src/components/dashboard/BentoLayoutPresets.ts`

Layout preset configurations:

```typescript
export const presets = {
  executive: {/* 3-column, revenue + AI pick + alerts prominent */},
  productScout: {/* trending + niches + heatmap prominent */},
  financialFocus: {/* revenue + calculator + profit prominent */},
  commandCenter: {/* all sections, 4-column layout */},
};
```

### 2.2 — Layout Persistence

**Create new file:** `src/hooks/useDashboardLayout.ts`

- Loads layout from Firestore `users/{uid}/settings/dashboardLayout`
- Saves on change (debounced 1s)
- Falls back to preset on first load
- Returns `{ layout, setLayout, resetToPreset, isLoading }`

**Create new file:** `src/app/api/settings/dashboard-layout/route.ts`

- GET: Fetch user's saved layout
- PUT: Save user's layout
- Uses `withAuth` HOC

### 2.3 — Refactor Dashboard Page

**File to modify:** `src/app/(app)/dashboard/page.tsx`

Major rewrite:

- Replace vertical section stack with `<BentoGrid>`
- Each section becomes a `<BentoCard>` with configurable span
- Remove Simple/Advanced toggle (replaced by layout presets)
- Add layout switcher dropdown (topbar or page header)
- Add "Customize" button that enters edit mode (drag/resize)

**Layout mapping:**

```
Hero Zone:        col-span-3 (full width)
Command Strip:    col-span-3 (full width)
KPI Row:          4x col-span-1
AI Daily Pick:    col-span-2, row-span-2
Intelligence:     col-span-2
Revenue:          col-span-2
Niche Radar:      col-span-3 (horizontal scroll)
Trending:         col-span-2
Heatmap:          col-span-1
Calculator:       col-span-1
Suppliers:        col-span-2
Daily Digest:     col-span-2
Mission:          col-span-1
```

### 2.4 — Mobile Bento

On mobile (< 768px):

- All cards become `col-span-1`
- Horizontal scroll sections remain scrollable
- Bottom navigation bar appears (Phase 6)

### 2.5 — Testing for Phase 2

**New test files:**

- `src/components/dashboard/BentoGrid.test.tsx` — Tests grid rendering, responsive columns, span classes
- `src/components/dashboard/BentoCard.test.tsx` — Tests collapse/expand, header rendering, actions
- `src/components/dashboard/BentoLayoutPresets.test.ts` — Tests preset configurations are valid
- `src/hooks/useDashboardLayout.test.ts` — Tests load/save/reset, fallback behavior
- `src/app/api/settings/dashboard-layout/route.test.ts` — Tests API endpoints

**Update:**

- `e2e/app-shell.spec.ts` — Add bento grid layout assertions
- `src/__tests__/pages/dashboard-page.test.ts` — Update for new layout structure

**Run:** `npm run test:components && npm run test:api`

---

## Phase 3: Interactive Data Visualizations

**Goal:** Replace hand-built SVG charts with proper interactive charting using Recharts.

### 3.1 — Install Recharts

**File to modify:** `package.json`

Add dependency: `recharts@^2.15`

Run: `npm install recharts`

### 3.2 — Chart Components

**Create new files in `src/components/ui/charts/`:**

| Component            | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `AreaChart.tsx`      | Revenue forecast (replaces hand-built SVG in RevenueForecast)    |
| `RadarChart.tsx`     | Niche radar scores (replaces MiniRadar in NicheRadarCards)       |
| `BarChart.tsx`       | Heatmap bars, market pulse (replaces CSS bar charts)             |
| `HeatmapGrid.tsx`    | Marketplace heatmap (interactive grid with hover tooltips)       |
| `SparklineChart.tsx` | Enhanced sparkline with hover tooltip (wraps Recharts LineChart) |

Each chart component:

- Uses Recharts under the hood
- Applies theme colors via CSS variables
- Has responsive sizing (`ResponsiveContainer`)
- Includes hover tooltips with custom styling
- Has entrance animation (fade + scale)

### 3.3 — Refactor Chart Components

**Files to modify:**

| File                     | Changes                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `RevenueForecast.tsx`    | Replace hand-built SVG chart with `<AreaChart />`                                           |
| `NicheRadarCards.tsx`    | Replace MiniRadar with `<RadarChart />`                                                     |
| `MarketplaceHeatmap.tsx` | Replace CSS bars and hand-built gauge with `<HeatmapGrid />`                                |
| `IntelligenceHub.tsx`    | Replace sentiment gauge with `<SemiCircleGauge />` (from Phase 1), bars with `<BarChart />` |
| `MarketPulseTicker.tsx`  | Replace local sparklines with `<SparklineChart />`                                          |

### 3.4 — Chart Theme Integration

**Create new file:** `src/lib/chart-theme.ts`

Maps dashboard theme CSS variables to Recharts color scheme:

```typescript
export function getChartTheme() {
  return {
    colors: {
      primary: getComputedStyle(document.documentElement).getPropertyValue(
        "--accent",
      ),
      success: getComputedStyle(document.documentElement).getPropertyValue(
        "--success",
      ),
      warning: getComputedStyle(document.documentElement).getPropertyValue(
        "--warning",
      ),
      danger: getComputedStyle(document.documentElement).getPropertyValue(
        "--danger",
      ),
    },
    grid: { stroke: "var(--border-color)", strokeDasharray: "3 3" },
    axis: { stroke: "var(--muted-fg)", fontSize: 11 },
    tooltip: { bg: "var(--surface-elevated)", border: "var(--border-color)" },
  };
}
```

### 3.5 — Testing for Phase 3

**New test files:**

- `src/components/ui/charts/AreaChart.test.tsx`
- `src/components/ui/charts/RadarChart.test.tsx`
- `src/components/ui/charts/BarChart.test.tsx`
- `src/components/ui/charts/HeatmapGrid.test.tsx`
- `src/components/ui/charts/SparklineChart.test.tsx`
- `src/lib/chart-theme.test.ts`

**Update:**

- `RevenueForecast.test.tsx` — Update to test Recharts rendering
- `NicheRadarCards.test.tsx` — Update for new radar chart
- `MarketplaceHeatmap.test.tsx` — Update for heatmap grid

**Run:** `npm run test:components`

---

## Phase 4: Command Palette & Navigation

**Goal:** Add Cmd+K command palette and quick switcher for power users.

### 4.1 — Command Palette

**Create new file:** `src/components/ui/CommandPalette.tsx`

A Raycast/Linear-style command palette:

- Opens with `Cmd+K` (macOS) or `Ctrl+K` (Windows)
- Fuzzy search across: pages, products, suppliers, actions, settings
- Keyboard navigation (arrow keys, Enter, Escape)
- Recent searches section
- Categorized results (Pages, Products, Actions, Settings)
- Spring-physics open/close animation (Framer Motion)
- Backdrop blur overlay

**Create new file:** `src/hooks/useCommandPalette.ts`

- Manages open/close state
- Registers global keyboard shortcut
- Handles search input with debouncing
- Returns `{ isOpen, query, results, open, close, setQuery }`

**Create new file:** `src/lib/command-registry.ts`

Defines all searchable commands:

```typescript
export const commands: Command[] = [
  {
    id: "search-products",
    label: "Search Products",
    href: "/products",
    icon: "Search",
    category: "pages",
  },
  {
    id: "find-suppliers",
    label: "Find Suppliers",
    href: "/suppliers",
    icon: "Truck",
    category: "pages",
  },
  // ... 30+ commands
];
```

### 4.2 — Quick Switcher

**Modify file:** `src/components/dashboard/Topbar.tsx`

- Replace current search bar with a quick switcher trigger
- Click or `Cmd+K` opens command palette
- Shows recent actions as chips below the search bar

### 4.3 — Keyboard Shortcuts

**Create new file:** `src/components/ui/KeyboardShortcuts.tsx`

A modal/tooltip that shows available shortcuts:

- `Cmd+K` — Command palette
- `Cmd+/` — Toggle sidebar
- `Cmd+1-9` — Quick navigate to sections
- `Esc` — Close modals

### 4.4 — Testing for Phase 4

**New test files:**

- `src/components/ui/CommandPalette.test.tsx` — Tests rendering, search, keyboard navigation, open/close
- `src/hooks/useCommandPalette.test.ts` — Tests hook state management, keyboard shortcut registration
- `src/lib/command-registry.test.ts` — Tests command definitions, search filtering
- `src/components/ui/KeyboardShortcuts.test.tsx` — Tests shortcut display

**Update:**

- `e2e/app-shell.spec.ts` — Add command palette E2E test (open, search, navigate)
- `e2e/responsive.spec.ts` — Add mobile command palette test

**Run:** `npm run test:components && npm run test:e2e`

---

## Phase 5: API Split & Performance

**Goal:** Split monolithic API, add skeleton loaders, optimize rendering.

### 5.1 — Split Dashboard API

**Current:** Single `src/app/api/dashboard/route.ts` returns everything.

**Create parallel endpoints:**

| Endpoint                                      | Data                                           |
| --------------------------------------------- | ---------------------------------------------- |
| `src/app/api/dashboard/kpi/route.ts`          | Revenue, orders, products, opportunities stats |
| `src/app/api/dashboard/trending/route.ts`     | Trending products list                         |
| `src/app/api/dashboard/intelligence/route.ts` | Alerts, briefing, pulse, action stats          |
| `src/app/api/dashboard/niches/route.ts`       | Niche radar cards                              |
| `src/app/api/dashboard/suppliers/route.ts`    | Supplier status cards                          |
| `src/app/api/dashboard/heatmap/route.ts`      | Marketplace heatmap data                       |
| `src/app/api/dashboard/daily-pick/route.ts`   | AI daily pick                                  |
| `src/app/api/dashboard/ticker/route.ts`       | Market pulse ticker                            |

Each endpoint:

- Uses `withAuth` HOC
- Has independent caching (5-min TTL)
- Returns typed response
- Includes error handling

**File to modify:** `src/app/api/dashboard/route.ts` — Keep as fallback, redirect to parallel endpoints.

### 5.2 — Parallel Data Fetching

**File to modify:** `src/hooks/useDashboardData.ts`

Replace single `useAPI('/api/dashboard')` with parallel calls:

```typescript
const kpi = useAPI("/api/dashboard/kpi");
const trending = useAPI("/api/dashboard/trending");
const intelligence = useAPI("/api/dashboard/intelligence");
// ... etc
```

Use `Promise.allSettled` for graceful degradation — if one endpoint fails, others still load.

### 5.3 — Skeleton Loaders

**Create new file:** `src/components/ui/SkeletonCard.tsx` (enhanced version of current inline SkeletonCard)

**Create new files:**

- `src/components/dashboard/skeletons/KPISkeleton.tsx`
- `src/components/dashboard/skeletons/TrendingSkeleton.tsx`
- `src/components/dashboard/skeletons/IntelligenceSkeleton.tsx`
- `src/components/dashboard/skeletons/NicheSkeleton.tsx`
- `src/components/dashboard/skeletons/HeatmapSkeleton.tsx`

Each skeleton:

- Matches the exact layout of its real component
- Uses CSS `@keyframes shimmer` animation
- Shows immediately on load, replaced when data arrives

### 5.4 — Lazy Loading Advanced Sections

**File to modify:** `src/app/(app)/dashboard/page.tsx`

Use `next/dynamic` for below-the-fold sections:

```typescript
const IntelligenceHub = dynamic(() => import('@/components/dashboard/IntelligenceHub'), { loading: () => <IntelligenceSkeleton /> });
const MarketplaceHeatmap = dynamic(() => import('@/components/dashboard/MarketplaceHeatmap'), { loading: () => <HeatmapSkeleton /> });
```

### 5.5 — Performance Optimizations

**Create new file:** `src/hooks/useScrollPerformance.ts`

- Replaces multiple IntersectionObservers with a single scroll listener
- Throttled at 16ms (60fps)
- Provides `visibleSections` Set to components

**Files to modify:**

- All dashboard components — Replace individual `useInView` with centralized scroll performance hook
- `src/hooks/useInView.ts` — Add deprecation warning, keep for non-dashboard use

### 5.6 — Testing for Phase 5

**New test files:**

- `src/app/api/dashboard/kpi/route.test.ts`
- `src/app/api/dashboard/trending/route.test.ts`
- `src/app/api/dashboard/intelligence/route.test.ts`
- `src/app/api/dashboard/niches/route.test.ts`
- `src/app/api/dashboard/suppliers/route.test.ts`
- `src/app/api/dashboard/heatmap/route.test.ts`
- `src/app/api/dashboard/daily-pick/route.test.ts`
- `src/app/api/dashboard/ticker/route.test.ts`
- `src/hooks/useDashboardData.test.ts` (update for parallel fetching)
- `src/hooks/useScrollPerformance.test.ts`
- `src/components/ui/SkeletonCard.test.tsx`
- All skeleton component tests

**Update:**

- `src/__tests__/pages/dashboard-page.test.ts` — Update for lazy loading
- `e2e/app-shell.spec.ts` — Test progressive loading

**Run:** `npm run test:api && npm run test:components && npm run test:e2e`

---

## Phase 6: Mobile-First Redesign

**Goal:** Transform mobile experience with bottom navigation, swipeable cards, and gesture support.

### 6.1 — Bottom Navigation Bar

**Create new file:** `src/components/dashboard/MobileNav.tsx`

A fixed bottom bar (mobile only, `md:hidden`):

- 5 tabs: Home, Search, Intelligence, Orders, Profile
- Active tab indicator (animated underline or filled icon)
- Badge support (notification count)
- Smooth tab switching animation
- Safe area insets for notched phones

**File to modify:** `src/app/(app)/layout.tsx`

Add `<MobileNav />` to app shell, conditionally rendered on mobile.

### 6.2 — Swipeable Card Containers

**Create new file:** `src/components/ui/SwipeContainer.tsx`

A touch-friendly horizontal scroll container:

- Snap-to-card scrolling (CSS scroll-snap)
- Touch/mouse drag support
- Page indicator dots
- Momentum scrolling

**Files to modify:**

- `NicheRadarCards.tsx` — Wrap in `<SwipeContainer />`
- `SupplierStatusCards.tsx` — Wrap in `<SwipeContainer />`
- KPI row in `page.tsx` — Wrap in `<SwipeContainer />` on mobile

### 6.3 — Mobile Card Stack

**File to modify:** `src/app/(app)/dashboard/page.tsx`

On mobile:

- Bento grid collapses to single column
- Cards stack vertically with spacing
- Horizontal scroll sections use `<SwipeContainer />`
- Bottom nav replaces sidebar

### 6.4 — Touch Gestures

**Create new file:** `src/hooks/useSwipe.ts`

- Detects swipe left/right/up/down
- Configurable thresholds
- Returns `{ direction, distance, isSwiping }`

**File to modify:** `TrendingProducts.tsx`

Add swipe-to-add-compare on mobile cards.

### 6.5 — Testing for Phase 6

**New test files:**

- `src/components/dashboard/MobileNav.test.tsx` — Tests tab rendering, active state, badge display
- `src/components/ui/SwipeContainer.test.tsx` — Tests scroll snap, page indicators
- `src/hooks/useSwipe.test.ts` — Tests gesture detection

**Update:**

- `e2e/responsive.spec.ts` — Add mobile navigation tests, swipe tests
- `e2e/app-shell.spec.ts` — Test mobile layout

**Run:** `npm run test:components && npm run test:e2e`

---

## Phase 7: Micro-interactions & Delight

**Goal:** Add polished animations and interactions that make the dashboard feel premium.

### 7.1 — 3D Card Hover Effects

**Create new file:** `src/components/ui/InteractiveCard.tsx`

A card component with:

- 3D perspective tilt on hover (CSS `transform: perspective(1000px) rotateX() rotateY()`)
- Mouse position tracking for tilt direction
- Subtle glow effect following cursor
- Smooth spring-back animation on leave

**Files to modify:**

- KPI cards in `page.tsx` — Wrap with `<InteractiveCard />`
- `AIDailyPick.tsx` — Apply 3D hover to main card

### 7.2 — Number Animation Enhancements

**File to modify:** `src/hooks/useAnimatedCounter.ts`

Enhance with:

- Configurable easing functions (ease-out, spring, bounce)
- Duration parameter
- Prefix/suffix support ($, %, K, M)
- Color flash on value change

### 7.3 — Scroll-Triggered Section Reveals

**Create new file:** `src/components/ui/ScrollReveal.tsx`

A wrapper component:

- Staggered children animation (configurable delay between children)
- Multiple animation presets: `fade-up`, `fade-left`, `fade-right`, `scale-in`, `blur-in`
- Uses single scroll listener (from Phase 5) instead of multiple IntersectionObservers

### 7.4 — Loading State Delight

**Create new file:** `src/components/ui/SkeletonShimmer.tsx`

Enhanced skeleton with:

- Gradient shimmer animation (not just pulse)
- Content-aware shapes (rectangles for text, circles for avatars, rounded for buttons)
- Subtle noise texture overlay

### 7.5 — Transition Polish

**File to modify:** `src/app/globals.css`

Add new animation keyframes:

```css
@keyframes spring-in {
  /* Spring physics entrance */
}
@keyframes tilt-hover {
  /* 3D tilt effect */
}
@keyframes glow-follow {
  /* Cursor-following glow */
}
@keyframes shimmer-gradient {
  /* Enhanced shimmer */
}
@keyframes stagger-fade {
  /* Staggered children */
}
```

### 7.6 — Testing for Phase 7

**New test files:**

- `src/components/ui/InteractiveCard.test.tsx` — Tests hover state, tilt calculation
- `src/components/ui/ScrollReveal.test.tsx` — Tests animation trigger, stagger timing
- `src/components/ui/SkeletonShimmer.test.tsx` — Tests rendering, animation classes
- `src/hooks/useAnimatedCounter.test.ts` (update) — Test new easing, prefix/suffix

**Update:**

- All existing component tests — Verify animations don't break rendering

**Run:** `npm run test:components`

---

## Phase 8: Gamification & Personalization

**Goal:** Make the dashboard adapt to each user and reward engagement.

### 8.1 — User Dashboard Profile

**Create new file:** `src/hooks/useDashboardProfile.ts`

Fetches user's Firestore profile and provides:

- Niche, budget, store preferences
- Layout preference
- Feature usage stats
- Gamification level/XP

### 8.2 — Contextual Greeting Enhancement

**File to modify:** `src/components/dashboard/GreetingCard.tsx`

Enhance to show:

- Top opportunity for user's niche (not generic)
- Revenue summary if connected to store
- "Today's focus" — personalized recommendation based on time of day + user history

### 8.3 — Gamification System

**Create new file:** `src/components/dashboard/GamificationPanel.tsx`

A persistent mini-panel showing:

- Current level + XP progress
- Streak counter (consecutive days active)
- Badges earned (with unlock dates)
- Next milestone preview

**Create new file:** `src/hooks/useGamification.ts`

- Tracks user actions (search, calculate, view product)
- Awards XP for actions
- Checks badge unlock conditions
- Persists to Firestore `users/{uid}/gamification`

### 8.4 — Onboarding Tour

**Create new file:** `src/components/onboarding/DashboardTour.tsx`

An interactive walkthrough:

- 6 steps: Welcome → KPIs → AI Pick → Intelligence → Quick Actions → Customize
- Tooltip-guided (pointing to actual UI elements)
- Skip/complete options
- Persists completion to Firestore

**File to modify:** `src/app/(app)/layout.tsx`

Show `<DashboardTour />` on first login.

### 8.5 — Layout Customization UI

**File to modify:** `src/app/(app)/dashboard/page.tsx`

Add "Customize" mode:

- Toggle button enters edit mode
- Cards show drag handles
- Section visibility toggles (eye icon)
- Preset selector dropdown
- Save/cancel buttons

### 8.6 — Testing for Phase 8

**New test files:**

- `src/hooks/useDashboardProfile.test.ts` — Tests profile loading, defaults
- `src/hooks/useGamification.test.ts` — Tests XP calculation, badge unlock, persistence
- `src/components/dashboard/GamificationPanel.test.tsx` — Tests rendering, level display
- `src/components/onboarding/DashboardTour.test.tsx` — Tests step progression, skip, completion
- `src/components/dashboard/GreetingCard.test.tsx` (update) — Test personalized content

**Update:**

- `src/__tests__/pages/dashboard-page.test.ts` — Test customize mode, layout switching

**Run:** `npm run test:components && npm run test:e2e`

---

## Cross-Cutting Concerns

### Accessibility

**Throughout all phases:**

- All interactive elements must have `aria-label` or visible text
- Color is never the only indicator (add icons/text for trends)
- Focus-visible outlines on all interactive elements
- Keyboard navigation for command palette, bento grid edit mode
- ARIA live regions for real-time data updates
- Reduced motion support (`prefers-reduced-motion` media query)

**Create new file:** `src/lib/accessibility.ts`

Utilities:

- `announceToScreenReader(message)` — Creates ARIA live region
- `getContrastRatio(color1, color2)` — Validates color contrast
- `prefersReducedMotion()` — Checks user preference

### Error Recovery

**File to modify:** All dashboard components

Add:

- Retry buttons on failed data loads
- Graceful degradation (show cached data with "stale" indicator)
- Offline mode support (detect `navigator.onLine`)

### Performance Monitoring

**Create new file:** `src/hooks/usePerformanceMetrics.ts`

- Tracks component render times
- Logs slow renders (>16ms)
- Reports to monitoring endpoint

---

## Implementation Order

| Step      | Phase                       | Estimated Files Changed | Estimated New Files |
| --------- | --------------------------- | ----------------------- | ------------------- |
| 1         | Phase 1: Design System      | 12                      | 10                  |
| 2         | Phase 2: Bento Grid         | 5                       | 6                   |
| 3         | Phase 3: Charts             | 6                       | 7                   |
| 4         | Phase 4: Command Palette    | 3                       | 5                   |
| 5         | Phase 5: API Split          | 3                       | 15                  |
| 6         | Phase 6: Mobile             | 4                       | 4                   |
| 7         | Phase 7: Micro-interactions | 4                       | 5                   |
| 8         | Phase 8: Gamification       | 3                       | 5                   |
| **Total** |                             | **40**                  | **57**              |

---

## Verification Checklist

After each phase, run:

```bash
npm run typecheck    # TypeScript compilation
npm run lint         # ESLint checks
npm run test         # All Vitest tests
npm run test:e2e     # Playwright E2E tests
npm run build        # Production build
```

All must pass before proceeding to next phase.
