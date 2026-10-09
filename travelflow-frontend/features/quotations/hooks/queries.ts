import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";

export function useQuotations(filters?: any) {
  return useQuery({
    queryKey: queryKeys.quotations.list(filters || {}),
    queryFn: () => API.getQuotations(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(id),
    queryFn: () => API.getQuotation(id),
    staleTime: 60_000,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createQuotation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateQuotation(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.quotations.detail(id) });
      const previousQuotation = queryClient.getQueryData(queryKeys.quotations.detail(id));
      queryClient.setQueryData(queryKeys.quotations.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));
      return { previousQuotation };
    },
    onError: (err, variables, context) => {
      if (context?.previousQuotation) {
        queryClient.setQueryData(queryKeys.quotations.detail(variables.id), context.previousQuotation);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

