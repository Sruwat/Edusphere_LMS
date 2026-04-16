import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as api from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  FileText, 
  Upload, 
  Download, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Star,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Send,
  Save,
  Timer,
  MessageSquare,
  BookOpen,
  Award
} from 'lucide-react';

// Types removed for JS build. Assignments should be fetched from API in production.
export function AssignmentSystem({ userRole }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false);
  const [editInitial, setEditInitial] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradingScore, setGradingScore] = useState('');
  const [gradingGrade, setGradingGrade] = useState('');
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [gradingSaving, setGradingSaving] = useState(false);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionSubmitting, setSubmissionSubmitting] = useState(false);
  const [submissionAssignment, setSubmissionAssignment] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [mySubmissionsMap, setMySubmissionsMap] = useState({});
  
  // NOTE: form state for creating assignments is moved into
  // a dedicated child component to avoid parent re-renders
  // (which caused the dialog to refresh while typing).

  // Assignments state (fetched from API)
  const [assignments, setAssignments] = useState([]);

  const fetchAssignments = async () => {
    try {
      const data = await api.getAssignments();
      // Use the server-provided status and due_date as-is (show DB values)
      const arr = data || [];
      setAssignments(arr);
      
      // For student users, build a map of assignmentId -> submission (student's own submission)
      if (userRole === 'student') {
        const map = {};
        await Promise.all(arr.map(async (a) => {
          try {
            let subs = await api.getAssignmentSubmissions(a.id);
            // Handle different response shapes: array, single object, paginated { results: [...] }
            if (!subs) return;
            if (subs && typeof subs === 'object' && !Array.isArray(subs)) {
              if (Array.isArray(subs.results)) subs = subs.results;
              else {
                // single submission object - verify it belongs to this assignment
                if (String(subs.assignment) === String(a.id) || subs.assignment === a.id) {
                  map[a.id] = subs;
                }
                return;
              }
            }
            if (Array.isArray(subs) && subs.length > 0) {
              // Filter to only submissions for this specific assignment
              const assignmentSubs = subs.filter(s => String(s.assignment) === String(a.id) || s.assignment === a.id);
              if (assignmentSubs.length === 0) return; // No submissions for this assignment
              
              // prefer the latest by submission_date if multiple
              try {
                assignmentSubs.sort((x, y) => {
                  const dx = new Date(x.submission_date || x.submitted_at || x.created_at || 0).getTime() || 0;
                  const dy = new Date(y.submission_date || y.submitted_at || y.created_at || 0).getTime() || 0;
                  return dy - dx;
                });
              } catch (e) { /* ignore sort errors */ }
              map[a.id] = assignmentSubs[0];
            }
          } catch (e) {
            // ignore per-assignment fetch errors
          }
        }));
        setMySubmissionsMap(map);
      } else if (userRole === 'teacher') {
        // For teacher users, build a map of assignmentId -> hasSubmissions (check if ANY student submitted)
        const submissionMap = {};
        await Promise.all(arr.map(async (a) => {
          try {
            let subs = await api.getAssignmentSubmissions(a.id);
            if (!subs) return;
            
            // Normalize response (handle array, paginated, or single object)
            if (!Array.isArray(subs)) {
              if (subs.results && Array.isArray(subs.results)) {
                subs = subs.results;
              } else {
                subs = [subs];
              }
            }
            
            // Check if ANY valid submissions exist for this assignment
            const validSubs = subs.filter(s => {
              const belongsToAssignment = String(s.assignment) === String(a.id) || s.assignment === a.id;
              const hasSubmittedContent = s.submitted_file || s.submitted_file_url || s.submission_text || s.submissionText || s.submitted_text;
              return belongsToAssignment && hasSubmittedContent;
            });
            
            if (validSubs && validSubs.length > 0) {
              submissionMap[a.id] = true; // Mark that submissions exist for this assignment
            }
          } catch (e) {
            // ignore per-assignment fetch errors
          }
        }));
        setMySubmissionsMap(submissionMap); // Reuse for teacher: maps assignment.id -> hasSubmissions
      }
    } catch (err) {
      console.error('Failed to load assignments', err);
      setAssignments([]);
    }
  };

    // submission dialog opens: no additional data required (device-only uploads)

