import {
  LayoutDashboard, Upload, Settings, FileSpreadsheet, LogOut, GraduationCap,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAppState } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Faculty Upload', url: '/dashboard/faculty-upload', icon: Upload },
  { title: 'Allocation', url: '/dashboard/allocation', icon: Settings },
  { title: 'Results', url: '/dashboard/results', icon: FileSpreadsheet },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout } = useAppState();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-primary-foreground truncate">Exam Cell</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Duty Allocation</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-primary-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
