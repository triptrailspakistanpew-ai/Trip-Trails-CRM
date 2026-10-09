import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";

export function useLeads(filters?: any) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters || {}),
    queryFn: () => API.getLeads(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useLead(id?: string | null) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id || ""),
    queryFn: () => API.getLead(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateLead(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.detail(id) });
      const previousLead = queryClient.getQueryData(queryKeys.leads.detail(id));
      queryClient.setQueryData(queryKeys.leads.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));
      return { previousLead };
    },
    onError: (err, variables, context) => {
      if (context?.previousLead) {
        queryClient.setQueryData(queryKeys.leads.detail(variables.id), context.previousLead);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => API.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
