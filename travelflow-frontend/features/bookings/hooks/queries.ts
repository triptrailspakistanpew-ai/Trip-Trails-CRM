import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";
import { Booking } from "@/types";

// --- Queries ---

export function useBookings(filters?: any) {
  return useQuery({
    queryKey: queryKeys.bookings.list(filters || {}),
    queryFn: () => API.getBookings(filters),
    placeholderData: (previousData) => previousData, // keep previous data for pagination
    staleTime: 60_000, // 1 minute
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => API.getBooking(id),
    staleTime: 60_000,
  });
}

// --- Mutations ---

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createBookingFromForm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateBooking(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.bookings.detail(id) });

      // Snapshot the previous value
      const previousBooking = queryClient.getQueryData(queryKeys.bookings.detail(id));

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.bookings.detail(id), (old: any) => ({
        ...old,
        ...data,
      }));

      return { previousBooking };
    },
    onError: (err, variables, context) => {
      // Rollback
      if (context?.previousBooking) {
        queryClient.setQueryData(queryKeys.bookings.detail(variables.id), context.previousBooking);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to sync
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => API.deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

// --- Payment Schedules ---

export function usePaymentSchedules(bookingId?: string) {
  return useQuery({
    queryKey: queryKeys.paymentSchedules.list(bookingId),
    queryFn: () => API.getPaymentSchedules(bookingId),
    staleTime: 60_000,
  });
}

export function usePaymentSchedule(id: string) {
  return useQuery({
    queryKey: queryKeys.paymentSchedules.detail(id),
    queryFn: () => API.getPaymentSchedule(id),
    staleTime: 60_000,
  });
}

export function useCreatePaymentSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => API.createPaymentSchedule(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.paymentSchedules.all });
      qc.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
