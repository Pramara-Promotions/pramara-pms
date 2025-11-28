// web/src/hooks/useProjectContext.ts
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

export interface ProjectContext {
  projectId: number | null;
  projectName: string | null;
  projectCode: string | null;
  isInProjectContext: boolean;
  loading: boolean;
  error: Error | null;
}

interface ProjectData {
  id: number;
  name: string;
  code: string;
}

/**
 * Hook to detect and load project context from URL
 * Checks multiple URL patterns:
 * - /projects/:id
 * - /projects/:projectId
 * - Any route with projectId in params
 */
export function useProjectContext(): ProjectContext {
  const params = useParams({ strict: false });
  
  // Try multiple sources for projectId
  const projectId = 
    (params as any).projectId || 
    (params as any).id;
  
  const projectIdNum = projectId ? Number(projectId) : null;
  
  // Fetch project details if we have an ID
  const { data: project, isLoading, error } = useQuery<ProjectData>({
    queryKey: ['project', projectIdNum],
    queryFn: async () => {
      if (!projectIdNum) return null;
      const res = await fetch(`/api/projects/${projectIdNum}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!projectIdNum,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });
  
  return {
    projectId: projectIdNum,
    projectName: project?.name || null,
    projectCode: project?.code || null,
    isInProjectContext: !!projectIdNum,
    loading: isLoading,
    error: error as Error | null,
  };
}
