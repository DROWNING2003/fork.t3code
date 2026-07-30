import { Link, useLocation } from "@tanstack/react-router";
import { CloudIcon, Settings2Icon } from "lucide-react";

import { sandboxNavigationItems } from "../sandboxNavigation";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

function isNavigationItemActive(
  pathname: string,
  to: (typeof sandboxNavigationItems)[number]["to"],
) {
  return to === "/sandboxes" ? pathname === to || pathname.startsWith(`${to}/`) : pathname === to;
}

export function SandboxOnlySidebar() {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <>
      <SidebarHeader className="h-[var(--workspace-topbar-height)] justify-center px-3 py-0">
        <Link
          aria-label="前往沙箱"
          className="text-sm font-medium text-foreground outline-hidden ring-ring focus-visible:ring-2"
          to="/sandboxes"
        >
          Boundly
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup className="px-2 py-2">
          <SidebarMenu>
            {sandboxNavigationItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  isActive={isNavigationItemActive(pathname, item.to)}
                  render={<Link to={item.to} />}
                  tooltip={item.label}
                >
                  {item.to === "/sandboxes" ? <CloudIcon /> : <Settings2Icon />}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </>
  );
}
