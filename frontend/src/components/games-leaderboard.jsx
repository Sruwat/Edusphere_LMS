import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useGameLeaderboardQuery } from '../features/games/queries';

export function GamesLeaderboard() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('game') || 'dataset-quiz';
  const { data = [], isLoading } = useGameLeaderboardQuery(slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Game Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leaderboard entries yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map((entry) => (
              <div key={`${entry.student?.id}-${entry.rank}`} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{entry.student?.username || 'Unknown player'}</p>
                  <p className="text-xs text-muted-foreground">Rank #{entry.rank}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{entry.score}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entry.scope}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
