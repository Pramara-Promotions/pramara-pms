# Project Card Interactive Visualizations

## Overview
Enhanced the project card component with **5 different auto-rotating visualization types** that cycle every 5-7 seconds. The visualizations pause on hover for better user interaction.

## Visualization Types

### 1. **Progress Bars** (Default)
- Traditional horizontal progress bars with gradient fills
- Shows Health Score, Timeline, and Budget progress
- Animated fade-in with staggered delays
- Color-coded based on metrics (green/yellow/red)

### 2. **Pie Chart**
- Donut-style pie chart showing proportions
- Three segments: Health (green), Timeline (blue), Budget (purple)
- Interactive legend below chart
- Smooth rotation animation on appearance

### 3. **Radial Chart**
- Circular progress bars
- Concentric rings for each metric
- Color-coded fills based on health
- Modern, space-efficient design

### 4. **Heat Map**
- 2x2 grid of colored cells
- Color intensity based on metric values:
  - Red (0-30%): Critical
  - Orange (30-50%): Warning
  - Yellow (50-70%): Caution
  - Green (70-90%): Good
  - Emerald (90-100%): Excellent
- Displays: Health, Timeline, Budget, Attention Items
- Animated wave fill effect

### 5. **Pulse Animation**
- Dramatic pulsing center circle with health score
- Floating metric cards (Timeline & Budget)
- Lightning bolt icon with bounce animation
- Multiple pulsing rings for depth
- Eye-catching and dynamic

## Features

### Auto-Rotation
- Cycles through all 5 visualization types
- Random delay between 5-7 seconds for variety
- Smooth transitions between types

### Pause on Hover
- Mouse hover pauses the auto-rotation
- Prevents jarring changes while user is viewing
- Resumes automatically when mouse leaves

### Manual Navigation
- 5 indicator dots at bottom of visualization area
- Click any dot to jump to specific visualization
- Active visualization shown with extended dot
- Temporary 2-second pause after manual selection

### Animations
- **fade-in**: Smooth appearance for all visualizations
- **float**: Gentle up-down motion for floating elements
- **float-delayed**: Staggered floating animation
- **ping**: Expanding ring effect
- **pulse**: Breathing effect for emphasis
- **bounce**: Energetic icon movement

## Technical Implementation

### Components Used
- **Recharts**: PieChart, RadialBarChart
- **Lucide Icons**: Activity, Calendar, DollarSign, Target, Zap
- **React Hooks**: useState, useEffect, useRef

### CSS Animations
Custom animations added to `index.css`:
```css
@keyframes fade-in { /* Smooth entrance */ }
@keyframes float { /* Floating motion */ }
@keyframes float-delayed { /* Staggered float */ }
```

### State Management
```typescript
const [currentViz, setCurrentViz] = useState<VisualizationType>('progress-bars');
const [isPaused, setIsPaused] = useState(false);
const timerRef = useRef<number | null>(null);
```

### Timer Logic
- `useEffect` hook manages rotation timer
- Clears timer on pause or component unmount
- Cycles to next visualization type
- Random delay adds organic feel

## Metrics Displayed

### Health Score
- Range: 0-100
- Source: `project.health.score`
- Colors: 
  - Green (≥70): Healthy
  - Yellow (50-69): At Risk
  - Red (<50): Critical

### Timeline Progress
- Calculated from project start/end dates
- Shows percentage of time elapsed
- Always blue gradient
- Due date displayed below

### Budget Progress
- Calculated from `budgetSpent / budget`
- Changes color when >90% (warning)
- Dollar amounts shown
- Green to red gradient

### Attention Items
- Count from `project.health.attentionItemCount`
- Shown in heat map only
- Helps identify projects needing focus

## User Experience

### Visual Hierarchy
1. **Status Indicator** (top): Quick health at-a-glance
2. **Project Name & Code**: Identity
3. **Description**: Context
4. **Rotating Visualization**: Detailed metrics
5. **Indicator Dots**: Navigation & status
6. **Output Target**: Production goal
7. **Attention Items**: Action required
8. **Footer Stats**: Quick links

### Interaction Patterns
- **Hover**: Pauses rotation, shows elevated shadow
- **Click Card**: Navigates to project details
- **Click Dot**: Selects specific visualization
- **Click Menu**: Shows project actions

### Accessibility
- Reduced motion support respects user preferences
- Color contrast meets WCAG standards
- Interactive elements have hover states
- Focus visible for keyboard navigation

## Performance

### Optimizations
- Single timer per card (not global)
- Lightweight state updates
- CSS transforms for animations
- Conditional rendering of visualizations
- Memoized calculations

### Bundle Size
- Recharts already in dependencies
- No additional libraries needed
- Custom CSS animations (minimal overhead)
- Efficient React hooks usage

## Browser Support
- Modern browsers with CSS Grid support
- Flexbox for layouts
- CSS custom properties for theming
- Graceful degradation for older browsers

## Future Enhancements
1. **More Visualization Types**:
   - Sparklines for trends
   - Gauge charts for single metrics
   - Area charts for timeline
   - Sankey diagrams for workflow

2. **Customization**:
   - User preference for default viz type
   - Adjustable rotation speed
   - Hide specific visualizations
   - Color theme preferences

3. **Interactivity**:
   - Click metric to drill down
   - Tooltip on hover for details
   - Compare mode (multiple projects)
   - Export visualization as image

4. **Data Integration**:
   - Real-time updates via WebSocket
   - Historical data comparison
   - Predictive indicators
   - Anomaly detection

## Testing Checklist
- [ ] All 5 visualizations render correctly
- [ ] Auto-rotation works (5-7 second intervals)
- [ ] Pause on hover functions
- [ ] Manual navigation via dots works
- [ ] Animations play smoothly
- [ ] Dark mode support verified
- [ ] Responsive on mobile devices
- [ ] No console errors
- [ ] Performance acceptable (no lag)
- [ ] Accessibility features work

## Code Locations
- **Component**: `web/src/components/projects/ProjectCard.tsx`
- **Styles**: `web/src/index.css`
- **Dependencies**: `web/package.json` (recharts already present)

---

**Status**: ✅ Implemented
**Date**: 2025-01-18
**Next**: Test visualizations with real project data
