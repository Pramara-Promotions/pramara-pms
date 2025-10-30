// Quick Links Widget
import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, ExternalLink, Plus, X, Edit2 } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetEmpty } from '../components/WidgetWrapper';

type QuickLink = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  color?: string;
};

const QuickLinksWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });

  useEffect(() => {
    // Load from config or localStorage
    const savedLinks = config.config?.links || [
      { id: '1', title: 'Projects', url: '/projects', color: 'indigo' },
      { id: '2', title: 'Tasks', url: '/tasks', color: 'purple' },
      { id: '3', title: 'Team', url: '/team', color: 'blue' },
      { id: '4', title: 'Reports', url: '/reports', color: 'green' },
    ];
    setLinks(savedLinks);
  }, [config]);

  const addLink = () => {
    if (newLink.title && newLink.url) {
      const link: QuickLink = {
        id: Date.now().toString(),
        title: newLink.title,
        url: newLink.url,
        color: ['indigo', 'purple', 'blue', 'green', 'yellow', 'orange'][Math.floor(Math.random() * 6)],
      };
      const updatedLinks = [...links, link];
      setLinks(updatedLinks);
      setNewLink({ title: '', url: '' });
      onUpdate?.({ ...config, config: { ...config.config, links: updatedLinks } });
    }
  };

  const removeLink = (id: string) => {
    const updatedLinks = links.filter((l) => l.id !== id);
    setLinks(updatedLinks);
    onUpdate?.({ ...config, config: { ...config.config, links: updatedLinks } });
  };

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'indigo':
        return 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700';
      case 'purple':
        return 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
      case 'blue':
        return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
      case 'green':
        return 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700';
      case 'yellow':
        return 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700';
      case 'orange':
        return 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700';
      default:
        return 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700';
    }
  };

  return (
    <WidgetWrapper
      config={config}
      onRemove={onRemove}
      allowRemove
      allowSettings
      showActions
    >
      {links.length === 0 && !isEditing ? (
        <WidgetEmpty
          icon={LinkIcon}
          title="No quick links"
          message="Add shortcuts to your frequently used pages."
          action={{
            label: 'Add Links',
            onClick: () => setIsEditing(true),
          }}
        />
      ) : (
        <div className="p-3">
          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {links.map((link) => (
              <div key={link.id} className="relative group">
                <a
                  href={link.url}
                  className={`flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br ${getColorClass(
                    link.color
                  )} text-white transition-all shadow-sm hover:shadow-md`}
                >
                  <LinkIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{link.title}</span>
                  <ExternalLink className="h-3 w-3 ml-auto flex-shrink-0 opacity-70" />
                </a>
                {isEditing && (
                  <button
                    onClick={() => removeLink(link.id)}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add New Link Form */}
          {isEditing && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Add New Link
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Link title"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="URL (e.g., /projects or https://...)"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addLink}
                    className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Link
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setNewLink({ title: '', url: '' });
                    }}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Toggle */}
          {!isEditing && links.length > 0 && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Links
            </button>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};

export default QuickLinksWidget;
