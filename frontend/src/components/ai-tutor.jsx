import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {  
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Mic,
  MicOff,
  Paperclip,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  Trophy,
  Clock,
  Sparkles,
  FileText,
  Save,
  CheckCircle,
  Target,
  ArrowLeft,
  Settings,
  Moon,
  Sun,
  Loader2,
  Image as ImageIcon,
  Camera,
  Upload,
  Copy,
  Share2,
  Zap,
  GraduationCap,
  Brain,
  ListChecks,
  Map,
  FileEdit,
  Eye,
  Plus,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// Type declarations removed for JS build. Replace with API-backed types if moving to TypeScript.
export function AITutor() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // API keys are managed on the backend. Frontend will not show or store API keys.

  // Chat state - start empty; messages should come from user interactions or API
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  // Photo upload state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Quiz Generator state
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');
  const [quizClass, setQuizClass] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Learning Path state
  const [showLearningPath, setShowLearningPath] = useState(false);
  const [learningGoal, setLearningGoal] = useState('');
  const [learningPath, setLearningPath] = useState([]);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);

  // Notes state
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [showSavedNotes, setShowSavedNotes] = useState(false);

  // Summary Generator state
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false);
  const [summaryTopic, setSummaryTopic] = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Stats
  const stats = {
    questionsAsked: messages.filter(m => m.type === 'user').length,
    quizzesCompleted: 0,
    notesCreated: savedNotes.length,
    learningPaths: learningPath.length > 0 ? 1 : 0
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // The backend is expected to provide AI services; assume configured in production
  const isApiConfigured = () => true;

  // Call OpenRouter API
  const callOpenRouterAPI = async (prompt, imageUrl) => {
    // Proxy the request to the backend. Backend should call the configured AI provider.
    try {
      // backend expects `message` in the payload and returns { content }
      const payload = { message: prompt };
      if (imageUrl) payload.image = imageUrl;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // bubble up 401/403 for auth issues
        const text = await res.text();
        throw new Error(`AI service request failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      // Defensive: some backends return the content directly or under other keys
      if (!data) return null;
      if (typeof data === 'string') return data;
      return data?.content || data?.text || data?.message || null;
    } catch (error) {
      console.error('AI proxy error:', error);
      toast.error('Failed to get AI response.');
      return null;
    }
  };

  // Call Hugging Face API for image analysis
  const callHuggingFaceVision = async (imageData) => {
    // Use backend proxy for image analysis
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!res.ok) {
        // Try to extract useful error info from backend
        let errDetail = null;
        try {
          const json = await res.json();
          errDetail = json?.detail || json?.error || JSON.stringify(json);
        } catch (e) {
          try {
            errDetail = await res.text();
          } catch (e2) {
            errDetail = `${res.status} ${res.statusText}`;
          }
        }
        throw new Error(errDetail || `Image analysis failed: ${res.status}`);
      }

      const data = await res.json();
      return data?.description || 'Unable to analyze image';
    } catch (error) {
      console.error('Image analysis proxy error:', error);
      // Surface backend-provided message when available
      const msg = (error && error.message) ? error.message : 'Failed to analyze image.';
      toast.error(msg);
      return null;
    }
  };

  // Transcribe audio using AssemblyAI
  const transcribeAudio = async (audioBlob) => {
    // Proxy audio to backend for transcription
    try {
      const form = new FormData();
      form.append('file', audioBlob, 'recording.wav');
      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Transcription failed');
      const data = await res.json();
      return data?.text || '';
    } catch (error) {
      console.error('Transcription proxy error:', error);
      toast.error('Failed to transcribe audio.');
      return '';
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (isSending) return;

    // If an image is attached, send image+text via analyzeImage (matches ChatGPT flow)
    if (uploadedImage) {
      await analyzeImage(uploadedImage);
      return;
    }

    if (!inputText.trim()) return;

    // Backend handles API configuration; proceed to send the message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);
    setIsTyping(true);

    // Get AI response
    const aiResponse = await callOpenRouterAPI(
      `Please explain this in simple English suitable for students: ${inputText}`
    );

    setIsTyping(false);
    setIsSending(false);

    if (aiResponse) {
      const tutorMessage = {
        id: messages.length + 2,
        type: 'tutor',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, tutorMessage]);
    }
  };

  // Handle photo upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageData = reader.result;
        // Just store the uploaded image and let user type a question and press Send.
        setUploadedImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageData) => {
    // Backend handles API configuration; proceed with image analysis

    setIsAnalyzingImage(true);

    // Add user message with image. If the user typed a question in the input box, use it.
    const userContent = (inputText || '').toString().trim();
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: userContent || '',
      imageUrl: imageData,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);
    // If we used the input text as the question, clear the input box so user knows it's consumed
    if (userContent) setInputText('');
    setIsTyping(true);

    // First call the image-analysis endpoint (better for vision models / HF).
    // If that returns a description, pass the description to the chat model to get a full step-by-step answer.
    let aiResponse = null;
    try {
      const visionDescription = await callHuggingFaceVision(imageData);
      if (visionDescription) {
        // If the user provided a custom question, include it in the prompt so the model focuses the answer.
        const promptParts = [];
        if (userContent) promptParts.push(`User question:\n${userContent}`);
        promptParts.push(`Image description:\n${visionDescription}`);
        promptParts.push(`Please analyze this image and provide a detailed solution in simple English. If it contains a math problem, solve it step by step. If it's a diagram, explain it clearly. If it's text, summarize and explain the key concepts.`);
        const prompt = promptParts.join('\n\n');
        aiResponse = await callOpenRouterAPI(prompt);
      } else {
        // Fallback: send the image data directly to the chat proxy. Include user question if provided.
        const fallbackPrompt = userContent
          ? `${userContent}\n\nPlease analyze the attached image and answer accordingly.`
          : 'Please analyze this image and provide a detailed solution in simple English.';
        aiResponse = await callOpenRouterAPI(fallbackPrompt, imageData);
      }
    } catch (err) {
      console.error('analyzeImage error:', err);
      aiResponse = null;
    }

    setIsAnalyzingImage(false);
    setIsTyping(false);
    setUploadedImage(null);

    if (aiResponse) {
      const tutorMessage = {
        id: messages.length + 2,
        type: 'tutor',
        content: aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, tutorMessage]);
    } else {
      const tutorMessage = {
        id: messages.length + 2,
        type: 'tutor',
        content: "Sorry, I couldn't analyze that image right now. Try again or use a clearer photo.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, tutorMessage]);
    }
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      toast.info('Recording started (max 60 seconds)');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleTranscription = async (audioBlob) => {
    setIsTranscribing(true);
    
    const transcription = await transcribeAudio(audioBlob);
    
    setIsTranscribing(false);

    if (transcription) {
      setInputText(transcription);
      toast.success('Voice transcribed! Click send to ask your question.');
    }
  };

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim() || !quizClass) {
      toast.error('Please enter both topic and class');
      return;
    }

    // Backend handles API configuration; proceed to generate quiz

    setIsGeneratingQuiz(true);

    const prompt = `Generate multiple choice questions for Class ${quizClass} students on the topic "${quizTopic}". 
Format each question as:
QUESTION: [question text]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
CORRECT: [A/B/C/D]
EXPLANATION: [brief explanation in simple English]

Make the questions appropriate for Class ${quizClass} level and explain answers in simple English.`;

    const response = await callOpenRouterAPI(prompt);

    if (response) {
      // Parse the response to extract questions
      console.debug('Quiz API response:', response);
      const questions = parseQuizResponse(response, 10);
      setQuizQuestions(questions);
      toast.success(`Generated ${questions.length} questions!`);
    }

    setIsGeneratingQuiz(false);
  };

  const parseQuizResponse = (response, expectedCount = 10) => {
    if (!response) return [];

    // If the model returned a JSON array, try to parse it
    try {
      if (typeof response === 'string') {
        const trimmed = response.trim();
        if ((trimmed.startsWith('[') || trimmed.startsWith('{')) ) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped = parsed.map((q, idx) => {
              const options = q.options || q.choices || q.answers || [];
              let correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : -1;
              if (correctIdx === -1) {
                const raw = (q.correct || q.answer || q.correctAnswer || '').toString().trim();
                const letter = raw.match(/[A-D]/i)?.[0];
                if (letter) correctIdx = ['A','B','C','D'].indexOf(letter.toUpperCase());
                else if (/^\d+$/.test(raw)) {
                  const n = parseInt(raw, 10);
                  if (n > 0) correctIdx = n - 1;
                } else if (raw) {
                  const rawLower = raw.toLowerCase();
                  for (let i = 0; i < options.length; i++) {
                    const optLower = (options[i] || '').toLowerCase();
                    if (!optLower) continue;
                    if (optLower === rawLower || optLower.includes(rawLower) || rawLower.includes(optLower)) {
                      correctIdx = i; break;
                    }
                  }
                }
              }

              return {
                id: q.id || idx + 1,
                question: q.question || q.prompt || q.q || q.title || '',
                options,
                correctAnswer: (typeof correctIdx === 'number' && correctIdx >= 0 && correctIdx < options.length) ? correctIdx : -1,
                explanation: q.explanation || q.explain || ''
              };
            });

            return mapped.filter(q => q.question && q.options && q.options.length >= 2);
          }
        }
      } else if (Array.isArray(response)) {
        const mapped = response.map((q, idx) => {
          const options = q.options || q.choices || q.answers || [];
          let correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : -1;
          if (correctIdx === -1) {
            const raw = (q.correct || q.answer || q.correctAnswer || '').toString().trim();
            const letter = raw.match(/[A-D]/i)?.[0];
            if (letter) correctIdx = ['A','B','C','D'].indexOf(letter.toUpperCase());
            else if (/^\d+$/.test(raw)) {
              const n = parseInt(raw, 10);
              if (n > 0) correctIdx = n - 1;
            } else if (raw) {
              const rawLower = raw.toLowerCase();
              for (let i = 0; i < options.length; i++) {
                const optLower = (options[i] || '').toLowerCase();
                if (!optLower) continue;
                if (optLower === rawLower || optLower.includes(rawLower) || rawLower.includes(optLower)) {
                  correctIdx = i; break;
                }
              }
            }
          }

          return {
            id: q.id || idx + 1,
            question: q.question || q.prompt || q.title || '',
            options,
            correctAnswer: (typeof correctIdx === 'number' && correctIdx >= 0 && correctIdx < options.length) ? correctIdx : -1,
            explanation: q.explanation || q.explain || ''
          };
        });

        return mapped.filter(q => q.question && q.options && q.options.length >= 2);
      }
    } catch (err) {
      // fall through to text parsing
      console.debug('Quiz JSON parse failed', err);
    }

    const questions = [];

    // Split into probable question blocks. Support variations like 'QUESTION:', 'Question', 'Q:', numbered lists '1.' and '1)'
    let blocks = response.split(/(?:\n|^)\s*(?:QUESTION\s*:|Question\s*:|Q\s*:|\d+\.|\d+\))/i).map(b => b.trim()).filter(Boolean);

    // If only one block found, try alternative splits (some models use double newlines or numbered with parenthesis)
    if (blocks.length === 1) {
      const alt = response.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
      if (alt.length > 1) blocks = alt;
      else {
        const alt2 = response.split(/(?:\n|^)\s*\d+\)\s*/).map(b => b.trim()).filter(Boolean);
        if (alt2.length > 1) blocks = alt2;
      }
    }

    blocks.forEach((block, index) => {
      // Extract question line (first non-empty line)
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const questionText = lines[0];
      const options = [];
      let correctAnswer = -1;
      let explanation = '';

      // Look for option lines like A) ..., A. ..., A: ..., or 'A) option'
      lines.forEach(line => {
        const optMatch = line.match(/^\s*([A-D])\s*[\)\.:-]\s*(.*)$/i);
        if (optMatch) {
          options.push(optMatch[2].trim());
          return;
        }

        // Sometimes options are prefixed with letters and a closing paren without space
        const optMatch2 = line.match(/^\s*([A-D])\s*(.*)$/i);
        if (optMatch2 && optMatch2[2].length > 0 && options.length < 4) {
          options.push(optMatch2[2].trim());
          return;
        }

        const correctMatch = line.match(/CORRECT\s*[:\-]\s*(.+)/i) || line.match(/ANSWER\s*[:\-]\s*(.+)/i) || line.match(/Correct Answer\s*[:\-]\s*(.+)/i);
        if (correctMatch) {
          const raw = correctMatch[1].toString().trim();
          const letter = raw.match(/[A-D]/i)?.[0];
          if (letter) {
            correctAnswer = ['A','B','C','D'].indexOf(letter.toUpperCase());
          } else if (/^\d+$/.test(raw)) {
            const n = parseInt(raw, 10);
            if (n > 0) correctAnswer = n - 1;
          } else {
            // raw might be the full answer text; try to match to options
            const rawLower = raw.toLowerCase();
            for (let i = 0; i < options.length; i++) {
              const optLower = (options[i] || '').toLowerCase();
              if (!optLower) continue;
              if (optLower === rawLower || optLower.includes(rawLower) || rawLower.includes(optLower)) {
                correctAnswer = i;
                break;
              }
            }
          }
        }

        const expMatch = line.match(/EXPLANATION\s*[:\-]\s*(.*)/i) || line.match(/Explanation\s*[:\-]\s*(.*)/i);
        if (expMatch) {
          explanation = expMatch[1].trim();
        }
      });

      // If options not found within the block, try to extract inline choices like 'A) option B) option...'
      if (options.length === 0) {
        const inlineOpts = block.match(/(?:\n|^|\s)([A-D])\s*[\)\.:-]\s*([^A-D]+)(?=(?:\s*[A-D]\s*[\)\.:-]|$))/gi);
        if (inlineOpts) {
          inlineOpts.forEach(o => {
            const m = o.match(/([A-D])\s*[\)\.:-]\s*(.*)/i);
            if (m) options.push(m[2].trim());
          });
        }
      }

      if (questionText && options.length >= 2) {
        // Normalize correctAnswer: ensure within range, attempt best-effort inference
        let normalizedCorrect = -1;
        if (typeof correctAnswer === 'number' && correctAnswer >= 0 && correctAnswer < options.length) {
          normalizedCorrect = correctAnswer;
        } else {
          // try to find by scanning option text for keywords like '(correct)' or '*' markers
          for (let i = 0; i < options.length; i++) {
            const o = options[i];
            if (/\(correct\)|\*correct\*|\*\s?correct/i.test(o)) {
              normalizedCorrect = i;
              break;
            }
          }
          // fallback: if explanation mentions one option uniquely, try to match
          if (normalizedCorrect === -1 && explanation) {
            const explLow = explanation.toLowerCase();
            for (let i = 0; i < options.length; i++) {
              const optLow = options[i].toLowerCase();
              if (explLow.includes(optLow) || optLow.includes(explLow)) {
                normalizedCorrect = i;
                break;
              }
            }
          }
        }

        // If still unknown, try default mapping using letters present in options like 'A) ' etc.
        if (normalizedCorrect === -1 && options.length > 0 && questionText) {
          normalizedCorrect = (correctAnswer >= 0 && correctAnswer < options.length) ? correctAnswer : -1;
        }

        // As a last resort, if still unknown, keep -1 so UI can treat it as unknown rather than assume 0
        questions.push({
          id: index + 1,
          question: questionText,
          options: options.slice(0, 4),
          correctAnswer: normalizedCorrect,
          explanation
        });
      }
    });

    // If we parsed fewer than the expected count, try a stricter boundary-based split.
    if (questions.length < expectedCount) {
      try {
        const text = typeof response === 'string' ? response : JSON.stringify(response);

        // Find all probable question-start positions using several markers.
        const boundaryRe = /(^|\n)\s*(?:QUESTION\s*:|Question\s*:|Q\s*:|Question\s+\d+\s*[:.)]|\b\d+\s*[\.)]\s+)/gi;
        const starts = [];
        let m;
        while ((m = boundaryRe.exec(text)) !== null) {
          starts.push(m.index);
        }

        // If no explicit boundary markers found, try double-newline splits (common separator)
        let altBlocks = [];
        if (starts.length > 0) {
          for (let i = 0; i < starts.length; i++) {
            const start = starts[i];
            const end = i + 1 < starts.length ? starts[i + 1] : text.length;
            const block = text.slice(start, end).trim();
            if (block) altBlocks.push(block);
          }
        } else {
          altBlocks = text.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
        }

        // Parse each alternate block using the same per-block logic above
        altBlocks.forEach((block, index) => {
          if (questions.length >= expectedCount) return;
          const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length === 0) return;

          // Remove leading numbering or 'QUESTION:' label from question line
          let firstLine = lines[0].replace(/^(?:QUESTION\s*:|Question\s*:|Q\s*:|\d+\s*[\.)]\s*)/i, '').trim();
          const opts = [];
          let correct = -1;
          let expl = '';

          lines.forEach(line => {
            const optMatch = line.match(/^\s*([A-D])\s*[\)\.:-]\s*(.*)$/i);
            if (optMatch) {
              opts.push(optMatch[2].trim());
              return;
            }

            const correctMatch = line.match(/CORRECT\s*[:\-]\s*([A-D]|[0-3])/i) || line.match(/ANSWER\s*[:\-]\s*([A-D]|[0-3])/i);
            if (correctMatch) {
              const ans = correctMatch[1].toString().trim().toUpperCase().replace('.', '');
              correct = ['A','B','C','D'].indexOf(ans);
            }

            const expMatch = line.match(/EXPLANATION\s*[:\-]\s*(.*)/i);
            if (expMatch) expl = expMatch[1].trim();
          });

          // Inline option extractor if we couldn't find separate option lines
          if (opts.length === 0) {
            const inlineOpts = block.match(/(?:\n|^|\s)([A-D])\s*[\)\.:-]\s*([^A-D]+?)(?=(?:\s*[A-D]\s*[\)\.:-]|$))/gi);
            if (inlineOpts) {
              inlineOpts.forEach(o => {
                const m = o.match(/([A-D])\s*[\)\.:-]\s*(.*)/i);
                if (m) opts.push(m[2].trim());
              });
            }
          }

          if (firstLine && opts.length >= 2) {
            // Normalize correct answer similar to primary parser
            let normalizedCorrect = -1;
            if (typeof correct === 'number' && correct >= 0 && correct < opts.length) normalizedCorrect = correct;
            else {
              for (let i = 0; i < opts.length; i++) {
                const o = opts[i];
                if (/\(correct\)|\*correct\*|\*\s?correct/i.test(o)) {
                  normalizedCorrect = i;
                  break;
                }
              }
              if (normalizedCorrect === -1 && expl) {
                const explLow = expl.toLowerCase();
                for (let i = 0; i < opts.length; i++) {
                  const optLow = opts[i].toLowerCase();
                  if (explLow.includes(optLow) || optLow.includes(explLow)) {
                    normalizedCorrect = i;
                    break;
                  }
                }
              }
            }

            questions.push({
              id: questions.length + 1,
              question: firstLine,
              options: opts.slice(0, 4),
              correctAnswer: normalizedCorrect,
              explanation: expl
            });
          }
        });
      } catch (err) {
        console.debug('Boundary-based fallback parse failed', err);
      }
    }

    return questions;
  };

  // Handle quiz answer selection
  const handleQuizAnswer = (questionId, answerIndex) => {
    if (quizSubmitted) return;
    setQuizQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, userAnswer: answerIndex } : q
    ));
  };

  // Submit quiz
  const handleSubmitQuiz = () => {
    const unanswered = quizQuestions.filter(q => q.userAnswer === undefined);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setQuizSubmitted(true);
    // Only count questions where we know the correct answer
    const known = quizQuestions.filter(q => typeof q.correctAnswer === 'number' && q.correctAnswer >= 0);
    const knownCount = known.length;
    const correct = known.filter(q => q.userAnswer === q.correctAnswer).length;
    const total = quizQuestions.length;
    const score = knownCount > 0 ? Math.round((correct / knownCount) * 100) : 0;
    if (knownCount < total) {
      toast.info(`Some answers couldn't be automatically validated. Score based on ${knownCount}/${total} known answers.`);
    }
    toast.success(`Quiz completed! Score: ${correct}/${knownCount} (${score}%)`);
  };

  // Generate Learning Path
  const handleGenerateLearningPath = async () => {
    if (!learningGoal.trim()) {
      toast.error('Please enter your learning goal');
      return;
    }

    // Backend handles API configuration; proceed to generate learning path

    setIsGeneratingPath(true);

    const prompt = `Create a detailed learning plan for a student who wants to "${learningGoal}". Prefer 8-12 weekly items.
Return the plan as a JSON array (no surrounding text) where each item is an object with these fields:
  week: (number),
  topic: (string),
  description: (string),
  duration: (string, e.g. "3-5 hours" or "4 hours"), // OPTIONAL - include only if you can estimate
  resources: (array of short strings) // OPTIONAL

Example output format:
[
  {"week":1,"topic":"Intro to Python","description":"...","duration":"4 hours","resources":["Resource A","Resource B"]},
  ...
]

Keep language simple and practical. Do not include filler or placeholder weeks. If you cannot estimate duration, omit the duration field for that week.`;

    const response = await callOpenRouterAPI(prompt);

    if (response) {
      console.debug('Learning Path API response:', response);
      const path = parseLearningPath(response);
      setLearningPath(path);
      toast.success('Learning path created successfully!');
    }

    setIsGeneratingPath(false);
  };

  const parseLearningPath = (response) => {
    // Try JSON parse first - the prompt asks model to return JSON array
    try {
      if (typeof response === 'string') {
        const trimmed = response.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((it, idx) => ({
              id: it.id || idx + 1,
              week: typeof it.week === 'number' ? it.week : idx + 1,
              topic: it.topic || it.title || `Week ${idx + 1}`,
              description: it.description || it.desc || '',
              duration: it.duration || '',
              resources: Array.isArray(it.resources) ? it.resources : (it.resources ? [String(it.resources)] : []),
              completed: false
            })).slice(0, 12);
          }
        }
      } else if (Array.isArray(response)) {
        return response.map((it, idx) => ({
          id: it.id || idx + 1,
          week: typeof it.week === 'number' ? it.week : idx + 1,
          topic: it.topic || it.title || `Week ${idx + 1}`,
          description: it.description || it.desc || '',
          duration: it.duration || '',
          resources: Array.isArray(it.resources) ? it.resources : (it.resources ? [String(it.resources)] : []),
          completed: false
        })).slice(0, 12);
      }
    } catch (err) {
      console.debug('Learning Path JSON parse failed', err);
    }

    // Fallback to legacy text parsing
    const items = [];
    const weekBlocks = (typeof response === 'string' ? response : JSON.stringify(response)).split(/WEEK\s+\d+:/).filter(w => w.trim());

    weekBlocks.forEach((block, index) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const topic = lines[0].trim();
      let description = '';
      let duration = '';
      const resources = [];

      lines.forEach(line => {
        if (/DESCRIPTION\s*[:\-]/i.test(line)) description = line.replace(/DESCRIPTION\s*[:\-]/i, '').trim();
        else if (/DURATION\s*[:\-]/i.test(line)) duration = line.replace(/DURATION\s*[:\-]/i, '').trim();
        else if (/RESOURCES\s*[:\-]/i.test(line)) {
          const rs = line.replace(/RESOURCES\s*[:\-]/i, '').trim();
          resources.push(...rs.split(/,|;|\||\//).map(r => r.trim()).filter(Boolean));
        }
      });

      items.push({
        id: index + 1,
        week: index + 1,
        topic: topic || `Week ${index + 1} Learning`,
        description: description || '',
        duration,
        resources,
        completed: false
      });
    });

    return items.slice(0, 12);
  };

  // Generate Summary
  const handleGenerateSummary = async () => {
    if (!summaryTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    // Backend handles API configuration; proceed to generate summary

    setIsGeneratingSummary(true);

    const prompt = `Create a comprehensive but concise summary about "${summaryTopic}" in simple English suitable for students. Include:
1. Key concepts and definitions
2. Important points to remember
3. Common examples
4. Practice tips

Keep it clear and easy to understand.`;

    const response = await callOpenRouterAPI(prompt);

    if (response) {
      setGeneratedSummary(response);
      toast.success('Summary generated successfully!');
    }

    setIsGeneratingSummary(false);
  };

  // Save note
  const handleSaveNote = () => {
    if (!noteTitle.trim() || !currentNote.trim()) {
      toast.error('Please enter both title and content');
      return;
    }

    const newNote = {
      id: Date.now(),
      title: noteTitle,
      content: currentNote,
      timestamp: new Date().toLocaleDateString(),
      tags: [quizTopic || 'general']
    };

    setSavedNotes(prev => [newNote, ...prev]);
    setNoteTitle('');
    setCurrentNote('');
    setShowNotesDialog(false);
    toast.success('Note saved successfully!');
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Download helper (simple plaintext fallback)
  const downloadAsPDF = (content, filename) => {
    // In a real implementation, use a library like jsPDF
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    toast.success(`${filename} downloaded!`);
  };

  const themeClasses = isDarkMode 
    ? 'bg-gray-900 text-gray-100' 
    : 'bg-[#FAFAFB] text-[#0F172A]';

  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';

  // Compute average hours/week from AI-provided durations (if any).
  const learningPathAvgHours = (() => {
    try {
      const nums = learningPath.map(item => {
        if (!item || !item.duration) return null;
        const m = item.duration.toString().match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : null;
      }).filter(n => n !== null && !Number.isNaN(n));
      if (nums.length === 0) return null;
      const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
      return avg;
    } catch (e) {
      return null;
    }
  })();

  return (
    <div className={`min-h-screen ${themeClasses} transition-colors duration-300`}>
      {/* Page header removed — using global app header instead */}

      {/* Main Content - Full Width Split Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Stats & Tools */}
        <div className={`w-80 flex-shrink-0 border-r ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-[#F8F9FB]'} overflow-y-auto`}>
          <div className="p-6 space-y-6">
            {/* API configuration is handled on the backend; no client-side prompt shown. */}

            {/* Stats Card */}
            <Card className={`${cardClasses} shadow-md rounded-xl`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-5 w-5 text-[#FFB703]" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.questionsAsked}</div>
                    <div className="text-xs text-muted-foreground mt-1">Questions</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.quizzesCompleted}</div>
                    <div className="text-xs text-muted-foreground mt-1">Quizzes</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.notesCreated}</div>
                    <div className="text-xs text-muted-foreground mt-1">Notes</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{stats.learningPaths}</div>
                    <div className="text-xs text-muted-foreground mt-1">Paths</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Tools */}
            <Card className={`${cardClasses} shadow-md rounded-xl`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-[#FFB703]" />
                  AI Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => setShowQuizGenerator(true)}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ListChecks className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm">Quiz Generator</div>
                    <div className="text-xs text-muted-foreground">Create practice quizzes</div>
                  </div>
                </Button>

                <Button
                  onClick={() => setShowLearningPath(true)}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Map className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm">Learning Path</div>
                    <div className="text-xs text-muted-foreground">Plan your studies</div>
                  </div>
                </Button>

                <Button
                  onClick={() => setShowSummaryGenerator(true)}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileEdit className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm">Summary Generator</div>
                    <div className="text-xs text-muted-foreground">Create topic summaries</div>
                  </div>
                </Button>

                <Button
                  onClick={() => setShowNotesDialog(true)}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm">My Notes</div>
                    <div className="text-xs text-muted-foreground">Save & manage notes</div>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Saved Notes Preview */}
            {savedNotes.length > 0 && (
              <Card className={`${cardClasses} shadow-md rounded-xl`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-5 w-5 text-[#FFB703]" />
                      Recent Notes
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowSavedNotes(true)}
                      className="h-7 text-xs"
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {savedNotes.slice(0, 3).map(note => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg border ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-colors`}
                      onClick={() => {
                        setNoteTitle(note.title);
                        setCurrentNote(note.content);
                        setShowNotesDialog(true);
                      }}
                    >
                      <h4 className="text-sm font-medium mb-1">{note.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{note.tags[0]}</Badge>
                        <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Side - ChatGPT-like Chat Interface */}
        <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-[#F8F9FB]'}`}>
          {/* Chat Header */}
          <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFB703] to-[#F4A261] flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base">AI Tutor Assistant</h3>
                <p className="text-xs text-muted-foreground">Always here to help you learn</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Online
            </Badge>
          </div>

          {/* Chat Messages Area - Scrollable */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="max-w-4xl mx-auto px-6 py-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="mb-6"
                  >
                    {message.type === 'tutor' ? (
                      // AI Message
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB703] to-[#F4A261] flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                            <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                          </div>
                          <div className="flex items-center gap-3 px-2">
                            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(message.content)}
                              className="h-7 text-xs gap-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <Copy className="h-3 w-3" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // User Message
                      <div className="flex gap-4 items-start justify-end">
                        <div className="flex-1 flex flex-col items-end space-y-2">
                          {message.imageUrl && (
                            <div className="rounded-xl overflow-hidden border max-w-sm shadow-sm">
                              <img src={message.imageUrl} alt="Uploaded" className="w-full h-auto" />
                            </div>
                          )}
                          <div className="bg-gradient-to-br from-[#FFB703] to-[#F4A261] rounded-2xl p-4 max-w-2xl shadow-sm">
                            <p className="text-sm leading-relaxed text-white whitespace-pre-line">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground px-2">{message.timestamp}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 items-start mb-6"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB703] to-[#F4A261] flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at Bottom */}
          <div className={`border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="max-w-4xl mx-auto px-6 py-4">
              {/* Status Messages */}
              <AnimatePresence>
                {isTranscribing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">Transcribing your voice...</span>
                  </motion.div>
                )}
                
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-700 dark:text-red-300 font-medium">Recording...</span>
                      </div>
                      <span className="text-sm text-red-700 dark:text-red-300">{recordingTime}s / 60s</span>
                    </div>
                    <div className="flex gap-1 items-end h-6">
                      {[...Array(40)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: ['30%', '100%', '30%'] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.02 }}
                          className="flex-1 bg-red-500 rounded-sm"
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {isAnalyzingImage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-700 dark:text-purple-300">Analyzing image...</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Input Box */}
              <div className={`flex items-end gap-3 p-3 rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                {/* Preview of attached image (before sending) */}
                {uploadedImage && (
                  <div className="flex items-center gap-2 mr-2">
                    <div className="w-20 h-14 rounded-md overflow-hidden border">
                      <img src={uploadedImage} alt="preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedImage(null)}
                        className="h-8 w-8 p-0"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">Attached</span>
                    </div>
                  </div>
                )}
                {/* Camera Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl h-11 w-11 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={isAnalyzingImage}
                  title="Upload image"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Voice Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`rounded-xl h-11 w-11 flex-shrink-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  disabled={isTranscribing}
                  title="Voice input"
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                
                {/* Text Input */}
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your question, or use camera/mic... (Press Enter to send)"
                  className={`flex-1 min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                  disabled={isRecording || isTranscribing || isAnalyzingImage}
                />
                
                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={( !inputText.trim() && !uploadedImage ) || isSending || isRecording}
                  className="rounded-xl h-11 w-11 flex-shrink-0 bg-gradient-to-br from-[#FFB703] to-[#F4A261] hover:from-[#F4A261] hover:to-[#FFB703] text-white shadow-md disabled:opacity-50"
                  size="icon"
                  title="Send message"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
              
              {/* Helper Text */}
              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Camera className="h-3 w-3" />
                  <span>Photo</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  <span>Voice</span>
                </div>
                <span>•</span>
                <span>Press Enter to send, Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API configuration is handled by the backend. No client-side key input is shown. */}

      {/* Quiz Generator Dialog */}
      <Dialog open={showQuizGenerator} onOpenChange={setShowQuizGenerator}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#F59E0B]" />
            Quiz Generator
          </DialogTitle>
          <DialogDescription>
            Generate custom quizzes on any topic for your class level
          </DialogDescription>

          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate Quiz</TabsTrigger>
              <TabsTrigger value="questions" disabled={quizQuestions.length === 0}>
                Questions ({quizQuestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    placeholder="e.g., Quadratic Equations, Photosynthesis, World War II"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Class/Grade</Label>
                  <Select value={quizClass} onValueChange={setQuizClass}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 11, 12].map(cls => (
                        <SelectItem key={cls} value={cls.toString()}>
                          Class {cls}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingQuiz}
                  className="w-full bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                >
                  {isGeneratingQuiz ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              {quizQuestions.map((question, qIndex) => (
                <Card key={question.id} className="border-2">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#F59E0B] text-white flex items-center justify-center flex-shrink-0 text-sm">
                        {qIndex + 1}
                      </div>
                      <div className="flex-1">
                        {question.imageUrl && (
                          <div className="mb-4">
                            <img
                              src={question.imageUrl}
                              alt="Question"
                              className="w-full max-h-64 object-contain rounded-lg border"
                            />
                          </div>
                        )}
                        <h4 className="font-medium mb-4">{question.question}</h4>
                        
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => {
                            const isSelected = question.userAnswer === oIndex;
                            const isCorrect = question.correctAnswer === oIndex;
                            const showFeedback = quizSubmitted;
                            
                            return (
                              <button
                                key={oIndex}
                                onClick={() => handleQuizAnswer(question.id, oIndex)}
                                disabled={quizSubmitted}
                                className={`w-full p-3 rounded-xl border-2 text-left transition-all text-sm ${
                                  showFeedback && isCorrect
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : showFeedback && isSelected && !isCorrect
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : isSelected
                                    ? 'border-[#F59E0B] bg-orange-50 dark:bg-orange-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{option}</span>
                                  {showFeedback && isCorrect && (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                  {showFeedback && isSelected && !isCorrect && (
                                    <X className="h-5 w-5 text-red-600" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && question.explanation && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm font-medium mb-1">Explanation:</p>
                            <p className="text-sm text-muted-foreground">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {quizQuestions.length > 0 && (
                <div className="flex gap-3">
                  {!quizSubmitted ? (
                    <>
                      <Button
                        onClick={() => {
                          setShowQuizGenerator(false);
                          setQuizQuestions([]);
                          setQuizTopic('');
                          setQuizClass('');
                        }}
                        variant="outline"
                        className="flex-1 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitQuiz}
                        className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                      >
                        Submit Quiz
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setQuizSubmitted(false);
                          setQuizQuestions(prev => prev.map(q => ({ ...q, userAnswer: undefined })));
                        }}
                        className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                      >
                        Retry Quiz
                      </Button>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Learning Path Dialog */}
      <Dialog open={showLearningPath} onOpenChange={setShowLearningPath}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-[#F59E0B]" />
            Personalized Learning Path
          </DialogTitle>
          <DialogDescription>
            Create a customized learning plan based on your goals
          </DialogDescription>

          <div className="space-y-6">
            {learningPath.length === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Your Learning Goal</Label>
                  <Textarea
                    id="goal"
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="e.g., I want to top in Class 10 Mathematics
or: Master Python programming for web development
or: Prepare for JEE Main Physics"
                    className="min-h-[100px] rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleGenerateLearningPath}
                  disabled={isGeneratingPath}
                  className="w-full bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                >
                  {isGeneratingPath ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Your Learning Path...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Learning Path
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-xl">
                  <h3 className="font-semibold mb-2">Your Goal: {learningGoal}</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{learningPath.length} Weeks</span>
                    </div>
                    {learningPathAvgHours ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{learningPathAvgHours} hours/week</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <ScrollArea className="max-h-[400px] pb-24">
                  <div className="space-y-3 pr-4">
                    {learningPath.map((item, index) => (
                      <Card key={item.id} className={item.completed ? 'border-green-500' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              item.completed 
                                ? 'bg-green-500 text-white' 
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                            }`}>
                              {item.completed ? <CheckCircle className="h-5 w-5" /> : <span className="font-semibold">{item.week}</span>}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">Week {item.week}: {item.topic}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                              {item.duration ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{item.duration}</span>
                                </div>
                              ) : null}
                              {item.resources && item.resources.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.resources.map((resource, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {resource}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className={`sticky bottom-0 ${isDarkMode ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200'} p-4 -mx-6`}>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => downloadAsPDF(
                        learningPath.map(item => 
                          `Week ${item.week}: ${item.topic}\n${item.description}\nDuration: ${item.duration}\nResources: ${item.resources.join(', ')}\n\n`
                        ).join(''),
                        `Learning-Path-${Date.now()}`
                      )}
                      variant="outline"
                      className="flex-1 rounded-xl"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Plan
                    </Button>
                    <Button
                      onClick={() => {
                        setLearningPath([]);
                        setLearningGoal('');
                      }}
                      className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                    >
                      Create New Plan
                    </Button>
                  </div>
                </div>
                </ScrollArea>

                
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Generator Dialog */}
      <Dialog open={showSummaryGenerator} onOpenChange={setShowSummaryGenerator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-[#F59E0B]" />
            Summary Generator
          </DialogTitle>
          <DialogDescription>
            Generate concise summaries on any topic
          </DialogDescription>

          <div className="space-y-4">
            {!generatedSummary ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="summary-topic">Topic</Label>
                  <Input
                    id="summary-topic"
                    value={summaryTopic}
                    onChange={(e) => setSummaryTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis, Newton's Laws, French Revolution"
                    className="rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="w-full bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Summary: {summaryTopic}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-line">{generatedSummary}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={() => copyToClipboard(generatedSummary)}
                    variant="outline"
                    className="flex-1 rounded-xl"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => downloadAsPDF(generatedSummary, `Summary-${summaryTopic}`)}
                    variant="outline"
                    className="flex-1 rounded-xl"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      setGeneratedSummary('');
                      setSummaryTopic('');
                    }}
                    className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
                  >
                    New Summary
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F59E0B]" />
            {noteTitle ? 'Edit Note' : 'Create Note'}
          </DialogTitle>
          <DialogDescription>
            Save important points and insights from your learning
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Write your notes here..."
                className="min-h-[200px] rounded-xl"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowNotesDialog(false);
                  setNoteTitle('');
                  setCurrentNote('');
                }}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNote}
                className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] rounded-xl"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Notes Dialog */}
      <Dialog open={showSavedNotes} onOpenChange={setShowSavedNotes}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#F59E0B]" />
            My Saved Notes
          </DialogTitle>
          <DialogDescription>
            All your saved notes and summaries
          </DialogDescription>

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-4">
              {savedNotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No notes saved yet</p>
                </div>
              ) : (
                savedNotes.map(note => (
                  <Card key={note.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{note.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSavedNotes(prev => prev.filter(n => n.id !== note.id));
                            toast.success('Note deleted');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{note.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {note.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
