import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";

export function useSuppliers(filters?: any) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters || {}),
    queryFn: () => API.getSuppliers(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => API.getSupplier(id),
    staleTime: 60_000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateSupplier(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.suppliers.detail(id) });
      const previousSupplier = queryClient.getQueryData(queryKeys.suppliers.detail(id));
      queryClient.setQueryData(queryKeys.suppliers.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));
      return { previousSupplier };
    },
    onError: (err, variables, context) => {
      if (context?.previousSupplier) {
        queryClient.setQueryData(queryKeys.suppliers.detail(variables.id), context.previousSupplier);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => API.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}
