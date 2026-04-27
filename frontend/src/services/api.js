import { toast } from 'sonner';

const DEFAULT_BASE = '/api';
const BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');

function isStorageBlockedError(error) {
  if (!error) return false;
  const message = String(error.message || error);
  return message.includes('Access is denied') || message.includes('storage') || message.includes('Storage');
}

// safe wrappers around localStorage to avoid exceptions when browser
// tracking protection blocks access to storage (e.g., Safari ITP).
function _safeLocalGet(key) {
  try { return localStorage.getItem(key); } catch (e) { if (!isStorageBlockedError(e)) console.warn('localStorage.getItem failed', e); return null; }
}
function _safeLocalSet(key, val) {
  try { return localStorage.setItem(key, val); } catch (e) { if (!isStorageBlockedError(e)) console.warn('localStorage.setItem failed', e); }
}
function _safeLocalRemove(key) {
  try { return localStorage.removeItem(key); } catch (e) { if (!isStorageBlockedError(e)) console.warn('localStorage.removeItem failed', e); }
}

function _getStorage() {
  return {
    access: _safeLocalGet('access'),
    refresh: _safeLocalGet('refresh'),
    user: JSON.parse(_safeLocalGet('user') || 'null'),
  };
}

let _isRefreshing = false;
let _refreshPromise = null;
let _onAuthFailure = null;
let _backendStatus = { unavailable: false, status: null, message: '' };
const _backendStatusSubscribers = new Set();

export function setAuthFailureHandler(fn) {
  _onAuthFailure = fn;
}

function _emitBackendStatus() {
  _backendStatusSubscribers.forEach((subscriber) => {
    try { subscriber(_backendStatus); } catch (error) { console.error('backend status subscriber failed', error); }
  });
}

function _setBackendStatus(nextStatus) {
  const changed = (
    _backendStatus.unavailable !== nextStatus.unavailable ||
    _backendStatus.status !== nextStatus.status ||
    _backendStatus.message !== nextStatus.message
  );
  _backendStatus = nextStatus;
  if (changed) _emitBackendStatus();
}

export function subscribeBackendStatus(fn) {
  _backendStatusSubscribers.add(fn);
  try { fn(_backendStatus); } catch (error) { console.error('backend status subscriber failed', error); }
  return () => _backendStatusSubscribers.delete(fn);
}

export function getBackendStatus() {
  return _backendStatus;
}

export async function getBackendHealth() {
  return await request('/health', { method: 'GET', skipAuth: true });
}

async function refreshToken() {
  if (_isRefreshing && _refreshPromise) return _refreshPromise;
  const refresh = _safeLocalGet('refresh');
  if (!refresh) throw new Error('No refresh token');

  _isRefreshing = true;
  _refreshPromise = (async () => {
    const res = await fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      throw new Error('Refresh failed');
    }
    const data = await res.json();
    if (data.access) {
      _safeLocalSet('access', data.access);
    }
    if (data.refresh) {
      // backend may rotate refresh tokens; persist new one if provided
      _safeLocalSet('refresh', data.refresh);
    }
    _isRefreshing = false;
    _refreshPromise = null;
    return data;
  })();

  try {
    return await _refreshPromise;
  } catch (e) {
    _isRefreshing = false;
    _refreshPromise = null;
    throw e;
  }
}

