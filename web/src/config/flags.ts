// Feature flags for the web app. Keep defaults conservative.
// Turn features on via Vite env, e.g., VITE_DOC_INTELLIGENCE_ENABLED=true

export const DOC_INTELLIGENCE_ENABLED = (import.meta as any)?.env?.VITE_DOC_INTELLIGENCE_ENABLED === 'true';

// Future flags can go here
export const FEATURES = {
  docIntelligence: DOC_INTELLIGENCE_ENABLED,
};
