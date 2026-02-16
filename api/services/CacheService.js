/**
 * @file CacheService.js
 * @description Centralized caching service.
 * Currently uses in-memory Map, but designed to be easily swapped for Redis.
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    
    // Periodic cleanup of expired keys (every 1 minute)
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get value from cache
   * @param {string} key 
   * @returns {any|null}
   */
  async get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set value in cache
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttlMs (optional, defaults to 5 min)
   */
  async set(key, data, ttlMs = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Delete specific key
   * @param {string} key 
   */
  async del(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all keys (useful for testing)
   */
  async flush() {
    this.cache.clear();
  }

  /**
   * Remove expired keys
   * (Internal use)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
module.exports = new CacheService();
