import React, { useState, useEffect } from 'react';
import { getCourses, getLiveClasses, createLiveClass, deleteLiveClass, updateLiveClass } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Video, 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Play, 
  Link,
  Copy,
  Edit,
  Trash2,
  UserCheck,
  MessageSquare
} from 'lucide-react';

// Props/types removed for JS build. Live classes should be fetched from API.
export function LiveClasses({ userRole }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);

  // editing state
  const [editClass, setEditClass] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // load live classes from backend
  const [liveClasses, setLiveClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');

  const apiFetch = async (url, opts = {}) => {
    const base = (window?.ENV && window.ENV.API_BASE) || '';
    const headers = opts.headers || {};
    // include JWT access token if present in localStorage
    const token = localStorage.getItem('access') || localStorage.getItem('token') || null;
    if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(base + url, { ...opts, headers });
      let data = {};
      try { data = await res.json(); } catch (e) { data = {}; }
      if (!res.ok) {
        console.error('apiFetch non-ok', { url: base + url, status: res.status, data });
        throw { status: res.status, data };
      }
      console.debug('apiFetch ok', { url: base + url, data });
      return data;
    } catch (err) {
      console.error('apiFetch error', err);
      throw err;
    }
  };

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        const list = await getLiveClasses();
        // normalize to expected UI shape
        const norm = (Array.isArray(list) ? list : (list.results || [])).map((p) => {
          const scheduledTimeRaw = p.scheduled_time || p.scheduledTime || null;
          const durationVal = p.duration_minutes || p.duration || 0;

          // compute status from time when scheduledTime is present, otherwise fall back to server status
          const computeStatus = (scheduledTime, durationMinutes) => {
            if (!scheduledTime) return 'scheduled';
            const start = new Date(scheduledTime).getTime();
            if (Number.isNaN(start)) return 'scheduled';
            const durMs = (Number(durationMinutes) || 0) * 60 * 1000;
            const now = Date.now();
            const end = start + durMs;
            if (now >= start && now <= end) return 'live';
            if (now < start) return 'scheduled';
            return 'completed';
          };

          const computedStatus = computeStatus(scheduledTimeRaw, durationVal);
          const finalStatus = scheduledTimeRaw ? computedStatus : (p.status || 'scheduled');

          return {
            id: p.id,
            title: p.title || p.name || `Class ${p.id}`,
            instructor: (p.instructor && (p.instructor.first_name || p.instructor.username)) ? `${p.instructor.first_name || ''} ${p.instructor.last_name || ''}`.trim() : (p.instructor ? (p.instructor.username || p.instructor.email) : ''),
            description: p.description || '',
            scheduledTime: scheduledTimeRaw,
            duration: durationVal,
            course: p.course || (p.course && p.course.id) || null,
            zoomLink: p.zoom_link || p.zoomLink || '',
            zoomPassword: p.zoom_password || p.zoomPassword || '',
            status: finalStatus
          };
        });
        setLiveClasses(norm);
      } catch (e) {
        console.error('failed to load live classes', e);
        setLiveClasses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Fetch courses — when authenticated as teacher the API will scope to their courses
    const loadCourses = async () => {
      try {
        const list = await getCourses();
        console.debug('courses response', list);
        const normalized = (Array.isArray(list) ? list : (list.results || [])).map(c => ({ id: c.id, title: c.title || c.name || `Course ${c.id}`, raw: c }));
        setCourses(normalized);
      } catch (e) {
        console.error('failed to load courses', e);
        setCourses([]);
      }
    };
    loadCourses();
  }, []);

  const upcomingClasses = liveClasses.filter(cls => cls.status === 'scheduled');
  const currentClasses = liveClasses.filter(cls => cls.status === 'live');
  const pastClasses = liveClasses.filter(cls => cls.status === 'completed');

  const joinClass = (classData) => {
    // In a real implementation, this would integrate with Zoom API
    if (classData?.zoomLink) window.open(classData.zoomLink, '_blank');
    
    // Mock attendance marking for teachers (placeholder)
    if (userRole === 'teacher') {
      setAttendanceData(prev => ({
        ...prev,
        [classData?.id]: {
          present: [],
          absent: [],
          total: 0
        }
      }));
    }
  };

  const createClass = (formData) => {
    // Collect form values by id and POST to backend
    try {
      const title = document.getElementById('title')?.value || '';
      const course = selectedCourse || null;
      const date = document.getElementById('date')?.value || null;
      const time = document.getElementById('time')?.value || null;
      const duration = parseInt(document.getElementById('duration')?.value || 0, 10) || 0;
      const description = document.getElementById('description')?.value || '';
      const zoomLink = document.getElementById('zoomLink')?.value || '';
      const zoomPassword = document.getElementById('zoomPassword')?.value || '';

      let scheduled_time = null;
      if (date) {
        // combine date and time into ISO string if possible
        const dt = time ? new Date(`${date}T${time}`) : new Date(`${date}`);
        if (!Number.isNaN(dt.getTime())) scheduled_time = dt.toISOString();
      }

      const payload = {
        title,
        course: course ? parseInt(course, 10) : null,
        description,
        scheduled_time,
        duration_minutes: duration,
        zoom_link: zoomLink,
        zoom_password: zoomPassword,
        status: 'scheduled'
      };
      // basic client-side validation to avoid easy 400s
      if (!payload.title || !payload.course) {
        console.error('Missing required fields for LiveClass creation', { title: payload.title, course: payload.course });
        // keep dialog open so user can fix form
        return;
      }

      // debug payload
      console.debug('Create live class payload', payload);
      createLiveClass(payload).then((created) => {
        // normalize created
        const c = {
          id: created.id,
          title: created.title || created.name || `Class ${created.id}`,
          instructor: created.instructor ? (created.instructor.username || '') : '',
          description: created.description || '',
          scheduledTime: created.scheduled_time || null,
          duration: created.duration_minutes || 0,
          zoomLink: created.zoom_link || '',
          zoomPassword: created.zoom_password || '',
          status: created.status || 'scheduled'
        };
        setLiveClasses(prev => [c, ...prev]);
        setShowCreateDialog(false);
      }).catch(err => {
        // show detailed server validation errors when available
        console.error('Create failed', err);
        if (err && err.data) {
          console.error('Create API response data:', err.data);
          // if DRF validation errors, they are in err.data
        }
        setShowCreateDialog(false);
      });
    } catch (e) {
      console.error(e);
      setShowCreateDialog(false);
    }
  };

  const updateClass = (id) => {
    try {
      const title = document.getElementById('edit_title')?.value || '';
      const course = document.getElementById('edit_course')?.value || selectedCourse || null;
      const date = document.getElementById('edit_date')?.value || null;
      const time = document.getElementById('edit_time')?.value || null;
      const duration = parseInt(document.getElementById('edit_duration')?.value || 0, 10) || 0;
      const description = document.getElementById('edit_description')?.value || '';
      const zoomLink = document.getElementById('edit_zoomLink')?.value || '';
      const zoomPassword = document.getElementById('edit_zoomPassword')?.value || '';

      let scheduled_time = null;
      if (date) {
        const dt = time ? new Date(`${date}T${time}`) : new Date(`${date}`);
        if (!Number.isNaN(dt.getTime())) scheduled_time = dt.toISOString();
      }

      const payload = {
        title,
        course: course ? parseInt(course, 10) : null,
        description,
        scheduled_time,
        duration_minutes: duration,
        zoom_link: zoomLink,
        zoom_password: zoomPassword,
      };

      updateLiveClass(id, payload).then((updated) => {
        const scheduledTimeRaw = updated.scheduled_time || updated.scheduledTime || null;
        const durationVal = updated.duration_minutes || updated.duration || 0;
        const computeStatus = (scheduledTime, durationMinutes) => {
          if (!scheduledTime) return 'scheduled';
          const start = new Date(scheduledTime).getTime();
          if (Number.isNaN(start)) return 'scheduled';
          const durMs = (Number(durationMinutes) || 0) * 60 * 1000;
          const now = Date.now();
          const end = start + durMs;
          if (now >= start && now <= end) return 'live';
          if (now < start) return 'scheduled';
          return 'completed';
        };
        const computedStatus = computeStatus(scheduledTimeRaw, durationVal);
        const normalized = {
          id: updated.id,
          title: updated.title || updated.name || `Class ${updated.id}`,
          instructor: updated.instructor ? (updated.instructor.username || '') : '',
          description: updated.description || '',
          scheduledTime: scheduledTimeRaw,
          duration: durationVal,
          zoomLink: updated.zoom_link || updated.zoomLink || '',
          zoomPassword: updated.zoom_password || updated.zoomPassword || '',
          status: scheduledTimeRaw ? computedStatus : (updated.status || 'scheduled')
        };
        setLiveClasses(prev => prev.map(c => c.id === normalized.id ? normalized : c));
        setShowEditDialog(false);
        setEditClass(null);
      }).catch(err => {
        console.error('Update failed', err);
        setShowEditDialog(false);
        setEditClass(null);
      });
    } catch (e) {
      console.error(e);
      setShowEditDialog(false);
      setEditClass(null);
    }
  };

  const markAttendance = (classId, studentId, status) => {
    // Placeholder for attendance marking functionality
    console.log(`Marking ${studentId} as ${status} for class ${classId}`);
  };

  const deleteClass = (id) => {
    deleteLiveClass(id)
      .then(() => setLiveClasses(prev => prev.filter(c => c.id !== id)))
      .catch(err => console.error('Delete failed', err));
  };

  

  

  const CreateClassDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Live Class</DialogTitle>
          <DialogDescription>
            Schedule a new live class session with Zoom integration for your students.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Class Title</Label>
              <Input id="title" placeholder="e.g., Advanced Mathematics - Integration" />
            </div>
            <div>
              <Label htmlFor="course">Course</Label>
              <Select onValueChange={(v) => setSelectedCourse(v)} value={selectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course">{selectedCourse ? (courses.find(cc => String(cc.id) === String(selectedCourse)) || {}).title : null}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <SelectItem value="none" disabled>No courses</SelectItem>
                  ) : (
                    courses.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input id="duration" type="number" placeholder="60" />
            </div>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="Brief description of the class content..." 
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zoomLink">Zoom Meeting Link</Label>
              <Input id="zoomLink" placeholder="https://zoom.us/j/123456789" />
            </div>
            <div>
              <Label htmlFor="zoomPassword">Meeting Password</Label>
              <Input id="zoomPassword" placeholder="Enter password" />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => createClass({})}>
              Create Class
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

    const EditClassDialog = () => {
      const dt = editClass && editClass.scheduledTime ? new Date(editClass.scheduledTime) : null;
      const defaultDate = dt ? dt.toISOString().slice(0,10) : '';
      const defaultTime = dt ? dt.toTimeString().slice(0,5) : '';

      return (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Live Class</DialogTitle>
              <DialogDescription>
                Update live class details. Changes will be saved to the backend.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_title">Class Title</Label>
                  <Input id="edit_title" defaultValue={editClass?.title || ''} />
                </div>
                <div>
                  <Label htmlFor="edit_course">Course</Label>
                  <Select onValueChange={(v) => setSelectedCourse(v)} value={selectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course">{selectedCourse ? (courses.find(cc => String(cc.id) === String(selectedCourse)) || {}).title : null}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {courses.length === 0 ? (
                        <SelectItem value="none" disabled>No courses</SelectItem>
                      ) : (
                        courses.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_date">Date</Label>
                  <Input id="edit_date" type="date" defaultValue={defaultDate} />
                </div>
                <div>
                  <Label htmlFor="edit_time">Time</Label>
                  <Input id="edit_time" type="time" defaultValue={defaultTime} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_duration">Duration (minutes)</Label>
                  <Input id="edit_duration" type="number" defaultValue={editClass?.duration || ''} />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Textarea id="edit_description" defaultValue={editClass?.description || ''} rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_zoomLink">Zoom Meeting Link</Label>
                  <Input id="edit_zoomLink" defaultValue={editClass?.zoomLink || ''} />
                </div>
                <div>
                  <Label htmlFor="edit_zoomPassword">Meeting Password</Label>
                  <Input id="edit_zoomPassword" defaultValue={editClass?.zoomPassword || ''} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditClass(null); }}>
                  Cancel
                </Button>
                <Button onClick={() => updateClass(editClass?.id)}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    };

  const ClassCard = ({ classData, showActions = true }) => (
    <Card className={`hover:shadow-lg transition-shadow ${
      classData.status === 'live' ? 'border-red-200 bg-red-50' : 
      classData.status === 'scheduled' ? 'border-blue-200 bg-blue-50' : 
      'border-gray-200'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{classData.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{classData.instructor}</p>
            <p className="text-sm text-muted-foreground mb-3">{classData.description}</p>
          </div>
          <Badge variant={
            classData.status === 'live' ? 'destructive' :
            classData.status === 'scheduled' ? 'default' :
            'outline'
          }>
            {classData.status === 'live' ? 'LIVE' : classData.status.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{classData.scheduledTime ? new Date(classData.scheduledTime).toLocaleDateString() : 'TBD'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{classData.scheduledTime ? new Date(classData.scheduledTime).toLocaleTimeString() : '—'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <span>{classData.duration ? `${classData.duration} minutes` : '—'}</span>
          </div>
        </div>

        {userRole === 'teacher' && classData.zoomLink && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Zoom Link:</span>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(classData.zoomLink)}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-all">{classData.zoomLink}</p>
              {classData.zoomPassword && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Password:</span>
                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(classData.zoomPassword)}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs font-mono">{classData.zoomPassword}</p>
                </>
              )}
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex gap-2">
            {classData.status === 'live' && (
              <Button 
                onClick={() => joinClass(classData)}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Join Live Class
              </Button>
            )}
            
            {classData.status === 'scheduled' && (
              <>
                {userRole === 'student' ? (
                  <Button 
                    variant="outline" 
                    onClick={() => joinClass(classData)}
                    className="flex-1"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                ) : (
                  <Button 
                    onClick={() => joinClass(classData)}
                    className="flex-1"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Start Class
                  </Button>
                )}
              </>
            )}

            {userRole === 'teacher' && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditClass(classData); setSelectedCourse(classData.course ? String(classData.course) : ''); setShowEditDialog(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>

                {classData.status === 'live' && (
                  <Button variant="outline" size="sm">
                    <UserCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => deleteClass(classData.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const AttendancePanel = ({ classData }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Mark Attendance - {classData.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Mock student list for attendance */}
          {[
            { id: '1', name: 'John Doe', status: null },
            { id: '2', name: 'Jane Smith', status: 'present' },
            { id: '3', name: 'Mike Johnson', status: 'absent' },
            { id: '4', name: 'Sarah Wilson', status: null },
          ].map((student) => (
            <div key={student.id} className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">{student.name}</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={student.status === 'present' ? 'default' : 'outline'}
                  onClick={() => markAttendance(classData.id, student.id, 'present')}
                >
                  Present
                </Button>
                <Button 
                  size="sm" 
                  variant={student.status === 'absent' ? 'destructive' : 'outline'}
                  onClick={() => markAttendance(classData.id, student.id, 'absent')}
                >
                  Absent
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4">
          Save Attendance
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Live Classes</h2>
          <p className="text-muted-foreground">
            {userRole === 'student' 
              ? 'Join live classes and interactive sessions'
              : 'Manage and conduct live classes with students'
            }
          </p>
        </div>
        {userRole === 'teacher' && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Live Class
          </Button>
        )}
      </div>

      {/* Live Classes Now */}
      {currentClasses.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-red-600">🔴 Live Now</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentClasses.map((classData) => (
              <ClassCard key={classData.id} classData={classData} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Classes */}
      <div>
        <h3 className="text-xl font-semibold mb-4">📅 Upcoming Classes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingClasses.map((classData) => (
            <ClassCard key={classData.id} classData={classData} />
          ))}
        </div>
      </div>

      {/* Past Classes */}
      <div>
        <h3 className="text-xl font-semibold mb-4">📚 Past Classes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pastClasses.map((classData) => (
            <ClassCard key={classData.id} classData={classData} showActions={false} />
          ))}
        </div>
      </div>

      {/* Attendance Panel for Teachers */}
      {userRole === 'teacher' && selectedClass && (
        <AttendancePanel classData={selectedClass} />
      )}

      {/* Create Class Dialog */}
      <CreateClassDialog />
      <EditClassDialog />
    </div>
  );
}