export async function request(path, options = {}) {
  const doRequest = async () => {
    const headers = Object.assign({}, options.headers || {});
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    // Allow callers to skip attaching existing Authorization header (useful for login/register)
    const skipAuth = options.skipAuth === true;
    if (!skipAuth) {
        const access = _safeLocalGet('access');
      if (access) headers['Authorization'] = `Bearer ${access}`;
    }

    // Ensure skipAuth isn't forwarded to fetch
    const opts = Object.assign({}, options);
    delete opts.skipAuth;

    let res;
    try {
      res = await fetch(BASE + path, Object.assign({}, opts, { headers }));
    } catch (error) {
      const err = new Error('Network request failed');
      err.status = 0;
      err.cause = error;
      throw err;
    }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { res, data };
  };

  let { res, data } = await doRequest();

  // if unauthorized and we have a refresh token, try refreshing once
  if (res.status === 401) {
    try {
      await refreshToken();
      // retry original request with new access token
      ({ res, data } = await doRequest());
    } catch (e) {
      // refresh failed: clear auth and propagate original 401
      _safeLocalRemove('access');
      _safeLocalRemove('refresh');
      _safeLocalRemove('user');
      // call central handler if available
      if (_onAuthFailure) {
        try { _onAuthFailure(); } catch (er) { console.error('onAuthFailure handler error', er); }
      } else {
        // default: redirect to login
        try { window.location.href = '/login'; } catch (er) { /* ignore */ }
      }
      const err = new Error('Unauthorized');
      err.status = 401;
      toast.error('Session expired — please sign in again');
      throw err;
    }
  }

  if (res.status === 503) {
    _setBackendStatus({
      unavailable: true,
      status: 503,
      message: data?.detail || 'Backend unavailable',
    });
  } else if (res.ok && _backendStatus.unavailable) {
    _setBackendStatus({ unavailable: false, status: null, message: '' });
  }

  if (!res.ok) {
    const err = new Error(data && data.detail ? data.detail : `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function login(email, password) {
  // Clear any existing auth before attempting login to avoid stale sessions
  logout();
  const loginId = (email || '').trim();
  const looksLikeEmail = loginId.includes('@');
  const body = JSON.stringify(
    looksLikeEmail
      ? { email: loginId, password }
      : { username: loginId, password }
  );
  // Skip attaching previous Authorization header for auth endpoints
  const data = await request('/auth/login', { method: 'POST', body, skipAuth: true });

  // TokenObtainPairView returns `access` and `refresh`; RegisterView returns `token`
  if (data.access) _safeLocalSet('access', data.access);
  if (data.refresh) _safeLocalSet('refresh', data.refresh);
  if (data.token) _safeLocalSet('access', data.token);

  // Attempt to fetch authoritative user data from /auth/me after storing tokens.
  // This avoids cases where the login response doesn't include `user` or is ambiguous.
  try {
    const meData = await me();
    if (meData) {
      _safeLocalSet('user', JSON.stringify(meData));
      // return auth payload together with user for callers
      const out = Object.assign({}, data, { user: meData });
      toast.success('Signed in successfully');
      return out;
    }
  } catch (err) {
    // If fetching /me failed, fall back to any user included in login response
    if (data.user) _safeLocalSet('user', JSON.stringify(data.user));
    toast.success('Signed in successfully');
    return data;
  }
}

export async function register({ name, email, password, role }) {
  // Clear existing auth to avoid mixing sessions
  logout();
  const [first_name, ...rest] = (name || '').split(' ');
  const last_name = rest.join(' ');
  const username = email ? email.split('@')[0] : (name || `u${Date.now()}`);
  const body = JSON.stringify({ username, email, password, first_name, last_name, role });
  // Skip attaching previous Authorization header for auth endpoints
  const data = await request('/auth/register', { method: 'POST', body, skipAuth: true });

  if (data.token) _safeLocalSet('access', data.token);

  // After registration, attempt to fetch /auth/me to get the created user's canonical data
  try {
    const meData = await me();
    if (meData) {
      _safeLocalSet('user', JSON.stringify(meData));
      toast.success('Account created');
      return Object.assign({}, data, { user: meData });
    }
  } catch (err) {
    if (data.user) _safeLocalSet('user', JSON.stringify(data.user));
    toast.success('Account created');
    return data;
  }
}

export async function me() {
  return await request('/auth/me', { method: 'GET' });
}

export async function getUsers() {
  const data = await request('/users', { method: 'GET' });
  if (data && data.results) return data.results;
  return data || [];
}

export function logout() {
  _safeLocalRemove('access');
  _safeLocalRemove('refresh');
  _safeLocalRemove('user');
}

export async function getCourses() {
  const data = await request('/courses/');
  // DRF pagination may return `results`
  if (data && data.results) return data.results;
  return data || [];
}

export async function getLibraryItems(filters = {}) {
  let path = '/library';
  const qs = [];
  if (filters.course) qs.push(`course=${encodeURIComponent(filters.course)}`);
  if (qs.length) path = `/library?${qs.join('&')}`;
  const data = await request(path, { method: 'GET' });
  if (data && data.results) return data.results;
  return data || [];
}

export async function createLibraryItem(payload) {
  const opts = {};
  if (payload instanceof FormData) {
    opts.body = payload;
  } else {
    opts.body = JSON.stringify(payload);
    opts.headers = { 'Content-Type': 'application/json' };
  }
  return await request('/library', { method: 'POST', ...opts });
}

export async function recordLibraryDownload(id) {
  if (!id) throw new Error('Missing library item id');
  // Backend returns { total_downloads }
  return await request(`/library/${id}/download`, { method: 'POST' });
}

export async function updateLibraryItem(id, payload) {
  if (!id) throw new Error('Missing library item id');
  const opts = {};
  if (payload instanceof FormData) {
    opts.body = payload;
  } else {
    opts.body = JSON.stringify(payload);
    opts.headers = { 'Content-Type': 'application/json' };
  }
  return await request(`/library/${id}`, { method: 'PUT', ...opts });
}

export async function deleteLibraryItem(id) {
  if (!id) throw new Error('Missing library item id');
  return await request(`/library/${id}`, { method: 'DELETE' });
}

export async function getAssignments() {
  const data = await request('/assignments/');
  if (data && data.results) return data.results;
  return data || [];
}

// Tests / Questions / Submissions API helpers
export async function getTests(filters = {}) {
  // filters: { course, created_by }
  let path = '/tests/';
  const qs = [];
  if (filters.course) qs.push(`course=${encodeURIComponent(filters.course)}`);
  if (filters.created_by) qs.push(`created_by=${encodeURIComponent(filters.created_by)}`);
  if (qs.length) path = `/tests/?${qs.join('&')}`;
  const data = await request(path);
  const tests = data && data.results ? data.results : data || [];
  return tests;
}

export async function getTest(id) {
  if (!id) return null;
  return await request(`/tests/${id}/`);
}

export async function getQuestions(testId, filters = {}) {
  if (!testId) return [];
  const qs = [`test=${encodeURIComponent(testId)}`];
  if (filters.student) qs.push(`student=${encodeURIComponent(filters.student)}`);
  if (filters.created_by) qs.push(`created_by=${encodeURIComponent(filters.created_by)}`);
  const data = await request(`/questions/?${qs.join('&')}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function getTestSubmissions(testId, filters = {}) {
  if (!testId) return [];
  const qs = [`test=${encodeURIComponent(testId)}`];
  if (filters.student) qs.push(`student=${encodeURIComponent(filters.student)}`);
  if (filters.status) qs.push(`status=${encodeURIComponent(filters.status)}`);
  const data = await request(`/test-submissions/?${qs.join('&')}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function createTestSubmission(payload) {
  // payload: { test: id }
  return await request('/test-submissions/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function updateTestSubmission(id, payload) {
  if (!id) throw new Error('Missing test submission id');
  return await request(`/test-submissions/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function createTestAnswer(payload) {
  // payload: { submission, question, student_answer, is_correct, marks_awarded }
  return await request('/test-answers/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getTestAnswers(submissionId, filters = {}) {
  if (!submissionId) return [];
  const qs = [`submission=${encodeURIComponent(submissionId)}`];
  if (filters.question) qs.push(`question=${encodeURIComponent(filters.question)}`);
  if (filters.student) qs.push(`student=${encodeURIComponent(filters.student)}`);
  const data = await request(`/test-answers/?${qs.join('&')}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function createTest(payload) {
  // payload should include required Test fields (e.g., course, title, test_type, scheduled_date, duration_minutes, total_marks)
  return await request('/tests/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function createQuestion(payload) {
  // payload should include: test, question_type, question_text, options (array), correct_answer, marks, order_index
  return await request('/questions/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function updateQuestion(id, payload) {
  if (!id) throw new Error('Missing question id');
  return await request(`/questions/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function deleteQuestion(id) {
  if (!id) throw new Error('Missing question id');
  return await request(`/questions/${id}/`, { method: 'DELETE' });
}

export async function updateTest(id, payload) {
  if (!id) throw new Error('Missing test id');
  return await request(`/tests/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function deleteTest(id) {
  if (!id) throw new Error('Missing test id');
  return await request(`/tests/${id}/`, { method: 'DELETE' });
}


export async function getCourse(id) {
  return await request(`/courses/${id}/`, { method: 'GET' });
}

// Live classes endpoints
export async function getLiveClasses() {
  const data = await request('/live-classes/');
  if (data && data.results) return data.results;
  return data || [];
}

export async function getEvents(filters = {}) {
  // filters can include course, event_type, date, etc. Build a query string if provided.
  let path = '/events/';
  const qs = [];
  if (filters.course) qs.push(`course=${encodeURIComponent(filters.course)}`);
  if (filters.event_type) qs.push(`event_type=${encodeURIComponent(filters.event_type)}`);
  if (filters.date) qs.push(`event_date=${encodeURIComponent(filters.date)}`);
  if (qs.length) path = `/events/?${qs.join('&')}`;
  const data = await request(path);
  if (data && data.results) return data.results;
  return data || [];
}

export async function createLiveClass(payload) {
  return await request('/live-classes/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createAnnouncement(payload) {
  // payload fields: title, body, audience, priority, channels (array), scheduled_for, expires_at, is_pinned, require_ack
  return await request('/announcements/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getAnnouncements(filters = {}) {
  // Optionally support basic filtering in future via querystring
  let path = '/announcements/';
  const qs = [];
  if (filters.audience) qs.push(`audience=${encodeURIComponent(filters.audience)}`);
  if (filters.priority) qs.push(`priority=${encodeURIComponent(filters.priority)}`);
  if (qs.length) path = `/announcements/?${qs.join('&')}`;
  const data = await request(path);
  if (data && data.results) return data.results;
  return data || [];
}

export async function updateAnnouncement(id, payload) {
  if (!id) throw new Error('Missing announcement id');
  return await request(`/announcements/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function deleteAnnouncement(id) {
  if (!id) throw new Error('Missing announcement id');
  return await request(`/announcements/${id}/`, { method: 'DELETE' });
}

export async function deleteLiveClass(id) {
  if (!id) throw new Error('Missing live class id');
  return await request(`/live-classes/${id}/`, { method: 'DELETE' });
}

export async function updateLiveClass(id, payload) {
  if (!id) throw new Error('Missing live class id');
  return await request(`/live-classes/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}


export async function updateCourse(id, payload) {
  const opts = {};
  if (payload instanceof FormData) {
    opts.body = payload;
  } else {
    opts.body = JSON.stringify(payload);
    opts.headers = { 'Content-Type': 'application/json' };
  }
  return await request(`/courses/${id}/`, { method: 'PATCH', ...opts });
}

export async function getForumThreads(courseId) {
  const data = await request(`/forum/threads/?course=${encodeURIComponent(courseId)}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function createForumThread(payload) {
  return await request('/forum/threads/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function createForumPost(threadId, payload) {
  return await request(`/forum/threads/${threadId}/posts/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getForumPosts(threadId) {
  const data = await request(`/forum/posts/?thread=${encodeURIComponent(threadId)}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function toggleForumThreadPin(threadId) {
  return await request(`/forum/threads/${threadId}/pin/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function toggleForumThreadLock(threadId) {
  return await request(`/forum/threads/${threadId}/lock/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function toggleForumThreadResolve(threadId) {
  return await request(`/forum/threads/${threadId}/resolve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function toggleForumThreadHide(threadId) {
  return await request(`/forum/threads/${threadId}/hide/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function subscribeForumThread(threadId) {
  return await request(`/forum/threads/${threadId}/subscribe/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function unsubscribeForumThread(threadId) {
  return await request(`/forum/threads/${threadId}/unsubscribe/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function toggleForumPostHide(postId) {
  return await request(`/forum/posts/${postId}/hide/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function createForumReport(payload) {
  return await request('/forum/reports/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getGames() {
  const data = await request('/games/');
  if (data && data.results) return data.results;
  return data || [];
}

export async function getGame(slug) {
  return await request(`/games/${slug}/`);
}

export async function startGameSession(slug, assignmentId = null) {
  return await request(`/games/${slug}/start/`, {
    method: 'POST',
    body: JSON.stringify(assignmentId ? { assignment_id: assignmentId } : {}),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function submitGameAttempt(slug, payload) {
  return await request(`/games/${slug}/submit/`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getGameLeaderboard(slug, assignmentId = null) {
  const qs = assignmentId ? `?assignment_id=${encodeURIComponent(assignmentId)}` : '';
  const data = await request(`/games/${slug}/leaderboard/${qs}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function getGameAssignments() {
  const data = await request('/game-assignments/');
  if (data && data.results) return data.results;
  return data || [];
}

export async function createGameAssignment(payload) {
  return await request('/game-assignments/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateGameAssignment(id, payload) {
  if (!id) throw new Error('Missing game assignment id');
  return await request(`/game-assignments/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function deleteGameAssignment(id) {
  if (!id) throw new Error('Missing game assignment id');
  return await request(`/game-assignments/${id}/`, { method: 'DELETE' });
}

export async function getGameBadges() {
  const data = await request('/game-badges/');
  if (data && data.results) return data.results;
  return data || [];
}

export async function getLectures(courseId) {
  return await request(`/lectures/?course=${courseId}`);
}

export async function createLecture(payload) {
  return await request('/lectures/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function createLectureMaterial(payload) {
  return await request('/lecture-materials/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function updateLecture(id, payload) {
  return await request(`/lectures/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getStudyMaterials(courseId) {
  return await request(`/study-materials/?course=${courseId}`);
}

export async function createStudyMaterial(payload) {
  return await request('/study-materials/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function updateStudyMaterial(id, payload) {
  return await request(`/study-materials/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function createCourse(payload) {
  // payload can be FormData or JSON
  const opts = {};
  if (payload instanceof FormData) {
    opts.body = payload;
  } else {
    opts.body = JSON.stringify(payload);
    opts.headers = { 'Content-Type': 'application/json' };
  }
  return await request('/courses/', Object.assign({ method: 'POST' }, opts));
}

export async function createEvent(payload) {
  // payload should include: title, event_type, event_date, start_time, course (id)
  return await request('/events/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  return await request('/uploads/', { method: 'POST', body: fd });
}

export async function getUploads() {
  const data = await request('/uploads/');
  if (data && data.results) return data.results;
  return data || [];
}

export async function createAssignmentAttachment(payload) {
  // payload is JSON: { assignment: id, file_name, file_url, file_size_kb }
  return await request('/assignment-attachments/', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function createAssignment(payload) {
  // payload can be FormData (for attachments) or JSON
  const opts = {};
  if (payload instanceof FormData) {
    opts.body = payload;
  } else {
    opts.body = JSON.stringify(payload);
    opts.headers = { 'Content-Type': 'application/json' };
  }
  return await request('/assignments/', Object.assign({ method: 'POST' }, opts));
}

export async function updateAssignment(id, payload) {
  if (!id) throw new Error('Missing assignment id');
  const opts = {};
  if (payload instanceof FormData) {
    opts.body = payload;
  } else {
    opts.body = JSON.stringify(payload);
    opts.headers = { 'Content-Type': 'application/json' };
  }
  return await request(`/assignments/${id}/`, Object.assign({ method: 'PATCH' }, opts));
}

export async function deleteAssignment(id) {
  if (!id) throw new Error('Missing assignment id');
  return await request(`/assignments/${id}/`, { method: 'DELETE' });
}

export async function submitAssignment({ assignment, file, submission_text }) {
  const fd = new FormData();
  fd.append('assignment', assignment);
  // `file` can be a File object (device upload) or omitted. If the frontend
  // wants to attach a previously uploaded file by URL it may provide
  // `submitted_file_url` in the payload; include it so the backend can accept
  // submissions by reference when no file is re-uploaded.
  if (file) fd.append('file', file);
  if (submission_text) fd.append('submission_text', submission_text);
  // support optional submitted_file_url passed via caller object
  if (typeof arguments[0] === 'object' && arguments[0].submitted_file_url) {
    fd.append('submitted_file_url', arguments[0].submitted_file_url);
  }
  return await request('/assignment-submissions/', { method: 'POST', body: fd });
}

export async function getAssignmentSubmissions(assignmentId) {
  if (!assignmentId) return [];
  const data = await request(`/assignment-submissions/?assignment=${assignmentId}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function updateAssignmentSubmission(id, payload) {
  if (!id) throw new Error('Missing submission id');
  return await request(`/assignment-submissions/${id}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getAssignmentAttachments(assignmentId) {
  if (!assignmentId) return [];
  const data = await request(`/assignment-attachments/?assignment=${assignmentId}`);
  if (data && data.results) return data.results;
  return data || [];
}

// User Profile Management API
export async function getUserProfile(userId) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/auth/me`, { method: 'GET' });
}

export async function updateUserProfile(payload) {
  // payload: { phone, bio, avatar_url }
  return await request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getStudentProfile(userId) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/student-profiles/${userId}/`, { method: 'GET' });
}

export async function updateStudentProfile(userId, payload) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/student-profiles/${userId}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getTeacherProfile(userId) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/teacher-profiles/${userId}/`, { method: 'GET' });
}

export async function updateTeacherProfile(userId, payload) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/teacher-profiles/${userId}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function getAdminProfile(userId) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/admin-profiles/${userId}/`, { method: 'GET' });
}

export async function updateAdminProfile(userId, payload) {
  if (!userId) throw new Error('Missing user id');
  return await request(`/admin-profiles/${userId}/`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
}

export async function changePassword(oldPassword, newPassword) {
  return await request('/auth/change-password', { 
    method: 'POST', 
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }), 
    headers: { 'Content-Type': 'application/json' } 
  });
}

// User Settings API
export async function getUserSettings() {
  return await request('/user-settings/me/', { method: 'GET' });
}

export async function updateUserSettings(payload) {
  return await request('/user-settings/me/', { 
    method: 'PATCH', 
    body: JSON.stringify(payload), 
    headers: { 'Content-Type': 'application/json' } 
  });
}

export async function getNotifications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  if (filters.read !== undefined) params.append('read', filters.read);
  const query = params.toString() ? `?${params.toString()}` : '';
  return await request(`/notifications/${query}`);
}

export async function markNotificationAsRead(id) {
  return await request(`/notifications/${id}/mark-as-read/`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' } 
  });
}

export async function markAllNotificationsAsRead() {
  return await request('/notifications/mark-all-as-read/', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' } 
  });
}

export async function deleteNotification(id) {
  return await request(`/notifications/${id}/`, { 
    method: 'DELETE' 
  });
}

export async function deleteAllNotifications() {
  return await request('/notifications/delete-all/', { 
    method: 'DELETE' 
  });
}

// Enrollment functions
export async function getEnrollments() {
  const data = await request('/enrollments/');
  if (data && data.results) return data.results;
  return data || [];
}

export async function enrollInCourse(courseId, studentId) {
  return await request('/enrollments/', {
    method: 'POST',
    body: JSON.stringify({
      course: courseId,
      student: studentId,
      status: 'active'
    }),
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function checkEnrollment(courseId, studentId) {
  const enrollments = await getEnrollments();
  return enrollments.find(e => e.course === courseId && e.student === studentId);
}

// Course Rating functions
export async function getCourseRatings(courseId) {
  const params = courseId ? `?course=${courseId}` : '';
  const data = await request(`/course-ratings/${params}`);
  if (data && data.results) return data.results;
  return data || [];
}

export async function rateCourse(courseId, rating, review = '') {
  return await request('/course-ratings/', {
    method: 'POST',
    body: JSON.stringify({
      course: courseId,
      rating: rating,
      review: review
    }),
    headers: { 'Content-Type': 'application/json' }
  });
}

export default {
  login,
  register,
  me,
  logout,
  getCourses,
  getLibraryItems,
  createLibraryItem,
  recordLibraryDownload,
  updateLibraryItem,
  deleteLibraryItem,
  getLiveClasses,
  createCourse,
  getCourse,
  updateCourse,
  getLectures,
  createLecture,
  updateLecture,
  createLectureMaterial,
  getStudyMaterials,
  createStudyMaterial,
  updateStudyMaterial,
  uploadFile,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentAttachments,
  updateAssignmentSubmission,
  getUserProfile,
  updateUserProfile,
  getStudentProfile,
  updateStudentProfile,
  getTeacherProfile,
  updateTeacherProfile,
  getAdminProfile,
  updateAdminProfile,
  changePassword,
  getUserSettings,
  updateUserSettings,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getEnrollments,
  enrollInCourse,
  checkEnrollment,
  getCourseRatings,
  rateCourse,
  getForumThreads,
  getForumPosts,
  createForumThread,
  createForumPost,
  toggleForumThreadPin,
  toggleForumThreadLock,
  toggleForumThreadResolve,
  toggleForumThreadHide,
  subscribeForumThread,
  unsubscribeForumThread,
  toggleForumPostHide,
  createForumReport,
  getGames,
  getGame,
  startGameSession,
  submitGameAttempt,
  getGameLeaderboard,
  getGameAssignments,
  createGameAssignment,
  updateGameAssignment,
  deleteGameAssignment,
  getGameBadges,
  getBackendHealth,
  subscribeBackendStatus,
};
