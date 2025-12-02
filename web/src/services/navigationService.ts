/**
 * Navigation Service - Tracks navigation history and manages unsaved changes
 * Provides consistent back button behavior across the application
 */

class NavigationService {
    private history: string[] = [];
    private unsavedChangesCallbacks: Map<string, () => boolean> = new Map();

    /**
     * Track a new navigation entry
     */
    push(path: string) {
        this.history.push(path);
        // Keep history at reasonable size
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    /**
     * Get the previous path in history
     */
    back(): string | null {
        if (this.history.length > 1) {
            // Remove current page
            this.history.pop();
            // Return previous page
            return this.history[this.history.length - 1] || null;
        }
        return null;
    }

    /**
     * Clear navigation history
     */
    clear() {
        this.history = [];
    }

    /**
     * Register a callback to check for unsaved changes on a specific page
     */
    registerUnsavedCheck(pageId: string, callback: () => boolean) {
        this.unsavedChangesCallbacks.set(pageId, callback);
    }

    /**
     * Unregister unsaved changes check
     */
    unregisterUnsavedCheck(pageId: string) {
        this.unsavedChangesCallbacks.delete(pageId);
    }

    /**
     * Check if any registered page has unsaved changes
     */
    hasUnsavedChanges(): boolean {
        for (const [_, callback] of this.unsavedChangesCallbacks) {
            if (callback()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get current path
     */
    getCurrentPath(): string {
        return this.history[this.history.length - 1] || window.location.pathname;
    }
}

// Singleton instance
export const navigationService = new NavigationService();

/**
 * Setup global navigation tracking and protection
 * Call this once in your app initialization
 */
export function setupNavigationTracking() {
    // Track route changes
    let lastPath = window.location.pathname;

    const checkNavigation = () => {
        const currentPath = window.location.pathname;
        if (currentPath !== lastPath) {
            navigationService.push(currentPath);
            lastPath = currentPath;
        }
    };

    // Poll for route changes (TanStack Router doesn't expose global navigation events)
    setInterval(checkNavigation, 100);

    // Initial path
    navigationService.push(window.location.pathname);

    // Prevent accidental closes with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (navigationService.hasUnsavedChanges()) {
            e.preventDefault();
            // Modern browsers ignore custom messages, but this still triggers the dialog
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    console.log('✅ Navigation tracking initialized');
}

/**
 * React hook to register/unregister unsaved changes check
 */
export function useUnsavedChangesProtection(pageId: string, hasUnsavedChanges: boolean) {
    const checkCallback = () => hasUnsavedChanges;

    // Register on mount, unregister on unmount
    if (typeof window !== 'undefined') {
        navigationService.registerUnsavedCheck(pageId, checkCallback);

        return () => {
            navigationService.unregisterUnsavedCheck(pageId);
        };
    }
}
