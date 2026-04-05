# Design System Specification: The Precision Architect

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"Structured Serenity."** For a professional management platform, the interface must do more than just function; it must instill a sense of absolute order and calm. We are moving away from the "cluttered dashboard" trope and toward a **High-End Editorial** experience.

By utilizing intentional asymmetry, expansive negative space, and a rejection of traditional containment (lines/borders), we create an environment that feels bespoke and premium. The goal is to make business management feel less like data entry and more like a curated executive summary. We achieve this through "The Layering Principle," where depth and hierarchy are defined by tonal shifts rather than structural outlines.

## 2. Colors: Tonal Architecture
The palette is rooted in a deep, authoritative blue complemented by a growth-oriented emerald. We utilize a Material 3-inspired token system to ensure semantic clarity across light and dark modes.

### The "No-Line" Rule
**Designers are strictly prohibited from using 1px solid borders for sectioning or containment.** 
Structural boundaries must be defined solely through background color shifts. For example, a sidebar should be defined by `surface-container-low` sitting flush against a `surface` background. This forces a cleaner, more sophisticated visual language that mimics architectural planes rather than digital boxes.

### Surface Hierarchy & Nesting
Depth is achieved through the physical stacking of color tiers. Treat the UI as a series of nested sheets:
*   **Base Layer:** `surface` or `background`
*   **Sectional Layer:** `surface-container-low`
*   **Component Layer (Cards/Modals):** `surface-container-lowest` (in light mode) or `surface-container-high` (to create lift).
*   **Active Interaction:** `surface-bright`

### The "Glass & Gradient" Rule
To elevate the experience beyond "standard SaaS," use **Glassmorphism** for floating elements like navigation bars or quick-action menus. Use semi-transparent `surface` colors with a `24px` backdrop blur. 
**Signature Texture:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle to provide a "lit from within" professional polish.

---

## 3. Typography: Editorial Authority
The system pairs the geometric elegance of **Manrope** for high-level display with the utilitarian precision of **Inter** for dense data.

*   **Display & Headlines (Manrope):** These are your "Editorial" voices. Use large scales (`display-lg` at 3.5rem) with tight letter spacing (-0.02em) to create an authoritative, premium feel. 
*   **Titles & Body (Inter):** These are your "Functional" voices. Inter’s high x-height ensures that appointment times and business metrics remain legible even in dense dashboard views.
*   **Hierarchy as Identity:** Use `title-lg` for card headers but pair them with `label-sm` in all-caps (spaced 0.05em) for category tags to create a sophisticated typographic contrast.

---

## 4. Elevation & Depth
We eschew traditional "drop shadows" in favor of **Tonal Layering** and **Ambient Light.**

### The Layering Principle
Instead of a shadow, place a `surface-container-lowest` card on top of a `surface-container-low` background. The slight shift in hex value creates a "soft lift" that is easier on the eyes during long management sessions.

### Ambient Shadows
When an element must float (e.g., a dropdown or a primary modal), use "Ambient Shadows":
*   **Blur:** 32px to 64px.
*   **Opacity:** 4% – 8%.
*   **Color:** Use a tinted version of `on_surface` (a deep navy/grey) rather than pure black to ensure the shadow feels like a natural part of the environment.

### The "Ghost Border" Fallback
If accessibility requirements demand a border (e.g., in high-contrast situations), use a **Ghost Border**: `outline-variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Soft & Intentional
All components follow the roundedness scale, primarily utilizing `md` (0.75rem) and `lg` (1rem) to maintain the "Soft Modern" aesthetic.

*   **Buttons:** 
    *   *Primary:* Gradient fill (Blue to Light Blue) with `full` (9999px) or `lg` (1rem) corners.
    *   *Tertiary:* No background, no border. Use `primary` text weight `600` with a subtle `surface-variant` hover state.
*   **Input Fields:** Use `surface-container-highest` for the field fill. No bottom line. Use `md` corners. Labels should be `label-md` and sit 8px above the field, never floating inside.
*   **Cards & Lists:** **Strictly forbid divider lines.** Separate list items using 12px of vertical white space or a subtle `surface` shift on hover. This creates a "breathable" list that feels less like a spreadsheet and more like a guest list.
*   **The "Growth" Chip:** For status indicators (e.g., "Confirmed" or "Revenue Up"), use `secondary_container` (Teal) with `on_secondary_container` text. This provides the "fresh, growth-oriented" feel requested.
*   **Booking Grid:** Use `surface-container-low` for empty slots and `primary_container` for booked slots. Overlapping elements (like a 30-minute appointment over a 60-minute block) should use a `1px` "Ghost Border" in `surface` to define edges without adding visual noise.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts for landing pages—place text on the far left and let imagery or booking widgets bleed off the right edge.
*   **Do** prioritize "Breathing Room." If a layout feels cramped, increase the padding to the next step in the spacing scale rather than adding a divider.
*   **Do** use `secondary` (Teal) sparingly as a "Success" or "Growth" signal to maintain its impact.

### Don't:
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#191b23) to maintain a soft, premium contrast.
*   **Don't** use standard "Material Blue." Stick to the defined `primary` (#004ac6) which has more depth and professional weight.
*   **Don't** use "Card-in-Card" layouts with multiple shadows. Use the Surface Hierarchy (shifting from Low to High background colors) to show nesting instead.