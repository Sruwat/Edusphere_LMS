import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { motion, AnimatePresence } from 'motion/react';
import {  
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  Users,
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Eye,
  Edit,
  Download,
  ArrowLeft,
  CheckCircle,
  XCircle,
  TrendingDown,
  ChevronRight,
  Filter,
  Search,
  FileText,
  Send,
  Trash2,
  Copy,
  Settings,
  X,
  PlayCircle,
  AlertCircle
} from 'lucide-react';
import {
  getTests,
  getQuestions,
  getTestSubmissions,
  createTestSubmission,
  createTestAnswer,
  updateTestSubmission,
  getTest,
  me,
  getTestAnswers,
  getCourses,
  createTest,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteTest,
  updateTest,
  getUsers
} from '../services/api';

// Props and types removed for JS build; shape: { userRole: 'student'|'teacher'|'admin' }
export function EnhancedTestSystem({ userRole }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('list');
  const [studentViewMode, setStudentViewMode] = useState('available');
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTestAnswers, setCurrentTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);

  // Tests should be fetched from API. Removed seeded/demo tests.
  const [allTests, setAllTests] = useState([]);
  // Student's completed tests (moved up so other effects can reference it)
  const [currentUser, setCurrentUser] = useState(null);
  // Lookup table for user id -> user object (for displaying real names)
  const [userLookup, setUserLookup] = useState({});

  const resolveStudentName = (id, fallbackName) => {
    const key = id != null ? String(id) : null;
    const user = key ? userLookup[key] : null;
    if (user) {
      const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      if (full) return full;
      if (user.username) return user.username;
      if (user.email) return user.email.split('@')[0];
    }
    if (fallbackName && String(fallbackName).trim()) return fallbackName;
    if (key) return `Student ${key}`;
    return 'Student';
  };

  // Safely coerce various numeric fields that may come as strings or null
  const safeNumber = (v) => {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Load all users so we can display real student names in submissions/leaderboards
  useEffect(() => {
    let mounted = true;
    async function loadUsers() {
      try {
        const users = await getUsers();
        if (!mounted) return;
        const map = {};
        (users || []).forEach(u => {
          if (u && u.id != null) map[String(u.id)] = u;
        });
        setUserLookup(map);
      } catch (e) {
        console.warn('Failed to load users', e);
      }
    }
    loadUsers();
    return () => { mounted = false; };
  }, []);

  // load tests from backend and map backend fields to frontend shape
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const tests = await getTests();
        const out = [];
        for (const t of tests) {
          try {
            const questions = await getQuestions(t.id, { student: currentUser && (currentUser.id || currentUser.pk || currentUser.user_id) });
            const mappedQuestions = (questions || []).map(q => ({
              id: q.id,
              question: q.question_text || q.question || '',
              points: Number(q.marks || q.points || 0),
              options: q.options || [],
              type: (q.question_type === 'mcq' && 'multiple-choice') || (q.question_type === 'true-false' && 'true-false') || (q.question_type === 'descriptive' && 'short-answer') || (q.question_type === 'multiple-answer' && 'multiple-choice') || 'short-answer',
              correctAnswer: q.correct_answer || q.correctAnswer || ''
            }));

            // Prefer submissions already embedded on the test object (often includes all students),
            // otherwise fall back to the submissions endpoint which may be user-scoped for students.
            let submissions = Array.isArray(t.submissions) ? t.submissions : await getTestSubmissions(t.id);
            // Defensive: ensure submissions actually belong to this test. Some
            // backends or proxy layers may return rows not strictly scoped by
            // test id — filter by the submission.test/test_id field if present.
            submissions = (submissions || []).filter(s => {
              const submissionTestId = s.test ?? s.test_id ?? s.testId ?? null;
              if (submissionTestId != null) return String(submissionTestId) === String(t.id);
              // If the submission row lacks a test id field, keep it only if
              // the backend endpoint was already called with t.id — this is a
              // conservative fallback to avoid dropping valid rows for older APIs.
              return true;
            });
            // map submissions to UI-friendly shape where possible
            const mappedSubs = (submissions || []).map(s => {
              const score = safeNumber(s.marks_obtained);
              const totalPoints = safeNumber(t.total_marks) || mappedQuestions.reduce((sum, q) => sum + safeNumber(q.points), 0);
              const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : score;
              // Resolve student identity for leaderboard and display
              const studentId = (s.student && s.student.id) ?? s.student ?? s.student_id ?? s.studentId;
              const fallbackName = s.student_name
                || s.student_username
                || (s.student && ((s.student.full_name) || [s.student.first_name, s.student.last_name].filter(Boolean).join(' ').trim() || s.student.username))
                || (studentId != null ? `Student ${studentId}` : 'Student');
              const studentName = resolveStudentName(studentId, fallbackName);
              return {
                id: s.id,
                studentId,
                studentName,
                submittedAt: s.submit_time || s.start_time || s.created_at || null,
                score,
                totalPoints,
                percentage,
              };
            });

            out.push({
              id: t.id,
              title: t.title,
              subject: t.subject,
              duration: `${t.duration_minutes || t.duration || 0} min`,
              scheduledDate: t.scheduled_date || t.scheduledDate || null,
              isActive: !['completed', 'archived', 'draft'].includes((t.status || '').toLowerCase()),
              questions: mappedQuestions,
              submissions: mappedSubs,
              submitted: mappedSubs.length,
              totalStudents: t.total_students || null,
              averageScore: mappedSubs.length ? Math.round((mappedSubs.reduce((acc, x) => acc + safeNumber(x.score), 0) / mappedSubs.length)) : 0,
              topScore: mappedSubs.length ? Math.max(...mappedSubs.map(s => safeNumber(s.percentage))) : 0,
              totalPoints: t.total_marks || mappedQuestions.reduce((sum, q) => sum + q.points, 0)
            });
          } catch (e) {
            // fallback: include test with minimal shape
            out.push({ id: t.id, title: t.title, subject: t.subject, duration: `${t.duration_minutes || 0} min`, isActive: true, questions: [], submissions: [] });
          }
        }

        if (mounted) setAllTests(out);
      } catch (e) {
        console.error('Failed to load tests', e);
      }
    }
    // only load once currentUser is available (or always if null) so we can
    // apply student-scoped submission filtering based on authenticated id.
    load();
    return () => { mounted = false; };
  }, [currentUser, userLookup]);

  useEffect(() => {
    let mounted = true;
    async function loadMe() {
      try {
        const u = await me();
        if (mounted) setCurrentUser(u);
      } catch (e) {
        // fallback: attempt to read from localStorage safely
        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (mounted) setCurrentUser(parsed);
          }
        } catch (err) {
          // ignore
        }
      }
    }
    loadMe();
    return () => { mounted = false; };
  }, []);

  const _hasSubmissionForUser = (test, userId) => {
    if (!test || !test.submissions) return false;
    return test.submissions.some(s => {
      // submissions may use `studentId` (mapped) or `student`
      const sid = s.studentId ?? s.student ?? s.student_id;
      return sid != null && userId != null && String(sid) === String(userId);
    });
  };

  let completedTests = [];
  let availableTests = [];
  if (currentUser && currentUser.id != null) {
    const uid = currentUser.id || currentUser.pk || currentUser.user_id;
    completedTests = allTests.filter(test => _hasSubmissionForUser(test, uid));
    availableTests = allTests.filter(test => test.isActive && !_hasSubmissionForUser(test, uid));
  } else {
    // fallback behaviour when user not loaded yet
    completedTests = allTests.filter(test => !test.isActive);
    availableTests = allTests.filter(test => test.isActive);
  }

  // Leaderboard: compute from all tests' submissions (aggregate by student)
  const leaderboardData = (() => {
    const map = new Map();
    // Gather submissions across all tests
    for (const test of allTests || []) {
      for (const s of test.submissions || []) {
        const sid = s.studentId ?? s.student ?? s.student_id;
        if (!sid) continue;
        const name = s.studentName || `Student ${sid}`;
        const pct = safeNumber(s.percentage);
        if (!map.has(sid)) {
          map.set(sid, { id: sid, name, totalPct: 0, count: 0, totalTests: 0 });
        }
        const entry = map.get(sid);
        entry.totalPct += pct;
        entry.count += 1;
        entry.totalTests += 1;
      }
    }

    // Convert map to array with averages
    const arr = Array.from(map.values()).map((e) => ({
      id: e.id,
      name: e.name,
      avgScore: e.count ? Math.round(e.totalPct / e.count) : 0,
      totalTests: e.totalTests,
      streak: 0,
      improvement: 0,
      badge: e.count >= 5 ? 'Gold Master' : (e.count >= 3 ? 'Silver Star' : 'Rising Star')
    }));

    // Sort descending by avgScore
    arr.sort((a, b) => b.avgScore - a.avgScore);

    // Add rank for stable keys
    return arr.map((item, idx) => ({ ...item, rank: idx + 1 }));
  })();

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-gray-400" />;
      case 3: return <Award className="h-6 w-6 text-amber-600" />;
      default: return <Trophy className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'Gold Master': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'Silver Star': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 'Bronze Elite': return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      case 'Rising Star': return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
      case 'Achiever': return 'bg-gradient-to-r from-green-400 to-green-600 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    return 'F';
  };

  // Auto-grade test submission
  const gradeTest = (test, answers) => {
    let score = 0;
    let totalPoints = 0;
    let correctAnswers = 0;

    test.questions.forEach(question => {
      totalPoints += question.points;
      const studentAnswer = answers[question.id]?.toLowerCase().trim();
      const correctAnswer = (question.correctAnswer || '').toLowerCase().trim();

      if (studentAnswer === correctAnswer) {
        score += question.points;
        correctAnswers++;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    return { score, totalPoints, percentage, correctAnswers };
  };

  const handleExportTest = (testId) => {
    const test = allTests.find(t => t.id === testId);
    if (!test) return;

    const headers = ['Student Name', 'Submitted At', 'Score', 'Total Points', 'Percentage', 'Grade'];
    const rows = test.submissions.map(s => [
      s.studentName,
      s.submittedAt,
      s.score.toString(),
      s.totalPoints.toString(),
      `${s.percentage}%`,
      getGradeFromPercentage(s.percentage)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test.title.replace(/\s+/g, '_')}_submissions.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Student Test Taking Interface
  const TakeTestInterface = () => {
    const test = allTests.find(t => t.id === selectedTestId);
    if (!test) return null;

  const handleAnswerChange = (questionId, answer) => {
      setCurrentTestAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));
    };

    const handleSubmitTest = async () => {
      // grade locally first
      const result = gradeTest(test, currentTestAnswers);
      setTestResult({
        ...result,
        totalQuestions: test.questions.length
      });

      try {
        // create a TestSubmission on the backend
        const submission = await createTestSubmission({ test: test.id });

        // create TestAnswer records for each question
        for (const q of test.questions) {
          const answerText = currentTestAnswers[q.id] || '';
          const isCorrect = (String((q.correctAnswer || '')).toLowerCase().trim() === String(answerText).toLowerCase().trim());
          const marksAwarded = isCorrect ? (q.points || 0) : 0;
          try {
            await createTestAnswer({
              submission: submission.id,
              question: q.id,
              student_answer: answerText,
              is_correct: isCorrect,
              marks_awarded: marksAwarded
            });
          } catch (e) {
            // continue even if single answer save fails
            console.warn('Failed to save answer', e);
          }
        }

        // update submission with aggregate score and grade
        try {
          await updateTestSubmission(submission.id, {
            marks_obtained: result.score,
            grade: getGradeFromPercentage(result.percentage),
            status: 'submitted'
          });
        } catch (e) {
          console.warn('Failed to update submission', e);
        }

        // Update local UI model: append submission info to test
        const newSubmission = {
          studentId: submission.student || submission.student_id || null,
          studentName: resolveStudentName(submission.student || submission.student_id, submission.student_name),
          submittedAt: submission.submit_time || new Date().toLocaleString(),
          answers: currentTestAnswers,
          score: result.score,
          totalPoints: result.totalPoints,
          percentage: result.percentage
        };

        setAllTests(prev => prev.map(t => 
          t.id === test.id 
            ? { ...t, submissions: [...(t.submissions || []), newSubmission], submitted: ((t.submitted || 0) + 1) }
            : t
        ));

        setViewMode('test-result');
      } catch (err) {
        console.error('Submission failed', err);
        // fallback to showing results locally even if backend failed
        setViewMode('test-result');
      }
    };

    const allQuestionsAnswered = test.questions.every(q => currentTestAnswers[q.id]);

  

  const _hasSubmissionsForTab = (tst) => ((tst && (tst.submissions || []).length > 0) || ((tst && tst.submitted) || 0) > 0);
  const hasSubmissionsForTab = _hasSubmissionsForTab(allTests.find(tt => tt.id === selectedTestId) || test);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => {
              setViewMode('list');
              setCurrentTestAnswers({});
            }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{test.title}</h2>
              <p className="text-muted-foreground">{test.subject} • {test.duration}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="font-medium">{test.duration}</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">• Answer all questions to the best of your ability</p>
            <p className="text-sm">• Your test will be automatically graded upon submission</p>
            <p className="text-sm">• You will see your results immediately after submitting</p>
            <p className="text-sm">• Make sure to review your answers before submitting</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {test.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Question {index + 1}</Badge>
                          <Badge>{question.points} points</Badge>
                        </div>
                        <p className="font-medium">{question.question}</p>
                      </div>
                    </div>

                    {question.type === 'multiple-choice' && question.options && (
                      <RadioGroup
                        value={currentTestAnswers[question.id] || ''}
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                      >
                        <div className="space-y-3">
                          {question.options.map((option, i) => (
                            <div
                              key={i}
                              className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                currentTestAnswers[question.id] === option
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleAnswerChange(question.id, option)}
                            >
                              <RadioGroupItem value={option} id={`q${question.id}-${i}`} />
                              <Label htmlFor={`q${question.id}-${i}`} className="flex-1 cursor-pointer">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}

                    {question.type === 'true-false' && (
                      <RadioGroup
                        value={currentTestAnswers[question.id] || ''}
                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                      >
                        <div className="space-y-3">
                          {['true', 'false'].map((option) => (
                            <div
                              key={option}
                              className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                currentTestAnswers[question.id] === option
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleAnswerChange(question.id, option)}
                            >
                              <RadioGroupItem value={option} id={`q${question.id}-${option}`} />
                              <Label htmlFor={`q${question.id}-${option}`} className="flex-1 cursor-pointer capitalize">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}

                    {question.type === 'short-answer' && (
                      <Textarea
                        placeholder="Type your answer here..."
                        value={currentTestAnswers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={4}
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-background border-t p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allQuestionsAnswered ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
            <span className="text-sm">
              {Object.keys(currentTestAnswers).length} of {test.questions.length} questions answered
            </span>
          </div>
          <Button
            size="lg"
            onClick={handleSubmitTest}
            disabled={!allQuestionsAnswered}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Test
          </Button>
        </div>
      </motion.div>
    );
  };

  // Test Result Interface
  const TestResultInterface = () => {
    const test = allTests.find(t => t.id === selectedTestId);
    if (!test || !testResult) return null;

    const grade = getGradeFromPercentage(testResult.percentage);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <div className="text-center space-y-4 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            {testResult.percentage >= 80 ? (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto">
                <Trophy className="h-12 w-12 text-white" />
              </div>
            ) : testResult.percentage >= 60 ? (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mx-auto">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-12 w-12 text-white" />
              </div>
            )}
          </motion.div>

          <div>
            <h2 className="text-3xl font-bold mb-2">Test Submitted!</h2>
            <p className="text-muted-foreground">Your test has been automatically graded</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600">{testResult.score}</div>
                  <div className="text-sm text-muted-foreground">Points Earned</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600">{testResult.totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600">{testResult.percentage}%</div>
                  <div className="text-sm text-muted-foreground">Percentage</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <Badge className={`${getGradeColor(grade)} text-2xl px-4 py-2`}>
                    {grade}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-2">Grade</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="max-w-3xl mx-auto"
          >
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Correct Answers</span>
                    <span className="font-bold">{testResult.correctAnswers} / {testResult.totalQuestions}</span>
                  </div>
                  <Progress value={(testResult.correctAnswers / testResult.totalQuestions) * 100} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex gap-4 justify-center pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setViewMode('list');
                setCurrentTestAnswers({});
                setTestResult(null);
                setSelectedTestId(null);
              }}
            >
              Back to Tests
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setViewMode('list');
                setCurrentTestAnswers({});
                setTestResult(null);
                setSelectedTestId(null);
                setStudentViewMode('completed');
              }}
            >
              View All Results
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Test View Interface for Teachers
  const TestViewInterface = () => {
    const test = allTests.find(t => t.id === selectedTestId);
    if (!test) return null;

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeViewTab, setActiveViewTab] = useState('submissions');
  const [editingQuestions, setEditingQuestions] = useState(test.questions);
  const [editingQuestion, setEditingQuestion] = useState(null);
    
    const selectedSubmission = test.submissions.find(s => s.studentId === selectedStudent);
    const [selectedSubmissionAnswers, setSelectedSubmissionAnswers] = useState({});

    // If the current viewer is a student, auto-select their submission (if any)
    useEffect(() => {
      if (!test) return;
      try {
        const uid = currentUser && (currentUser.id || currentUser.pk || currentUser.user_id);
        const viewerIsStudent = (userRole === 'student') || (currentUser && (currentUser.role === 'student' || currentUser.user_type === 'student'));
        if (viewerIsStudent && uid != null) {
          // find submission matching this student id
          const mySub = (test.submissions || []).find(s => {
            const sid = s.studentId ?? s.student ?? s.student_id;
            return sid != null && String(sid) === String(uid);
          });
          if (mySub) {
            setSelectedStudent(mySub.studentId ?? mySub.student ?? mySub.student_id);
            // ensure submissions tab is visible
            setActiveViewTab('submissions');
          }
        }
      } catch (e) {
        // ignore
      }
    }, [test, currentUser, userRole]);

    useEffect(() => {
      let mounted = true;
      async function loadSubmissionAnswers() {
        setSelectedSubmissionAnswers({});
        if (!selectedSubmission) return;
        const sid = selectedSubmission.id || selectedSubmission.submission || selectedSubmission.pk || selectedSubmission.submission_id;
        if (!sid) return;
          try {
          const answers = await getTestAnswers(sid, { student: currentUser && (currentUser.id || currentUser.pk || currentUser.user_id) });
          if (!mounted) return;
          const map = {};
          (answers || []).forEach(a => {
            const qid = a.question ?? a.question_id ?? a.questionId;
            if (qid != null) map[String(qid)] = a.student_answer ?? a.studentAnswer ?? a.answer ?? '';
          });
          setSelectedSubmissionAnswers(map);
        } catch (e) {
          console.warn('Failed to load submission answers', e);
        }
      }
      loadSubmissionAnswers();
      return () => { mounted = false; };
    }, [selectedSubmission]);

    const handleSaveQuestions = async () => {
      // Persist changes: create new questions, update existing, delete removed
      try {
        const originalMap = {};
        (test.questions || []).forEach(q => { if (q.id) originalMap[String(q.id)] = q; });

        const editedMap = {};
        (editingQuestions || []).forEach(q => { if (q.id) editedMap[String(q.id)] = q; });

        // Deletions: original ids not present in edited list
        const deletions = (test.questions || []).filter(q => q.id && !editedMap[String(q.id)]);
        for (const d of deletions) {
          try {
            await deleteQuestion(d.id);
          } catch (e) {
            console.warn('Failed to delete question', d.id, e);
          }
        }

        // Updates & Creations
        for (let i = 0; i < (editingQuestions || []).length; i++) {
          const q = editingQuestions[i];
          const qPayload = {
            test: test.id,
            question_type: q.type === 'multiple-choice' ? 'mcq' : (q.type === 'true-false' ? 'true-false' : 'descriptive'),
            question_text: q.question,
            options: q.options || [],
            correct_answer: q.correctAnswer,
            marks: q.points || 0,
            order_index: i + 1
          };

          try {
            if (q.id) {
              await updateQuestion(q.id, qPayload);
            } else {
              await createQuestion(qPayload);
            }
          } catch (e) {
            console.warn('Failed to save question', q, e);
          }
        }

        // Optionally update test-level metadata (total marks)
        try {
          const totalPoints = (editingQuestions || []).reduce((s, qq) => s + (Number(qq.points) || 0), 0);
          await updateTest(test.id, { total_marks: totalPoints });
        } catch (e) {
          console.warn('Failed to update test metadata', e);
        }

        // Refresh test from server to get canonical ids and submissions
        let refreshed = null;
        try {
          refreshed = await getTest(test.id);
        } catch (e) {
          console.warn('Failed to refresh test', e);
        }

        if (refreshed) {
          // map server shape to UI shape similar to initial load
          const mappedQuestions = (refreshed.questions || []).map(q => ({
            id: q.id,
            question: q.question_text || q.question || '',
            points: Number(q.marks || q.points || 0),
            options: q.options || [],
            type: (q.question_type === 'mcq' && 'multiple-choice') || (q.question_type === 'true-false' && 'true-false') || 'short-answer',
            correctAnswer: q.correct_answer || q.correctAnswer || ''
          }));

          const submissions = await getTestSubmissions(test.id).catch(() => []);
          const mappedSubs = (submissions || []).map(s => {
            const score = safeNumber(s.marks_obtained);
            const totalPoints = safeNumber(refreshed.total_marks) || mappedQuestions.reduce((sum, q) => sum + safeNumber(q.points), 0);
            const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : score;
            const studentId = (s.student && s.student.id) ?? s.student ?? s.student_id ?? s.studentId;
            const fallbackName = s.student_name
              || s.student_username
              || (s.student && ((s.student.full_name) || [s.student.first_name, s.student.last_name].filter(Boolean).join(' ').trim() || s.student.username))
              || (studentId != null ? `Student ${studentId}` : 'Student');
            const studentName = resolveStudentName(studentId, fallbackName);
            return {
              id: s.id,
              studentId,
              studentName,
              submittedAt: s.submit_time || s.start_time || s.created_at || null,
              score,
              totalPoints,
              percentage,
            };
          });

          setAllTests(prev => prev.map(t => t.id === test.id ? ({
            id: refreshed.id,
            title: refreshed.title,
            subject: refreshed.subject,
            duration: `${refreshed.duration_minutes || refreshed.duration || 0} min`,
            scheduledDate: refreshed.scheduled_date || refreshed.scheduledDate || null,
            isActive: !['completed', 'archived', 'draft'].includes((refreshed.status || '').toLowerCase()),
            questions: mappedQuestions,
            submissions: mappedSubs,
            submitted: mappedSubs.length,
            totalStudents: refreshed.total_students || null,
            averageScore: mappedSubs.length ? Math.round((mappedSubs.reduce((acc, x) => acc + safeNumber(x.score), 0) / mappedSubs.length)) : 0,
            topScore: mappedSubs.length ? Math.max(...mappedSubs.map(s => safeNumber(s.percentage))) : 0,
            totalPoints: refreshed.total_marks || mappedQuestions.reduce((sum, q) => sum + q.points, 0)
          }) : t));
        } else {
          // Fallback: update local model only
          setAllTests(prev => prev.map(t => t.id === test.id ? { ...t, questions: editingQuestions } : t));
        }

        setActiveViewTab('questions');
      } catch (err) {
        console.error('Failed saving questions', err);
        // still switch views so teacher isn't blocked
        setAllTests(prev => prev.map(t => t.id === test.id ? { ...t, questions: editingQuestions } : t));
        setActiveViewTab('questions');
      }
    };

  const handleDeleteQuestion = (questionId) => {
      setEditingQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    const handleDeleteTest = async (testId) => {
      if (!testId) return;
      const confirmed = window.confirm('Delete this test and all related questions/submissions? This action cannot be undone.');
      if (!confirmed) return;
      try {
        await deleteTest(testId);
        // remove from UI
        setAllTests(prev => prev.filter(t => t.id !== testId));
        // if currently viewing this test, go back to list
        if (selectedTestId === testId) {
          setSelectedTestId(null);
          setViewMode('list');
        }
      } catch (e) {
        console.error('Failed to delete test', e);
        alert('Failed to delete test: ' + (e && e.message ? e.message : 'unknown error'));
      }
    };

  const handleUpdateQuestion = (updatedQuestion) => {
      setEditingQuestions(prev => prev.map(q => 
        q.id === updatedQuestion.id ? updatedQuestion : q
      ));
      setEditingQuestion(null);
    };

  const hasSubmissionsForTab = (test && ((test.submissions || []).length > 0 || (test.submitted || 0) > 0));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{test.title}</h2>
              <p className="text-muted-foreground">{test.subject} • {test.scheduledDate}</p>
            </div>
          </div>
          <div className="flex gap-2">
              {(() => {
                const hasSubmissions = (test.submissions || []).length > 0 || (test.submitted || 0) > 0;
                return (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (hasSubmissions) {
                        // prevent entering edit mode if submissions exist (silent)
                        return;
                      }
                      setActiveViewTab('edit');
                    }}
                    disabled={hasSubmissions}
                    title={hasSubmissions ? 'Cannot edit after submissions' : 'Edit test'}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Test
                  </Button>
                );
              })()}
            <Button onClick={() => handleExportTest(test.id)}>
              <Download className="h-4 w-4 mr-2" />
              Export Submissions
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{test.submitted}/{test.totalStudents}</div>
              <div className="text-sm text-muted-foreground">Submissions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{test.averageScore}%</div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{test.topScore}%</div>
              <div className="text-sm text-muted-foreground">Top Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{test.questions.length}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </CardContent>
          </Card>
        </div>

  <Tabs value={activeViewTab} onValueChange={(v) => {
    // Prevent switching to edit tab when submissions exist (silent)
    if (v === 'edit' && hasSubmissionsForTab) return;
    setActiveViewTab(v);
  }}>
    <TabsList>
      <TabsTrigger value="submissions">Submissions ({test.submissions.length})</TabsTrigger>
      <TabsTrigger value="questions">Questions ({test.questions.length})</TabsTrigger>
      <TabsTrigger value="edit" disabled={hasSubmissionsForTab}>Edit Test</TabsTrigger>
    </TabsList>

          <TabsContent value="submissions" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Submissions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Submissions (Auto-Graded)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {test.submissions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No submissions yet</p>
                      </div>
                    ) : (
                      test.submissions.map((submission, index) => (
                        <motion.div
                          key={submission.studentId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedStudent(submission.studentId)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedStudent === submission.studentId 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {((submission.studentName || '').split(/\s+/).filter(Boolean).map(n => n[0]).join('')) || (submission.studentName ? submission.studentName[0] : '?')}
                              </div>
                              <div>
                                <p className="font-medium">{submission.studentName}</p>
                                <p className="text-xs text-muted-foreground">{submission.submittedAt}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-bold text-green-600">{submission.percentage}%</span>
                              </div>
                              <Badge className={getGradeColor(getGradeFromPercentage(submission.percentage))}>
                                {getGradeFromPercentage(submission.percentage)}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Answer Review Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedSubmission ? `Review: ${selectedSubmission.studentName}` : 'Select a Student'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedSubmission ? (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{selectedSubmission.score}</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">{selectedSubmission.percentage}%</div>
                            <div className="text-xs text-muted-foreground">Percentage</div>
                          </div>
                          <div>
                            <Badge className={`${getGradeColor(getGradeFromPercentage(selectedSubmission.percentage))} text-lg`}>
                              {getGradeFromPercentage(selectedSubmission.percentage)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {test.questions.map((question, index) => {
                        const studentAnswer = (selectedSubmissionAnswers && (selectedSubmissionAnswers[String(question.id)] ?? selectedSubmissionAnswers[question.id])) ?? selectedSubmission?.answers?.[question.id];
                        const normalizedStudentAnswer = (studentAnswer || '').toString().toLowerCase().trim();
                        const normalizedCorrectAnswer = (question.correctAnswer || '').toString().toLowerCase().trim();
                        const isCorrect = normalizedStudentAnswer === normalizedCorrectAnswer;

                        return (
                          <motion.div
                            key={question.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-lg border"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">Question {index + 1}</p>
                                  <p className="text-sm mt-1">{question.question}</p>
                                </div>
                                <Badge variant={isCorrect ? 'default' : 'destructive'} className="ml-2">
                                  {isCorrect ? `+${question.points}` : '0'} pts
                                </Badge>
                              </div>

                              <div className="space-y-2 ml-4">
                                <div className={`p-2 rounded text-sm ${
                                  isCorrect
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                    <span><strong>Student Answer:</strong> {studentAnswer || 'No answer'}</span>
                                  </div>
                                </div>
                                {!isCorrect && (
                                  <div className="p-2 rounded bg-green-50 border border-green-200 text-sm">
                                    <span><strong>Correct Answer:</strong> {question.correctAnswer}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p>Select a student submission to review answers</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Test Questions</span>
                  <Badge className="text-lg">
                    Total Points: {test.questions.reduce((sum, q) => sum + q.points, 0)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {test.questions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p>No questions added to this test yet</p>
                    </div>
                  ) : (
                    test.questions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-6 rounded-lg border bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline">Question {index + 1}</Badge>
                                <Badge className="bg-blue-100 text-blue-800">
                                  {question.points} points
                                </Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {question.type.replace('-', ' ')}
                                </Badge>
                              </div>
                              <p className="font-medium text-lg mb-3">{question.question}</p>
                              
                              {question.type === 'multiple-choice' && question.options && (
                                <div className="space-y-2 ml-4">
                                  {question.options.map((option, i) => {
                                    const isCorrect = option === question.correctAnswer;
                                    return (
                                      <div
                                        key={i}
                                        className={`p-3 rounded-lg border ${
                                          isCorrect
                                            ? 'bg-green-50 border-green-300 text-green-900'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                                          <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
                                          <span>{option}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {question.type === 'true-false' && (
                                <div className="ml-4 p-3 rounded-lg bg-green-50 border border-green-300">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">Correct Answer:</span>
                                    <span className="capitalize">{question.correctAnswer}</span>
                                  </div>
                                </div>
                              )}

                              {question.type === 'short-answer' && (
                                <div className="ml-4 p-3 rounded-lg bg-green-50 border border-green-300">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">Expected Answer:</span>
                                    <span>{question.correctAnswer}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Edit Test Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-900">Editing Mode</p>
                        <p className="text-sm text-orange-700">
                          {test.submissions.length > 0 
                            ? `Warning: ${test.submissions.length} students have already submitted. Changes may affect grading.`
                            : 'You can safely edit this test as no submissions have been made yet.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editingQuestions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 rounded-lg border bg-white"
                      >
                        {editingQuestion?.id === question.id ? (
                          <QuestionEditForm
                            question={editingQuestion}
                            onSave={handleUpdateQuestion}
                            onCancel={() => setEditingQuestion(null)}
                          />
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">Q{index + 1}</Badge>
                                <Badge>{question.points} pts</Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {question.type.replace('-', ' ')}
                                </Badge>
                              </div>
                              <p className="font-medium mb-2">{question.question}</p>
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium text-green-600">Answer:</span> {question.correctAnswer}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingQuestion(question)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteQuestion(question.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {editingQuestions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p>No questions in this test</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveQuestions} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingQuestions(test.questions);
                        setEditingQuestion(null);
                        setActiveViewTab('questions');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  };

  // Question Edit Form Component
  const QuestionEditForm = ({ question, onSave, onCancel }) => {
    const [editedQuestion, setEditedQuestion] = useState(question);

    return (
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
        <div>
          <Label>Question</Label>
          <Textarea
            value={editedQuestion.question}
            onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
            rows={3}
            className="mt-2"
          />
        </div>

        {editedQuestion.type === 'multiple-choice' && editedQuestion.options && (
          <div className="space-y-3">
            <Label>Options (Select the correct answer)</Label>
            <RadioGroup
              value={editedQuestion.correctAnswer}
              onValueChange={(value) => setEditedQuestion({ ...editedQuestion, correctAnswer: value })}
            >
              {editedQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editedQuestion.options];
                      newOptions[index] = e.target.value;
                      setEditedQuestion({ ...editedQuestion, options: newOptions });
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`edit-option-${index}`} disabled={!option} />
                    <Label htmlFor={`edit-option-${index}`} className="text-xs">
                      Correct
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {editedQuestion.type === 'true-false' && (
          <div>
            <Label>Correct Answer</Label>
            <RadioGroup
              value={editedQuestion.correctAnswer}
              onValueChange={(value) => setEditedQuestion({ ...editedQuestion, correctAnswer: value })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="edit-true" />
                <Label htmlFor="edit-true">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="edit-false" />
                <Label htmlFor="edit-false">False</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {editedQuestion.type === 'short-answer' && (
          <div>
            <Label>Correct Answer</Label>
            <Input
              value={editedQuestion.correctAnswer}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, correctAnswer: e.target.value })}
              className="mt-2"
            />
          </div>
        )}

        <div>
          <Label>Points</Label>
          <Input
            type="number"
            min="1"
            value={editedQuestion.points}
            onChange={(e) => setEditedQuestion({ ...editedQuestion, points: Number(e.target.value) })}
            className="mt-2 w-24"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(editedQuestion)} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  // Test Creation Interface
  const TestCreationInterface = () => {
    const [testTitle, setTestTitle] = useState('');
    const [testSubject, setTestSubject] = useState('');
    const [testDuration, setTestDuration] = useState('');
    const [testDate, setTestDate] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10
    });

    const addQuestion = () => {
      if (currentQuestion.question && currentQuestion.correctAnswer) {
        setQuestions([...questions, { ...currentQuestion, id: questions.length + 1 }]);
        setCurrentQuestion({
          type: 'multiple-choice',
          question: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 10
        });
      }
    };

    const removeQuestion = (id) => {
      setQuestions(questions.filter(q => q.id !== id));
    };

    const handlePublishTest = async () => {
      if (!(testTitle && testSubject && questions.length > 0)) return;

      try {
        // Require the teacher to have at least one course; pick first for now
        const courses = await getCourses();
        if (!courses || courses.length === 0) {
          // eslint-disable-next-line no-alert
          alert('No course found. Create a course before publishing a test.');
          return;
        }
        const courseId = courses[0].id;

        const totalPoints = questions.reduce((s, q) => s + (Number(q.points) || 0), 0);
        // parse duration minutes from input if numeric, otherwise default
        const durationVal = Number(testDuration) || (typeof testDuration === 'string' && parseInt(testDuration, 10)) || 60;

        const testPayload = {
          course: courseId,
          title: testTitle,
          subject: testSubject,
          test_type: 'test',
          scheduled_date: testDate || new Date().toISOString(),
          duration_minutes: durationVal,
          total_marks: totalPoints,
          instructions: '',
          status: 'upcoming'
        };

        const created = await createTest(testPayload);
        // create questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qType = q.type === 'multiple-choice' ? 'mcq' : (q.type === 'true-false' ? 'true-false' : (q.type === 'short-answer' ? 'descriptive' : 'descriptive'));
          const questionPayload = {
            test: created.id,
            question_type: qType,
            question_text: q.question,
            options: q.options || [],
            correct_answer: q.correctAnswer,
            marks: q.points || 0,
            order_index: i + 1
          };
          try {
            await createQuestion(questionPayload);
          } catch (e) {
            console.warn('Failed to create question', e);
          }
        }

        // fetch the created test and its questions to display
        let fullTest = null;
        try {
          fullTest = await getTest(created.id);
        } catch (e) {
          console.warn('Failed to fetch created test', e);
        }

        const mapped = {
          id: created.id,
          title: created.title || testTitle,
          subject: created.subject || testSubject,
          scheduledDate: created.scheduled_date || testDate || new Date().toISOString().split('T')[0],
          duration: `${created.duration_minutes || durationVal} min`,
          totalStudents: created.total_students || 0,
          submitted: 0,
          averageScore: 0,
          topScore: 0,
          isActive: (created.status || 'upcoming') !== 'completed',
          questions: fullTest && fullTest.questions ? (fullTest.questions.map(q => ({ id: q.id, question: q.question_text || '', points: Number(q.marks || q.points || 0), options: q.options || [], type: (q.question_type === 'mcq' && 'multiple-choice') || (q.question_type === 'true-false' && 'true-false') || 'short-answer', correctAnswer: q.correct_answer || '' }))) : questions,
          submissions: []
        };

        setAllTests(prev => [...prev, mapped]);
        setViewMode('list');

        // Reset form
        setTestTitle('');
        setTestSubject('');
        setTestDuration('');
        setTestDate('');
        setQuestions([]);
      } catch (err) {
        console.error('Failed to publish test', err);
        alert('Failed to publish test. See console for details.');
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <h2 className="text-2xl font-bold">Create New Test</h2>
          </div>
          <Button onClick={handlePublishTest} disabled={!testTitle || !testSubject || questions.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            Publish Test
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Details Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Test Title</Label>
                  <Input
                    placeholder="e.g., Advanced Calculus Final Exam"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Subject</Label>
                    <Select value={testSubject} onValueChange={setTestSubject}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent> 
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      placeholder="90"
                      value={testDuration}
                      onChange={(e) => setTestDuration(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label>Scheduled Date</Label>
                  <Input
                    type="datetime-local"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <Select
                    value={currentQuestion.type}
                    onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, type: value, options: value === 'multiple-choice' ? ['', '', '', ''] : undefined })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                      <SelectItem value="short-answer">Short Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Question</Label>
                  <Textarea
                    placeholder="Enter your question..."
                    value={currentQuestion.question}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                    rows={3}
                    className="mt-2"
                  />
                </div>

                {currentQuestion.type === 'multiple-choice' && (
                  <div className="space-y-3">
                    <Label>Answer Options (Select the correct answer)</Label>
                    <RadioGroup
                      value={currentQuestion.correctAnswer}
                      onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                    >
                      {currentQuestion.options?.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(currentQuestion.options || [])];
                              newOptions[index] = e.target.value;
                              setCurrentQuestion({ ...currentQuestion, options: newOptions });
                            }}
                          />
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`option-${index}`} disabled={!option} />
                            <Label htmlFor={`option-${index}`} className="text-xs text-muted-foreground">
                              Correct
                            </Label>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
                  </div>
                )}

                {currentQuestion.type === 'true-false' && (
                  <div>
                    <Label>Correct Answer</Label>
                    <RadioGroup
                      value={currentQuestion.correctAnswer}
                      onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {currentQuestion.type === 'short-answer' && (
                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      placeholder="Enter the correct answer (will be matched exactly)"
                      value={currentQuestion.correctAnswer}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Answer matching is case-insensitive and ignores extra spaces
                    </p>
                  </div>
                )}

                <div>
                  <Label>Points</Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                    className="mt-2 w-24"
                  />
                </div>

                <Button onClick={addQuestion} className="w-full" disabled={!currentQuestion.question || !currentQuestion.correctAnswer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Questions Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Questions ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[700px] overflow-y-auto">
                  {questions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No questions added yet</p>
                    </div>
                  ) : (
                    questions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-lg border bg-white"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                Q{index + 1}
                              </Badge>
                              <Badge className="text-xs">
                                {question.points} pts
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {question.type.replace('-', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-2 mb-2">{question.question}</p>
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">Answer: {question.correctAnswer}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {questions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Points</span>
                      <span className="font-bold">
                        {questions.reduce((sum, q) => sum + q.points, 0)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    );
  };

  // Test Analytics Interface
  const TestAnalyticsInterface = () => {
    const test = allTests.find(t => t.id === selectedTestId);
    if (!test) return null;

    // Compute score distribution buckets from actual submissions when available.
    const subs = (test.submissions || []).map(s => safeNumber(s.percentage));
    const totalSubs = subs.length;
    const bucketsDef = [
      { label: '90-100', min: 90, max: 100 },
      { label: '80-89', min: 80, max: 89 },
      { label: '70-79', min: 70, max: 79 },
      { label: '60-69', min: 60, max: 69 },
      { label: '0-59', min: 0, max: 59 }
    ];

    let performanceData = [];
    if (totalSubs > 0) {
      performanceData = bucketsDef.map(b => {
        const count = subs.filter(p => p >= b.min && p <= b.max).length;
        const percentage = parseFloat(((count / totalSubs) * 100).toFixed(1));
        return { range: b.label, count, percentage };
      });
    } else {
      // Fallback sample data when there are no submissions yet
      performanceData = [
        { range: '90-100', count: 0, percentage: 0 },
        { range: '80-89', count: 0, percentage: 0 },
        { range: '70-79', count: 0, percentage: 0 },
        { range: '60-69', count: 0, percentage: 0 },
        { range: '0-59', count: 0, percentage: 0 }
      ];
    }

    const questionAnalysis = test.questions.map((q, i) => ({
      question: `Q${i + 1}`,
      correctRate: Math.floor(Math.random() * 40) + 60,
      avgTime: Math.floor(Math.random() * 5) + 1
    }));

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setViewMode('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Test Analytics</h2>
              <p className="text-muted-foreground">{test.title}</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Students', value: test.totalStudents, icon: Users, color: 'text-blue-600' },
            { label: 'Submitted', value: test.submitted, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Average Score', value: `${test.averageScore}%`, icon: Target, color: 'text-purple-600' },
            { label: 'Top Score', value: `${test.topScore}%`, icon: Trophy, color: 'text-yellow-600' },
            { label: 'Completion Rate', value: `${Math.round(((test.submitted || 0) / (test.totalStudents || 1)) * 100)}%`, icon: TrendingUp, color: 'text-orange-600' }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <metric.icon className={`h-8 w-8 ${metric.color} mx-auto mb-2`} />
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.map((data, index) => (
                    <motion.div
                      key={data.range}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{data.range}%</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{data.count} students</span>
                          <span className="font-bold">{data.percentage}%</span>
                        </div>
                      </div>
                      <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${data.percentage}%` }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-end pr-3"
                        >
                          {data.percentage > 15 && (
                            <span className="text-white text-sm font-medium">{data.count}</span>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Question Analysis */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Question Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questionAnalysis.map((q, index) => (
                    <motion.div
                      key={q.question}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{q.question}</span>
                        <Badge variant={q.correctRate >= 70 ? 'default' : 'destructive'}>
                          {q.correctRate}% correct
                        </Badge>
                      </div>
                      <Progress value={q.correctRate} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-2">
                        Avg. time: {q.avgTime} min
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Performers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {test.submissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No submissions yet</p>
                    </div>
                  ) : (
                    test.submissions
                      .sort((a, b) => b.percentage - a.percentage)
                      .slice(0, 5)
                      .map((student, index) => (
                        <motion.div
                          key={student.studentId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{student.studentName}</p>
                              <p className="text-xs text-muted-foreground">{student.submittedAt}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {student.percentage}%
                            </p>
                          </div>
                        </motion.div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Auto-Grading System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="p-4 rounded-lg bg-green-50 border border-green-200"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Instant Grading</p>
                      <p className="text-sm text-green-700">
                        All tests are automatically graded when students submit. No manual grading required!
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="p-4 rounded-lg bg-blue-50 border border-blue-200"
                >
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Accurate Scoring</p>
                      <p className="text-sm text-blue-700">
                        The system compares student answers with correct answers you provided during test creation.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="p-4 rounded-lg bg-purple-50 border border-purple-200"
                >
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-900">Immediate Results</p>
                      <p className="text-sm text-purple-700">
                        Students see their scores immediately after submission, enhancing the learning experience.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Enhanced Leaderboard Component
  const EnhancedLeaderboard = () => {
    // Show full leaderboard to all viewers (students and teachers)
    const visibleLeaderboard = Array.isArray(leaderboardData) ? leaderboardData : [];

    // Guard against empty leaderboard data
    if (visibleLeaderboard.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No leaderboard data yet</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Podium for Top 3 */}
        <div className="grid grid-cols-3 gap-4 items-end mb-8">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300">
              <CardContent className="pt-6 pb-8">
                <div className="relative inline-block mb-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-2xl font-bold mx-auto border-4 border-white shadow-lg">
                    {(visibleLeaderboard[1]?.name || '').split(/\s+/).filter(Boolean).map(n => n[0]).join('') || (visibleLeaderboard[1]?.name?.[0] || '?')}
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center border-2 border-white shadow-md">
                    <Medal className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h3 className="font-bold mb-1">{visibleLeaderboard[1]?.name || '—'}</h3>
                <p className="text-2xl font-bold text-gray-700">{visibleLeaderboard[1]?.avgScore ?? 0}%</p>
                <Badge className="mt-2 bg-gradient-to-r from-gray-300 to-gray-500 text-white">
                  2nd Place
                </Badge>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span>{visibleLeaderboard[1]?.streak ?? 0} streak</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400">
              <CardContent className="pt-6 pb-10">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-3xl font-bold mx-auto border-4 border-white shadow-xl">
                    {(visibleLeaderboard[0]?.name || '').split(/\s+/).filter(Boolean).map(n => n[0]).join('') || (visibleLeaderboard[0]?.name?.[0] || '?')}
                  </div>
                  <div className="absolute -top-2 -right-2 h-12 w-12 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-1">{visibleLeaderboard[0]?.name || '—'}</h3>
                <p className="text-3xl font-bold text-yellow-700">{visibleLeaderboard[0]?.avgScore ?? 0}%</p>
                <Badge className="mt-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-sm">
                  Champion
                </Badge>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{visibleLeaderboard[0]?.streak ?? 0} streak</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400">
              <CardContent className="pt-6 pb-8">
                <div className="relative inline-block mb-4">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold mx-auto border-4 border-white shadow-lg">
                    {(visibleLeaderboard[2]?.name || '').split(/\s+/).filter(Boolean).map(n => n[0]).join('') || (visibleLeaderboard[2]?.name?.[0] || '?')}
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center border-2 border-white shadow-md">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                </div>
                <h3 className="font-bold mb-1">{visibleLeaderboard[2]?.name || '—'}</h3>
                <p className="text-2xl font-bold text-amber-700">{visibleLeaderboard[2]?.avgScore ?? 0}%</p>
                <Badge className="mt-2 bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                  3rd Place
                </Badge>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span>{visibleLeaderboard[2]?.streak ?? 0} streak</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Rest of Leaderboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Full Leaderboard
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search students..."
                  className="w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibleLeaderboard.map((student, index) => (
                <motion.div
                  key={student.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="group p-4 rounded-lg border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 font-bold text-gray-700">
                          #{student.rank}
                        </div>
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                          {((student.name || '').split(/\s+/).filter(Boolean).map(n => n[0]).join('')) || (student.name ? student.name[0] : '?')}
                        </div>
                      </div> 

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{student.name}</p>
                          <Badge className={getBadgeColor(student.badge)} variant="secondary">
                            {student.badge}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {student.totalTests} tests
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3 text-orange-500" />
                            {student.streak} streak
                          </span>
                          {student.improvement !== 0 && (
                            <span className={`flex items-center gap-1 ${
                              student.improvement > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {student.improvement > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(student.improvement)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{student.avgScore}%</p>
                        <p className="text-sm text-muted-foreground">Average</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const StudentView = () => {
    // Calculate average score for the student
    const calculateAverageScore = () => {
      if (!currentUser || completedTests.length === 0) return 0;
      
      const uid = currentUser.id || currentUser.pk || currentUser.user_id;
      let totalPercentage = 0;
      let count = 0;
      
      completedTests.forEach(test => {
        if (test.submissions) {
          const userSubmission = test.submissions.find(s => {
            const sid = s.studentId || s.student_id || s.student || s.user_id || s.user;
            return sid === uid || sid === String(uid) || String(sid) === String(uid);
          });
          
          if (userSubmission && userSubmission.percentage != null) {
            totalPercentage += safeNumber(userSubmission.percentage);
            count++;
          }
        }
      });
      
      return count > 0 ? Math.round(totalPercentage / count) : 0;
    };
    
    // Get student's rank from leaderboard
    const getStudentRank = () => {
      if (!currentUser) return null;
      
      const uid = currentUser.id || currentUser.pk || currentUser.user_id;
      const studentEntry = leaderboardData.find(entry => {
        return entry.id === uid || entry.id === String(uid) || String(entry.id) === String(uid);
      });
      
      return studentEntry ? studentEntry.rank : null;
    };
    
    const averageScore = calculateAverageScore();
    const studentRank = getStudentRank();
    
    return (
    <div className="space-y-6">
      {/* Student Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{completedTests.length}</div>
            <div className="text-sm text-muted-foreground">Tests Taken</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{averageScore}%</div>
            <div className="text-sm text-muted-foreground">Average Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {studentRank ? `#${studentRank}` : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Class Rank</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Win Streak</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">My Tests</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="analytics">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Tabs value={studentViewMode} onValueChange={(v) => setStudentViewMode(v)}>
            <TabsList>
              <TabsTrigger value="available">Available Tests ({availableTests.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed Tests ({completedTests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="space-y-4">
              {availableTests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-muted-foreground">No available tests at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableTests.map((test, index) => (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow border-2 border-blue-200">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <Badge className="mb-2 bg-green-100 text-green-800">Available</Badge>
                                <h3 className="font-bold mb-1">{test.title}</h3>
                                <p className="text-sm text-muted-foreground">{test.subject}</p>
                              </div>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{test.scheduledDate}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{test.duration}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>{test.questions.length} questions</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-muted-foreground" />
                                <span>{test.questions.reduce((sum, q) => sum + q.points, 0)} total points</span>
                              </div>
                            </div>

                            {(() => {
                              const uid = currentUser && (currentUser.id || currentUser.pk || currentUser.user_id);
                              const isCompletedByUser = uid ? _hasSubmissionForUser(test, uid) : false;
                              return (
                                <Button 
                                  className="w-full" 
                                  size="lg"
                                  onClick={() => {
                                    if (isCompletedByUser) {
                                      // open results view for this test
                                      setSelectedTestId(test.id);
                                      setViewMode('test-result');
                                      return;
                                    }
                                    setSelectedTestId(test.id);
                                    setViewMode('take-test');
                                    setCurrentTestAnswers({});
                                  }}
                                  disabled={isCompletedByUser}
                                >
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  {isCompletedByUser ? 'View Result' : 'Start Test'}
                                </Button>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-muted-foreground">No completed tests yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedTests.map((test, index) => {
                    // Get student's submission for this test
                    let submission = null;
                    const uid = currentUser && (currentUser.id || currentUser.pk || currentUser.user_id);
                    if (uid) {
                      submission = (test.submissions || []).find(s => {
                        const sid = s.studentId ?? s.student ?? s.student_id;
                        return sid != null && String(sid) === String(uid);
                      }) || null;
                    }
                    // fallback: if no currentUser, show first submission if present
                    if (!submission && (test.submissions || []).length > 0) submission = test.submissions[0];
                    const grade = submission ? getGradeFromPercentage(submission.percentage) : 'N/A';

                    return (
                      <motion.div
                        key={test.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h3 className="font-bold mb-1">{test.title}</h3>
                                  <p className="text-sm text-muted-foreground">{test.subject}</p>
                                </div>
                                {submission && (
                                  <Badge className={getGradeColor(grade)}>
                                    {grade}
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{test.scheduledDate}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{test.duration}</span>
                                </div>
                              </div>

                              {submission && (
                                <>
                                  <div className="space-y-2 pt-2 border-t">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm">Your Score</span>
                                      <span className="font-bold">{submission.score}/{submission.totalPoints}</span>
                                    </div>
                                    <Progress value={submission.percentage} />
                                    <div className="text-center">
                                      <span className="text-2xl font-bold text-blue-600">{submission.percentage}%</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <EnhancedLeaderboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Get student's test performance over time
                  const uid = currentUser && (currentUser.id || currentUser.pk || currentUser.user_id);
                  const testPerformance = [];
                  
                  if (uid && completedTests.length > 0) {
                    completedTests.forEach(test => {
                      if (test.submissions) {
                        const userSubmission = test.submissions.find(s => {
                          const sid = s.studentId || s.student_id || s.student || s.user_id || s.user;
                          return sid === uid || sid === String(uid) || String(sid) === String(uid);
                        });
                        
                        if (userSubmission && userSubmission.percentage != null) {
                          testPerformance.push({
                            title: test.title,
                            subject: test.subject,
                            percentage: safeNumber(userSubmission.percentage),
                            date: test.scheduledDate
                          });
                        }
                      }
                    });
                  }

                  if (testPerformance.length === 0) {
                    return (
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No test data available yet</p>
                        </div>
                      </div>
                    );
                  }

                  // Calculate max score for scaling
                  const maxScore = 100; // Always use 100 as max for consistent scaling
                  
                  return (
                    <div className="space-y-4">
                      {/* Line Chart Visualization */}
                      <div className="relative h-52 bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 border border-gray-200">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                          <span>100%</span>
                          <span>75%</span>
                          <span>50%</span>
                          <span>25%</span>
                          <span>0%</span>
                        </div>
                        
                        {/* Grid lines */}
                        <div className="absolute left-12 right-4 top-4 bottom-8 flex flex-col justify-between">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="border-t border-gray-200"></div>
                          ))}
                        </div>
                        
                        {/* Chart area */}
                        <div className="relative ml-12 mr-4 h-[calc(100%-2rem)]">
                          <svg className="w-full h-full" preserveAspectRatio="none">
                            {/* Line path */}
                            <motion.path
                              d={(() => {
                                const width = 100;
                                const height = 100;
                                const points = testPerformance.map((test, i) => {
                                  const x = (i / Math.max(testPerformance.length - 1, 1)) * width;
                                  const y = height - (test.percentage / maxScore * height);
                                  return `${x},${y}`;
                                });
                                return `M ${points.join(' L ')}`;
                              })()}
                              fill="none"
                              stroke="url(#lineGradient)"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 1 }}
                              transition={{ duration: 1.5, ease: "easeInOut" }}
                              vectorEffect="non-scaling-stroke"
                            />
                            
                            {/* Area fill under line */}
                            <motion.path
                              d={(() => {
                                const width = 100;
                                const height = 100;
                                const points = testPerformance.map((test, i) => {
                                  const x = (i / Math.max(testPerformance.length - 1, 1)) * width;
                                  const y = height - (test.percentage / maxScore * height);
                                  return `${x},${y}`;
                                });
                                return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
                              })()}
                              fill="url(#areaGradient)"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.3 }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                            
                            {/* Data points */}
                            {testPerformance.map((test, index) => {
                              const x = (index / Math.max(testPerformance.length - 1, 1)) * 100;
                              const y = 100 - (test.percentage / maxScore * 100);
                              return (
                                <motion.g key={index}>
                                  <motion.circle
                                    cx={`${x}%`}
                                    cy={`${y}%`}
                                    r="4"
                                    fill="white"
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                                    className="cursor-pointer hover:r-6 transition-all"
                                  />
                                  <title>{`${test.title}: ${test.percentage}%`}</title>
                                </motion.g>
                              );
                            })}
                            
                            {/* Gradients */}
                            <defs>
                              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#dbeafe" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                        
                        {/* X-axis labels */}
                        <div className="absolute bottom-0 left-12 right-4 flex justify-between text-xs text-gray-500 mt-2">
                          {testPerformance.map((test, index) => (
                            <span key={index} className="truncate max-w-[60px]" title={test.title}>
                              Test {index + 1}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Test labels */}
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {testPerformance.map((test, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className={`h-3 w-3 rounded-full ${
                              test.percentage >= 80 ? 'bg-green-500' :
                              test.percentage >= 60 ? 'bg-blue-500' :
                              test.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="flex-1 truncate" title={test.title}>
                              {test.title.length > 25 ? test.title.substring(0, 25) + '...' : test.title}
                            </span>
                            <span className="text-muted-foreground">{test.percentage}%</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Summary stats */}
                      <div className="pt-3 border-t grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">Tests</div>
                          <div className="font-bold">{testPerformance.length}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Average</div>
                          <div className="font-bold text-blue-600">
                            {Math.round(testPerformance.reduce((sum, t) => sum + t.percentage, 0) / testPerformance.length)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Best</div>
                          <div className="font-bold text-green-600">
                            {Math.max(...testPerformance.map(t => t.percentage))}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Calculate subject-wise performance
                  const uid = currentUser && (currentUser.id || currentUser.pk || currentUser.user_id);
                  const subjectStats = new Map();
                  
                  if (uid && completedTests.length > 0) {
                    completedTests.forEach(test => {
                      if (test.submissions && test.subject) {
                        const userSubmission = test.submissions.find(s => {
                          const sid = s.studentId || s.student_id || s.student || s.user_id || s.user;
                          return sid === uid || sid === String(uid) || String(sid) === String(uid);
                        });
                        
                        if (userSubmission && userSubmission.percentage != null) {
                          if (!subjectStats.has(test.subject)) {
                            subjectStats.set(test.subject, { total: 0, count: 0, subject: test.subject });
                          }
                          const stats = subjectStats.get(test.subject);
                          stats.total += safeNumber(userSubmission.percentage);
                          stats.count += 1;
                        }
                      }
                    });
                  }

                  const subjectData = Array.from(subjectStats.values()).map((stats, index) => ({
                    subject: stats.subject,
                    score: Math.round(stats.total / stats.count),
                    tests: stats.count,
                    color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'][index % 5]
                  }));

                  if (subjectData.length === 0) {
                    return (
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                        <div className="text-center">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No subject data available yet</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {subjectData.map((subject, index) => (
                        <motion.div
                          key={subject.subject}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{subject.subject}</span>
                            <span className="text-sm text-muted-foreground">{subject.tests} test{subject.tests !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={subject.score} className="flex-1" />
                            <span className="font-bold text-sm w-12">{subject.score}%</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    );
  };

  const TeacherView = () => (
    <AnimatePresence mode="wait">
      {viewMode === 'list' && (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Tests & Auto-Grading</h3>
            <Button onClick={() => setViewMode('create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          </div>

          <Tabs defaultValue="tests">
            <TabsList>
              <TabsTrigger value="tests">My Tests</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>

            <TabsContent value="tests" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allTests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold line-clamp-2">{test.title}</h3>
                            <Badge className={test.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {test.isActive ? 'Active' : 'Closed'}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-3 w-3" />
                              <span>{test.subject}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>{test.scheduledDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              <span>{test.submitted}/{test.totalStudents} submitted</span>
                            </div>
                          </div>

                          {(test.submitted || 0) > 0 && (
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex justify-between">
                                <span className="text-sm">Average Score</span>
                                <span className="font-medium">{test.averageScore}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Top Score</span>
                                <span className="font-medium">{test.topScore}%</span>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedTestId(test.id);
                                setViewMode('view');
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedTestId(test.id);
                                setViewMode('analytics');
                              }}
                            >
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Analytics
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleExportTest(test.id)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            {/* Teacher-only: delete test */}
                            {userRole === 'teacher' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteTest(test.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Overall Test Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold">{allTests.length}</div>
                      <div className="text-sm text-muted-foreground">Total Tests</div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold">
                        {allTests.reduce((sum, t) => sum + (t.submitted || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Submissions</div>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold">100%</div>
                      <div className="text-sm text-muted-foreground">Auto-Graded</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-4">
              <EnhancedLeaderboard />
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {viewMode === 'view' && <TestViewInterface />}
      {viewMode === 'create' && <TestCreationInterface />}
      {viewMode === 'analytics' && <TestAnalyticsInterface />}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6">
      {viewMode !== 'take-test' && viewMode !== 'test-result' && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Tests & Grades</h2>
            <p className="text-muted-foreground">
              {userRole === 'student' 
                ? 'Take tests and get instant results with automatic grading'
                : 'Create tests with correct answers - students get automatic grades upon submission'
              }
            </p>
          </div>
        </div>
      )}

      {userRole === 'student' && viewMode === 'list' && <StudentView />}
      {userRole === 'student' && viewMode === 'take-test' && <TakeTestInterface />}
      {userRole === 'student' && viewMode === 'test-result' && <TestResultInterface />}
      {userRole === 'teacher' && <TeacherView />}
    </div>
  );
}
