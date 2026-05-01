import {
  IconLayoutDashboard,
  IconBuilding,
  IconSettings,
  IconTerminal2,
} from "@tabler/icons-react";

export const DASHBOARD_NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconLayoutDashboard,
  },
  {
    title: "Commands",
    url: "/dashboard/commands",
    icon: IconTerminal2,
  },
  {
    title: "Organizations",
    url: "/dashboard/orgs",
    icon: IconBuilding,
    disabled: true,
    tooltip: "Coming soon",
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: IconSettings,
  },
] as const;
