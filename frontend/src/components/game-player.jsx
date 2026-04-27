import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useGameQuery, useStartGameSessionMutation, useSubmitGameAttemptMutation } from '../features/games/queries';

function scoreAnswers(questions, answers) {
  const total = questions.length || 1;
  const correct = questions.filter((question) => answers[question.id] === question.answer).length;
  return {
    score: Math.round((correct / total) * 100),
    accuracy: Math.round((correct / total) * 100),
    correct,
    total,
  };
}

export function GamePlayer() {
  const { slug, role, username } = useParams();
  const navigate = useNavigate();
  const { data: game, isLoading } = useGameQuery(slug);
  const startMutation = useStartGameSessionMutation();
  const submitMutation = useSubmitGameAttemptMutation(slug);
  const [sessionId, setSessionId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [wordGuess, setWordGuess] = useState('');
  const [wordProgress, setWordProgress] = useState([]);
  const [battleFound, setBattleFound] = useState([]);
  const [result, setResult] = useState(null);
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function startSession() {
      if (!slug) return;
      const session = await startMutation.mutateAsync({ slug });
      if (!cancelled) setSessionId(session.id);
    }
    startSession();
    return () => { cancelled = true; };
  }, [slug]);

  const questionBank = game?.config?.question_bank || [];
  const wrdlerWords = useMemo(() => game?.config?.words || [], [game]);
  const battleWords = useMemo(() => game?.config?.gridWords || [], [game]);

  const submitResult = async (payload) => {
    const response = await submitMutation.mutateAsync({
      session_id: sessionId,
      score: payload.score,
      max_score: 100,
      accuracy: payload.accuracy ?? payload.score,
      streak: payload.streak || 0,
      payload,
    });
    setResult(response);
  };

  if (isLoading || !game) {
    return <div>Loading game...</div>;
  }

  const renderQuizGame = () => (
    <div className="space-y-4">
      {questionBank.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-lg">{question.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {question.options.map((option) => (
              <Button
                key={option}
                variant={answers[question.id] === option ? 'default' : 'outline'}
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
              >
                {option}
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button onClick={() => submitResult(scoreAnswers(questionBank, answers))}>
          Submit Quiz
        </Button>
      </div>
    </div>
  );

  const renderWrdler = () => {
    const target = wrdlerWords[activeWordIndex] || 'LEARN';
    const guesses = wordProgress.length;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Guess the hidden word</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Target length: {target.length}</p>
          <Input value={wordGuess} onChange={(event) => setWordGuess(event.target.value.toUpperCase())} maxLength={target.length} />
          <Button
            onClick={() => {
              if (!wordGuess) return;
              const normalized = wordGuess.trim().toUpperCase();
              const next = [...wordProgress, normalized];
              setWordProgress(next);
              if (normalized === target) {
                submitResult({ score: Math.max(100 - (guesses * 10), 50), accuracy: 100, streak: 1, solvedWord: target, guesses: next });
              }
              setWordGuess('');
            }}
          >
            Check Guess
          </Button>
          <div className="space-y-2">
            {wordProgress.map((guess) => (
              <div key={guess} className="rounded border px-3 py-2 text-sm">{guess}</div>
            ))}
          </div>
          <Button variant="outline" onClick={() => { setWordProgress([]); setWordGuess(''); setResult(null); setActiveWordIndex((prev) => (prev + 1) % Math.max(wrdlerWords.length, 1)); }}>
            <RotateCcw className="mr-2 h-4 w-4" />
            New Word
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderBattlewords = () => (
    <Card>
      <CardHeader>
        <CardTitle>Find the hidden vocabulary words</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Type one of the hidden words to claim it.</p>
        <Input value={wordGuess} onChange={(event) => setWordGuess(event.target.value.toUpperCase())} />
        <Button
          onClick={() => {
            if (!wordGuess) return;
            const normalized = wordGuess.trim().toUpperCase();
            if (battleWords.includes(normalized) && !battleFound.includes(normalized)) {
              const next = [...battleFound, normalized];
              setBattleFound(next);
              if (next.length === battleWords.length) {
                submitResult({ score: 100, accuracy: 100, streak: battleWords.length, foundWords: next });
              }
            }
            setWordGuess('');
          }}
        >
          Claim Word
        </Button>
        <div className="grid grid-cols-2 gap-2">
          {battleWords.map((word) => (
            <div key={word} className={`rounded border px-3 py-2 text-sm ${battleFound.includes(word) ? 'bg-green-100' : 'bg-muted/40'}`}>
              {battleFound.includes(word) ? word : 'Hidden word'}
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={() => { setBattleFound([]); setWordGuess(''); setResult(null); }}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restart Grid
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/${role}/${username}/games`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Games
        </Button>
        <Button variant="outline" onClick={() => navigate(`/${role}/${username}/games/leaderboard?game=${slug}`)}>
          <Trophy className="mr-2 h-4 w-4" />
          View Leaderboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{game.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{game.description}</p>
          <p className="text-xs text-muted-foreground mt-2">Inspired by {game.upstream_label}</p>
        </CardContent>
      </Card>

      {slug === 'dataset-quiz' || slug === 'code-quiz' ? renderQuizGame() : null}
      {slug === 'wrdler' ? renderWrdler() : null}
      {slug === 'battlewords' ? renderBattlewords() : null}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Score: {result.score?.best_score ?? result.attempt?.score}</p>
            <p>Attempts: {result.score?.attempts_count}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
