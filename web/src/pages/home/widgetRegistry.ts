// Widget Registry - Centralized widget management
import { WidgetDefinition, WidgetType, IWidgetRegistry } from './types';

class WidgetRegistry implements IWidgetRegistry {
  private widgets: Map<WidgetType, WidgetDefinition> = new Map();

  /**
   * Register a new widget definition
   */
  register(definition: WidgetDefinition): void {
    if (this.widgets.has(definition.type)) {
      console.warn(`Widget type "${definition.type}" is already registered. Overwriting.`);
    }
    this.widgets.set(definition.type, definition);
  }

  /**
   * Get a widget definition by type
   */
  get(type: WidgetType): WidgetDefinition | undefined {
    return this.widgets.get(type);
  }

  /**
   * Get all registered widgets
   */
  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets available for a specific role
   */
  getByRole(role: string): WidgetDefinition[] {
    return this.getAll().filter(widget => {
      // If widget has no role restrictions, it's available to all
      if (!widget.roles || widget.roles.length === 0) {
        return true;
      }
      // Check if role matches any of the widget's allowed roles
      return widget.roles.includes(role);
    });
  }

  /**
   * Check if a widget type exists
   */
  has(type: WidgetType): boolean {
    return this.widgets.has(type);
  }

  /**
   * Unregister a widget (useful for testing or dynamic loading)
   */
  unregister(type: WidgetType): boolean {
    return this.widgets.delete(type);
  }

  /**
   * Clear all registered widgets
   */
  clear(): void {
    this.widgets.clear();
  }

  /**
   * Get widget count
   */
  get size(): number {
    return this.widgets.size;
  }
}

// Export singleton instance
export const widgetRegistry = new WidgetRegistry();

// Export class for testing
export { WidgetRegistry };
