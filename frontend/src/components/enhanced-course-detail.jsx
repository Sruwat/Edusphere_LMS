import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  FileText, 
  Video, 
  CheckCircle, 
  Clock, 
  MessageSquare,
  Star,
  Users,
  Eye,
  PlayCircle,
  BookOpen,
  HelpCircle,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings,
  Subtitles,
  MoreVertical,
  Send,
  ExternalLink,
  Award,
  Brain,
  Calendar
} from 'lucide-react';

// Props/types removed for JS build. Course details, materials and lectures should be fetched from API.
export function EnhancedCourseDetail({ courseId, userRole, onBack }) {
  const [currentVideo, setCurrentVideo] = useState(null);
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [videoErrorMessage, setVideoErrorMessage] = useState('');
  const [videoSrc, setVideoSrc] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  // data will be fetched from API
  const currentVideoData = currentVideo ? (lectures.find(l => l.id === currentVideo) || {}) : {};

  // helper to select a lecture and mark it current in the list
  const selectLecture = (lectureId) => {
    const lec = lectures.find(l => l.id === lectureId) || {};
    setCurrentVideo(lectureId);
    setLectures(prev => prev.map(l => ({ ...l, current: l.id === lectureId })));
    setCurrentProgress(0);
    setVideoError(false);
    // optimistic playback: only for Google Drive-hosted videos
    const raw = lec.video_url || lec.video_file;
    const playable = getPlayableSrc(raw);
    if (!playable) {
      // unsupported source (not Google Drive)
      setVideoSrc('');
      setVideoLoading(false);
      setVideoError(true);
      setVideoErrorMessage('Only Google Drive-hosted videos are supported.');
      return;
    }

    const srcToUse = playable;

    setVideoSrc(srcToUse);
    setVideoLoading(true);
    setVideoError(false);
    setVideoErrorMessage('');

    // Try to play immediately; if autoplay is blocked, retry muted, then fall back to absolute backend proxied URL.
    const el = videoRef.current;
    if (!el) {
      setIsPlaying(false);
      return;
    }

    const tryPlay = async (srcToUse, mutedAttempt = false) => {
      try {
        el.src = srcToUse;
        // ensure browser tries to preload small amount
        try { el.load?.(); } catch(e){}
        if (mutedAttempt) {
          try { el.muted = true; } catch (e) {}
        }
        await el.play();
        setIsPlaying(true);
        setVideoLoading(false);
        return true;
      } catch (e) {
        return false;
      }
    };

    (async () => {
      // Try direct playable URL. Autoplay may be blocked; try muted fallback.
      let ok = await tryPlay(srcToUse, false);
      if (ok) return;
      ok = await tryPlay(srcToUse, true);
      if (ok) return;

      // all attempts failed — show helpful message
      setIsPlaying(false);
      setVideoLoading(false);
      setVideoError(true);
      setVideoErrorMessage('Unable to start playback quickly. Check network or cross-origin restrictions.');
      console.warn('Playback attempts failed for', srcToUse);
    })();
  };

  // Turn common drive/google share links into a direct-download/streamable URL when possible
  const getPlayableSrc = (raw) => {
    // Only support Google Drive / docs links. The URL is expected to be
    // stored in the database already in a playable form. Return the raw
    // DB value when it points to Drive/docs; otherwise return empty.
    if (!raw) return '';
    try {
      const url = String(raw).trim();
      if (url.includes('drive.google.com') || url.includes('docs.google.com')) return url;
      return '';
    } catch (e) {
      return '';
    }
  };

  // Extract Google Drive file ID from common Drive URL patterns
  const extractDriveId = (raw) => {
    if (!raw) return null;
    try {
      const s = String(raw).trim();
      // /file/d/<id>/ pattern
      let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return m[1];
      // open?id=<id> or uc?id=<id> or id=<id>
      m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return m[1];
      // plain id (rare) — avoid accidental matches
      return null;
    } catch (e) {
      return null;
    }
  };

  // Helper: find a usable URL for a material record
  const getMaterialUrl = (material) => {
    if (!material) return null;
    // common fields that might contain a URL
    return material.url || material.file_url || material.download_url || material.path || null;
  };

  const handlePreview = (materialId) => {
    const material = studyMaterials.find(m => m.id === materialId);
    if (!material) return alert('Material not found');
    const url = getMaterialUrl(material);
    if (!url) return alert('No preview available for this material');
    // Open in a new tab for preview; the browser will open PDFs, images, or the hosted file.
    window.open(url, '_blank');
  };

  const handleDownload = async (materialId) => {
    const material = studyMaterials.find(m => m.id === materialId);
    if (!material) return alert('Material not found');
    const url = getMaterialUrl(material);
    if (!url) return alert('No downloadable URL available for this material');

    try {
      // Attempt a simple download by creating an anchor. This works for same-origin or CORS-enabled URLs.
      const a = document.createElement('a');
      a.href = url;
      // prefer a sensible filename if available
      const safeName = (material.title || `material-${material.id}`).replace(/[^a-z0-9._-]/gi, '_');
      a.download = safeName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Download failed, falling back to open in new tab', e);
      window.open(url, '_blank');
    }
  };

  const handleDownloadAll = async () => {
    if (!studyMaterials || studyMaterials.length === 0) return alert('No study materials to download');

    const urls = studyMaterials.map(m => ({
      id: m.id,
      title: m.title || `file-${m.id}`,
      url: getMaterialUrl(m)
    })).filter(x => x.url);

    if (urls.length === 0) return alert('No downloadable files available');

    // Attempt to load UMD builds of JSZip and FileSaver from CDN at runtime.
    // This avoids Vite import-analysis failures when the packages are not installed.
    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });

    try {
      let JSZipLib = window.JSZip;
      let saveAsFn = window.saveAs || window.saveAs;
      if (!JSZipLib) {
        await loadScript('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
        JSZipLib = window.JSZip;
      }
      if (!saveAsFn) {
        await loadScript('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js');
        saveAsFn = window.saveAs || (window && window.saveAs);
      }

      if (!JSZipLib || !saveAsFn) throw new Error('ZIP libraries not available');

      const zip = new JSZipLib();
      for (const item of urls) {
        try {
          const resp = await fetch(item.url, { cache: 'no-store' });
          if (!resp.ok) {
            console.warn('Failed to fetch', item.url, resp.status);
            continue;
          }
          const blob = await resp.blob();
          const safeName = (item.title || `file-${item.id}`).replace(/[^a-z0-9._-]/gi, '_');
          zip.file(safeName, blob);
        } catch (e) {
          console.warn('Error fetching material for zipping', item.url, e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAsFn(content, `${(course && course.title ? course.title.replace(/[^a-z0-9._-]/gi, '_') : 'materials')}.zip`);
    } catch (e) {
      console.warn('ZIP process failed, falling back to individual downloads', e);
      for (const item of urls) {
        try {
          const a = document.createElement('a');
          a.href = item.url;
          a.target = '_blank';
          a.download = (item.title || `file-${item.id}`).replace(/[^a-z0-9._-]/gi, '_');
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (err) {
          console.warn('Fallback download failed for', item.url, err);
          window.open(item.url, '_blank');
        }
      }
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // Simulate sending message to teacher
      console.log('Message sent:', chatMessage);
      setChatMessage('');
      setShowChatModal(false);
      alert('Message sent to teacher!');
    }
  };

  const handleStartQuiz = () => {
    setShowQuizModal(false);
    alert('Starting practice quiz...');
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Reference': return <BookOpen className="h-4 w-4" />;
      case 'Practice': return <HelpCircle className="h-4 w-4" />;
      case 'Slides': return <FileText className="h-4 w-4" />;
      case 'DPP': return <Award className="h-4 w-4" />;
      case 'Assignment': return <Calendar className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Reference': return 'bg-blue-100 text-blue-600';
      case 'Practice': return 'bg-green-100 text-green-600';
      case 'Slides': return 'bg-purple-100 text-purple-600';
      case 'DPP': return 'bg-orange-100 text-orange-600';
      case 'Assignment': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Fetch course, lectures and study materials when component mounts or courseId changes
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [courseData, lecturesData, materialsData] = await Promise.all([
          api.getCourse(courseId),
          api.getLectures(courseId),
          api.getStudyMaterials(courseId)
        ]);

        if (!mounted) return;

        // lecturesData may be paginated or an array
        const lecturesList = Array.isArray(lecturesData) ? lecturesData : (lecturesData.results || []);
        const materialsList = Array.isArray(materialsData) ? materialsData : (materialsData.results || []);

        // normalize lectures: ensure id, title, duration, completed, progress
        const normalizedLectures = lecturesList.map((l, idx) => ({
          id: l.id || l.pk || idx + 1,
          title: l.title || l.name || `Lecture ${idx + 1}`,
          duration: l.duration || l.duration_minutes || l.duration_text || '',
          completed: !!l.completed,
          current: false,
          progress: typeof l.progress === 'number' ? l.progress : 0,
          ...l
        }));

        const lecturesCompleted = normalizedLectures.filter(x => x.completed).length;
        const totalLectures = normalizedLectures.length;
        const computedProgress = courseData && (courseData.progress || courseData.progress === 0)
          ? courseData.progress
          : (totalLectures > 0 ? Math.round((lecturesCompleted / totalLectures) * 100) : 0);

        // mark the first lecture as current by default
        if (normalizedLectures.length > 0) normalizedLectures[0].current = true;

        setCourse(Object.assign({}, courseData, {
          lecturesCompleted,
          totalLectures,
          progress: computedProgress
        }));
        setLectures(normalizedLectures);
        setStudyMaterials(materialsList);
        if (normalizedLectures.length > 0) setCurrentVideo(normalizedLectures[0].id);
      } catch (err) {
        console.error('Failed to load course details', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [courseId]);

  // Sync video element with state: play/pause and muted, and update progress/time
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;

    const handleTimeUpdate = () => {
      const pct = el.duration ? Math.round((el.currentTime / el.duration) * 100) : 0;
      setCurrentProgress(pct);
      // Save progress for students only; debounced/throttled below
      try {
        if (userRole === 'student') {
          // schedule a save via ref-managed debouncer
          scheduleSaveProgress.current && scheduleSaveProgress.current(pct, el.currentTime, el.duration);
        }
      } catch (err) {
        console.warn('Error scheduling progress save', err);
      }
    };

    const handleLoaded = () => {
      setCurrentProgress(0);
      if (isPlaying) el.play().catch(() => setIsPlaying(false));
      setVideoLoading(false);
    };

    const handleCanPlay = () => {
      setVideoLoading(false);
    };

    const handleWaiting = () => {
      setVideoLoading(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentProgress(100);
      // final save on ended
      try {
        if (userRole === 'student') {
          // immediate save to mark 100%
          saveProgressImmediate(currentVideo, 100, el.currentTime || 0, el.duration || 0);
        }
      } catch (err) {
        console.warn('Error saving progress on ended', err);
      }
    };

    const handleError = (e) => {
      console.error('Video playback error', e);
      setVideoError(true);
      setIsPlaying(false);
      // We do not attempt to load Drive preview iframe here because the Drive preview
      // can load Google APIs that are blocked by tracking-prevention and cause many console errors.
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('loadedmetadata', handleLoaded);
    el.addEventListener('canplay', handleCanPlay);
    el.addEventListener('playing', handleCanPlay);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('error', handleError);

    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', handleLoaded);
      el.removeEventListener('canplay', handleCanPlay);
      el.removeEventListener('playing', handleCanPlay);
      el.removeEventListener('waiting', handleWaiting);
      el.removeEventListener('ended', handleEnded);
      el.removeEventListener('error', handleError);
    };
  }, [currentVideo, isPlaying, isMuted]);

  // Progress save helpers: debounce/throttle and send to backend
  // use refs to keep stable handlers across renders
  const lastSavedPercentRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const saveTimerRef = useRef(null);

  const saveProgressImmediate = async (lectureId, percent, currentTime, duration) => {
    if (!lectureId) return;
    lastSavedPercentRef.current = percent;
    lastSavedAtRef.current = Date.now();
    // attempt to call API module if available
    try {
      const payload = { lecture_id: lectureId, progress: percent, current_time: Math.round(currentTime || 0), duration: Math.round(duration || 0) };
      if (api && typeof api.updateLectureProgress === 'function') {
        await api.updateLectureProgress(lectureId, payload);
      } else {
        // best-effort fallback: POST to conventional endpoint
        await fetch(`/api/lectures/${lectureId}/progress/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      }
    } catch (e) {
      console.warn('Failed to save lecture progress', e);
    }
  };

  const scheduleSaveProgress = useRef((percent, currentTime, duration) => {
    // don't spam server: only save when percent increased by >=5 or 30s elapsed
    const now = Date.now();
    const lastPct = lastSavedPercentRef.current || 0;
    const lastAt = lastSavedAtRef.current || 0;
    const pctDelta = percent - lastPct;
    if (percent === 100 || pctDelta >= 5 || (now - lastAt) >= 30000) {
      // immediate save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      saveProgressImmediate(currentVideo, percent, currentTime, duration);
      return;
    }
    // else debounce a save in 10s
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      saveProgressImmediate(currentVideo, percent, currentTime, duration);
    }, 10000);
  });

  // Probe proxied video URL before assigning it to the <video> element.
  // This avoids loading an HTML/JSON error response in the video tag
  // (which causes 'error' events and noisy console output) and lets
  // us show a clearer message to the user (e.g. private file / 401).
  useEffect(() => {
    let cancelled = false;
      // Do not clear videoSrc
    setVideoError(false);
    setVideoErrorMessage('');

    const raw = currentVideoData && (currentVideoData.video_url || currentVideoData.video_file);
    const playable = getPlayableSrc(raw);
    if (!raw || !playable) {
      // Only Google Drive files are supported by the player
      setVideoError(true);
      setVideoErrorMessage('Only Google Drive-hosted videos are supported.');
      setVideoLoading(false);
      return;
    }

    const attemptFetch = async (url) => {
      try {
        const resp = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
        const ct = (resp.headers.get('Content-Type') || '').toLowerCase();
        const txt = await resp.text().catch(() => '');
        return { resp, ct, txt };
      } catch (e) {
        return { error: e };
      }
    };

    const probe = async () => {
      try {
        // Decide whether to probe via backend proxy for Drive URLs (to avoid CORS and Drive viewer HTML)
        const isDrive = playable && (playable.includes('drive.google.com') || playable.includes('docs.google.com') || playable.includes('uc?export=download'));
        const proxyPrefix = '/api/video-proxy/?url=';
        const probeUrl = isDrive ? `${proxyPrefix}${encodeURIComponent(playable)}` : playable;

        // Try the direct playable URL (or proxy endpoint for Drive)
        let result = await attemptFetch(probeUrl);
        if (cancelled) return;
        if (result && result.resp && (result.resp.status === 200 || result.resp.status === 206)) {
          // if dev server returned index.html (vite), txt will contain the HTML
          if (result.ct.startsWith('video') || result.ct.includes('application/octet-stream')) {
            if (!videoSrc) setVideoSrc(playable);
            setVideoError(false);
            setVideoErrorMessage('');
            setVideoLoading(false);
            return;
          }

          // Non-video content-type. Try Drive direct-download fallback if we can extract an ID
          // try direct-download fallback via proxy as well (Drive direct-download often blocked by CORS)
          const driveId = extractDriveId(playable);
          if (driveId) {
            const dd = `https://drive.google.com/uc?export=download&id=${driveId}`;
            const probeDd = `${proxyPrefix}${encodeURIComponent(dd)}`;
            try {
              const second = await attemptFetch(probeDd);
              if (cancelled) return;
              if (second && second.resp && (second.resp.status === 200 || second.resp.status === 206)) {
                const sct = (second.ct || '').toLowerCase();
                if (sct.startsWith('video') || sct.includes('application/octet-stream')) {
                  if (!videoSrc) setVideoSrc(dd);
                  setVideoError(false);
                  setVideoErrorMessage('');
                  setVideoLoading(false);
                  return;
                }
              }
            } catch (e) {
              // ignore second-fetch errors and fall through to original handling
            }
          }

          // Non-video content-type (and fallback didn't yield a video)
          // setVideoError(true);
          // setVideoErrorMessage(`Upstream returned non-video content (status ${result.resp.status}).`);
          // console.error('Probe returned non-video', result.resp.status, result.txt);
          // setVideoLoading(false);
          // return;
        }
        // setVideoError(true);
        // setVideoErrorMessage(`Unable to play video (status ${result && result.resp ? result.resp.status : 'network error'}).`);
        // console.error('Probe failed or non-OK response', result && result.error ? result.error : result && result.resp ? result.resp.status : 'unknown');
        // setVideoLoading(false);
      } catch (e) {
        if (cancelled) return;
        setVideoError(true);
        setVideoErrorMessage('Network error while checking video');
        console.error('Probe failed', e);
          setVideoLoading(false);
      }
    };

    probe();
    return () => { cancelled = true; };
  }, [currentVideo]);

  // When videoSrc becomes available and user requested play, attempt to play.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (videoSrc && isPlaying) {
      // load the new source and try to play. This call may be allowed because
      // it follows a user gesture (selectLecture click) which set `isPlaying`.
      try {
        el.load?.();
      } catch (e) {
        // ignore
      }
      el.play().catch((err) => {
        console.warn('Autoplay blocked or failed', err);
        setIsPlaying(false);
      });
    }
  }, [videoSrc, isPlaying]);

  if (loading) return <div>Loading course...</div>;
  if (!course) return <div>Course not found</div>;

  // Only support Google Drive-hosted videos for playback.
  const rawCurrentVideo = currentVideoData && (currentVideoData.video_url || currentVideoData.video_file);
  const currentPlayable = getPlayableSrc(rawCurrentVideo);
  // If the stored Drive URL is a share/view/open link, derive the Drive preview URL
  const drivePreviewUrl = (() => {
    try {
      if (!currentPlayable) return null;
      const raw = String(currentPlayable).trim();
      // /file/d/<id>/... pattern
      let m = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return `https://drive.google.com/file/d/${m[1]}/preview`;
      // open?id=<id> or uc?id=
      try {
        const u = new URL(raw, window.location.origin);
        const q = u.searchParams.get('id') || u.searchParams.get('uc?id') || u.searchParams.get('export') ? null : null;
        if (u.searchParams.get('id')) return `https://drive.google.com/file/d/${u.searchParams.get('id')}/preview`;
      } catch (e) {
        // ignore
      }
      // fallback: if it already contains /preview use it
      if (raw.includes('/preview')) return raw;
      return null;
    } catch (e) {
      return null;
    }
  })();

  const instructorLabel = (() => {
    const instr = course.instructor;
    if (!instr) return 'Unknown';
    if (typeof instr === 'string') return instr;
    return instr.first_name || instr.last_name ? `${instr.first_name || ''} ${instr.last_name || ''}`.trim() : instr.username || instr.email || 'Instructor';
  })();

  const avatarInitials = (() => {
    const name = typeof course.instructor === 'string' ? course.instructor : (course.instructor && (course.instructor.first_name || course.instructor.username)) || course.title || '';
    return name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase() || 'C';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center gap-4">
          {userRole === 'student' && (
            <>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Progress value={course.progress} className="w-32" />
                  <span className="text-sm font-medium">{course.progress}% Complete</span>
                </div>
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Brain className="h-4 w-4 mr-2" />
                AI Tutor
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Course Info Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <span>by {instructorLabel}</span>
                <Badge variant="outline">{course.level}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{course.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.enrolled} students</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">{course.description}</p>
              
              {userRole === 'student' && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span>Last watched: {course.lastWatched}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span>Next class: {course.nextClass}</span>
                  </div>
                </div>
              )}
            </div>
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-xl">{avatarInitials}</AvatarFallback>
            </Avatar>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Video Player and Materials */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Video Player */}
          <Card>
            <CardContent className="p-0">
              <div className="relative bg-black aspect-video rounded-t-lg">
                { currentPlayable ? (
                  <>
                    { drivePreviewUrl ? (
                      <iframe
                        title={currentVideoData && currentVideoData.title ? currentVideoData.title : 'lecture'}
                        src={drivePreviewUrl}
                        className="absolute inset-0 w-full h-full rounded-t-lg"
                        frameBorder="0"
                        allow="autoplay; encrypted-media; fullscreen"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-contain"
                        src={videoSrc || currentPlayable || undefined}
                        controls
                        playsInline
                        preload="auto"
                      />
                    )}
                    {videoLoading && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/60 text-white p-3 rounded flex items-center gap-2">
                          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="4"/><path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="4" strokeLinecap="round"/></svg>
                          <span>Loading video…</span>
                        </div>
                      </div>
                    )}
                    {videoError && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/70 text-white p-3 rounded">
                          {videoErrorMessage || 'Unable to play video here — try "Open in New Tab"'}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white bg-black/50 p-4 rounded">
                      <h3 className="text-lg font-semibold mb-2">Only Google Drive videos supported</h3>
                      <p className="text-sm opacity-80 mb-2">This player only supports Google Drive-hosted video files. Add a Drive file URL to the lecture.</p>
                      {currentVideoData && currentVideoData.title && (
                        <p className="text-sm opacity-80">Selected: {currentVideoData.title}</p>
                      )}
                    </div>
                  </div>
                )}

                
              </div>
              
                <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{currentVideoData.title}</h3>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                        const raw = currentVideoData.video_url || currentVideoData.video_file;
                        if (!raw) return alert('No video available to open');
                        const playable = getPlayableSrc(raw);
                        // Open the original DB URL when available (user requested DB links be used as-is).
                        const toOpen = raw || videoSrc || playable;
                        window.open(toOpen, '_blank');
                    }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{currentVideoData.description}</p>
                {userRole === 'student' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Progress: {currentProgress}% watched</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Study Materials */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Study Materials
                </CardTitle>
                <Button onClick={handleDownloadAll} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {studyMaterials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(material.category)}`}>
                      {getCategoryIcon(material.category)}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{material.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">{material.category}</Badge>
                        <span>{material.type}</span>
                        <span>{material.size}</span>
                        <span>{material.downloads} downloads</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(material.id)}>
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button size="sm" onClick={() => handleDownload(material.id)}>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Sidebar */}
        <div className="space-y-6">
          {/* Course Content with Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Content
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {lectures.filter(l => l.completed).length} of {lectures.length} lectures completed
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {lectures.map((lecture) => (
                <div 
                  key={lecture.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    lecture.current ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => selectLecture(lecture.id)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    lecture.completed ? 'bg-green-100' : 
                    lecture.current ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {lecture.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <PlayCircle className={`h-4 w-4 ${
                        lecture.current ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${
                      lecture.current ? 'text-blue-600' : ''
                    }`}>
                      {lecture.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{lecture.duration}</p>
                      {userRole === 'student' && lecture.progress > 0 && lecture.progress < 100 && (
                        <div className="flex items-center gap-1">
                          <Progress value={lecture.progress} className="w-16 h-1" />
                          <span className="text-xs text-muted-foreground">{lecture.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enhanced Quick Actions - Only for Students */}
          {userRole === 'student' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-start" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Ask Teacher
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ask Teacher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Type your question here..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        rows={4}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowChatModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSendMessage}>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button className="w-full justify-start" variant="outline" onClick={handleDownloadAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Download All Notes
                </Button>

                <Dialog open={showQuizModal} onOpenChange={setShowQuizModal}>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-start" variant="outline">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Take Practice Quiz
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Practice Quiz</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Ready to test your knowledge on "{currentVideoData.title}"?</p>
                      <p className="text-sm text-muted-foreground">
                        This quiz contains 10 questions and should take about 15 minutes to complete.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowQuizModal(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleStartQuiz}>
                          <Award className="h-4 w-4 mr-2" />
                          Start Quiz
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white">
                  <Brain className="h-4 w-4 mr-2" />
                  AI Study Assistant
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Progress */}
          {userRole === 'student' && (
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{course.progress}%</div>
                  <p className="text-sm text-muted-foreground">Course Completion</p>
                </div>
                <Progress value={course.progress} className="w-full" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Lectures Completed</span>
                    <span className="font-medium">{course.lecturesCompleted}/{course.totalLectures}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Study Time</span>
                    <span className="font-medium">NA</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Quiz Score</span>
                    <span className="font-medium text-green-600">0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Milestone</span>
                    <span className="font-medium text-blue-600">0%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}