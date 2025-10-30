# PRAMARA PMS DESIGN SYSTEM
**Version:** 1.0  
**Date:** October 30, 2025  
**Philosophy:** Professional Yet Inviting - Asana-Inspired Gradients & Micro-interactions

---

## 🎨 DESIGN PHILOSOPHY

### Core Principles:
1. **Professional but Happy** - Not strict/corporate, but inviting and energetic
2. **Meaningful Color** - Colors communicate status and importance, not just decoration
3. **Gradients Everywhere** - No flat colors on interactive elements
4. **Visible Feedback** - Every action has visual response
5. **Mobile-First** - Floor workers on phones, managers on desktops
6. **Accessibility** - WCAG AA compliant, reduced motion support

---

## 🌈 COLOR SYSTEM

### Primary Gradient (Blue-Purple Spectrum)
**Usage:** Primary actions, navigation, brand elements

```css
/* Light shades */
primary-50:  #f0f4ff  /* Backgrounds */
primary-100: #e0e9ff  /* Hover backgrounds */
primary-200: #c7d7fe  /* Subtle accents */

/* Medium shades */
primary-500: #6b6ef2  /* Primary buttons, links */
primary-600: #5b50e5  /* Hover states */

/* Dark shades */
primary-800: #3f35a3  /* Dark mode primary */
primary-900: #362f81  /* Dark mode hover */
```

**Gradient:**
```css
bg-gradient-primary: linear-gradient(135deg, #6b6ef2 0%, #5b50e5 50%, #4c3fca 100%)
```

---

### Accent Gradient (Vibrant Red-Pink)
**Usage:** Important callouts, urgent actions, highlights

```css
accent-500: #e84d64  /* Accent buttons */
accent-600: #d32f4c  /* Accent hover */
```

**Gradient:**
```css
bg-gradient-accent: linear-gradient(135deg, #f27a8a 0%, #e84d64 50%, #d32f4c 100%)
```

---

### Status Colors

#### Success (Green Gradient)
**Usage:** Completed tasks, successful operations, health indicators

```css
success-500: #22c55e  /* Success primary */
success-600: #16a34a  /* Success hover */
```

**Gradient:**
```css
bg-gradient-success: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)
```

#### Warning (Orange Gradient)
**Usage:** Attention needed, approaching deadlines, moderate risks

```css
warning-500: #f59e0b  /* Warning primary */
warning-600: #d97706  /* Warning hover */
```

**Gradient:**
```css
bg-gradient-warning: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)
```

#### Error (Red Gradient)
**Usage:** Errors, critical issues, overdue tasks, rejections

```css
error-500: #ef4444  /* Error primary */
error-600: #dc2626  /* Error hover */
```

**Gradient:**
```css
bg-gradient-error: linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)
```

#### Info (Blue Gradient)
**Usage:** Informational messages, tips, neutral states

```css
info-500: #3b82f6  /* Info primary */
info-600: #2563eb  /* Info hover */
```

**Gradient:**
```css
bg-gradient-info: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)
```

---

### Background Gradients

#### Light Mode
```css
/* Default page background */
bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20

/* Card backgrounds */
bg-white with subtle shadows

/* Hover backgrounds */
from-slate-100 to-slate-50
```

#### Dark Mode
```css
/* Default page background */
bg-gradient-to-br from-slate-900 via-blue-950/50 to-purple-950/30

/* Card backgrounds */
bg-slate-800/50 with backdrop-blur

/* Hover backgrounds */
from-slate-800 to-slate-700
```

---

## 📝 TYPOGRAPHY SYSTEM

### Font Families
```css
/* Primary (UI) */
font-sans: Inter, system-ui, -apple-system, sans-serif

/* Secondary (Content) */
font-serif: Georgia, Cambria, Times New Roman, serif

/* Monospace (Code) */
font-mono: Fira Code, Consolas, Monaco, monospace
```

### Font Sizes & Line Heights
```
text-xs:   12px / 16px   (Captions, small labels)
text-sm:   14px / 20px   (Body small, secondary text)
text-base: 16px / 24px   (Body text, default)
text-lg:   18px / 28px   (Emphasized text)
text-xl:   20px / 28px   (Subheadings)
text-2xl:  24px / 32px   (Section headings)
text-3xl:  30px / 36px   (Page headings)
text-4xl:  36px / 40px   (Hero text)
text-5xl:  48px / 48px   (Display text)
```

