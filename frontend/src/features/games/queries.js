import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../services/api';

export function useGamesQuery() {
  return useQuery({
    queryKey: ['games'],
    queryFn: api.getGames,
  });
}

export function useGameQuery(slug) {
  return useQuery({
    queryKey: ['games', slug],
    queryFn: () => api.getGame(slug),
    enabled: Boolean(slug),
  });
}

export function useGameLeaderboardQuery(slug, assignmentId) {
  return useQuery({
    queryKey: ['game-leaderboard', slug, assignmentId || null],
    queryFn: () => api.getGameLeaderboard(slug, assignmentId),
    enabled: Boolean(slug),
  });
}

export function useStartGameSessionMutation() {
  return useMutation({
    mutationFn: ({ slug, assignmentId }) => api.startGameSession(slug, assignmentId),
  });
}

export function useSubmitGameAttemptMutation(slug, assignmentId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.submitGameAttempt(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-leaderboard', slug, assignmentId || null] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

