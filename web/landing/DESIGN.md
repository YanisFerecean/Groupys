# Design System Specification: High-End Editorial Minimalism

## 1. Overview & Creative North Star: "The Digital Curator"
This design system is anchored by the concept of **"The Digital Curator."** It moves beyond a simple music player interface into a high-end editorial experience. It is defined by a "Gallery-First" mentality: the UI exists only to frame and elevate content. 

To break the "template" look, we employ **intentional asymmetry**. Hero headers should use extreme scale (Display-LG) offset against generous whitespace (Scale 20+), creating a rhythm that feels more like a prestige magazine than a mobile app. We favor overlapping elements—such as a high-quality artist image bleeding into a glassmorphic navigation bar—to create a sense of three-dimensional space and sophisticated depth.

---

## 2. Colors & Tonal Architecture
The palette is a sophisticated interplay of stark whites, clinical grays, and a singular, high-energy pulse of red.

### The Palette (Material Design Tokens)
*   **Primary (The Pulse):** `#ba002b` (Derived from the vibrant `#FA2D48` for accessibility compliance). Used for active states and critical CTAs.
*   **Surface / Background:** `#f9f9fb` (A cool, crisp off-white that prevents eye strain).
*   **Surface Containers:** From `lowest` (`#ffffff`) to `highest` (`#e2e2e4`).

### The "No-Line" Rule
**Explicit Prohibition:** 1px solid borders are strictly forbidden for sectioning or containment. 
Boundaries must be defined solely through background color shifts. For example, a content card using `surface-container-lowest` (#ffffff) should sit atop a `surface` background (#f9f9fb). The contrast is felt, not seen.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine paper and frosted glass. 
*   **Level 0 (Base):** `surface`
*   **Level 1 (Sections):** `surface-container-low`
*   **Level 2 (Cards/Interaction):** `surface-container-lowest` (Pure white) to create a "lifted" appearance.

### The "Glass & Gradient" Rule
Floating navigation bars and music controllers must utilize **Glassmorphism**. Apply `surface` at 70% opacity with a `backdrop-blur` of 20px. For primary CTAs, use a subtle linear gradient from `primary` to `primary_container` to give the button "soul" and a tactile, slightly convex feel.

---

## 3. Typography: Bold Intent
We utilize **Inter** (as a high-performance alternative to SF Pro) to create an authoritative, editorial hierarchy.

*   **Display-LG (3.5rem):** Set with `font-weight: 800` and `letter-spacing: -0.04em`. This is your "Statement" type. Used for Artist names or Playlist titles.
*   **Headline-SM (1.5rem):** Set with `font-weight: 700`. Used for section headers (e.g., "Recently Played").
*   **Body-MD (0.875rem):** Set with `font-weight: 400` and `line-height: 1.5`. This provides the "breathing room" required for long-form metadata.
*   **Label-SM (0.6875rem):** Set with `font-weight: 600` and `text-transform: uppercase`. Use sparingly for micro-contextual clues.

The hierarchy communicates **Confidence**. By using heavy weights for headers and light, spacious weights for body text, we create a high-contrast visual tension that feels premium.

---

## 4. Elevation & Depth
Depth is achieved through "Tonal Layering" rather than structural shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a natural, soft lift.
*   **Ambient Shadows:** When a true "floating" element (like a Now Playing drawer) is required, use a shadow with a 40px blur and 4% opacity, tinted with the `on-surface` color.
*   **The "Ghost Border":** If a boundary is required for accessibility (e.g., a search input), use `outline-variant` at **15% opacity**. Never use a 100% opaque border.
*   **Backdrop Integration:** Use glassmorphism for any element that scrolls over content. The `surface` color should bleed through, ensuring the UI feels integrated into the imagery.

---

## 5. Components

### Buttons
*   **Primary:** Rounded `full`. Background: `primary` gradient. Typography: `title-sm` (white).
*   **Secondary:** Rounded `full`. Background: `surface-container-high`. No border.
*   **Tertiary:** Ghost style. `primary` text, no background.

### Cards & Lists (The "No-Divider" Rule)
*   **Cards:** Use `rounded-xl` (1.5rem). Use `spacing-4` (1.4rem) padding. 
*   **Lists:** Strictly forbid 1px horizontal dividers. Separate list items using `spacing-3` (1rem) of vertical whitespace. If separation is visually required, use a subtle background shift to `surface-container-low` on hover.

### Iconic Navigation
*   **The Bottom Bar:** A high-blur glassmorphic container (`surface` @ 80% opacity). Icons are 24px, using `on-surface-variant` for inactive and `primary` for active. No text labels—the icons must be universally recognizable.

### Input Fields
*   **Text Inputs:** `surface-container-high` background, `rounded-md`. No border. The focus state should be a subtle glow or a change to `surface-container-highest`.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the Void:** Use `spacing-16` or `spacing-20` for top margins on major sections.
*   **Image Dominance:** Allow album art to define the mood. If the art is dark, the glassmorphic elements should subtly reflect that tonal shift.
*   **Soft Transitions:** All hover and active states should have a 300ms cubic-bezier ease.

### Don't:
*   **Don't use black:** Pure black (#000000) is too harsh. Use `on-surface` (#1a1c1d) for text.
*   **Don't crowd the edges:** Maintain a minimum of `spacing-6` (2rem) horizontal padding on all screens.
*   **Don't use shadows on everything:** Reserve shadows only for elements that physically "float" (modals, drawers). Everything else relies on tonal shifts.
*   **No "Boxy" feel:** Avoid sharp corners. Stick to the `xl` (1.5rem) and `lg` (1rem) roundedness scale to maintain the soft, Apple-inspired aesthetic.