import * as React from "react"
import { Home, Settings, PlusCircle, FileText, BarChart3, User } from "lucide-react"
import { useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [location, navigate] = useLocation()
  const { isAdmin, isAuthenticated } = useAuth()

  // Base navigation items for all users (show even when not authenticated)
  const navigation = [
    {
      title: "ホーム",
      url: "/",
      icon: Home,
      isActive: location === "/",
    },
    {
      title: "トピック投稿",
      url: "/submit",
      icon: PlusCircle,
      isActive: location === "/submit",
    },
    {
      title: "拡張機能",
      url: "/extension",
      icon: Settings,
      isActive: location === "/extension",
    },
  ]

  // Admin-only navigation items
  const adminNavigation = [
    {
      title: "台本管理",
      url: "/admin/scripts",
      icon: FileText,
      isActive: location === "/admin/scripts",
    },
    {
      title: "パフォーマンス監視",
      url: "/admin/performance",
      icon: BarChart3,
      isActive: location === "/admin/performance",
    },
  ]

  const handleNavigation = (url: string) => {
    navigate(url)
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-primary-foreground text-xs font-medium">
            N
          </div>
          <span className="font-semibold text-sm">Netaspace</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>メインメニュー</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => handleNavigation(item.url)}
                    isActive={item.isActive}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && isAuthenticated && (
          <SidebarGroup>
            <SidebarGroupLabel>管理者メニュー</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigation.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => handleNavigation(item.url)}
                      isActive={item.isActive}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <User />
              <span>{isAuthenticated ? (isAdmin ? "管理者" : "ユーザー") : "ゲスト"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}