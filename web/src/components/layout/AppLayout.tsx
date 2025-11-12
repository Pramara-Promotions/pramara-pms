import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Menu, Search, Plus, LayoutGrid, ClipboardList, PackageCheck, AlertTriangle,
  BarChart3, Settings, LogOut, User, Factory, FlaskConical, PackageOpen,
  CheckSquare, Boxes, CalendarCheck, Users, TrendingUp, Bell, Home, Moon, Sun
} from 'lucide-react'
import clsx from 'clsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CommandPalette from '../../features/common/CommandPalette'
import QuickAddModal from '../../features/common/QuickAddModal'
import { useAuth } from '../../features/common/AuthProvider'
import SecurityAlertBanner from '../SecurityAlertBanner'
import NotificationBell from '../notifications/NotificationBell'
import NotificationCenter from '../notifications/NotificationCenter'
import PinnedNavItem from './PinnedNavItem'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInitialQuery, setSearchInitialQuery] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { user, logout, loading, hasRole, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch pinned items
  const { data: preferences } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/user/preferences', {
        credentials: 'include'
      })
      if (!res.ok) {
        // Silently fail for 401/403 - user might not have permissions yet
        if (res.status === 401 || res.status === 403) {
          return { pinnedItems: [], theme: 'light' }
        }
        throw new Error('Failed to fetch preferences')
      }
      return res.json()
    },
    enabled: !!user && !loading,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })

  const pinnedItems = Array.isArray(preferences?.pinnedItems) ? preferences.pinnedItems : []

  // Initialize theme from preferences
  useEffect(() => {
    if (preferences?.theme) {
      setTheme(preferences.theme)
      document.documentElement.classList.toggle('dark', preferences.theme === 'dark')
    }
  }, [preferences?.theme])

  // Toggle theme
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')

    // Persist to backend
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: newTheme })
      })
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    } catch (error) {
      console.error('Failed to save theme preference:', error)
    }
  }

  // Unpin mutation
  const unpinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      const res = await fetch(`/api/user/preferences/pin/${pinId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to unpin')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    }
  })

  const handleUnpin = (pinId: string) => {
    unpinMutation.mutate(pinId)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Debounce search query
  useEffect(() => {
    // Only trigger search if query is at least 2 characters
    if (searchQuery.length < 2) {
      return
    }

    const timer = setTimeout(() => {
      setSearchInitialQuery(searchQuery)
      setPaletteOpen(true)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  // Handle search input keyboard events
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.length >= 2) {
      e.preventDefault()
      setSearchInitialQuery(searchQuery)
      setPaletteOpen(true)
    } else if (e.key === 'Escape') {
      setSearchQuery('')
    }
  }

  // Reset search query when palette closes
  useEffect(() => {
    if (!paletteOpen) {
      setSearchQuery('')
      setSearchInitialQuery('')
    }
  }, [paletteOpen])

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    if (!user && !loading) {
      navigate({ to: '/login', replace: true })
    }
  }, [user, loading, navigate])

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to))
    return (
      <Link to={to as any} className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
        active
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          : "text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
      )}>
        <Icon className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  return (
    <div className="h-screen w-screen flex bg-gray-50 dark:bg-gray-950">
      <aside className={clsx(
        "hidden md:flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all",
        sidebarOpen ? "w-[var(--sidebar-w)]" : "w-16"
      )}>
        <div className="flex items-center justify-between px-3 h-14 border-b border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
          <button onClick={() => setSidebarOpen(s => !s)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu className="h-5 w-5" />
          </button>
          {sidebarOpen && <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pramara PMS</span>}
          <div className="w-8" />
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {/* Core Navigation - Only 3 items */}
          <NavItem to="/" icon={Home} label="Home" />
          <NavItem to="/projects" icon={ClipboardList} label="Projects" />
          <NavItem to="/reminders" icon={Bell} label="Tasks & Reminders" />
          <NavItem to="/workforce" icon={Users} label="Workforce" />

          {/* Pinned Items Section */}
          {pinnedItems.length > 0 && (
            <>
              <div className="border-t my-3" />
              {sidebarOpen && (
                <div className="text-xs font-semibold text-gray-500 px-3 mb-2 flex items-center justify-between">
                  <span>PINNED</span>
                </div>
              )}
              <div className="space-y-1">
                {pinnedItems.map((item: any) => (
                  <PinnedNavItem key={item.id} item={item} onUnpin={handleUnpin} />
                ))}
              </div>
            </>
          )}

          {/* Empty state for pinned items */}
          {pinnedItems.length === 0 && sidebarOpen && (
            <>
              <div className="border-t my-3" />
              <div className="px-3 py-4 bg-gray-50 rounded-lg text-xs text-gray-600 text-center">
                <p className="mb-1">Pin frequently accessed items here</p>
                <p className="text-gray-500 text-[10px]">Search for items and pin them to sidebar</p>
              </div>
            </>
          )}
        </nav>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-3 gap-3">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setSidebarOpen(s => !s)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 w-[360px]">
              <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <input
                placeholder="Search projects, tasks, QC…"
                className="bg-transparent outline-none text-sm w-full text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            {user && (
              <NotificationBell onOpen={() => setNotificationCenterOpen(true)} />
            )}

            {/* User Menu */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title={user.email}
                >
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-200" />
                  </div>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg z-50">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{user.email}</div>
                      </div>
                      <div className="p-1 text-gray-700 dark:text-gray-200">
                        <Link
                          to={"/account" as any}
                          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Account settings
                        </Link>
                        <button
                          onClick={() => {
                            toggleTheme()
                            setUserMenuOpen(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                        >
                          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </button>
                        {/* Super Admin Actions */}
                        {isSuperAdmin() && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-800 my-1" />
                            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                              ADMIN ACTIONS
                            </div>
                            <Link
                              to={"/admin" as any}
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <Settings className="h-4 w-4" />
                              Manage Users
                            </Link>
                          </>
                        )}
                        <div className="border-t border-gray-200 dark:border-gray-800 my-1" />
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-red-600"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-[1400px]">
            <SecurityAlertBanner />
            {children}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 grid grid-cols-4 text-xs text-gray-700 dark:text-gray-200">
          <Link to={"/" as any} className="py-2 text-center">Home</Link>
          <Link to={"/projects" as any} className="py-2 text-center">Projects</Link>
          <Link to={"/reminders" as any} className="py-2 text-center">Tasks</Link>
          <Link to={"/admin" as any} className="py-2 text-center">More</Link>
        </nav>
      </section>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        initialQuery={searchInitialQuery}
      />
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
    </div>
  )
}
