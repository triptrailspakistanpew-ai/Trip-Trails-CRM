import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";
import { Branch, Role, User } from "@/types";

export function useBranches(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.shared.branches(),
    queryFn: () => API.getBranches().catch(() => []),
    placeholderData: (previousData) => previousData,
    staleTime: Infinity, // Branches rarely change
    gcTime: Infinity,
    retry: false,
    ...options,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => API.createBranch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.branches() });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.branches() });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.shared.roles(),
    queryFn: () => API.getRoles(),
    placeholderData: (previousData) => previousData,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => API.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.roles() });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) => API.updateRolePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.roles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.users() });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.roles() });
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.shared.users(),
    queryFn: () => API.getUsers(),
    staleTime: 5 * 60 * 1000, // 5 mins
  });
}

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.shared.agents(),
    queryFn: () => API.getAgents(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.users() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.users() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => API.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.users() });
    },
  });
}
