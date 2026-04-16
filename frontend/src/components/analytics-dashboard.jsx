import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
// removed time range Select UI per request
import { Loader2 } from 'lucide-react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Clock, 
  Award, 
  Target,
  Activity,
  PieChart,
  LineChart,
  Calendar,
  // Download icon removed per request
  MessageSquare,
  Brain,
  Lightbulb,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Cell, Pie, AreaChart, Area } from 'recharts';
import { getStudentAnalytics, getTeacherAnalytics, getAdminAnalytics } from '../services/analyticsService';

// Props/type annotations removed for JS build. Fetch analytics from API in production.
export function AnalyticsDashboard({ userRole, userId }) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('monthly');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default empty state for analytics data
  const defaultStudentAnalytics = {
    overview: { overallScore: 0, studyHours: 0, totalCourses: 0, rank: 0, totalStudents: 0 },
    coursePerformance: [],
    studyActivity: [],
    recentScores: []
  };
  const defaultTeacherAnalytics = {
    overview: { totalStudents: 0, avgProgress: 0, avgScore: 0, studyTime: 0 },
    engagementMetrics: [],
    coursePerformance: [],
    aiInsights: { trends: [], concerns: [], recommendations: [] }
  };
  const defaultAdminAnalytics = {
    userAnalytics: {
      activeUsers: { daily: 0, weekly: 0, monthly: 0 },
      newRegistrations: { students: 0, teachers: 0, thisMonth: 0 },
      engagement: { avgTime: 0, logins: 0, dropouts: 0 }
    },
    courseAnalytics: { completion: 0, averageGrades: 0, engagement: 0, popular: [] },
    performance: [],
    systemWide: { 
      usage: [], 
      content: { totalFiles: 0, totalVideos: 0, totalQuizzes: 0, monthlyUploads: 0 },
      health: { uptimePercent: 0, dbPerfScore: 0, apiLatencyMs: 0, apiResponseScore: 0 }
    }
  };

  const [studentAnalytics, setStudentAnalytics] = useState(defaultStudentAnalytics);
  const [teacherAnalytics, setTeacherAnalytics] = useState(defaultTeacherAnalytics);
  const [adminAnalytics, setAdminAnalytics] = useState(defaultAdminAnalytics);

  // Fetch analytics data based on user role
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (userRole === 'student' && userId) {
          const data = await getStudentAnalytics(userId, selectedTimeRange);
          if (data) setStudentAnalytics(data);
        } else if (userRole === 'teacher' && userId) {
          const data = await getTeacherAnalytics(userId, selectedTimeRange);
          if (data) setTeacherAnalytics(data);
        } else if (userRole === 'admin') {
          const data = await getAdminAnalytics(selectedTimeRange);
          if (data) setAdminAnalytics(data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError('Failed to load analytics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [userRole, userId, selectedTimeRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const StudentAnalyticsView = ({ analytics }) => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold">{analytics.overview.overallScore}%</p>
                <p className="text-xs text-green-600">0% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Study Hours</p>
                <p className="text-2xl font-bold">{analytics.overview.studyHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold">{analytics.overview.totalCourses}</p>
                <p className="text-xs text-green-600">All active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-2xl font-bold">#{analytics.overview.rank}</p>
                <p className="text-xs text-muted-foreground">of {analytics.overview.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Course Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.coursePerformance.length > 0 ? (
                analytics.coursePerformance.map((course, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{course.course}</span>
                      <Badge variant="outline">{course.score}%</Badge>
                    </div>
                    <Progress value={course.progress} />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress: {course.progress}%</span>
                      <span>Assignments: {course.assignments} | Tests: {course.tests}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No course data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Study Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Study Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.studyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.studyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })} />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
                  <Area type="monotone" dataKey="hours" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No activity data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const TeacherAnalyticsView = ({ analytics }) => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{analytics.overview.totalStudents}</div>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{analytics.overview.avgProgress}%</div>
              <p className="text-sm text-muted-foreground">Avg Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Award className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{analytics.overview.avgScore}%</div>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{(analytics.overview.studyTime / 60).toFixed(0)}h</div>
              <p className="text-sm text-muted-foreground">Total Study Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.engagementMetrics.length > 0 ? (
                analytics.engagementMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{metric.metric}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={metric.value} className="flex-1" />
                        <span className="text-sm font-medium">{metric.value}%</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 text-green-600">
                      {metric.trend}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No engagement data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Course Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.coursePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="course" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgScore" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No course data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI-Generated Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Positive Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.aiInsights.trends.length > 0 ? (
                analytics.aiInsights.trends.map((trend, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <p className="text-sm">{trend}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No trends available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.aiInsights.concerns.length > 0 ? (
                analytics.aiInsights.concerns.map((concern, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                    <p className="text-sm">{concern}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No concerns reported</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.aiInsights.recommendations.length > 0 ? (
                analytics.aiInsights.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recommendations available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const AdminAnalyticsView = ({ analytics }) => (
    <div className="space-y-6">
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="courses">Course Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System-Wide</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Daily</span>
                    <span className="font-bold">{analytics.userAnalytics.activeUsers.daily}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekly</span>
                    <span className="font-bold">{analytics.userAnalytics.activeUsers.weekly}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly</span>
                    <span className="font-bold">{analytics.userAnalytics.activeUsers.monthly}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Registrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Students</span>
                    <span className="font-bold">{analytics.userAnalytics.newRegistrations.students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teachers</span>
                    <span className="font-bold">{analytics.userAnalytics.newRegistrations.teachers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month</span>
                    <span className="font-bold text-green-600">{analytics.userAnalytics.newRegistrations.thisMonth}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Avg Time (hrs)</span>
                    <span className="font-bold">{analytics.userAnalytics.engagement.avgTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logins/Week</span>
                    <span className="font-bold">{analytics.userAnalytics.engagement.logins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dropouts (%)</span>
                    <span className="font-bold text-red-600">{analytics.userAnalytics.engagement.dropouts}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Peak Usage Hours</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.systemWide.usage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.systemWide.usage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No usage data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analytics.courseAnalytics.completion}%</div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytics.courseAnalytics.averageGrades}%</div>
                  <p className="text-sm text-muted-foreground">Average Grades</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{analytics.courseAnalytics.engagement}%</div>
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{analytics.courseAnalytics.popular.length}</div>
                  <p className="text-sm text-muted-foreground">Popular Courses</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Popular Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.courseAnalytics.popular.length > 0 ? (
                  analytics.courseAnalytics.popular.map((course, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.enrollments} enrollments</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{course.rating}★</Badge>
                        <Progress value={(course.enrollments / 400) * 100} className="w-20" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No course data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.performance.length > 0 ? (
              analytics.performance.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{item.value}</div>
                      <p className="font-medium">{item.category}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">No performance data available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Files</span>
                    <span className="font-bold">{analytics.systemWide.content.totalFiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Videos</span>
                    <span className="font-bold">{analytics.systemWide.content.totalVideos.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Quizzes</span>
                    <span className="font-bold">{analytics.systemWide.content.totalQuizzes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Uploads</span>
                    <span className="font-bold text-green-600">{analytics.systemWide.content.monthlyUploads}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Server Uptime</span>
                      <span>{analytics.systemWide.health?.uptimePercent ?? 0}%</span>
                    </div>
                    <Progress value={analytics.systemWide.health?.uptimePercent ?? 0} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Database Performance</span>
                      <span>{analytics.systemWide.health?.dbPerfScore ?? 0}</span>
                    </div>
                    <Progress value={analytics.systemWide.health?.dbPerfScore ?? 0} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>API Response Time</span>
                      <span>{analytics.systemWide.health?.apiLatencyMs ?? 0}ms</span>
                    </div>
                    <Progress value={analytics.systemWide.health?.apiResponseScore ?? 0} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xs text-green-600">N/A this month</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <p className="text-sm text-muted-foreground">Course Sales</p>
                  <p className="text-xs text-blue-600">N/A this month</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <p className="text-sm text-muted-foreground">Payment Success</p>
                  <p className="text-xs text-green-600">N/A this month</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            {userRole === 'student' && "Track your learning progress and performance"}
            {userRole === 'teacher' && "Monitor student engagement and course performance"}
            {userRole === 'admin' && "Comprehensive platform analytics and insights"}
          </p>
        </div>
        {/* Right-side controls removed as requested */}
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && (
        <>
          {userRole === 'student' && <StudentAnalyticsView analytics={studentAnalytics} />}
          {userRole === 'teacher' && <TeacherAnalyticsView analytics={teacherAnalytics} />}
          {userRole === 'admin' && <AdminAnalyticsView analytics={adminAnalytics} />}
        </>
      )}
    </div>
  );
}