"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useOrganization, useOrganizationList } from '@clerk/nextjs';
import type { OrganizationMembershipResource } from '@clerk/types';

export interface OrganizationMember {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  role: 'org:admin' | 'org:member';
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  imageUrl?: string;
  membersCount?: number;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isAdmin: boolean;
  userRole: 'owner' | 'admin' | 'member' | null;
  isLoading: boolean;
  members: OrganizationMember[];
  switchOrganization: (orgId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { organization, membership } = useOrganization();
  const { 
    userMemberships, 
    isLoaded: orgListLoaded,
    setActive 
  } = useOrganizationList({ userMemberships: true });
  
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Convert Clerk organization to our format
  const currentOrganization: Organization | null = organization ? {
    id: organization.id,
    name: organization.name,
    slug: organization.slug || undefined,
    imageUrl: organization.imageUrl || undefined,
    membersCount: organization.membersCount || undefined,
  } : null;

  // Get list of user's organizations from userMemberships
  const organizations: Organization[] = (userMemberships?.data || []).map((item: OrganizationMembershipResource) => ({
    id: item.organization.id,
    name: item.organization.name,
    slug: item.organization.slug || undefined,
    imageUrl: item.organization.imageUrl || undefined,
    membersCount: item.organization.membersCount || undefined,
  }));

  // Check if current user is admin
  const isAdmin = membership?.role === 'org:admin';

  // Get user role (normalized)
  const userRole: 'owner' | 'admin' | 'member' | null = membership?.role 
    ? (membership.role === 'org:admin' ? 'admin' : 'member')
    : null;

  // Refresh members list
  const refreshMembers = useCallback(async () => {
    if (!organization) {
      setMembers([]);
      return;
    }

    setIsLoadingMembers(true);
    try {
      const membersList = await organization.getMemberships();
      const formattedMembers: OrganizationMember[] = membersList.data.map(m => ({
        id: m.id,
        clerkId: m.publicUserData?.userId || '',
        email: m.publicUserData?.identifier || '',
        firstName: m.publicUserData?.firstName || undefined,
        lastName: m.publicUserData?.lastName || undefined,
        imageUrl: m.publicUserData?.imageUrl || undefined,
        role: m.role as 'org:admin' | 'org:member',
      }));
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [organization]);

  // Load members when organization changes
  useEffect(() => {
    if (organization) {
      refreshMembers();
    } else {
      setMembers([]);
    }
  }, [organization?.id, refreshMembers]);

  // Switch to a different organization
  const switchOrganization = useCallback(async (orgId: string) => {
    if (!setActive) return;
    
    try {
      await setActive({ organization: orgId });
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw error;
    }
  }, [setActive]);

  // Refresh organizations list
  const refreshOrganizations = useCallback(async () => {
    // The organizationList is automatically refreshed by Clerk
    // This function is here for API consistency
  }, []);

  const isLoading = !authLoaded || !orgListLoaded || isLoadingMembers;

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        isAdmin,
        userRole,
        isLoading,
        members,
        switchOrganization,
        refreshOrganizations,
        refreshMembers,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
}
