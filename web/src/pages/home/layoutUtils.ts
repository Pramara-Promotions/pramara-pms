// Widget Layout Utilities
import { WidgetSize, WidgetPosition } from './types';

/**
 * Convert widget size to grid dimensions
 */
export function sizeToGridDimensions(size: WidgetSize): { w: number; h: number } {
  switch (size) {
    case 'small':
      return { w: 1, h: 1 };
    case 'medium':
      return { w: 2, h: 1 };
    case 'large':
      return { w: 2, h: 2 };
    case 'full-width':
      return { w: 4, h: 1 };
    default:
      return { w: 1, h: 1 };
  }
}

/**
 * Calculate widget area (for sorting/positioning)
 */
export function calculateWidgetArea(position: WidgetPosition): number {
  return position.w * position.h;
}

/**
 * Check if two widgets overlap
 */
export function doWidgetsOverlap(a: WidgetPosition, b: WidgetPosition): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

/**
 * Get widget CSS classes for grid span
 */
export function getWidgetGridClasses(position: WidgetPosition, isMobile: boolean, isTablet: boolean): string {
  // On mobile, always full width
  if (isMobile) {
    return 'col-span-1 row-span-1';
  }

  // On tablet, limit width to 2 columns max
  if (isTablet) {
    const colSpan = Math.min(position.w, 2);
    return `col-span-${colSpan} row-span-${position.h}`;
  }

  // Desktop: use full dimensions
  return `col-span-${position.w} row-span-${position.h}`;
}

/**
 * Auto-arrange widgets to avoid overlaps
 */
export function autoArrangeWidgets(
  positions: WidgetPosition[],
  columns: number = 4
): WidgetPosition[] {
  const arranged: WidgetPosition[] = [];
  const grid: boolean[][] = [];

  // Initialize grid (100 rows should be enough)
  for (let y = 0; y < 100; y++) {
    grid[y] = new Array(columns).fill(false);
  }

  // Sort by area (larger widgets first)
  const sorted = [...positions].sort((a, b) => 
    calculateWidgetArea(b) - calculateWidgetArea(a)
  );

  for (const widget of sorted) {
    // Find first available position
    let placed = false;
    
    for (let y = 0; y < 100 && !placed; y++) {
      for (let x = 0; x <= columns - widget.w && !placed; x++) {
        // Check if this position is available
        let available = true;
        for (let dy = 0; dy < widget.h && available; dy++) {
          for (let dx = 0; dx < widget.w && available; dx++) {
            if (grid[y + dy]?.[x + dx]) {
              available = false;
            }
          }
        }

        if (available) {
          // Mark grid as occupied
          for (let dy = 0; dy < widget.h; dy++) {
            for (let dx = 0; dx < widget.w; dx++) {
              if (grid[y + dy]) {
                grid[y + dy][x + dx] = true;
              }
            }
          }

          arranged.push({ ...widget, x, y });
          placed = true;
        }
      }
    }

    // If still not placed, add to end
    if (!placed) {
      const lastRow = arranged.reduce((max, w) => Math.max(max, w.y + w.h), 0);
      arranged.push({ ...widget, x: 0, y: lastRow });
    }
  }

  return arranged;
}

/**
 * Compact layout by moving widgets up to fill gaps
 */
export function compactLayout(positions: WidgetPosition[], columns: number = 4): WidgetPosition[] {
  const sorted = [...positions].sort((a, b) => a.y - b.y || a.x - b.x);
  const compacted: WidgetPosition[] = [];
  const grid: boolean[][] = [];

  // Initialize grid
  for (let y = 0; y < 100; y++) {
    grid[y] = new Array(columns).fill(false);
  }

  for (const widget of sorted) {
    // Try to move widget as far up as possible
    let finalY = widget.y;

    for (let y = 0; y < widget.y; y++) {
      // Check if widget fits at this y position
      let fits = true;
      for (let dy = 0; dy < widget.h && fits; dy++) {
        for (let dx = 0; dx < widget.w && fits; dx++) {
          if (grid[y + dy]?.[widget.x + dx]) {
            fits = false;
          }
        }
      }

      if (fits) {
        finalY = y;
        break;
      }
    }

    // Mark grid as occupied
    for (let dy = 0; dy < widget.h; dy++) {
      for (let dx = 0; dx < widget.w; dx++) {
        if (grid[finalY + dy]) {
          grid[finalY + dy][widget.x + dx] = true;
        }
      }
    }

    compacted.push({ ...widget, y: finalY });
  }

  return compacted;
}

/**
 * Validate widget position fits within grid
 */
export function isValidPosition(
  position: WidgetPosition,
  columns: number = 4
): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.x + position.w <= columns &&
    position.w > 0 &&
    position.h > 0
  );
}
