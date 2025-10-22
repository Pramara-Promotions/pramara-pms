// @ts-nocheck
import React from "react";

const ProjectContext = React.createContext(null);

export function ProjectProvider({ value, children }: { value: any; children: React.ReactNode }) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  return React.useContext(ProjectContext);
}

