import { Link, useRouterState } from '@tanstack/react-router'
import { X, GripVertical, Bookmark, Search as SearchIcon, Folder } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

interface PinnedItem {
  id: string
  type: 'search' | 'project' | 'custom'
  label: string
  icon: string
  link: string
}

interface PinnedNavItemProps {
  item: PinnedItem
  onUnpin: (id: string) => void
}

export default function PinnedNavItem({ item, onUnpin }: PinnedNavItemProps) {
  const [hovering, setHovering] = useState(false)
  const pathname = useRouterState({ select: s => s.location.pathname })
  const active = pathname === item.link || pathname.startsWith(item.link)
  
  // Map icon names to components
  const getIcon = () => {
    switch (item.icon) {
      case 'search': return SearchIcon
      case 'folder': return Folder
      case 'bookmark': return Bookmark
      default: return Bookmark
    }
  }
  
  const Icon = getIcon()
  
  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Link 
        to={item.link as any}
        className={clsx(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
          active ? "bg-accent/10 text-accent" : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 cursor-move flex-shrink-0" />
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate flex-1">{item.label}</span>
      </Link>
      
      {hovering && (
        <button
          onClick={(e) => {
            e.preventDefault()
            onUnpin(item.id)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200"
          title="Unpin"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  )
}
