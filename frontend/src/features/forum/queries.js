import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';

export function useForumThreadsQuery(courseId) {
  return useQuery({
    queryKey: ['forum-threads', courseId],
    queryFn: () => api.getForumThreads(courseId),
    enabled: Boolean(courseId),
  });
}

export function useCreateForumThreadMutation(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createForumThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads', courseId] });
    },
  });
}

export function useCreateForumPostMutation(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, payload }) => api.createForumPost(threadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads', courseId] });
    },
  });
}

export function useForumThreadActionMutation(courseId, action) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId) => {
      switch (action) {
        case 'pin':
          return api.toggleForumThreadPin(threadId);
        case 'lock':
          return api.toggleForumThreadLock(threadId);
        case 'resolve':
          return api.toggleForumThreadResolve(threadId);
        case 'hide':
          return api.toggleForumThreadHide(threadId);
        case 'subscribe':
          return api.subscribeForumThread(threadId);
        case 'unsubscribe':
          return api.unsubscribeForumThread(threadId);
        default:
          throw new Error(`Unsupported forum action: ${action}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads', courseId] });
    },
  });
}

export function useForumPostHideMutation(courseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId) => api.toggleForumPostHide(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads', courseId] });
    },
  });
}

export function useCreateForumReportMutation() {
  return useMutation({
    mutationFn: (payload) => api.createForumReport(payload),
  });
}