### Font Weights
```
font-normal:   400 (Body text)
font-medium:   500 (Emphasized text, labels)
font-semibold: 600 (Headings, buttons)
font-bold:     700 (Page titles, important headings)
```

### Text Hierarchy
```css
.text-primary:   slate-900 / slate-100  (Primary content)
.text-secondary: slate-600 / slate-400  (Supporting text)
.text-tertiary:  slate-500 / slate-500  (De-emphasized text)
```

---

## 📏 SPACING SYSTEM

### Base Unit: 4px

```
0.5 =  2px   (Tight spacing)
1   =  4px   (Base unit)
2   =  8px   (Small gaps)
3   = 12px   (Default gaps)
4   = 16px   (Medium gaps)
6   = 24px   (Large gaps)
8   = 32px   (Section spacing)
12  = 48px   (Major sections)
16  = 64px   (Hero spacing)
```

### Usage Guidelines
- **Padding:** 3-4 for buttons, 4-6 for cards
- **Margins:** 4 between elements, 8 between sections
- **Gaps:** 2-3 for tight layouts, 4-6 for comfortable layouts

---

## 🔘 BORDER RADIUS SYSTEM

```
rounded-none: 0px     (Sharp corners)
rounded-sm:   2px     (Very subtle)
rounded:      4px     (Default)
rounded-md:   6px     (Input fields)
rounded-lg:   8px     (Buttons, cards)
rounded-xl:   12px    (Large cards)
rounded-2xl:  16px    (Hero cards)
rounded-3xl:  24px    (Special elements)
rounded-full: 9999px  (Pills, avatars)
```

---

## 💫 SHADOW SYSTEM

### Elevation Levels
```css
shadow-sm:  Subtle lift (1px)
shadow:     Default elevation (2-3px)
shadow-md:  Medium elevation (4-6px)
shadow-lg:  High elevation (10-15px)
shadow-xl:  Very high elevation (20-25px)
shadow-2xl: Maximum elevation (25-50px)
```

### Colored Shadows (for emphasis)
```css
shadow-primary: Primary blue glow
shadow-success: Green glow
shadow-warning: Orange glow
shadow-error:   Red glow
```

### Glow Effects (for focus/hover)
```css
shadow-glow-primary: 0 0 20px rgba(107, 110, 242, 0.5)
shadow-glow-success: 0 0 20px rgba(34, 197, 94, 0.5)
```

---

## 🎬 ANIMATION SYSTEM

### Timing Functions
```
ease-out:     Natural deceleration (most animations)
ease-in-out:  Smooth start and end (page transitions)
ease-in:      Natural acceleration (exit animations)
```

### Durations
```
duration-200: 200ms (Hover effects, micro-interactions)
duration-300: 300ms (Default transitions)
duration-500: 500ms (Complex animations)
duration-700: 700ms (Page transitions)
```

### Pre-built Animations

#### Fade
```css
animate-fade-in:  Fade in (0 → 1 opacity)
animate-fade-out: Fade out (1 → 0 opacity)
```

#### Slide
```css
animate-slide-in-right: Slide in from right
animate-slide-in-left:  Slide in from left
animate-slide-in-up:    Slide in from bottom
animate-slide-in-down:  Slide in from top
```

#### Scale
```css
animate-scale-in:  Scale in (0.9 → 1)
animate-scale-out: Scale out (1 → 0.9)
animate-bounce-in: Bounce in effect
```

#### Special Effects
```css
animate-shimmer:      Loading shimmer (2s infinite)
animate-pulse-success: Success pulse (2s infinite)
animate-shake:        Error shake (0.5s)
animate-lift:         Hover lift (0.2s)
```

---

## 🖱️ COMPONENT PATTERNS

### Buttons

#### Primary Button
```jsx
<button className="btn-primary">
  {/* Gradient background, shadow, lift on hover */}
</button>
```

**States:**
- Default: Gradient background
- Hover: Lift (-translate-y-1), shadow grows
- Active: Press down (translate-y-0)
- Disabled: Opacity 50%, no pointer events

#### Secondary Button
```jsx
<button className="btn-secondary">
  {/* Gradient border, subtle background */}
</button>
```

#### Ghost Button
```jsx
<button className="btn-ghost">
  {/* Gradient text, hover background */}
</button>
```

---

### Cards

