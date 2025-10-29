import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { 
  Menu, Search, Plus, LayoutGrid, ClipboardList, PackageCheck, AlertTriangle, 
  BarChart3, Settings, LogOut, User, Factory, FlaskConical, PackageOpen,
  CheckSquare, Boxes, CalendarCheck, Users, TrendingUp, Bell
} from 'lucide-react'
import clsx from 'clsx'
import CommandPalette from '../../features/common/CommandPalette'
import QuickAddModal from '../../features/common/QuickAddModal'
import { useAuth } from '../../features/common/AuthProvider'
import SecurityAlertBanner from '../SecurityAlertBanner'
import NotificationBell from '../notifications/NotificationBell'
import NotificationCenter from '../notifications/NotificationCenter'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) { e.preventDefault(); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Redirect to login if not authenticated and not loading
  useEffect(() => {
    if (!user && !loading) {
      navigate({ to: '/login', replace: true })
    }
  }, [user, loading, navigate])

  const NavItem = ({ to, icon: Icon, label }:{to:string, icon:any, label:string}) => {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to))
    return (
      <Link to={to as any} className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
        active ? "bg-accent/10 text-accent" : "text-gray-700 hover:bg-gray-100"
      )}>
        <Icon className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  return (
    <div className="h-screen w-screen flex bg-white">
      <aside className={clsx(
        "hidden md:flex flex-col border-r bg-white transition-all",
        sidebarOpen ? "w-[var(--sidebar-w)]" : "w-16"
      )}>
        <div className="flex items-center justify-between px-3 h-14 border-b">
          <button onClick={()=>setSidebarOpen(s=>!s)} className="p-2 rounded hover:bg-gray-100">
            <Menu className="h-5 w-5" />
          </button>
          {sidebarOpen && <span className="text-sm font-semibold">Pramara PMS</span>}
          <div className="w-8" />
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          <NavItem to="/"          icon={LayoutGrid}   label="Dashboard" />
          <NavItem to="/projects"  icon={ClipboardList}label="Projects" />
          <NavItem to="/tasks"     icon={PackageCheck} label="Tasks" />
          <NavItem to="/qc"        icon={AlertTriangle}label="QC" />
          <NavItem to="/alerts"    icon={AlertTriangle}label="Alerts" />
          <NavItem to="/reports"   icon={BarChart3}    label="Reports" />
          
          {/* Pre-Production Section */}
          {sidebarOpen && <div className="text-xs font-semibold text-gray-500 mt-4 mb-2 px-3">PRE-PRODUCTION</div>}
          <NavItem to="/preprod/molds"    icon={Factory}      label="Molds" />
          <NavItem to="/preprod/trials"   icon={FlaskConical} label="Trials" />
          <NavItem to="/preprod/packaging"icon={PackageOpen}  label="Packaging" />
          <NavItem to="/preprod/pps"      icon={CheckSquare}  label="PPS" />
          <NavItem to="/preprod/policies" icon={ClipboardList}label="Policies" />
          <NavItem to="/preprod/process-flows" icon={BarChart3} label="Process Flows" />
          
          {/* Compliance Section */}
          {sidebarOpen && <div className="text-xs font-semibold text-gray-500 mt-4 mb-2 px-3">COMPLIANCE</div>}
          <NavItem to="/compliance"               icon={CheckSquare} label="Dashboard" />
          <NavItem to="/compliance/certifications"icon={CheckSquare} label="Certifications" />
          <NavItem to="/compliance/projects"      icon={ClipboardList}label="Projects" />
          <NavItem to="/compliance/materials"     icon={Boxes}       label="Materials" />
          <NavItem to="/compliance/lab-tests"     icon={FlaskConical}label="Lab Tests" />
          
          {/* Execution Section */}
          {sidebarOpen && <div className="text-xs font-semibold text-gray-500 mt-4 mb-2 px-3">EXECUTION</div>}
          <NavItem to="/execution/stations"       icon={Factory}      label="Stations" />
          <NavItem to="/execution/workflow"       icon={BarChart3}    label="Workflow" />
          <NavItem to="/execution/workflow-builder" icon={Settings}   label="Workflow Builder" />
          <NavItem to="/execution/qc"             icon={CheckSquare}  label="QC Management" />
          <NavItem to="/execution/production"     icon={Factory}      label="Production Entry" />
          <NavItem to="/execution/batches"        icon={PackageCheck} label="Batch Tracking" />
          <NavItem to="/execution/process-config" icon={Settings}     label="Process Config" />
          <NavItem to="/execution/shift-entries"  icon={CalendarCheck}label="Shift Entries" />
          <NavItem to="/execution/wip-ledger"     icon={ClipboardList}label="WIP Ledger" />
          
          {/* Planning Section */}
          {sidebarOpen && <div className="text-xs font-semibold text-gray-500 mt-4 mb-2 px-3">PLANNING</div>}
          <NavItem to="/planning/daily"      icon={CalendarCheck}label="Daily Planning" />
          <NavItem to="/planning/workforce"  icon={Users}        label="Workforce" />
          <NavItem to="/planning/materials"  icon={Boxes}        label="Materials" />
          <NavItem to="/planning/mrp"        icon={TrendingUp}   label="MRP Calculator" />
          <NavItem to="/planning/approvals"  icon={Bell}         label="Approvals" />
          
          {/* Admin Section */}
          {sidebarOpen && <div className="text-xs font-semibold text-gray-500 mt-4 mb-2 px-3">ADMIN</div>}
          <NavItem to="/admin"     icon={Settings}     label="Admin" />
        </nav>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-3 gap-3">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-2 rounded hover:bg-gray-100" onClick={()=>setSidebarOpen(s=>!s)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1 w-[360px]">
              <Search className="h-4 w-4 text-gray-500" />
              <input placeholder="Search projects, tasks, QC…" className="bg-transparent outline-none text-sm w-full"/>
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
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
                  title={user.email}
                >
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                </button>
                
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg z-50">
                      <div className="px-3 py-2 border-b text-sm">
                        <div className="font-medium">{user.email}</div>
                      </div>
                      <div className="p-1">
                        <Link
                          to={"/account" as any}
                          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-sm"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Account settings
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-red-600"
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

        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white grid grid-cols-4 text-xs">
          <Link to={"/" as any} className="py-2 text-center">Home</Link>
          <Link to={"/projects" as any} className="py-2 text-center">Projects</Link>
          <Link to={"/tasks" as any} className="py-2 text-center">Tasks</Link>
          <Link to={"/admin" as any} className="py-2 text-center">More</Link>
        </nav>
      </section>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <NotificationCenter 
        isOpen={notificationCenterOpen} 
        onClose={() => setNotificationCenterOpen(false)} 
      />
    </div>
  )
}
