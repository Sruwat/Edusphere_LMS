import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';

export function useAssignmentsQuery() {
  return useQuery({
    queryKey: ['assignments'],
    queryFn: api.getAssignments,
  });
}

export function useCreateAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

