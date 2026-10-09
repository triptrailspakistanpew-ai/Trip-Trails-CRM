import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";
import { Customer } from "@/types";

export function useCustomers(filters?: any) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters || {}),
    queryFn: () => API.getCustomers(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => API.getCustomer(id),
    staleTime: 60_000,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateCustomer(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.detail(id) });
      const previousCustomer = queryClient.getQueryData(queryKeys.customers.detail(id));
      queryClient.setQueryData(queryKeys.customers.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));
      return { previousCustomer };
    },
    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousCustomer) {
        queryClient.setQueryData(queryKeys.customers.detail(variables.id), context.previousCustomer);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => API.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
