import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Calendar as CalendarIcon, 
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  BookOpen,
  BarChart3,
  Download,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

// Removed TypeScript-only declarations and seeded/demo data.
export function StudentAttendance() {
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());

  // Data should be fetched from API; placeholders used to avoid demo content
  const coursesAttendance = [];
  const attendanceDetails = [];

  const getOverallStats = () => {
    // Safe reduce with initial values to handle empty arrays
    const totalClasses = coursesAttendance.reduce((sum, course) => sum + course.totalClasses, 0);
    const totalAttended = coursesAttendance.reduce((sum, course) => sum + course.attendedClasses, 0);
    const totalPresent = coursesAttendance.reduce((sum, course) => sum + course.presentCount, 0);
    const totalAbsent = coursesAttendance.reduce((sum, course) => sum + course.absentCount, 0);
    const totalLate = coursesAttendance.reduce((sum, course) => sum + course.lateCount, 0);
    const overallPercentage = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : 0;

    return { totalClasses, totalAttended, totalPresent, totalAbsent, totalLate, overallPercentage };
  };

  const stats = getOverallStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 85) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (percentage >= 75) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getAttendanceStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Absent</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Late</Badge>;
      default:
        return null;
    }
  };

  const filteredAttendance = selectedCourse === 'all' 
    ? attendanceDetails 
    : attendanceDetails.filter(a => {
        const course = coursesAttendance.find(c => c.courseName === a.courseName);
        return course?.courseId === selectedCourse;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">Track your attendance across all courses</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Overall Attendance</p>
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold">{stats.overallPercentage}%</p>
                {getStatusIcon(Number(stats.overallPercentage))}
              </div>
              <Progress value={Number(stats.overallPercentage)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.totalAttended} of {stats.totalClasses} classes attended
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <p className="text-sm text-green-700">Present</p>
              </div>
              <p className="text-3xl font-bold text-green-700">{stats.totalPresent}</p>
              <p className="text-xs text-green-600">Classes attended</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-700" />
                <p className="text-sm text-red-700">Absent</p>
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.totalAbsent}</p>
              <p className="text-xs text-red-600">Classes missed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-700" />
                <p className="text-sm text-yellow-700">Late</p>
              </div>
              <p className="text-3xl font-bold text-yellow-700">{stats.totalLate}</p>
              <p className="text-xs text-yellow-600">Times late</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-700" />
                <p className="text-sm text-blue-700">Total Classes</p>
              </div>
              <p className="text-3xl font-bold text-blue-700">{stats.totalClasses}</p>
              <p className="text-xs text-blue-600">Scheduled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses">Course-wise Attendance</TabsTrigger>
          <TabsTrigger value="history">Attendance History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Course-wise Attendance */}
        <TabsContent value="courses" className="space-y-4">
          {coursesAttendance.map((course) => (
            <Card key={course.courseId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{course.courseName}</CardTitle>
                    <CardDescription>
                      {course.courseCode} • Instructor: {course.instructor}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={getStatusColor(course.status)}>
                    {course.percentage}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Attendance Progress</span>
                    <span className="text-sm font-medium">{course.attendedClasses}/{course.totalClasses}</span>
                  </div>
                  <Progress value={course.percentage} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-700">{course.presentCount}</p>
                    <p className="text-xs text-green-600">Present</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{course.absentCount}</p>
                    <p className="text-xs text-red-600">Absent</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-700">{course.lateCount}</p>
                    <p className="text-xs text-yellow-600">Late</p>
                  </div>
                </div>

                {course.percentage < 75 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Low Attendance Warning</p>
                      <p className="text-xs text-red-600 mt-1">
                        Your attendance is below 75%. You need to attend the next {Math.ceil((course.totalClasses * 0.75 - course.attendedClasses))} classes to reach 75%.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Attendance History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>Detailed record of your attendance</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {coursesAttendance.map(course => (
                        <SelectItem key={course.courseId} value={course.courseId}>
                          {course.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(record.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{record.courseName}</TableCell>
                      <TableCell className="text-center">
                        {getAttendanceStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trend</CardTitle>
                <CardDescription>Your attendance over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[].map((month, index) => {
                    const percentage = 95 - (index * 3) - Math.random() * 5;
                    return (
                      <div key={month} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{month}</span>
                          <span className="font-medium">{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>Key metrics and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Great Performance!</p>
                      <p className="text-sm text-green-600 mt-1">
                        Your overall attendance is {stats.overallPercentage}%. Keep it up!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Best Performing Course</p>
                      <p className="text-sm text-blue-600 mt-1">
                        {coursesAttendance.length > 0 ? (
                          <>
                            {coursesAttendance.reduce((best, course) => 
                              course.percentage > best.percentage ? course : best
                            ).courseName} - {coursesAttendance.reduce((best, course) => 
                              course.percentage > best.percentage ? course : best
                            ).percentage}%
                          </>
                        ) : (
                          'No course data available'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {coursesAttendance.some(c => c.percentage < 75) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-700" />
                      </div>
                      <div>
                        <p className="font-medium text-red-800">Needs Improvement</p>
                        <p className="text-sm text-red-600 mt-1">
                          {coursesAttendance.filter(c => c.percentage < 75).length} course(s) below 75% attendance
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
