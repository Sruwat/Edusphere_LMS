import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';

export function useCoursesQuery() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: api.getCourses,
  });
}

export function useCreateCourseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

