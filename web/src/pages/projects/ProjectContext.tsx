import React from "react";

type Project = {
  id: number;
  code: string;
  name: string;
  status?: string | null;
  [key: string]: any;
};

const ProjectContext = React.createContext<Project | null>(null);

export function ProjectProvider({ value, children }: { value: Project | null; children: React.ReactNode }) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/**
 * Hook to access the current project context.
 * Must be used within a ProjectProvider (inside project routes).
 * Returns the project object directly (not nested).
 * 
 * @throws Error if used outside ProjectProvider
 */
export function useProjectContext(): Project {
  const context = React.useContext(ProjectContext);
  
  if (context === null) {
    throw new Error(
      "useProjectContext must be used within a ProjectProvider. " +
      "This hook should only be used in project-specific pages (inside /projects/:id routes)."
    );
  }
  
  return context;
}

/**
 * Hook to safely access project context without throwing.
 * Returns null if not within a ProjectProvider.
 * Use this for components that may be used both inside and outside project context.
 */
export function useProjectContextSafe(): Project | null {
  return React.useContext(ProjectContext);
}

