import React, { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { 
  BookOpen, 
  Video, 
  Calendar as CalendarIcon,
  Bell,
  Trophy,
  Users,
  BarChart3,
  Clock,
  Award,
  Star,
  CheckCircle,
  Plus,
  MessageSquare,
  Brain,
  Target,
  TrendingUp,
  LogOut,
  User,
  Settings,
  Library,
  FileText,
  Eye,
  Edit,
  Menu,
  Activity,
  Zap,
  GraduationCap,
  Home,
  HelpCircle,
  Gamepad2
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { ErrorBoundary } from './error-boundary';
import { getCourses, getEnrollments, getLiveClasses, getNotifications, request as apiRequest } from '../services/api';

// Import lightweight components directly
import { SimpleCourses } from './simple-courses';
import { EnhancedDashboardSections } from './enhanced-dashboard-sections';
import { NotificationCenter } from './notification-center';

// Lazy load heavy components
const AITutor = lazy(() => import('./ai-tutor').then(module => ({ default: module.AITutor })));
const Achievements = lazy(() => import('./achievements').then(module => ({ default: module.Achievements })));
const EnhancedCalendar = lazy(() => import('./enhanced-calendar').then(module => ({ default: module.EnhancedCalendar })));
const EnhancedLibrary = lazy(() => import('./enhanced-library').then(module => ({ default: module.EnhancedLibrary })));
const AssignmentSystem = lazy(() => import('./assignment-system').then(module => ({ default: module.AssignmentSystem })));
const EnhancedTestSystem = lazy(() => import('./enhanced-test-system').then(module => ({ default: module.EnhancedTestSystem })));
const LiveClasses = lazy(() => import('./live-classes').then(module => ({ default: module.LiveClasses })));
const AttendanceManagement = lazy(() => import('./attendance-management').then(module => ({ default: module.AttendanceManagement })));
const GamesHub = lazy(() => import('./games-hub').then(module => ({ default: module.GamesHub })));
const AnalyticsDashboard = lazy(() => import('./analytics-dashboard').then(module => ({ default: module.AnalyticsDashboard })));
const UserManagement = lazy(() => import('./user-management').then(module => ({ default: module.UserManagement })));
const AnnouncementsSystem = lazy(() => import('./announcements-system').then(module => ({ default: module.AnnouncementsSystem })));
const UserProfile = lazy(() => import('./user-profile').then(module => ({ default: module.UserProfile })));
const SettingsPanel = lazy(() => import('./settings-panel').then(module => ({ default: module.SettingsPanel })));

import exampleStudentBanner from '../assets/Banner.jpeg';
import exampleTeacherBanner from '../assets/Banner.jpeg';
import exampleAdminBanner from '../assets/Banner.jpeg';
import { ImageWithFallback } from './figma/ImageWithFallback';

// Loading component
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export function OptimizedLMSDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
   
  const userRole = user?.role || params.role;
  const userId = user?.id || null;
  // Derive a stable username slug for URLs and a friendly display name.
  const usernameSlug = (user?.username || params.username || 'user').toString();
  const userName = (user?.first_name || user?.last_name)
    ? `${(user?.first_name || '').trim()} ${(user?.last_name || '').trim()}`.trim()
    : (user?.username || params.username || 'User');
  // Ensure the URL role segment matches the authenticated user's role.
  // If the route contains a stale role (e.g. `/student/...`) but the logged-in
  // user is a teacher, redirect to the correct role path preserving the page.
  React.useEffect(() => {
    try {
      const routeRole = params.role;
      if (user && routeRole && routeRole !== user.role) {
        const parts = location.pathname.split('/').filter(Boolean);
        const currentPage = parts[2] || '';
        const username = (user.username || params.username || 'user').toString().toLowerCase().replace(/\s+/g, '_');
        navigate(`/${user.role}/${username}/${currentPage}`, { replace: true });
      }
    } catch (err) {
      // swallow any redirect errors to avoid breaking the dashboard
      // navigation will continue to work without this guard.
      // eslint-disable-next-line no-console
      console.warn('Role sync redirect failed', err);
    }
  }, [user, params.role, location.pathname, navigate]);
  
  // Extract the current page for highlighting active navigation
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = pathParts[2] || 'dashboard';
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Unread announcements count - in production, fetch from API
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseCreationMode, setCourseCreationMode] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    student: { enrolledCourses: 0, averageScore: 0, studyHours: 0, rank: 0 },
    teacher: { coursesTeaching: 0, totalStudents: 0, avgProgress: 0, avgScore: 0 },
    admin: { totalUsers: 0, activeCourses: 0, platformRevenue: 0, systemHealth: 0 }
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  const navigateToPage = (page) => {
    const username = usernameSlug.toLowerCase().replace(/\s+/g, '_');
    navigate(`/${userRole}/${username}/${page}`);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch dashboard stats from API
  useEffect(() => {
    let cancelled = false;

    const normalizeArray = (data) => (Array.isArray(data) ? data : (data?.results || []));

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        // Suppress console errors for endpoints that may not exist or require database
        const originalError = console.error;
        console.error = () => {};
        
        const basePromises = [
          getCourses().catch(() => []),
          getEnrollments().catch(() => []),
          getLiveClasses().catch(() => []),
          getNotifications({ limit: 50 }).catch(() => []),
        ];

        // conditional fetches based on role
        const attendancePromise = (userRole === 'student' || userRole === 'teacher')
          ? apiRequest('/attendance/').catch(() => [])
          : Promise.resolve([]);
        const testSubsPromise = (userRole === 'student' || userRole === 'teacher')
          ? apiRequest('/test-submissions/').catch(() => [])
          : Promise.resolve([]);
        const usersPromise = userRole === 'admin'
          ? apiRequest('/users').catch(() => [])
          : Promise.resolve([]);
        const activityLogsPromise = userRole === 'student'
          ? apiRequest('/activity-logs/').catch(() => [])
          : Promise.resolve([]);
        const userDataPromise = (userRole === 'student' && userId)
          ? apiRequest('/auth/me').catch(() => null)
          : Promise.resolve(null);

        const [coursesRes, enrollmentsRes, liveClassesRes, notificationsRes, attendanceRes, testSubsRes, usersRes, activityLogsRes, userDataRes] = await Promise.all([
          ...basePromises,
          attendancePromise,
          testSubsPromise,
          usersPromise,
          activityLogsPromise,
          userDataPromise,
        ]);
        
        console.error = originalError;

        if (cancelled) {
          console.error = originalError;
          return;
        }

        const coursesList = normalizeArray(coursesRes);
        const enrollmentsList = normalizeArray(enrollmentsRes);
        const liveClassesList = normalizeArray(liveClassesRes);
        const attendanceList = normalizeArray(attendanceRes);
        const testSubsList = normalizeArray(testSubsRes);
        const usersList = normalizeArray(usersRes);
        const activityLogsList = normalizeArray(activityLogsRes);
        const userData = userDataRes;

        if (userRole === 'student' && userId) {
          const myEnrollments = enrollmentsList.filter((e) => e.student === userId);
          const myCourseIds = myEnrollments.map((e) => e.course);
          const myLiveClasses = liveClassesList.filter((c) => !c.course || myCourseIds.includes(typeof c.course === 'object' ? c.course.id : c.course));
          const attendanceRecords = attendanceList.filter((r) => r.student === userId);
          
          // Calculate study hours from multiple sources
          let totalStudyHours = 0;
          
          // 1. Calculate from last_login (time since account creation or login)
          if (userData?.last_login) {
            const lastLogin = new Date(userData.last_login);
            const now = new Date();
            const hoursSinceLastLogin = Math.max(0, (now - lastLogin) / (1000 * 60 * 60));
            
            // If user logged in recently (within last 24 hours), count as active session 
            if (hoursSinceLastLogin <= 24) {
              totalStudyHours += hoursSinceLastLogin;
            }
          }
          
          // 2. Add hours from activity logs (each activity represents engagement)
          const myActivityLogs = activityLogsList.filter((log) => {
            const logUserId = typeof log.user === 'object' ? log.user?.id : log.user;
            return logUserId === userId;
          });
          
          // Estimate 0.5 hours per meaningful activity (viewing courses, submissions, etc.)
          const activityBasedHours = myActivityLogs.length * 0.5;
          totalStudyHours += activityBasedHours;
          
          // 3. Add hours from attendance records (each session = estimated duration)
          const attendanceBasedHours = attendanceRecords.length * 1; // 1 hour per session
          totalStudyHours += attendanceBasedHours;
          
          // 4. Add hours from live class attendance
          const liveClassHours = myLiveClasses
            .filter((cls) => cls.status === 'completed')
            .reduce((sum, cls) => sum + ((cls.duration || cls.duration_minutes || 60) / 60), 0);
          totalStudyHours += liveClassHours;
          
          // Round to 1 decimal place
          totalStudyHours = Math.round(totalStudyHours * 10) / 10;
          
          const avgScore = testSubsList.length
            ? Math.round(testSubsList.reduce((sum, s) => sum + (s.score || s.marks_obtained || s.total_score || 0), 0) / testSubsList.length)
            : 0;

          setDashboardStats((prev) => ({
            ...prev,
            student: {
              enrolledCourses: myEnrollments.length,
              averageScore: avgScore,
              studyHours: totalStudyHours,
              rank: myLiveClasses.length, // placeholder: number of upcoming/live classes as engagement proxy
            },
          }));
        }

        if (userRole === 'teacher' && userId) {
          const myCourses = coursesList.filter((c) => {
            const instructorId = typeof c.instructor === 'object' ? c.instructor?.id : c.instructor;
            const createdById = typeof c.created_by === 'object' ? c.created_by?.id : c.created_by;
            return instructorId === userId || createdById === userId;
          });
          const myCourseIds = myCourses.map((c) => c.id);
          const studentsSet = new Set();
          enrollmentsList.forEach((e) => {
            if (myCourseIds.includes(e.course)) studentsSet.add(e.student);
          });
          const myStudentIds = Array.from(studentsSet);
          
          // Calculate average test score from students' test submissions
          const studentTestSubmissions = testSubsList.filter((sub) => 
            myStudentIds.includes(sub.student)
          );
          const avgTestScore = studentTestSubmissions.length
            ? Math.round(studentTestSubmissions.reduce((sum, s) => {
                const score = s.score ?? s.marks_obtained ?? s.percentage ?? s.total_score ?? 0;
                const maxScore = s.max_score ?? s.total_marks ?? s.max_marks ?? 100;
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : score;
                return sum + percentage;
              }, 0) / studentTestSubmissions.length)
            : 0;
          
          const avgProgress = myCourses.length
            ? Math.round(myCourses.reduce((sum, c) => sum + (c.progress || c.completion_rate || 0), 0) / myCourses.length)
            : 0;

          setDashboardStats((prev) => ({
            ...prev,
            teacher: {
              coursesTeaching: myCourses.length,
              totalStudents: studentsSet.size,
              avgProgress,
              avgScore: avgTestScore,
            },
          }));
        }

        if (userRole === 'admin') {
          setDashboardStats((prev) => ({
            ...prev,
            admin: {
              totalUsers: usersList.length,
              activeCourses: coursesList.length,
              platformRevenue: 0,
              systemHealth: 100,
            },
          }));
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };

    loadStats();
    return () => { cancelled = true; };
  }, [userRole, userId]);

  const currentStats = dashboardStats[userRole] || { enrolledCourses: 0, averageScore: 0, studyHours: 0, rank: 0 };

  const NavigationItem = ({ icon, label, value, active, badge }) => (
    <Button
      variant={active ? 'default' : 'ghost'}
      className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : ''}`}
      onClick={() => navigateToPage(value)}
    >
      {icon}
      {!sidebarCollapsed && (
        <div className="flex items-center justify-between w-full ml-2">
          <span>{label}</span>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
      )}
    </Button>
  );

  const DashboardBanner = () => {
    const bannerProps = {
      student: {
        title: `Welcome back, ${userName}!`,
        subtitle: 'Continue your learning journey. You\'re doing great!',
        actions: [
          { icon: MessageSquare, label: 'AI Tutor', onClick: () => navigateToPage('ai-tutor') },
          { icon: Award, label: 'Take Test', onClick: () => navigateToPage('tests') },
          { icon: Library, label: 'Browse Library', onClick: () => navigateToPage('library') },
          { icon: FileText, label: 'View Assignments', onClick: () => navigateToPage('assignments') }
        ],
        image: exampleStudentBanner
      },
      teacher: {
        title: `Welcome back, ${userName}!`,
        subtitle: 'Manage your courses and track student progress effectively.',
        actions: [
          { icon: Plus, label: 'Create Course', onClick: () => navigateToPage('courses/create') },
          { icon: FileText, label: 'Create Assignment', onClick: () => navigateToPage('assignments') },
          { icon: HelpCircle, label: 'Create Test', onClick: () => navigateToPage('tests') },
          { icon: Video, label: 'Start Class', onClick: () => navigateToPage('live-classes') }
        ],
        image: exampleTeacherBanner
      },
      admin: {
        title: `Welcome back, ${userName}!`,
        subtitle: 'Monitor platform performance and manage all system operations.',
        actions: [
          { icon: Users, label: 'Manage Users', onClick: () => navigateToPage('user-management') },
          { icon: BarChart3, label: 'View Analytics', onClick: () => navigateToPage('analytics') },
          { icon: Bell, label: 'Send Notice', onClick: () => navigateToPage('announcements') }
        ],
        image: exampleAdminBanner
      }
    };

    const banner = bannerProps[userRole];

    return (
      <div className="relative overflow-hidden rounded-lg mb-6">
        <ImageWithFallback 
          src={banner.image} 
          alt={`${userRole} banner`}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent">
          <div className="p-6 text-white h-full flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-2">{banner.title}</h2>
            <p className="text-white/90 mb-4">{banner.subtitle}</p>
            <div className="flex flex-wrap gap-3">
              {banner.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SimpleDashboard = () => (
    <div className="space-y-6">
      <DashboardBanner />
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {userRole === 'student' && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Courses</p>
                    <p className="text-2xl font-bold">{currentStats.enrolledCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-2xl font-bold">{currentStats.averageScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Study Hours</p>
                    <p className="text-2xl font-bold">{currentStats.studyHours}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Rank</p>
                    <p className="text-2xl font-bold">#{currentStats.rank}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        
        {userRole === 'teacher' && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">My Courses</p>
                    <p className="text-2xl font-bold">{currentStats.coursesTeaching}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Students</p>
                    <p className="text-2xl font-bold">{currentStats.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Progress</p>
                    <p className="text-2xl font-bold">{currentStats.avgProgress}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Score</p>
                    <p className="text-2xl font-bold">{currentStats.avgScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        
        {userRole === 'admin' && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{currentStats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Courses</p>
                    <p className="text-2xl font-bold">{currentStats.activeCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">${currentStats.platformRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Health</p>
                    <p className="text-2xl font-bold">{currentStats.systemHealth}%</p>
                  </div>
                </div>
              </CardContent> 
            </Card>
          </>
        )}
      </div>

      {/* Enhanced Dashboard Sections */}
      <EnhancedDashboardSections userRole={userRole} userId={userId} />
    </div>
  );

  // Helper to wrap lazy-loaded components with ErrorBoundary and Suspense
  const renderLazyRoute = (Component, props = {}) => (
    <ErrorBoundary>
      <Suspense fallback={<ComponentLoader />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { icon: <Home className="h-4 w-4" />, label: 'Dashboard', value: 'dashboard' },
      { icon: <BookOpen className="h-4 w-4" />, label: 'Courses', value: 'courses' }
    ];

    if (userRole === 'student') {
      return [
        ...baseItems,
        { icon: <FileText className="h-4 w-4" />, label: 'Assignments', value: 'assignments' },
        { icon: <HelpCircle className="h-4 w-4" />, label: 'Tests', value: 'tests' },
        { icon: <CalendarIcon className="h-4 w-4" />, label: 'Calendar', value: 'calendar' },
        { icon: <Clock className="h-4 w-4" />, label: 'Attendance', value: 'attendance' },
        { icon: <Library className="h-4 w-4" />, label: 'Library', value: 'library' },
        { icon: <Brain className="h-4 w-4" />, label: 'AI Tutor', value: 'ai-tutor' },
        { icon: <Trophy className="h-4 w-4" />, label: 'Achievements', value: 'achievements' },
        { icon: <Gamepad2 className="h-4 w-4" />, label: 'Games', value: 'games' },
        { icon: <Video className="h-4 w-4" />, label: 'Live Classes', value: 'live-classes' },
        { icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics', value: 'analytics' },
        { icon: <Bell className="h-4 w-4" />, label: 'Announcements', value: 'announcements', badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
        { icon: <User className="h-4 w-4" />, label: 'Profile', value: 'profile' },
        { icon: <Settings className="h-4 w-4" />, label: 'Settings', value: 'settings' }
      ];
    } else if (userRole === 'teacher') {
      return [
        ...baseItems,
        { icon: <Library className="h-4 w-4" />, label: 'Library', value: 'library' },
        { icon: <FileText className="h-4 w-4" />, label: 'Assignments', value: 'assignments' },
        { icon: <HelpCircle className="h-4 w-4" />, label: 'Tests', value: 'tests' },
        { icon: <Video className="h-4 w-4" />, label: 'Live Classes', value: 'live-classes' },
        { icon: <CalendarIcon className="h-4 w-4" />, label: 'Calendar', value: 'calendar' },
        { icon: <Users className="h-4 w-4" />, label: 'Students', value: 'students' },
        { icon: <Clock className="h-4 w-4" />, label: 'Attendance', value: 'attendance' },
        { icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics', value: 'analytics' },
        { icon: <Bell className="h-4 w-4" />, label: 'Announcements', value: 'announcements', badge: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : null },
        { icon: <User className="h-4 w-4" />, label: 'Profile', value: 'profile' },
        { icon: <Settings className="h-4 w-4" />, label: 'Settings', value: 'settings' }
      ];
    } else { // admin
      return [
        ...baseItems,
        { icon: <Users className="h-4 w-4" />, label: 'User Management', value: 'user-management' },
        { icon: <Clock className="h-4 w-4" />, label: 'Attendance', value: 'attendance' },
        { icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics', value: 'analytics' },
        { icon: <Bell className="h-4 w-4" />, label: 'Announcements', value: 'announcements' },
        { icon: <User className="h-4 w-4" />, label: 'Profile', value: 'profile' },
        { icon: <Settings className="h-4 w-4" />, label: 'Settings', value: 'settings' }
      ];
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div
        className={`border-r transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
        style={{
          backgroundColor: 'var(--sidebar)',
          color: 'var(--sidebar-foreground)',
          borderColor: 'var(--sidebar-border)'
        }}
      >
        <div className="p-4">
          <div className="flex items-center gap-3">
            {!sidebarCollapsed && (
              <>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">Saras Edu Hub</span>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-2 space-y-1">
          {getNavigationItems().map((item) => (
            <NavigationItem
              key={item.value}
              icon={item.icon}
              label={item.label}
              value={item.value}
              active={currentPage === item.value}
              badge={item.badge}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="border-b px-6 py-4"
          style={{ backgroundColor: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold capitalize">{currentPage.replace(/-/g, ' ')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                      {String(userName || 'U').split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase()}
                    </AvatarFallback> 
                </Avatar>
                <div className="hidden sm:block">
                  <p className="font-medium">{userName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{userRole}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-background text-foreground">
          <Routes>
            <Route index element={<SimpleDashboard />} />
            <Route path="dashboard" element={<SimpleDashboard />} />
            <Route path="courses" element={<SimpleCourses userRole={userRole} />} />
            <Route path="courses/*" element={<SimpleCourses userRole={userRole} />} />
            <Route path="ai-tutor" element={renderLazyRoute(AITutor)} />
            <Route path="achievements" element={renderLazyRoute(Achievements)} />
            <Route path="calendar" element={renderLazyRoute(EnhancedCalendar)} />
            <Route path="library" element={renderLazyRoute(EnhancedLibrary)} />
            <Route path="assignments" element={renderLazyRoute(AssignmentSystem, { userRole })} />
            <Route path="assignments/*" element={renderLazyRoute(AssignmentSystem, { userRole })} />
            <Route path="tests" element={renderLazyRoute(EnhancedTestSystem, { userRole })} />
            <Route path="tests/*" element={renderLazyRoute(EnhancedTestSystem, { userRole })} />
            <Route path="live-classes" element={renderLazyRoute(LiveClasses, { userRole })} />
            <Route path="attendance" element={renderLazyRoute(AttendanceManagement, { userRole })} />
            <Route path="games" element={renderLazyRoute(GamesHub)} />
            <Route path="analytics" element={renderLazyRoute(AnalyticsDashboard, { userRole, userId })} />
            <Route path="students" element={renderLazyRoute(UserManagement, { userType: userRole === 'teacher' ? 'teacher' : 'student', onSelectStudent: setSelectedStudent, currentUser: user })} />
            <Route path="user-management" element={renderLazyRoute(UserManagement, { userType: 'all', currentUser: user })} />
            <Route path="announcements" element={renderLazyRoute(AnnouncementsSystem, { userRole })} />
            <Route path="profile" element={renderLazyRoute(UserProfile, { userRole, userId, userName })} />
            <Route path="settings" element={renderLazyRoute(SettingsPanel, { userRole })} />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}