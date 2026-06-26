import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/SupabaseAuthContext';
import { 
  Database, 
  Menu, 
  LogOut, 
  User, 
  Settings, 
  CreditCard, 
  FileText, 
  RefreshCw, 
  Download, 
  LayoutDashboard, 
  Search, 
  Sun, 
  Moon,
  Workflow,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Code,
  ShoppingBag
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Define the Sidebar subcomponents replicating shadcn-style structured namespaces
export function Sidebar({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <aside id="sidebar-wrapper" className={`flex flex-col h-full bg-background border-r border-border ${className}`}>
      {children}
    </aside>
  );
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-5 border-b border-border flex items-center justify-between">{children}</div>;
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto p-4 space-y-6">{children}</div>;
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="px-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{children}</h4>;
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <nav className="space-y-1">{children}</nav>;
}

interface SidebarMenuItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
  badge?: string;
  onClick?: () => void;
  key?: string;
}

export function SidebarMenuItem({ to, icon: Icon, label, active, badge, onClick }: SidebarMenuItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
        <span>{label}</span>
      </div>
      {badge && (
        <Badge variant={active ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0.2">
          {badge}
        </Badge>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isRealSupabase } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const menuItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/dashboard/forms', label: 'Google Forms', icon: FileText },
    { to: '/dashboard/woocommerce', label: 'Woo Commerce', icon: RefreshCw },
    { to: '/dashboard/marketplace', label: 'Template Marketplace', icon: ShoppingBag },
    { to: '/dashboard/billing', label: 'Billing & Plans', icon: CreditCard },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  // Map route path to human-readable page titles
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Overview';
    if (path.startsWith('/dashboard/forms')) return 'Google Forms';
    if (path.startsWith('/dashboard/woocommerce')) return 'Woo Commerce';
    if (path.startsWith('/dashboard/marketplace')) return 'Template Marketplace';
    if (path.startsWith('/dashboard/billing')) return 'Stripe Billing';
    if (path.startsWith('/dashboard/settings')) return 'Platform Settings';
    return 'Dashboard';
  };

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'US';

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContentNode = (onItemClick?: () => void) => (
    <Sidebar className="w-full">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2.5 font-bold text-lg select-none" onClick={onItemClick}>
          <div className="bg-primary hover:bg-primary/95 text-primary-foreground p-1.5 rounded-lg flex items-center justify-center shadow-md">
            <Workflow className="h-5.5 w-5.5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span>PluginFoundry</span>
            <span className="text-[10px] text-muted-foreground font-normal tracking-wide">Multi-SaaS Core</span>
          </div>
        </Link>
        <Badge variant={isRealSupabase ? 'default' : 'secondary'} className="text-[10px]">
          {isRealSupabase ? 'Supabase Live' : 'SQLite Local'}
        </Badge>
      </SidebarHeader>

      <SidebarContent>
        {/* Core Products Groups */}
        <SidebarGroup>
          <SidebarGroupLabel>SaaS Console</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.slice(0, 5).map((item) => (
              <SidebarMenuItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to}
                onClick={onItemClick}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Configuration Groups */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.slice(5).map((item) => (
              <SidebarMenuItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to}
                onClick={onItemClick}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Developer Assistant Section */}
        <div className="pt-4 border-t border-border mt-auto">
          <div className="bg-muted/40 rounded-xl p-3 border border-border/80">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold">Workspace Active</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Data scoped exclusively to your profile:
            </p>
            <div className="mt-2 text-[10px] bg-slate-950 text-slate-300 p-1.5 rounded font-mono truncate select-all">
              {user?.id || 'usr_dev_1001'}
            </div>
          </div>
        </div>
      </SidebarContent>

      {/* Sidebar Footer detailing the active developer context */}
      <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 ring-1 ring-border shadow-sm">
            <AvatarFallback className="text-xs bg-muted text-foreground font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-none mb-1">Developer</span>
            <span className="text-[10px] text-muted-foreground truncate leading-none">{user?.email}</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSignOut}
          title="Sign Out" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </Sidebar>
  );

  return (
    <div className="min-h-screen max-h-screen h-screen bg-background text-foreground flex overflow-hidden">
      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        {SidebarContentNode()}
      </div>

      {/* Main Dashboard Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-background/95 backdrop-blur-md flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger (Sheet) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 shrink-0 border border-border">
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="p-0 w-64 h-full border-r border-border">
                {SidebarContentNode(() => setMobileOpen(false))}
              </SheetContent>
            </Sheet>

            {/* Dynamic Page Heading */}
            <div className="flex items-center gap-2">
              <h1 className="text-md md:text-lg font-semibold tracking-tight text-foreground">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          {/* Minimal Header Controls */}
          <div className="flex items-center gap-4">
            {/* Quick Search */}
            <div className="relative w-40 md:w-60 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search resources..."
                className="pl-9 h-9 text-xs focus-visible:ring-1 bg-muted/20 hover:bg-muted/30 transition-colors"
                disabled
              />
            </div>

            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="h-9 w-9 border border-border hover:bg-muted/30 transition-colors shrink-0"
            >
              {theme === 'light' ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Sun className="h-4.5 w-4.5 text-yellow-500" />
              )}
            </Button>

            {/* User Dropdown Profile Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full select-none" id="user-profile-menu">
                    <Avatar className="h-9 w-9 ring-1 ring-border shadow-sm">
                      <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Console Account</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/billing')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing & Subscriptions</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Container containing child component frames */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 min-w-0 overflow-x-hidden">
          <div className="min-w-0 w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