// CreateAssignmentDialog is a self-contained component that manages its own
// form state and fetches `courses` only when the dialog opens. Keeping the
// form state local prevents typing in the dialog from causing re-renders in
// the parent `AssignmentSystem` component (which caused the dialog to refresh
// on each keystroke).
function CreateAssignmentDialog({ open, onOpenChange, onCreated, initial = null, isEditing = false }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [wordLimit, setWordLimit] = useState('');
  const [allowedFileTypes, setAllowedFileTypes] = useState([]);
    const [attachments, setAttachments] = useState([]); // array of URL strings
    const [attachmentUrl, setAttachmentUrl] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    api.getCourses()
      .then((data) => { if (mounted) setCourses(data || []); })
      .catch((err) => { console.error('Failed to load courses', err); });
    return () => { mounted = false; };
  }, [open]);

  // when editing, populate form fields from `initial`
  useEffect(() => {
    if (!open || !isEditing || !initial) return;
    // helper to convert DB timestamp to input[type=datetime-local] value
    const parseForDatetimeLocal = (val) => {
      if (!val) return '';
      try {
        // if format is 'YYYY-MM-DD HH:MM:SS' -> convert to 'YYYY-MM-DDTHH:MM'
        if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
          return val.replace(' ', 'T').slice(0,16);
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        const iso = d.toISOString();
        return iso.slice(0,16);
      } catch (e) { return ''; }
    };

    try {
      setTitle(initial.title || '');
      setSelectedCourse(initial.course ? String(initial.course.id || initial.course) : '');
      setDescription(initial.description || '');
      setInstructions(initial.instructions || '');
      setDueDate(parseForDatetimeLocal(initial.due_date || initial.dueDate || initial.deadline));
      setTotalMarks(initial.total_marks ?? initial.totalMarks ?? '');
      setWordLimit(initial.word_limit ?? initial.wordLimit ?? '');
      const fileTypes = initial.allowed_file_types || initial.fileTypes || initial.allowedFileTypes || null;
      if (Array.isArray(fileTypes)) setAllowedFileTypes(fileTypes);
      else if (typeof fileTypes === 'string') setAllowedFileTypes(fileTypes.split(/\s*,\s*/));
      // For edit mode we will not pre-fill attachments for mutation (attachments handled separately)
      setAttachments([]);
    } catch (e) { console.warn('Failed to populate edit form', e); }
  }, [open, isEditing, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Create a new assignment for your students with detailed instructions and requirements.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assignment Title</Label>
              <Input type="text" placeholder="Enter assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <SelectItem value="no_courses" disabled>No courses available</SelectItem>
                  ) : (
                    courses.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.title || course.name || course.slug || `Course ${course.id}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Description</Label>
            <Textarea placeholder="Assignment description..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          
          <div>
            <Label>Instructions</Label>
            <Textarea placeholder="Detailed instructions for students..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Total Marks</Label>
              <Input type="number" placeholder="100" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
            </div>
            <div>
              <Label>Word Limit (Optional)</Label>
              <Input type="number" placeholder="1500" value={wordLimit} onChange={(e) => setWordLimit(e.target.value)} />
            </div>
          </div>
          
          <div>
            <Label>Allowed File Types</Label>
            <div className="flex gap-2 mt-2">
              {['pdf','docx','jpg','png'].map((t) => {
                const selected = allowedFileTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setAllowedFileTypes((prev) => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
                    }}
                    className={`px-2 py-1 rounded text-xs border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-muted-foreground'}`}
                  >
                    {t.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <Label>Reference Material URL</Label>
            <div className="flex gap-2">
              <Input type="url" placeholder="https://example.com/resource.pdf" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} />
              <Button type="button" onClick={() => {
                if (!attachmentUrl) return alert('Please enter a URL');
                setAttachments((prev) => [...prev, attachmentUrl.trim()]);
                setAttachmentUrl('');
              }}>Add</Button>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1 text-sm">
                {attachments.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-1 border rounded">
                    <div className="truncate pr-4">{u}</div>
                    <div className="flex gap-2">
                      <a href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600">Open</a>
                      <Button size="sm" variant="outline" onClick={() => setAttachments((prev) => prev.filter((x, idx) => idx !== i))}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
            <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={async () => {
              // Validate required fields before creating assignment
              if (!title || !selectedCourse || !dueDate || !totalMarks) {
                alert('Please provide title, course, due date and total marks before creating assignment');
                return;
              }

              const serializeError = (err) => {
                try {
                  if (err && err.data) {
                    if (typeof err.data === 'string') return err.data;
                    if (err.data.detail) return err.data.detail;
                    return Object.entries(err.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
                  }
                } catch (e) { /* ignore */ }
                return err?.message || (isEditing ? 'Failed to update assignment' : 'Failed to create assignment');
              };

              try {
                setCreating(true);
                const fd = new FormData();
                fd.append('title', title);
                fd.append('course', selectedCourse);
                fd.append('description', description);
                fd.append('instructions', instructions);
                fd.append('due_date', dueDate);
                fd.append('total_marks', totalMarks);
                if (wordLimit) fd.append('word_limit', wordLimit);
                if (allowedFileTypes && allowedFileTypes.length) fd.append('allowed_file_types', JSON.stringify(allowedFileTypes));
                // Always set status to 'active'; 'overdue' is computed dynamically on backend
                fd.append('status', 'active');

                if (isEditing && initial && initial.id) {
                  // Update existing assignment
                  await api.updateAssignment(initial.id, fd);
                } else {
                  const created = await api.createAssignment(fd);

                  // If reference material URLs were provided, create AssignmentAttachment rows
                  if (attachments && attachments.length) {
                    try {
                      await Promise.all(attachments.map(async (u) => {
                        const name = (u && u.split && u.split('/').pop()) || u;
                        await api.createAssignmentAttachment({ assignment: created.id, file_name: name, file_url: u, file_size_kb: null });
                      }));
                    } catch (e) {
                      console.warn('Failed to create attachment records', e, e && e.data ? e.data : null);
                      try {
                        const msg = (e && e.data && (e.data.detail || e.data.error)) || e.message || 'Attachment create failed';
                        alert(`Attachment warning: ${msg}`);
                      } catch (_) { /* ignore */ }
                    }
                  }
                }

                setCreating(false);
                onOpenChange(false);
                if (onCreated) await onCreated();
              } catch (err) {
                console.error(err);
                setCreating(false);
                alert(serializeError(err));
              }
            }} disabled={creating}>
                {creating ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Assignment' : 'Create Assignment')}
            </Button>
          </div>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'graded': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'graded': return <Award className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Compute visible status based on core_assignmentsubmission and core_assignment table data
  // For students: 
  //   1. Graded: submission exists with status='graded'
  //   2. Submitted: submission exists with status='submitted'
  //   3. Overdue: no submission AND assignment.status='overdue'
  //   4. Active: no submission AND assignment.status='active'
  const getVisibleStatus = (assignment) => {
    try {
      // Student-specific visibility: check submission status first, then assignment status
      if (userRole === 'student') {
        const sub = mySubmissionsMap && mySubmissionsMap[assignment.id] ? mySubmissionsMap[assignment.id] : null;
        
        if (sub) {
          const sStatus = (sub.status || '').toLowerCase();
          // Check submission table status field
          if (sStatus === 'graded') return 'graded';
          if (sStatus === 'submitted') return 'submitted';
        }

        // No submission record found - check assignment status from database
        const assignmentStatus = (assignment.status || 'active').toLowerCase();
        if (assignmentStatus === 'overdue') return 'overdue';
        return 'active';
      }

      // Teacher or other roles: show based on assignment status
      const assignmentStatus = (assignment.status || 'active').toLowerCase();
      if (assignmentStatus === 'overdue') return 'overdue';
      return 'active';
    } catch (e) {
      return 'active';
    }
  };

  const isOverdue = (dueDate) => {
    try {
      if (!dueDate) return false;
      return new Date(dueDate) < new Date();
    } catch (e) {
      return false;
    }
  };

  // Derive visible status for each assignment once and memoize so tab counts and
  // filtered lists stay consistent across renders (avoids mismatch when
  // `mySubmissionsMap` is populated asynchronously).
  const { visibleStatusMap, activeList, submittedList, gradedList, overdueList } = React.useMemo(() => {
    const map = {};
    const act = [];
    const subm = [];
    const grad = [];
    const over = [];

    for (const assignment of assignments) {
      try {
        if (userRole === 'student') {
          // Student logic: use submission status from database
          const vis = getVisibleStatus(assignment) || (assignment.status || 'active').toLowerCase();
          map[assignment.id] = vis;
          if (vis === 'active') act.push(assignment);
          else if (vis === 'submitted') subm.push(assignment);
          else if (vis === 'graded') grad.push(assignment);
          else if (vis === 'overdue') over.push(assignment);
        } else if (userRole === 'teacher') {
          // Teacher logic: use assignment status field and check for submissions
          const assignmentStatus = (assignment.status || 'active').toLowerCase();
          const hasSubmissions = mySubmissionsMap && mySubmissionsMap[assignment.id]; // Check if ANY student submitted
          
          map[assignment.id] = assignmentStatus;
          
          if (assignmentStatus === 'overdue') {
            // Overdue assignments show only in overdue tab
            over.push(assignment);
          } else if (assignmentStatus === 'active') {
            // Active assignments show in active tab
            act.push(assignment);
            // If any student submitted, also show in submissions tab
            if (hasSubmissions) {
              subm.push(assignment);
            }
          }
        }
      } catch (e) {
        // fallback
        map[assignment.id] = (assignment.status || 'active').toLowerCase();
        act.push(assignment);
      }
    }

    return { visibleStatusMap: map, activeList: act, submittedList: subm, gradedList: grad, overdueList: over };
  }, [assignments, mySubmissionsMap, userRole]);

  const filteredAssignments = React.useMemo(() => {
    if (activeFilter === 'all') return assignments;
    if (activeFilter === 'active') return activeList;
    if (activeFilter === 'submitted') return submittedList;
    if (activeFilter === 'graded') return gradedList;
    if (activeFilter === 'overdue') return overdueList;
    // default
    return assignments.filter(a => (visibleStatusMap[a.id] || '').toLowerCase() === activeFilter);
  }, [activeFilter, assignments, activeList, submittedList, gradedList, overdueList, visibleStatusMap]);

  // Debug: log visible status and filtered lengths to browser console to aid debugging
  React.useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.debug('AssignmentSystem debug:', {
        activeFilter,
        totalAssignments: assignments.length,
        activeCount: activeList.length,
        submittedCount: submittedList.length,
        gradedCount: gradedList.length,
        overdueCount: overdueList.length,
        filteredCount: filteredAssignments.length,
      });
    } catch (e) { /* ignore */ }
  }, [activeFilter, assignments, activeList, submittedList, gradedList, overdueList, filteredAssignments]);

  // When opening details, fetch attachments separately (API may store them in a different table)
  const openAssignmentDetails = async (assignment) => {
    try {
      let atts = await api.getAssignmentAttachments(assignment.id);
      // defensive: ensure attachments belong to this assignment id
      if (Array.isArray(atts)) {
        atts = atts.filter((a) => String(a.assignment) === String(assignment.id) || a.assignment === assignment.id);
      } else {
        atts = [];
      }
      setSelectedAssignment(Object.assign({}, assignment, { attachments: atts }));
    } catch (err) {
      console.warn('Failed to load attachments', err);
      setSelectedAssignment(Object.assign({}, assignment, { attachments: [] }));
    }
  };

  // Helper to render a grid of assignment cards (used for each tab's content)
  const renderAssignmentCards = (list, emptyLabel) => {
    if (!list || list.length === 0) {
      return (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No assignments found</h3>
          <p className="text-muted-foreground">{emptyLabel}</p>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((assignment) => (
          <Card 
            key={assignment.id} 
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              getVisibleStatus(assignment) === 'overdue' ? 'border-red-200 bg-red-50' : ''
            }`}
            onClick={() => openAssignmentDetails(assignment)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm line-clamp-2">{assignment.title}</h3>
                <div className="flex items-center gap-2">
                  {userRole === 'teacher' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={(e) => handleEditAssignment(assignment, e)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => handleDeleteAssignment(assignment, e)} className="text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <Badge className={`${getStatusColor(getVisibleStatus(assignment))} text-xs`}>
                    {getStatusIcon(getVisibleStatus(assignment))}
                    <span className="ml-1">{getVisibleStatus(assignment)}</span>
                  </Badge>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                {assignment.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <BookOpen className="h-3 w-3" />
                  <span>{getCourseName(assignment.course)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDateTime(getDueDate(assignment))}</span>
                </div>
                
                <div className={`flex items-center gap-2 text-xs ${
                  isOverdue(getDueDate(assignment)) ? 'text-red-600' : 'text-orange-600'
                }`}>
                  <Timer className="h-3 w-3" />
                  <span>{getTimeRemaining(getDueDate(assignment))} • {getHoursRemaining(getDueDate(assignment))} hours</span>
                </div>
                
                {assignment.attachments && assignment.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <FileText className="h-3 w-3" />
                    <span>{assignment.attachments.length} attachment(s)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const handleEditAssignment = (assignment, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setEditInitial(assignment);
    setEditMode(true);
    try { if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch (ex) { /* ignore */ }
    setCreateAssignmentOpen(true);
  };

  const handleDeleteAssignment = async (assignment, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!assignment || !assignment.id) return;
    if (!confirm(`Delete assignment "${assignment.title || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await api.deleteAssignment(assignment.id);
      // refresh list and close details if open
      await fetchAssignments();
      if (selectedAssignment && String(selectedAssignment.id) === String(assignment.id)) setSelectedAssignment(null);
    } catch (err) {
      console.error('Failed to delete assignment', err);
      alert((err && err.message) || 'Delete failed');
    }
  };

  useEffect(() => {
    // load assignments on mount
    fetchAssignments();
  }, []);

  useEffect(() => {
    // when a teacher opens an assignment, load real submissions for that assignment
    let mounted = true;
    const load = async () => {
      if (!selectedAssignment || userRole !== 'teacher') {
        if (mounted) setAssignmentSubmissions([]);
        return;
      }
      try {
        let subs = await api.getAssignmentSubmissions(selectedAssignment.id);
        if (!subs) {
          if (mounted) setAssignmentSubmissions([]);
          return;
        }
        
        // Normalize response (handle array, paginated, or single object)
        if (!Array.isArray(subs)) {
          if (subs.results && Array.isArray(subs.results)) {
            subs = subs.results;
          } else {
            subs = [subs];
          }
        }
        
        // Filter to only valid submissions that:
        // 1. Belong to the current assignment
        // 2. Have actual submitted content (file or text)
        const validSubs = subs.filter(s => {
          const belongsToAssignment = String(s.assignment) === String(selectedAssignment.id) || s.assignment === selectedAssignment.id;
          const hasSubmittedContent = s.submitted_file || s.submitted_file_url || s.submission_text || s.submissionText || s.submitted_text;
          return belongsToAssignment && hasSubmittedContent;
        });
        
        if (mounted) setAssignmentSubmissions(validSubs || []);
      } catch (err) {
        console.error('Failed to load submissions', err);
        if (mounted) setAssignmentSubmissions([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedAssignment, userRole]);

  // populate grading form when a submission is opened for grading
  useEffect(() => {
    if (!gradingSubmission || !gradingSubmission.submission) {
      setGradingScore('');
      setGradingGrade('');
      setGradingFeedback('');
      return;
    }
    const sub = gradingSubmission.submission;
    const score = sub.marks_obtained ?? sub.marks ?? sub.score ?? '';
    setGradingScore(score !== null && score !== undefined ? String(score) : '');
    setGradingGrade(sub.grade ?? '');
    setGradingFeedback(sub.teacher_feedback ?? sub.teacherFeedback ?? '');
  }, [gradingSubmission]);

  const getTimeRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days ${hours} hours`;
    return `${hours} hours`;
  };

  const getDueDate = (a) => (a?.dueDate ?? a?.due_date ?? a?.deadline ?? null);

  const getHoursRemaining = (dueDate) => {
    try {
      if (!dueDate) return 0;
      const now = new Date();
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) return 0;
      const diff = due.getTime() - now.getTime();
      if (diff <= 0) return 0;
      const hours = diff / (1000 * 60 * 60);
      return Math.round(hours * 10) / 10; // one decimal
    } catch (e) { return 0; }
  };

  const formatDateTime = (iso) => {
    try {
      if (!iso) return '';
      // If the server provided a DB-like timestamp (e.g. "2025-11-23 11:59:00"),
      // return it unchanged so the UI matches the DB value exactly (avoid
      // automatic timezone conversion by the browser).
      if (typeof iso === 'string' && iso.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
        return iso;
      }
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      // For ISO timestamps with timezone information, show localized string
      return d.toLocaleString();
    } catch (e) { return iso; }
  };

  const getCourseName = (course) => {
    if (!course) return 'Unknown';
    if (typeof course === 'object') return course.title || course.name || course.slug || String(course.id || 'Unknown');
    return String(course);
  };

  // Extract raw URL string from attachment which may be a string or an object
  const extractAttachmentUrl = (file) => {
    if (!file) return null;
    if (typeof file === 'string') return file;
    return file.file_url || file.fileUrl || file.url || null;
  };

  // Convert various Google Drive share links into an embeddable preview URL
  // Examples handled:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing -> /file/d/FILE_ID/preview
  // - https://drive.google.com/open?id=FILE_ID -> /file/d/FILE_ID/preview
  // - https://drive.google.com/uc?id=FILE_ID -> https://drive.google.com/uc?export=preview&id=FILE_ID
  const getDrivePreviewUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
      const u = rawUrl.trim();
      // file/d/FILE_ID pattern
      const m1 = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (m1 && m1[1]) return `https://drive.google.com/file/d/${m1[1]}/preview`;

      // open?id=FILE_ID or uc?id=FILE_ID
      const m2 = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m2 && m2[1]) {
        // prefer /file/d/ preview form
        return `https://drive.google.com/file/d/${m2[1]}/preview`;
      }

      // direct uc?export=download links -> try convert to preview
      const m3 = u.match(/drive\.google\.com\/uc\?export=download&id=([a-zA-Z0-9_-]+)/);
      if (m3 && m3[1]) return `https://drive.google.com/file/d/${m3[1]}/preview`;

      return null;
    } catch (e) {
      return null;
    }
  };

  const getTotalMarks = (a) => (a?.totalMarks ?? a?.total_marks ?? a?.total_marks_value ?? a?.total_marks ?? '—');

  const getWordLimit = (a) => (a?.wordLimit ?? a?.word_limit ?? a?.word_limit_value ?? null);

  const getAcceptedFormats = (a) => {
    const f = a?.fileTypes || a?.allowed_file_types || a?.file_types || a?.allowedFileTypes || null;
    if (!f) return [];
    if (Array.isArray(f)) return f;
    // if comma-separated string
    if (typeof f === 'string') return f.split(/\s*,\s*/);
    return [];
  };

  const getSubmissionInfo = (a) => {
    return {
      file: a?.submissionFile || a?.submittedFile || a?.submitted_file_url || a?.submitted_file || null,
      date: a?.submissionDate || a?.submission_date || a?.submitted_at || null,
      marks: a?.marks ?? a?.marks_obtained ?? a?.score ?? null,
      grade: a?.grade || null,
      feedback: a?.teacherFeedback || a?.teacher_feedback || null,
    };
  };

  

  const AssignmentDetailsDialog = () => (
    <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {selectedAssignment && (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between w-full">
                <div>
                  <DialogTitle>{selectedAssignment.title}</DialogTitle>
                  <DialogDescription>
                    View assignment details, requirements, and submission information.
                  </DialogDescription>
                </div>
                {userRole === 'teacher' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEditAssignment(selectedAssignment, e); }}>
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDeleteAssignment(selectedAssignment, e); }} className="text-red-600">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{getCourseName(selectedAssignment.course)}</Badge>
                  <Badge className={getStatusColor(getVisibleStatus(selectedAssignment))}>
                    {getStatusIcon(getVisibleStatus(selectedAssignment))}
                    <span className="ml-1">{getVisibleStatus(selectedAssignment)}</span>
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Due: {formatDateTime(getDueDate(selectedAssignment))}</p>
                  <p className="text-sm font-medium text-red-600">
                    {getTimeRemaining(getDueDate(selectedAssignment))} • {getHoursRemaining(getDueDate(selectedAssignment))} hours
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Assignment Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Course:</strong> {getCourseName(selectedAssignment.course)}</p>
                      <p><strong>Total Marks:</strong> {getTotalMarks(selectedAssignment)}</p>
                      {getWordLimit(selectedAssignment) && (
                        <p><strong>Word Limit:</strong> {getWordLimit(selectedAssignment)} words</p>
                      )}
                      <p><strong>Accepted Formats:</strong> { (getAcceptedFormats(selectedAssignment).length ? getAcceptedFormats(selectedAssignment).join(', ').toUpperCase() : 'Any') }</p>
                    </div>
                </div>

                {(userRole === 'student' || getVisibleStatus(selectedAssignment) === 'submitted' || getVisibleStatus(selectedAssignment) === 'graded') && (
                  <div>
                    <h4 className="font-semibold mb-2">Submission Details</h4>
                    <div className="space-y-2 text-sm">
                      {(() => {
                        // Prefer the logged-in student's submission when available
                        const studentSub = (userRole === 'student' && mySubmissionsMap && mySubmissionsMap[selectedAssignment?.id]) ? mySubmissionsMap[selectedAssignment.id] : null;
                        const submittedDate = studentSub?.submission_date || studentSub?.submitted_at || studentSub?.submissionDate || studentSub?.submittedAt || selectedAssignment.submissionDate || null;
                        const score = studentSub?.marks_obtained ?? studentSub?.marks ?? studentSub?.score ?? selectedAssignment.marks ?? null;
                        const grade = studentSub?.grade ?? selectedAssignment.grade ?? null;

                        return (
                          <>
                            {submittedDate && (
                              <p><strong>Submitted:</strong> {formatDateTime(submittedDate)}</p>
                            )}
                            {score !== null && (
                              <p><strong>Score:</strong> {score}/{selectedAssignment.totalMarks ?? getTotalMarks(selectedAssignment)}</p>
                            )}
                            {grade && (
                              <p><strong>Grade:</strong> {grade}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedAssignment.description}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Instructions</h4>
                <p className="text-sm">{selectedAssignment.instructions}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Reference Materials</h4>
                <div className="space-y-2">
                  {(selectedAssignment.attachments || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No reference PDF available.</div>
                  ) : (
                    (selectedAssignment.attachments || []).map((file, idx) => {
                      const u = extractAttachmentUrl(file);
                      const name = (file && file.file_name) ? file.file_name : (u ? u.split('/').pop() : `file-${idx}`);
                      // If this is a Google Drive link, prefer the embeddable preview URL so it opens as a PDF preview
                      const drivePreview = getDrivePreviewUrl(u);
                      const href = drivePreview || u;
                      return (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); href && window.open(href, '_blank', 'noopener,noreferrer'); } }}
                          onClick={() => { if (href) window.open(href, '_blank', 'noopener,noreferrer'); }}
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{name}</span>
                            </div>
                          </div>
                          <div>
                            {href ? (
                              <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline">
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </a>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedAssignment.teacherFeedback && (
                <div>
                  <h4 className="font-semibold mb-2">Teacher Feedback</h4>
                  <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p className="text-sm">{selectedAssignment.teacherFeedback}</p>
                  </div>
                </div>
              )}

              {userRole === 'student' && getVisibleStatus(selectedAssignment) === 'active' && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => {
                    try { if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch (e) { /* ignore */ }
                    // Close the details dialog and open the submission dialog.
                    // Preserve the assignment being submitted in `submissionAssignment`
                    try { setSubmissionAssignment(selectedAssignment); } catch (e) { /* ignore */ }
                    try { setSelectedAssignment(null); } catch (e) { /* ignore */ }
                    setSubmissionOpen(true);
                  }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Assignment
                  </Button>
                </div>
              )}

              {userRole === 'teacher' && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Student Submissions</h4>
                  <div className="space-y-3">
                    {assignmentSubmissions.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No submissions yet.</div>
                    ) : (
                      assignmentSubmissions.map((sub) => {
                        const student = sub.student || {};
                        const studentName = (student.first_name || student.last_name) ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : (student.username || student.email || `User ${student.id}`);
                        const rollNumber = student.student_profile?.roll_number || student.roll_number || null;
                        const fileUrl = sub.submitted_file_url || sub.submitted_file || null;
                        const submittedAt = sub.submission_date || sub.submitted_at || null;
                        const score = sub.marks_obtained ?? sub.marks ?? sub.score ?? null;
                        const status = sub.status || 'submitted';

                        return (
                          <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium">{studentName}</p>
                                {rollNumber && <p className="text-sm text-muted-foreground">{rollNumber}</p>}
                              </div>
                              <div>
                                {fileUrl ? (
                                  <div>
                                    <p className="text-sm">{fileUrl.split('/').pop()}</p>
                                    {submittedAt && <p className="text-xs text-muted-foreground">{formatDateTime(submittedAt)}</p>}
                                  </div>
                                ) : (
                                  <p className="text-sm text-red-600">Not submitted</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {score !== null && (
                                <div className="text-center">
                                  <p className="font-medium">{score}/{selectedAssignment?.totalMarks ?? getTotalMarks(selectedAssignment)}</p>
                                  <p className="text-xs text-muted-foreground">Grade</p>
                                </div>
                              )}
                              {fileUrl && (
                                <>
                                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" download onClick={(e) => { try { e.stopPropagation(); } catch (ex) {} }}>
                                    <Button size="sm" variant="outline" onClick={(e) => { try { e.stopPropagation(); } catch (ex) {} }}>
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                  </a>
                                  {status === 'submitted' && (
                                    <Button size="sm" onClick={() => {
                                      try { if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch (ex) { }
                                      // close the assignment details first, then open grading dialog after a short delay
                                      try { setSelectedAssignment(null); } catch (e) { /* ignore */ }
                                      try { setGradingSubmission({ submission: sub, assignment: selectedAssignment }); } catch (e) { /* ignore */ }
                                      // delay opening to avoid nested dialog overlap
                                      try { setTimeout(() => setGradingOpen(true), 120); } catch (e) { setGradingOpen(true); }
                                    }}>
                                      <Award className="h-3 w-3 mr-1" />
                                      Grade
                                    </Button>
                                  )}
                                  {status === 'graded' && (
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  const SubmissionDialog = () => (
    <Dialog open={submissionOpen} onOpenChange={(open) => { if (!open) setSubmissionAssignment(null); setSubmissionOpen(open); }}>
      <DialogContent className="max-w-xl">
        <form onSubmit={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Submit Assignment</DialogTitle>
          <DialogDescription>
            Upload your completed assignment and add any additional comments for your teacher.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Deadline Reminder</span>
            </div>
              <p className="text-sm text-yellow-700">
              Time remaining: {submissionAssignment ? getTimeRemaining(getDueDate(submissionAssignment)) : ''}
            </p>
          </div>

          <div>
            <Label>Upload Your Work</Label>
            <Input type="file" accept={submissionAssignment?.allowed_file_types ? submissionAssignment.allowed_file_types.map(type => `.${type}`).join(',') : undefined} onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} />
            {submissionFile ? (
              <p className="text-sm mt-2">Selected file: <strong>{submissionFile.name}</strong></p>
            ) : null}
            <p className="text-xs text-muted-foreground mt-1">
              Accepted formats: {submissionAssignment?.allowed_file_types ? submissionAssignment?.allowed_file_types.join(', ').toUpperCase() : 'Any'}
            </p>
          </div>

          <div>
            <Label>Additional Comments (Optional)</Label>
            <Textarea placeholder="Any additional notes for your teacher..." value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} />
          </div>

            <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={async () => {
              // Save draft: currently client-side only (placeholder)
              try {
                // TODO: implement server-side draft save
                alert('Draft saved (local only)');
              } catch (err) { console.error(err); }
            }}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button type="button" className="flex-1" onClick={async () => {
              if (!submissionAssignment) return;
              if (!submissionFile) {
                alert('Please choose a file to upload from your device before submitting.');
                return;
              }
              try {
                setSubmissionSubmitting(true);
                const res = await api.submitAssignment({ assignment: submissionAssignment.id, file: submissionFile, submission_text: submissionText });
                setSubmissionSubmitting(false);
                setSubmissionFile(null);
                setSubmissionText('');
                setSubmissionOpen(false);
                // refresh assignments list and the submission list for this assignment
                await fetchAssignments();
                try {
                  const subs = await api.getAssignmentSubmissions(submissionAssignment.id);
                  setAssignmentSubmissions(subs || []);
                    // update per-student submission mapping so UI updates immediately
                    if (submissionAssignment && submissionAssignment.id) {
                      setMySubmissionsMap((prev) => Object.assign({}, prev, { [submissionAssignment.id]: (subs && subs[0]) || res }));
                    }
                } catch (e) {
                  console.warn('Failed to refresh assignment submissions', e);
                }
                // update selectedAssignment with latest server copy if we have it in assignments
                try {
                  const updated = (await api.getAssignments()).find(a => a.id === submissionAssignment.id);
                  if (updated) setSelectedAssignment(updated);
                } catch (e) {
                  // ignore
                }
                toast.success('Submission saved');
              } catch (err) {
                console.error(err);
                setSubmissionSubmitting(false);
                alert(err.message || 'Submission failed');
              }
            }} disabled={submissionSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {submissionSubmitting ? 'Submitting...' : 'Submit Final'}
            </Button>
          </div>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  const GradingDialog = () => (
    <Dialog open={gradingOpen} onOpenChange={(open) => { setGradingOpen(open); if (!open) setGradingSubmission(null); }}>
      <DialogContent className="max-w-4xl">
        <form onSubmit={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Grade Assignment - {gradingSubmission?.assignment?.title || selectedAssignment?.title}</DialogTitle>
          <DialogDescription>
            Review the student submission and provide a grade with detailed feedback.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium mb-2">Student Submission</h4>
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <div className="text-sm break-all max-w-[70%] overflow-hidden">{gradingSubmission?.submission?.submitted_file_url || gradingSubmission?.submission?.submitted_file || selectedAssignment?.submittedFile}</div>
              </div>
              <Button type="button" size="sm" variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted: {gradingSubmission?.submission?.submission_date || gradingSubmission?.submission?.submitted_at || selectedAssignment?.submissionDate}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Score</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={gradingScore}
                  onChange={(e) => setGradingScore(e.target.value)}
                  max={gradingSubmission?.assignment?.total_marks || selectedAssignment?.totalMarks}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Out of {gradingSubmission?.assignment?.total_marks || selectedAssignment?.totalMarks}
                </p>
              </div>
            <div>
              <Label>Grade</Label>
              <Select value={gradingGrade} onValueChange={setGradingGrade} className="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+ (90-100%)</SelectItem>
                  <SelectItem value="A">A (80-89%)</SelectItem>
                  <SelectItem value="A-">A- (75-79%)</SelectItem>
                  <SelectItem value="B+">B+ (70-74%)</SelectItem>
                  <SelectItem value="B">B (65-69%)</SelectItem>
                  <SelectItem value="B-">B- (60-64%)</SelectItem>
                  <SelectItem value="C+">C+ (55-59%)</SelectItem>
                  <SelectItem value="C">C (50-54%)</SelectItem>
                  <SelectItem value="F">F (Below 50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Feedback & Comments</Label>
            <Textarea 
              placeholder="Provide detailed feedback for the student..." 
              className="min-h-[100px]"
              value={gradingFeedback}
              onChange={(e) => setGradingFeedback(e.target.value)}
            />
          </div>

            <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { toast.success('Draft saved locally'); }}>Save Draft</Button>
            <Button type="button" className="flex-1" onClick={async () => {
              if (!gradingSubmission || !gradingSubmission.submission || !gradingSubmission.submission.id) {
                alert('No submission selected to grade');
                return;
              }
              const max = Number(gradingSubmission?.assignment?.total_marks || selectedAssignment?.totalMarks || 0);
              const score = gradingScore === '' ? null : Number(gradingScore);
              if (score === null || isNaN(score)) {
                if (!gradingGrade) { alert('Please provide a score or select a grade'); return; }
              } else {
                if (max > 0 && (score < 0 || score > max)) { alert(`Score must be between 0 and ${max}`); return; }
              }
              try {
                setGradingSaving(true);
                const payload = {
                  marks_obtained: score,
                  grade: gradingGrade || null,
                  teacher_feedback: gradingFeedback || null,
                  status: 'graded'
                };
                // include current teacher id if available so backend can store graded_by_id
                try {
                  const raw = localStorage.getItem('user');
                  if (raw) {
                    const u = JSON.parse(raw);
                    const uid = u && (u.id || u.pk || u.user_id || u.userid || u.username) ? (u.id || u.pk || u.user_id || u.userid || null) : null;
                    if (uid) {
                      payload.graded_by_id = uid;
                      payload.graded_by = uid;
                    }
                  }
                } catch (e) { /* ignore if localStorage can't be read */ }
                const id = gradingSubmission.submission.id;
                const updated = await api.updateAssignmentSubmission(id, payload);
                toast.success('Grade submitted');
                setGradingSaving(false);
                setGradingOpen(false);
                setGradingSubmission(null);
                // refresh assignments and submissions
                await fetchAssignments();
                try {
                  if (selectedAssignment && selectedAssignment.id) {
                    const subs = await api.getAssignmentSubmissions(selectedAssignment.id);
                    setAssignmentSubmissions(subs || []);
                  }
                } catch (e) { console.warn('Failed to refresh submissions', e); }
                // update per-student mapping so the student sees their updated grade
                try {
                  const assignmentId = (gradingSubmission.assignment && gradingSubmission.assignment.id) || (selectedAssignment && selectedAssignment.id) || null;
                  if (assignmentId) {
                    setMySubmissionsMap((prev) => Object.assign({}, prev, { [assignmentId]: updated }));
                  }
                } catch (e) { /* ignore */ }
              } catch (err) {
                console.error('Failed to submit grade', err);
                setGradingSaving(false);
                alert((err && err.message) || 'Failed to submit grade');
              }
            }} disabled={gradingSaving}>
              <Send className="h-4 w-4 mr-2" />
              {gradingSaving ? 'Submitting...' : 'Submit Grade'}
            </Button>
          </div>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Assignments</h2>
        <div className="flex gap-2">
          {userRole === 'teacher' && (
            <Button onClick={() => { try { if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch (ex) { } setCreateAssignmentOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs - Remove status labels for teachers */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList>
          <TabsTrigger value="all">All Assignments</TabsTrigger>
          {userRole === 'student' && (
            <>
              <TabsTrigger value="active">Active ({activeList.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({submittedList.length})</TabsTrigger>
              <TabsTrigger value="graded">Graded ({gradedList.length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({overdueList.length})</TabsTrigger>
            </>
          )} 
          {userRole === 'teacher' && (
            <>
              <TabsTrigger value="active">Active ({activeList.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submissions ({submittedList.length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({overdueList.length})</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {renderAssignmentCards(assignments, 'No assignments available')}
        </TabsContent>
        <TabsContent value="active" className="space-y-4">
          {renderAssignmentCards(activeList, 'No active assignments')}
        </TabsContent>
        <TabsContent value="submitted" className="space-y-4">
          {renderAssignmentCards(submittedList, 'No submitted assignments')}
        </TabsContent>
        <TabsContent value="graded" className="space-y-4">
          {renderAssignmentCards(gradedList, 'No graded assignments')}
        </TabsContent>
        <TabsContent value="overdue" className="space-y-4">
          {renderAssignmentCards(overdueList, 'No overdue assignments')}
        </TabsContent>
      </Tabs>

      <CreateAssignmentDialog
        open={createAssignmentOpen}
        onOpenChange={(v) => { setCreateAssignmentOpen(v); if (!v) { setEditInitial(null); setEditMode(false); } }}
        onCreated={fetchAssignments}
        initial={editInitial}
        isEditing={editMode}
      />
      <AssignmentDetailsDialog />
      <SubmissionDialog />
      <GradingDialog />
    </div>
  );
}