import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';

export function useLibraryItemsQuery(filters = {}) {
  return useQuery({
    queryKey: ['library-items', filters],
    queryFn: () => api.getLibraryItems(filters),
  });
}

export function useSaveLibraryItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => (id ? api.updateLibraryItem(id, payload) : api.createLibraryItem(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
    },
  });
}