#### Basic Card
```jsx
<div className="card">
  {/* White/dark background, subtle border, hover lift */}
</div>
```

**States:**
- Default: Subtle shadow
- Hover: Lift, shadow grows, border color intensifies

#### Gradient Card
```jsx
<div className="card-gradient">
  {/* Gradient background, animated on hover */}
</div>
```

#### Glass Morphism Card
```jsx
<div className="card-glass">
  {/* Frosted glass effect, backdrop blur */}
</div>
```

---

### Inputs

#### Text Input
```jsx
<input className="input-gradient" />
```

**States:**
- Default: Border visible
- Focus: Gradient glow ring
- Error: Red gradient border + shake animation
- Success: Green gradient border

---

### Badges

#### Status Badges
```jsx
<span className="badge-primary">In Progress</span>
<span className="badge-success">Completed</span>
<span className="badge-warning">Attention</span>
<span className="badge-error">Overdue</span>
```

---

### Progress Bars

```jsx
<div className="progress-bar">
  <div className="progress-fill-primary" style={{ width: '60%' }}></div>
</div>
```

**Variants:**
- `.progress-fill-primary` - Blue gradient
- `.progress-fill-success` - Green gradient (on track)
- `.progress-fill-warning` - Orange gradient (at risk)
- `.progress-fill-error` - Red gradient (critical)

---

## 📱 RESPONSIVE DESIGN

### Breakpoints
```
sm:  640px   (Large phones)
md:  768px   (Tablets)
lg:  1024px  (Laptops)
xl:  1280px  (Desktops)
2xl: 1536px  (Large desktops)
```

### Mobile-First Strategy

#### Touch Targets
- Minimum size: 44x44px
- Use `.touch-target` utility class

#### Navigation
- Mobile: Bottom tabs (thumb-friendly)
- Desktop: Sidebar (persistent)

#### Modals
- Mobile: Bottom sheet (slides up)
- Desktop: Center modal (overlays)

#### Tables
- Mobile: Card view (stacked)
- Desktop: Table view (columns)

#### Forms
- Mobile: Stacked (single column)
- Desktop: Side-by-side (two columns)

---

## ♿ ACCESSIBILITY

### Focus States
```css
:focus-visible {
  outline: none;
  ring: 2px solid primary-500;
  ring-offset: 2px;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* All animations reduced to 0.01ms */
}
```

### Color Contrast
- All text meets WCAG AA standards (4.5:1 for normal text)
- Interactive elements clearly visible in both modes

### Keyboard Navigation
- All interactive elements focusable
- Logical tab order
- Keyboard shortcuts available

---

## 🎯 USAGE EXAMPLES

### Example 1: Project Card
```jsx
<div className="card-gradient">
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="status-online"></span>
      <h3 className="text-gradient-primary text-xl font-bold">Project Alpha</h3>
    </div>
    <span className="badge-success">On Track</span>
  </div>
  
  <div className="space-y-3">
    <div className="progress-bar">
      <div className="progress-fill-primary" style={{ width: '65%' }}></div>
    </div>
    <p className="text-secondary">Timeline: 65% complete</p>
  </div>
</div>
```

### Example 2: Action Button
```jsx
<button className="btn-primary flex items-center gap-2">
  <Plus className="w-5 h-5" />
  <span>Create Batch</span>
</button>
```

### Example 3: Status Indicator
```jsx
<div className="flex items-center gap-2">
  <span className="status-online"></span>
  <span className="text-success-600">Active</span>
</div>
```

---

## 🚀 IMPLEMENTATION CHECKLIST

- [x] Tailwind config with gradient colors
- [x] Animation keyframes defined
- [x] Component classes created
- [x] Typography system established
- [x] Spacing system documented
- [x] Shadow system with colored variants
- [x] Responsive utilities
- [x] Accessibility features
- [x] Design system documentation

---

## 📚 RESOURCES

- **Inspiration:** Asana, OneDrive, Linear
- **Icons:** Lucide React
- **Fonts:** Inter (Google Fonts)
- **Color Tool:** https://tailwindcss.com/docs/customizing-colors
- **Gradient Generator:** https://cssgradient.io/

---

**Next Steps:**
1. Apply design system to existing components (T1.2, T1.3)
2. Create component library showcase
3. Update component documentation
4. Train team on design patterns

**"Professional Yet Inviting"** - Every pixel should feel intentional and welcoming! 🎨✨
