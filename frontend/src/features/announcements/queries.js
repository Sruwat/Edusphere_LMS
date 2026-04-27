import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';

export function useAnnouncementsQuery(filters = {}) {
  return useQuery({
    queryKey: ['announcements', filters],
    queryFn: () => api.getAnnouncements(filters),
  });
}

export function useSaveAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => (id ? api.updateAnnouncement(id, payload) : api.createAnnouncement(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useDeleteAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

