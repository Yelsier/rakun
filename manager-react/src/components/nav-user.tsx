"use client";

import { BadgeCheck, ChevronsUpDown, LogOut } from "lucide-react";

import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import LanguageSelector from "./LanguageSelector";
import { useManagerMutation } from "@/client/react";
import { useTranslations } from "@/i18n";
import { ManagerLink } from "@/link";
import { useManagerNavigation } from "@/state/navigation";
import { useSession } from "@/state/session";
import { useManagerTheme } from "@/state/theme";

import { UserAvatar } from "./user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { setTheme, resolvedTheme } = useManagerTheme();
  const navigation = useManagerNavigation();
  const logoutMutation = useManagerMutation("manager.auth.logout");
  const { user } = useSession();
  const t = useTranslations();
  const avatar = {
    url: user.avatarUrl,
    previewUrl: user.avatarPreviewUrl,
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined as never, {
      onSuccess: () => {
        navigation.replacePath?.("/login");
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar
                name={user.user}
                email={user.email}
                avatar={avatar}
                className="h-8 w-8 rounded-lg"
                fallbackClassName="rounded-lg"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.user}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar
                  name={user.user}
                  email={user.email}
                  avatar={avatar}
                  className="h-8 w-8 rounded-lg"
                  fallbackClassName="rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.user}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() =>
                  setTheme(resolvedTheme === "light" ? "dark" : "light")
                }
              >
                <Switch id="theme-switch" checked={resolvedTheme === "light"} />
                <Label htmlFor="theme-switch" className="pointer-events-none">
                  {resolvedTheme === "dark"
                    ? t("navUser.theme.dark")
                    : t("navUser.theme.light")}
                </Label>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <ManagerLink href="/account">
                  <BadgeCheck />
                  {t("navUser.account")}
                </ManagerLink>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <LanguageSelector manager className="w-full" />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              {t("navUser.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
