---
name: Modern Financial Pulse
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#5b4138'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#8f7067'
  outline-variant: '#e4beb3'
  surface-tint: '#ad3300'
  primary: '#a93200'
  on-primary: '#ffffff'
  primary-container: '#d34000'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59e'
  secondary: '#485e8a'
  on-secondary: '#ffffff'
  secondary-container: '#b5ccfe'
  on-secondary-container: '#3f5681'
  tertiary: '#605b57'
  on-tertiary: '#ffffff'
  tertiary-container: '#79746f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59e'
  on-primary-fixed: '#3a0b00'
  on-primary-fixed-variant: '#842500'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#b0c7f8'
  on-secondary-fixed: '#001a40'
  on-secondary-fixed-variant: '#304670'
  tertiary-fixed: '#e9e1db'
  tertiary-fixed-dim: '#ccc5c0'
  on-tertiary-fixed: '#1e1b18'
  on-tertiary-fixed-variant: '#4a4642'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 1rem
  margin-tablet: 2rem
  gutter: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

This design system is built on a **Corporate / Modern** foundation with a **Vibrant / Optimistic** overlay. It balances the uncompromising reliability of a financial institution with the approachability of a lifestyle app. The brand personality is "The Empathetic Expert"—authoritative on security, yet friendly and clear in communication.

The visual language is characterized by high legibility, energetic color accents to drive action, and a soft physical presence through subtle shadows. The goal is to reduce "financial anxiety" by using a bright, airy aesthetic that makes complex banking tasks feel manageable and fluid.

## Colors

The palette is anchored by a high-energy **Vibrant Orange** (#EE5115) used for primary actions, critical alerts, and brand expression. This is balanced by a **Deep Navy Blue** (#1D355E) which provides the necessary "banking weight," used for headers, secondary buttons, and primary text to evoke trust and stability.

- **Primary:** Orange is for "Doing"—CTAs, active states, and highlights.
- **Secondary:** Navy is for "Being"—Structure, navigation, and core identity.
- **Surface:** A very light peach/cream (#F9F1EB) acts as a warm alternative to clinical white for large background areas, making the UI feel more inviting.
- **Status:** Standardized semantic colors for Success (Green), Warning (Amber), and Error (Red) must be used at 600-grade intensity for accessibility against light backgrounds.

## Typography

The system utilizes two distinct sans-serif families to balance modern flair with data clarity. 

**Manrope** is used for headlines and display text. Its geometric yet slightly condensed nature feels modern and high-tech, perfect for showing balances and section titles. 

**Work Sans** is used for all body text, inputs, and labels. Its optimized legibility at small sizes is critical for financial statements and transaction lists. 

On mobile, reduce display sizes by roughly 15% (as defined in `headline-lg-mobile`) to ensure numeric data doesn't wrap awkwardly. Use `600` weight for emphasis within body text rather than bold `700` to maintain a clean, professional look.

## Layout & Spacing

The design system follows a **Fluid Grid** model with an 8px base unit. For mobile banking, touch targets and scanability are prioritized over high density.

- **Mobile (Default):** 4-column layout with 16px (1rem) side margins and 16px gutters.
- **Vertical Rhythm:** Elements are grouped using a stack-based approach. Related items (like an input and its label) use `stack-sm`. Component groups use `stack-md`. Major sections use `stack-lg`.
- **Safe Zones:** Ensure all primary actions (Transfer, Pay) are within the "Thumb Zone" (bottom 40% of the screen) for one-handed use.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layers**. 

1.  **Base Layer:** The surface background (#F9F1EB or White).
2.  **Surface-Container:** Cards and interactive containers use a pure white background to pop against the off-white base.
3.  **Shadows:** Use a "Soft-Focus" shadow style. 
    - *Low Elevation:* 0px 2px 8px rgba(29, 53, 94, 0.05) — Used for standard cards.
    - *High Elevation:* 0px 8px 24px rgba(29, 53, 94, 0.12) — Used for floating action buttons and modals.
    
The Navy Blue color is used as the shadow tint rather than pure black to keep the UI looking "rich" and integrated.

## Shapes

The shape language is **Rounded**, communicating friendliness and safety.

- **Standard Elements:** Buttons, input fields, and small cards use a **0.5rem (8px)** radius.
- **Large Containers:** Dashboard widgets and promotional banners use **1rem (16px)** to feel softer and more distinct.
- **Icon Enclosures:** Small circular elements (like profile pictures or status pips) should be fully rounded (999px).

Avoid sharp corners as they appear too aggressive for a consumer-facing banking app.

## Components

### Buttons
- **Primary:** Solid Orange background with White text. Height: 56px for mobile accessibility.
- **Secondary:** Navy Blue border (2px) with Navy Blue text.
- **Ghost:** No background, Orange text. Used for "Cancel" or "Skip" actions.

### Input Fields
- **Style:** White background with a 1px Navy border (at 20% opacity). 
- **States:** On focus, the border becomes 2px Orange. Floating labels are preferred to maintain context during typing.

### Cards (The "Financial Widget")
- Cards are the primary vessel for data. They must have a 0.5rem radius and the "Low Elevation" shadow. White background is mandatory for contrast.

### Chips & Badges
- Used for transaction categories (e.g., "Shopping," "Food"). These use the Pill-shaped (999px) radius with a light tint of the Primary color (Orange at 10% opacity) and 100% opacity text.

### Navigation Bar
- A bottom-anchored bar with a blur effect (Glassmorphism Lite) or pure White background. Icons should be 24px, using Navy Blue for inactive and Orange for active states.