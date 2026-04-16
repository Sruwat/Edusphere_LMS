import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getCourses, getEvents } from '../services/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Clipboard, 
  FileText,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Award
} from 'lucide-react';
import { createEvent as apiCreateEvent } from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function EnhancedCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date()); // Current month
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  // Track which event (by id) has inline action buttons expanded in the Upcoming Events list
  const [inlineSelectedId, setInlineSelectedId] = useState(null);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Helper to format date to yyyy-mm-dd for inputs and comparisons
  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Events state (loaded from API)
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // derive canonical username slug from logged-in user (fallbacks kept safe)
  const usernameSlug = (user && (user.username || user.email || 'user'))
    ? String(user.username || user.email || 'user').toLowerCase().replace(/\s+/g, '_')
    : 'user';
  const userRole = (user && (user.role || user.user_type)) ? String(user.role || user.user_type) : null;

  const routeFor = (type) => {
    const roleSegment = (userRole === 'teacher' ? 'teacher' : (userRole === 'student' ? 'student' : (user && user.role) || 'teacher'));
    if (type === 'live-class') return `/${roleSegment}/${usernameSlug}/live-classes`;
    if (type === 'test') return `/${roleSegment}/${usernameSlug}/tests`;
    if (type === 'assignment') return `/${roleSegment}/${usernameSlug}/assignments`;
    return `/${roleSegment}/${usernameSlug}`;
  };

  const transformEventFromAPI = (e, coursesList) => {
    const id = e.id;
    const type = e.event_type || e.type;
    const dateStr = e.event_date || e.date || e.scheduled_date || e.eventDate;
    const date = dateStr ? new Date(dateStr) : null;
    const time = e.start_time || e.time || '';

    const courseCandidates = [];
    if (e.course_title) courseCandidates.push(e.course_title);
    if (e.course_name) courseCandidates.push(e.course_name);
    if (e.course_obj && (e.course_obj.title || e.course_obj.name)) courseCandidates.push(e.course_obj.title || e.course_obj.name);

    // Prefer explicit candidate fields first
    let course = courseCandidates.find(Boolean) || '';

    // If still empty and course is provided as an object, use its title/name/id
    if (!course && e.course && typeof e.course === 'object') {
      course = e.course.title || e.course.name || String(e.course.id || '') || '';
    }

    // If still empty and course is an id (string/number), try to resolve from provided coursesList or component state `courses`
    const courseId = (e.course && typeof e.course !== 'object') ? String(e.course) : null;
    const lookupList = Array.isArray(coursesList) ? coursesList : Array.isArray(courses) ? courses : [];
    if (!course && courseId) {
      const found = lookupList.find((c) => String(c.id) === String(courseId));
      if (found) course = found.title || found.name || String(found.id);
      else course = String(courseId);
    }

    // Fallback to any residual string conversion
    if (!course) course = '';

    return Object.assign({ id, title: e.title || e.name || '', type, date, time, course }, e);
  };

  // Years range for selector (current year +/- 5)
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const arr = [];
    for (let i = y - 5; i <= y + 5; i++) arr.push(i);
    return arr;
  }, []);

  const eventTypes = {
    'live-class': { 
      color: 'bg-blue-500', 
      icon: Video, 
      label: 'Live Class',
      action: 'Join'
    },
    'test': { 
      color: 'bg-red-500', 
      icon: Clipboard, 
      label: 'Test',
      action: 'Start'
    },
    'assignment': { 
      color: 'bg-purple-500', 
      icon: FileText, 
      label: 'Assignment',
      action: 'View'
    }
  };

  const getEventTypeConfig = (type) => {
    if (!type) return { color: 'bg-gray-400', icon: CalendarIcon, label: 'Event', action: 'Open' };
    return eventTypes[type] || { color: 'bg-gray-400', icon: CalendarIcon, label: type, action: 'Open' };
  };

  // Courses loaded from backend for CreateEventDialog (use shared API helper so auth/base URL are correct)
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Form fields for Create Event
  const [eventTitle, setEventTitle] = useState('');
  const [eventTypeValue, setEventTypeValue] = useState('live-class');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        const items = await getCourses();
        if (!aborted) setCourses(items || []);
        // load events
        try {
          const ev = await getEvents();
          if (!aborted) setEvents((ev || []).map((it) => transformEventFromAPI(it, items)));
        } catch (ee) {
          console.warn('Failed to load events', ee);
          if (!aborted) setEvents([]);
        }
      } catch (e) {
        if (!aborted) setCourses([]);
      } finally {
        if (!aborted) setCoursesLoading(false);
      }
    };
    load();
    return () => { aborted = true; };
  }, []);

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const evDate = event.date instanceof Date ? event.date : new Date(event.date);
      return evDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const calendarRef = useRef(null);

  // Keep FullCalendar in sync when `currentDate` changes
  useEffect(() => {
    if (calendarRef.current && calendarRef.current.getApi) {
      const api = calendarRef.current.getApi();
      api.gotoDate(currentDate);
    }
  }, [currentDate]);

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  

  // Map events to FullCalendar format
  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: formatDateISO(e.date instanceof Date ? e.date : new Date(e.date)),
    allDay: true,
    extendedProps: { ...e }
  }));

  // Get upcoming events from today onwards
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = events
    .filter(event => {
      const d = event.date instanceof Date ? event.date : new Date(event.date);
      return d >= today;
    })
    .sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da.getTime() - db.getTime();
    })
    .slice(0, 6);

  // Events for a selected date (if any)
  const selectedDateEvents = selectedDate ? getEventsForDate(new Date(selectedDate)) : [];
  const displayTitle = selectedDate ? `Events on ${new Date(selectedDate).toLocaleDateString()}` : 'Upcoming Events';
  const displayEvents = selectedDate ? selectedDateEvents : upcomingEvents;



  // Note: the IIFE above is used to scope `typeCfg` safely while keeping JSX structure intact.
  // Now we replace the original body below with a safe rendering using `typeCfg`.
  
  // Recreate EventDetailsDialog using a function to avoid nested JSX confusion
  const EventDetailsDialog = () => {
    if (!selectedEvent) return (
      <Dialog open={false} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl" />
      </Dialog>
    );
    const typeCfg = getEventTypeConfig(selectedEvent.type);
    return (
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl" aria-describedby="event-details-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${typeCfg.color} flex items-center justify-center`}>
                {React.createElement(typeCfg.icon, { className: 'h-5 w-5 text-white' })}
              </div>
              <div>
                <div>{selectedEvent.title}</div>
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  {selectedEvent.course}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <DialogDescription id="event-details-desc">Details for the selected event: title, course, date and available actions.</DialogDescription>
            {/* Event Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Date:</span>
                  <span>{(selectedEvent.date instanceof Date ? selectedEvent.date : new Date(selectedEvent.date)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Time:</span>
                  <span>{selectedEvent.time}</span>
                </div>
                {selectedEvent.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Duration:</span>
                    <span>{selectedEvent.duration}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {selectedEvent.instructor && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Instructor:</span>
                    <span>{selectedEvent.instructor}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="w-fit">
                    {typeCfg.label}
                  </Badge>
                </div>
                {selectedEvent.totalMarks && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Total Marks:</span>
                    <span>{selectedEvent.totalMarks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 border-t pt-4">
              {selectedEvent.type === 'live-class' && (
                <Button className="flex-1" onClick={() => navigate(routeFor('live-class'))}>
                  <Video className="h-4 w-4 mr-2" />
                  Join Live Class
                </Button>
              )}

              {selectedEvent.type === 'test' && (
                <Button className="flex-1" onClick={() => navigate(routeFor('test'))}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Start Test
                </Button>
              )}

              {selectedEvent.type === 'assignment' && (
                <Button className="flex-1" onClick={() => navigate(routeFor('assignment'))}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Assignment
                </Button>
              )}
              
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  

  const CreateEventDialog = () => (
    <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
      <DialogContent className="max-w-2xl" aria-describedby="create-event-desc">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <DialogDescription id="create-event-desc">Create a new calendar event by providing title, type, course, date and time.</DialogDescription>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Event Title</Label>
              <Input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Enter event title" />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={eventTypeValue} onValueChange={setEventTypeValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live-class">Live Class</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {coursesLoading ? (
                    <SelectItem value="__loading" disabled>Loading courses...</SelectItem>
                  ) : courses.length === 0 ? (
                    <SelectItem value="__none" disabled>No courses available</SelectItem>
                  ) : (
                    courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </div>
          </div>

          

          <div className="flex gap-2">
            <Button className="flex-1" onClick={async () => {
              if (submitting) return;
              if (!eventTitle || !eventTypeValue || !selectedCourseId || !selectedDate || !eventTime) {
                toast.error('Please fill all fields');
                return;
              }
              setSubmitting(true);
              try {
                const payload = {
                  title: eventTitle,
                  event_type: eventTypeValue,
                  event_date: selectedDate,
                  start_time: eventTime,
                  course: Number(selectedCourseId),
                };
                const created = await apiCreateEvent(payload);
                toast.success('Event created');
                setEventTitle('');
                setEventTypeValue('live-class');
                setSelectedCourseId('');
                setSelectedDate('');
                setEventTime('');
                setCreateEventOpen(false);
                if (created) {
                  const newEv = transformEventFromAPI(created, courses);
                  setEvents((prev) => [newEv, ...prev]);
                  setSelectedEvent(null);
                }
              } catch (err) {
                console.error('Create event failed', err);
                toast.error(err && err.data && err.data.detail ? err.data.detail : (err.message || 'Failed to create event'));
              } finally {
                setSubmitting(false);
              }
            }}>{submitting ? 'Creating…' : 'Create Event'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setCreateEventOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1 bg-white"
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newMonth = Number(e.target.value);
                  const newDate = new Date(currentDate.getFullYear(), newMonth, 1);
                  setCurrentDate(newDate);
                }}
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                className="border rounded px-2 py-1 bg-white"
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newYear = Number(e.target.value);
                  const newDate = new Date(newYear, currentDate.getMonth(), 1);
                  setCurrentDate(newDate);
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Button variant="outline" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setSelectedDate('');
            setCreateEventOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
          <Button variant="outline" onClick={goToToday}>Today</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {/* FullCalendar integration */}
              <div className="px-4 py-3">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={false}
                  initialDate={currentDate}
                  events={fcEvents}
                  dateClick={(info) => {
                    // info.dateStr is YYYY-MM-DD
                    setSelectedDate(info.dateStr);
                    setSelectedEvent(null);
                    setCurrentDate(new Date(info.dateStr));
                  }}
                  eventClick={(info) => {
                    // Open the details dialog for the clicked event instead of navigating away.
                    const props = info.event.extendedProps || {};
                    const id = info.event.id;

                    // Try to find the normalized event in component state first
                    const fromState = events.find((ev) => String(ev.id) === String(id));
                    if (fromState) {
                      // If the user prefers navigation, route to teacher/student pages
                      const t = fromState.type || '';
                      const route = routeFor(t);
                      if (route) {
                        navigate(route);
                        return;
                      }

                      setSelectedEvent(fromState);
                      // collapse any inline actions
                      setInlineSelectedId(null);
                      return;
                    }

                    // Build a minimal event object from extendedProps and try routing first
                    const built = transformEventFromAPI(Object.assign({ id }, props), courses);
                    const route = routeFor(built.type);
                    if (route) {
                      navigate(route);
                      return;
                    }

                    setSelectedEvent(built);
                    setInlineSelectedId(null);
                  }}
                  /* prevent overlapping by letting calendar size to content */
                  height="auto"
                  contentHeight="auto"
                  expandRows={true}
                  dayMaxEventRows={3}
                  eventDisplay="auto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Event Legend */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Object.entries(eventTypes).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${config.color} flex items-center justify-center`}>
                      <config.icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm">{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Upcoming Events */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {displayTitle}
                </CardTitle>
                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate('')}>Clear</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{selectedDate ? 'No events for selected date' : 'No upcoming events'}</p>
                </div>
              ) : (
                displayEvents.map((event) => {
                  const eventType = getEventTypeConfig(event.type);
                  const date = event.date instanceof Date ? event.date : new Date(event.date);
                  return (
                    <div
                      key={event.id}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                          // Toggle inline action buttons for this event (separate from the details dialog)
                          setInlineSelectedId((prev) => (prev === event.id ? null : event.id));
                        }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${eventType.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <eventType.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1 truncate">{event.title}</h4>
                          <div className="text-xs text-muted-foreground mb-1">{eventType.label}</div>
                          <div className="text-xs text-muted-foreground">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {event.time}</div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">{event.course}</div>
                        </div>
                      </div>
                      {/* Inline action buttons when this event is selected */}
                      {inlineSelectedId === event.id && (
                        <div className="flex gap-2 border-t pt-3 mt-3">
                          {event.type === 'live-class' && (
                            <Button className="flex-1" onClick={() => navigate(routeFor('live-class'))}>
                              <Video className="h-4 w-4 mr-2" />
                              Join Live Class
                            </Button>
                          )}

                          {event.type === 'test' && (
                            <Button className="flex-1" onClick={() => navigate(routeFor('test'))}>
                              <Clipboard className="h-4 w-4 mr-2" />
                              Start Test
                            </Button>
                          )}

                          {event.type === 'assignment' && (
                            <Button className="flex-1" onClick={() => navigate(routeFor('assignment'))}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Assignment
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDetailsDialog />
      <CreateEventDialog />
    </div>
  );
}