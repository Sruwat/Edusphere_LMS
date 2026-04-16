import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Video,
  Clock,
  Calendar,
  Activity,
  BookOpen,
  Users,
  AlertTriangle,
  Bell,
  Award,
  Mail,
  Settings,
  BarChart3,
  FileText,
  ExternalLink,
  UserPlus,
  BookMarked,
  CheckCircle,
  Zap
} from 'lucide-react';
import {
  getAnnouncements,
  getCourses,
  getEnrollments,
  getEvents,
  getLiveClasses,
  getNotifications,
  request as apiRequest,
} from '../services/api';

// Pulls dashboard sections data from the API and renders per-role sections.
export function EnhancedDashboardSections({ userRole, userId }) {
  const [liveClasses, setLiveClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Suppress console errors for endpoints that may not exist or require database
        const originalError = console.error;
        console.error = () => {};
        
        const [live, courseList, ann, notif, enr, attendance, evt, activityLogsRes, systemAlertsRes] = await Promise.all([
          getLiveClasses().catch(() => []),
          getCourses().catch(() => []),
          getAnnouncements().catch(() => []),
          getNotifications({ limit: 12 }).catch(() => []),
          getEnrollments().catch(() => []),
          apiRequest('/attendance/').catch(() => []),
          getEvents().catch(() => []),
          apiRequest('/activity-logs/').catch(() => []),
          apiRequest('/system-alerts/').catch(() => []),
        ]);
        
        console.error = originalError;

        if (cancelled) {
          console.error = originalError;
          return;
        }

        const normalizeArray = (data) => (Array.isArray(data) ? data : (data?.results || []));

        const normalizedLive = normalizeArray(live).map((p) => {
          const scheduledTimeRaw = p.scheduled_time || p.scheduledTime || null;
          const durationVal = p.duration_minutes || p.duration || 0;

          const computeStatus = (scheduledTime, durationMinutes) => {
            if (!scheduledTime) return p.status || 'scheduled';
            const start = new Date(scheduledTime).getTime();
            if (Number.isNaN(start)) return 'scheduled';
            const durMs = (Number(durationMinutes) || 0) * 60 * 1000;
            const now = Date.now();
            const end = start + durMs;
            if (now >= start && now <= end) return 'live';
            if (now < start) return 'scheduled';
            return 'completed';
          };

          const status = computeStatus(scheduledTimeRaw, durationVal);
          const courseId = typeof p.course === 'object' ? p.course?.id : p.course;
          const instructor = p.instructor || p.teacher || p.created_by || null;
          const instructorId = typeof instructor === 'object' ? instructor?.id : instructor;
          const instructorName = (instructor && typeof instructor === 'object')
            ? `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim() || instructor.username || instructor.email || ''
            : '';

          return {
            id: p.id,
            courseId,
            title: p.title || p.name || `Class ${p.id}`,
            teacher: instructorName,
            scheduledTime: scheduledTimeRaw,
            duration: durationVal,
            platform: p.platform || (p.zoom_link ? 'Zoom' : 'Online'),
            status,
            instructorId,
          };
        });

        setLiveClasses(normalizedLive);
        setCourses(normalizeArray(courseList));
        setAnnouncements(normalizeArray(ann));
        setNotifications(normalizeArray(notif));
        setEnrollments(normalizeArray(enr));
        setAttendanceRecords(normalizeArray(attendance));
        setEvents(normalizeArray(evt));
        setActivityLogs(normalizeArray(activityLogsRes));
        setSystemAlerts(normalizeArray(systemAlertsRes));
      } catch (err) {
        setLiveClasses([]);
        setCourses([]);
        setAnnouncements([]);
        setNotifications([]);
        setEnrollments([]);
        setAttendanceRecords([]);
        setEvents([]);
        setActivityLogs([]);
        setSystemAlerts([]);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userRole, userId]);

  const studentEnrollments = useMemo(() => (
    enrollments.filter((enr) => (userRole === 'student' && userId) ? enr.student === userId : true)
  ), [enrollments, userRole, userId]);

  const studentCourseIds = useMemo(() => studentEnrollments.map((e) => e.course), [studentEnrollments]);

  const studentUpcomingClasses = useMemo(() => {
    const now = Date.now();
    return liveClasses.filter((cls) => {
      if (userRole !== 'student') return false;
      if (!studentCourseIds.length) return true;
      if (!studentCourseIds.includes(cls.courseId)) return false;
      
      // Only show upcoming or live classes (not past classes)
      if (cls.scheduledTime) {
        const classTime = new Date(cls.scheduledTime).getTime();
        if (Number.isFinite(classTime)) {
          // Include if live or scheduled in future
          return cls.status === 'live' || classTime > now;
        }
      }
      
      // Include if no scheduled time or status indicates it's upcoming/live
      return cls.status === 'live' || cls.status === 'scheduled';
    }).sort((a, b) => new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0));
  }, [liveClasses, studentCourseIds, userRole]);

  const studentRecentActivity = useMemo(() => {
    const iconMap = {
      course_viewed: { icon: BookOpen, color: 'text-blue-600' },
      video_watched: { icon: Video, color: 'text-purple-600' },
      assessment_submitted: { icon: FileText, color: 'text-orange-600' },
      test_submitted: { icon: Award, color: 'text-green-600' },
      file_downloaded: { icon: FileText, color: 'text-gray-600' },
      live_class_attended: { icon: Video, color: 'text-red-600' },
      ai_tutor_chat: { icon: Zap, color: 'text-yellow-600' },
      event_added: { icon: Calendar, color: 'text-teal-600' },
      announcement: { icon: Bell, color: 'text-blue-600' },
      notification: { icon: Activity, color: 'text-green-600' },
    };

    const allowedActivityTypes = new Set([
      'course_viewed',
      'video_watched',
      'assessment_submitted',
      'test_submitted',
      'file_downloaded',
      'live_class_attended',
      'ai_tutor_chat',
      'event_added',
    ]);

    const activity = [];

    // Add activity logs for meaningful student actions
    activityLogs
      .filter((log) => {
        if (!userId) return false;
        const logUserId = typeof log.user === 'object' ? log.user?.id : log.user;
        if (logUserId !== userId) return false;
        return !allowedActivityTypes.size || allowedActivityTypes.has(log.activity_type);
      })
      .forEach((log) => {
        const activityInfo = iconMap[log.activity_type] || { icon: Activity, color: 'text-blue-600' };
        activity.push({
          id: `act-${log.id}`,
          title: log.title || log.activity_type?.replace(/_/g, ' ') || 'Activity',
          course: log.description || log.course_name || 'Learning Activity',
          time: log.created_at || '',
          icon: activityInfo.icon,
          color: activityInfo.color,
        });
      });

    // Add announcements
    announcements.slice(0, 6).forEach((a) => {
      activity.push({
        id: `ann-${a.id}`,
        title: a.title || 'Announcement',
        course: a.course ? (a.course.title || a.course.name || a.course) : 'Platform',
        time: a.created_at || a.updated_at || a.published_at || '',
        icon: Bell,
        color: 'text-blue-600',
      });
    });

    // Add notifications
    notifications.slice(0, 6).forEach((n) => {
      activity.push({
        id: `notif-${n.id}`,
        title: n.title || n.message || 'Notification',
        course: n.context || n.category || 'Update',
        time: n.created_at || n.timestamp || '',
        icon: Activity,
        color: 'text-green-600',
      });
    });

    // Sort by time (newest first) and limit to 8 items
    activity.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return activity.slice(0, 8);
  }, [announcements, notifications, activityLogs, userId]);

  const attendanceSummary = useMemo(() => {
    if (!userId) return { present: 0, total: 0, percent: 0 };
    const records = attendanceRecords.filter((r) => r.student === userId);
    const total = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const percent = total ? Math.round((present / total) * 100) : 0;
    return { present, total, percent };
  }, [attendanceRecords, userId]);

  const teacherRecentActivity = useMemo(() => {
    const allowedTypes = new Set([
      'course_created',
      'lecture_uploaded',
      'assignment_created',
      'grade_posted',
      'test_created',
      'live_class_scheduled',
      'event_created',
      'attendance_marked',
      'profile_updated',
    ]);

    const iconMap = {
      course_created: BookOpen,
      lecture_uploaded: FileText,
      assignment_created: FileText,
      grade_posted: CheckCircle,
      test_created: Award,
      live_class_scheduled: Video,
      event_created: Calendar,
      attendance_marked: Users,
      profile_updated: Settings,
      announcement: Bell,
    };

    const items = [];

    announcements.slice(0, 6).forEach((a) => {
      items.push({
        id: `ann-${a.id}`,
        title: a.title || 'Announcement',
        subtitle: a.course ? (a.course.title || a.course.name || a.course) : 'Platform',
        time: a.created_at || a.updated_at || a.published_at || '',
        type: 'announcement',
      });
    });

    activityLogs
      .filter((log) => !allowedTypes.size || allowedTypes.has(log.activity_type))
      .forEach((log) => {
        items.push({
          id: `act-${log.id}`,
          title: log.title || log.activity_type?.replace(/_/g, ' ') || 'Activity',
          subtitle: log.description || log.user_name || log.activity_type,
          time: log.created_at || '',
          type: log.activity_type,
        });
      });

    items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return items.slice(0, 8).map((item) => ({
      ...item,
      Icon: iconMap[item.type] || Activity,
    }));
  }, [announcements, activityLogs]);

  const teacherTodayItems = useMemo(() => {
    const todayLabel = new Date().toDateString();
    const items = [];

    liveClasses.forEach((cls) => {
      const date = cls.scheduledTime ? new Date(cls.scheduledTime) : null;
      const isToday = date ? date.toDateString() === todayLabel : false;
      if (!isToday) return;
      if (cls.instructorId && cls.instructorId !== userId) return;
      items.push({
        id: `class-${cls.id}`,
        title: cls.title,
        time: date,
        subtitle: cls.platform || 'Online',
        type: 'class',
      });
    });

    events.forEach((evt) => {
      const rawDate = evt.start_time || evt.start || evt.date || evt.startDate;
      const date = rawDate ? new Date(rawDate) : null;
      const isToday = date ? date.toDateString() === todayLabel : false;
      if (!isToday) return;
      items.push({
        id: `event-${evt.id}`,
        title: evt.title || evt.name || 'Event',
        time: date,
        subtitle: evt.location || 'Event',
        type: 'event',
      });
    });

    items.sort((a, b) => (a.time || 0) - (b.time || 0));
    return items;
  }, [liveClasses, events, userId]);

  const StudentSections = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {studentUpcomingClasses.length === 0 ? (
              <div className="text-sm text-muted-foreground">No classes at this time</div>
            ) : (
              studentUpcomingClasses.map((class_) => (
                <div key={class_.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${class_.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                    <div>
                      <h4 className="font-medium">{class_.title}</h4>
                      <p className="text-sm text-muted-foreground">{class_.teacher || 'Instructor TBD'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{class_.scheduledTime ? new Date(class_.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
                        <span>•</span>
                        <span>{class_.scheduledTime ? new Date(class_.scheduledTime).toLocaleDateString() : 'Date TBC'}</span>
                        <span>•</span>
                        <span>{class_.platform || 'Online'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {class_.status === 'live' && (
                      <Badge className="bg-red-100 text-red-700">Live Now</Badge>
                    )}
                    <Button size="sm" className={class_.status === 'live' ? 'bg-red-600 hover:bg-red-700' : ''}>
                      <Video className="h-3 w-3 mr-1" />
                      {class_.status === 'live' ? 'Join Now' : 'Join Class'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {studentRecentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            ) : (
              studentRecentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    {activity.icon ? <activity.icon className={`h-4 w-4 ${activity.color || ''}`} /> : null}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    <p className="text-xs text-muted-foreground">{activity.course}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{activity.time ? new Date(activity.time).toLocaleString() : ''}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Present</span>
              <Badge variant="outline">{attendanceSummary.present}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Total Sessions</span>
              <Badge variant="secondary">{attendanceSummary.total}</Badge>
            </div>
            <Progress value={attendanceSummary.percent} />
            <p className="text-xs text-muted-foreground">Attendance rate {attendanceSummary.percent}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const TeacherSections = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses
              .filter((c) => {
                const instructorId = typeof c.instructor === 'object' ? c.instructor?.id : c.instructor;
                const createdById = typeof c.created_by === 'object' ? c.created_by?.id : c.created_by;
                return instructorId === userId || createdById === userId;
              })
              .map((course) => {
                const courseId = course.id;
                const now = Date.now();
                const nextClass = liveClasses
                  .filter((cls) => {
                    if (cls.courseId !== courseId || !cls.scheduledTime) return false;
                    const ts = new Date(cls.scheduledTime).getTime();
                    return Number.isFinite(ts) && ts > now;
                  })
                  .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))[0];
                const studentsCount =
                  course.total_enrollments ??
                  course.enrollments_count ??
                  course.enrolled_students ??
                  course.students_count ??
                  course.total_students ??
                  0;

                const teacherSlug =
                  (course.created_by && (course.created_by.username || course.created_by.email || course.created_by.id)) ||
                  (course.instructor && (course.instructor.username || course.instructor.email || course.instructor.id)) ||
                  course.instructor_username ||
                  'devesh';

                const courseUrl = `${window.location.origin.replace(/\/$/, '')}/teacher/${teacherSlug}/courses`;

                const goToCourse = () => {
                  window.open(courseUrl, '_self');
                };

                return (
                  <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{course.title || course.name || `Course ${course.id}`}</h4>
                      <Badge variant="secondary">{studentsCount} students</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        Next class: {nextClass?.scheduledTime ? new Date(nextClass.scheduledTime).toLocaleString() : 'TBD'}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1" onClick={goToCourse}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Course
                      </Button>
                      <Button size="sm" variant="outline" onClick={goToCourse}>Edit</Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teacherTodayItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No items scheduled for today</div>
            ) : (
              teacherTodayItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 ${item.type === 'event' ? 'bg-purple-500' : 'bg-blue-500'} rounded-full`} />
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {item.subtitle ? ` • ${item.subtitle}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.type === 'event' ? 'Event' : 'Class'}</Badge>
                    {item.type === 'class' && (
                      <Button size="sm" variant="outline">
                        <Video className="h-3 w-3 mr-1" />
                        Start Class
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teacherRecentActivity.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent activity</div>
            ) : (
              teacherRecentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <activity.Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time ? new Date(activity.time).toLocaleString() : ''}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AdminSections = () => {
    const getActivityIcon = (activityType) => {
      const iconMap = {
        'user_registered': { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100' },
        'course_published': { icon: BookMarked, color: 'text-blue-600', bg: 'bg-blue-100' },
        'assignment_submitted': { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' },
        'test_completed': { icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
        'system_maintenance': { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
        'user_enrolled': { icon: Users, color: 'text-teal-600', bg: 'bg-teal-100' },
        'announcement_posted': { icon: Bell, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        'system_alert': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
      };
      return iconMap[activityType] || { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' };
    };

    const formatTimeAgo = (dateString) => {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              ) : (
                activityLogs.slice(0, 6).map((activity) => {
                  const { icon: IconComponent, color, bg } = getActivityIcon(activity.activity_type);
                  return (
                    <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{activity.title}</p>
                        {activity.user_name && <p className="text-xs text-muted-foreground">{activity.user_name}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatTimeAgo(activity.created_at)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemAlerts.length === 0 ? (
              <div className="text-sm text-muted-foreground">All systems operational</div>
            ) : (
              systemAlerts.slice(0, 6).map((alert) => {
                const severityStyles = {
                  critical: { dot: 'bg-red-600', badge: 'destructive', bgColor: 'bg-red-50' },
                  high: { dot: 'bg-orange-500', badge: 'destructive', bgColor: 'bg-orange-50' },
                  medium: { dot: 'bg-yellow-500', badge: 'default', bgColor: 'bg-yellow-50' },
                  low: { dot: 'bg-blue-500', badge: 'secondary', bgColor: 'bg-blue-50' }
                };
                const styles = severityStyles[alert.severity] || severityStyles.low;
                const statusMap = {
                  active: 'Active',
                  resolved: 'Resolved',
                  investigating: 'Investigating',
                  monitoring: 'Monitoring'
                };
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 border rounded-lg ${styles.bgColor}`}>
                    <div className={`w-2 h-2 rounded-full ${styles.dot} flex-shrink-0 mt-2`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                      {alert.affected_service && (
                        <p className="text-xs text-muted-foreground mt-1">Service: {alert.affected_service}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge variant={styles.badge} className="text-xs">
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {statusMap[alert.status] || alert.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administrative Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'Manage Users', icon: Users, description: 'Add, edit, or remove users', color: 'text-blue-600', bgColor: 'bg-blue-100' },
              { title: 'Course Overview', icon: BookOpen, description: 'View all courses and statistics', color: 'text-green-600', bgColor: 'bg-green-100' },
              { title: 'Send Notice', icon: Mail, description: 'Send platform-wide announcements', color: 'text-purple-600', bgColor: 'bg-purple-100' },
              { title: 'System Settings', icon: Settings, description: 'Configure platform settings', color: 'text-orange-600', bgColor: 'bg-orange-100' }
            ].map((action, index) => (
              <Button key={index} variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 p-4 hover:bg-gray-50">
                <div className={`w-8 h-8 rounded-full ${action.bgColor} flex items-center justify-center`}>
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-xs">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    );
  };

  switch (userRole) {
    case 'student':
      return <StudentSections />;
    case 'teacher':
      return <TeacherSections />;
    case 'admin':
      return <AdminSections />;
    default:
      return <StudentSections />;
  }
}
