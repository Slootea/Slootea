"use client";

import { OrganizationSwitcher as ClerkOrganizationSwitcher } from "@clerk/nextjs";

export function OrganizationSwitcher() {
  return (
    <ClerkOrganizationSwitcher
      hidePersonal
      afterCreateOrganizationUrl="/dashboard"
      afterSelectOrganizationUrl="/dashboard"
      afterLeaveOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "w-full",
          organizationSwitcherTrigger:
            "w-full rounded-lg px-2 py-2 hover:bg-sidebar-accent text-sidebar-foreground",
        },
      }}
    />
  );
}

