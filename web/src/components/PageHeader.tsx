// web/src/components/PageHeader.tsx
import React from 'react';
import { ArrowLeft, AlertCircle, FolderOpen } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface ProjectContext {
  id: number;
  name: string;
  code: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  projectContext?: ProjectContext | null;
  backTo?: string;
  hasUnsavedChanges?: boolean;
  onBack?: () => Promise<boolean>; // Returns true if can proceed
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  projectContext,
  backTo,
  hasUnsavedChanges = false,
  onBack,
  actions
}: PageHeaderProps) {
  const navigate = useNavigate();
  
  const handleBack = async () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }

    // Custom back handler
    if (onBack) {
      const canProceed = await onBack();
      if (!canProceed) return;
    }

    // Navigate back
    if (backTo) {
      navigate({ to: backTo });
    } else {
      window.history.back();
    }
  };
  
  return (
    <div className="mb-6">
      {/* Project Context Banner */}
      {projectContext && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <FolderOpen className="h-4 w-4" />
          <span className="font-medium">Project:</span>
          <span>{projectContext.code} - {projectContext.name}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Back Button */}
          {(backTo || onBack) && (
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
            
            {/* Unsaved Changes Warning */}
            {hasUnsavedChanges && (
              <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
