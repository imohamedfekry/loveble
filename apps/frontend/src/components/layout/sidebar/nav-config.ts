import {
  Compass,
  Grid3x3,
  LayoutDashboard,
  Plug,
  Search,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import type { IconType, NavEntry } from "./types";

export const NAV_MAIN: NavEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Search, label: "Search", shortcut: "Ctrl K" },
  { icon: Compass, label: "Resources" },
  { icon: Plug, label: "Connectors" },
];

export const NAV_PROJECTS: { icon: IconType; label: string }[] = [
  { icon: Grid3x3, label: "All projects" },
  { icon: Star, label: "Starred" },
  { icon: UserRound, label: "Created by me" },
  { icon: Users, label: "Shared with me" },
];

export const RECENT_PROJECTS = ["Social Media Website", "Translation App"];