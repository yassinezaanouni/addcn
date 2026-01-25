import {
  IconLayoutDashboard,
  IconBuilding,
  IconSettings,
} from "@tabler/icons-react";

export const DASHBOARD_NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconLayoutDashboard,
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
