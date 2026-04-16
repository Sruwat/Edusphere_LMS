import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Calendar as CalendarIcon, 
  Download,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  FileText,
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Printer,
  Save
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Types removed for JS build — replace with API-backed data in production
export function AdminAttendance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });

  // Attendance data should come from API. Removed demo/sample data.
  const courses = [];
  const attendanceRecords = [];
  const dailyReports = [];

  const courseStats = courses.map(course => {
    const courseRecords = attendanceRecords.filter(r => r.courseId === course.id);
    const totalClasses = 45;
    const presentCount = courseRecords.filter(r => r.status === 'present').length;
    const absentCount = courseRecords.filter(r => r.status === 'absent').length;
    const lateCount = courseRecords.filter(r => r.status === 'late').length;
    const percentage = totalClasses > 0 ? ((presentCount + lateCount * 0.5) / totalClasses * 100).toFixed(1) : 0;

    return {
      ...course,
      totalClasses,
      presentCount,
      absentCount,
      lateCount,
      percentage: Number(percentage)
    };
  });

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || record.courseId === selectedCourse;
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const getOverallStats = () => {
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
    const percentage = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

    return { totalRecords, presentCount, absentCount, lateCount, percentage };
  };

  const stats = getOverallStats();

  const handleEditRecord = (record) => {
    setSelectedRecord(record);
    setShowEditDialog(true);
  };

  const handleDeleteRecord = (recordId) => {
    if (confirm('Are you sure you want to delete this attendance record?')) {
      // Delete logic here
      console.log('Deleting record:', recordId);
    }
  };

  const handleSaveEdit = () => {
    // Save edit logic here
    console.log('Saving edited record:', selectedRecord);
    setShowEditDialog(false);
  };

  const exportReport = (format) => {
    // Export logic here
    alert(`Exporting ${reportType} report as ${format.toUpperCase()}`);
  };

  const getStatusBadge = (status) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">Monitor and manage attendance across all courses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Records</p>
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold">{stats.totalRecords}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-700">Present</p>
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              </div>
              <p className="text-3xl font-bold text-green-700">{stats.presentCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">Absent</p>
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.absentCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-yellow-700">Late</p>
                <Clock className="h-5 w-5 text-yellow-700" />
              </div>
              <p className="text-3xl font-bold text-yellow-700">{stats.lateCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700">Avg. %</p>
                <TrendingUp className="h-5 w-5 text-blue-700" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{stats.percentage}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Attendance Records</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          <TabsTrigger value="courses">Course Overview</TabsTrigger>
          <TabsTrigger value="students">Student Overview</TabsTrigger>
        </TabsList>

        {/* Attendance Records */}
        <TabsContent value="records" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students or courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    Showing {filteredRecords.length} records
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Marked By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{record.rollNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.courseName}</p>
                          <p className="text-xs text-muted-foreground">{record.courseCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.markedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports & Analytics */}
        <TabsContent value="reports" className="space-y-4">
          {/* Report Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Report</SelectItem>
                    <SelectItem value="weekly">Weekly Report</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                    <SelectItem value="course">Course-wise Report</SelectItem>
                    <SelectItem value="student">Student-wise Report</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">October 2025</SelectItem>
                    <SelectItem value="9">September 2025</SelectItem>
                    <SelectItem value="8">August 2025</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => exportReport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={() => exportReport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Daily Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Summary</CardTitle>
              <CardDescription>Institution-wide attendance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Classes</TableHead>
                    <TableHead className="text-center">Total Students</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Percentage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReports.map((report) => (
                    <TableRow key={report.date}>
                      <TableCell className="font-medium">
                        {format(new Date(report.date), 'MMMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">{report.totalClasses}</TableCell>
                      <TableCell className="text-center">{report.totalStudents}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {report.presentCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {report.absentCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          {report.lateCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {report.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
                <CardDescription>Attendance percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => {
                    const percentage = 90 + Math.random() * 8;
                    return (
                      <div key={week} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{week}</span>
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
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Overall attendance breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-700" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">Present</p>
                        <p className="text-sm text-green-600">{stats.presentCount} students</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {((stats.presentCount / stats.totalRecords) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-red-700" />
                      </div>
                      <div>
                        <p className="font-medium text-red-800">Absent</p>
                        <p className="text-sm text-red-600">{stats.absentCount} students</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-700">
                      {((stats.absentCount / stats.totalRecords) * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-700" />
                      </div>
                      <div>
                        <p className="font-medium text-yellow-800">Late</p>
                        <p className="text-sm text-yellow-600">{stats.lateCount} students</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-yellow-700">
                      {((stats.lateCount / stats.totalRecords) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Course Overview */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course-wise Attendance</CardTitle>
              <CardDescription>Attendance statistics for each course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {courseStats.map((course) => (
                  <Card key={course.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{course.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {course.code} • Section {course.section}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-lg px-3 py-1">
                            {course.percentage}%
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2 text-sm">
                            <span>Overall Attendance</span>
                            <span className="font-medium">{course.presentCount}/{course.totalClasses}</span>
                          </div>
                          <Progress value={course.percentage} className="h-2" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xl font-bold text-green-700">{course.presentCount}</p>
                            <p className="text-xs text-green-600">Present</p>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                            <p className="text-xl font-bold text-red-700">{course.absentCount}</p>
                            <p className="text-xs text-red-600">Absent</p>
                          </div>
                          <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-xl font-bold text-yellow-700">{course.lateCount}</p>
                            <p className="text-xs text-yellow-600">Late</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Overview */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Overview</CardTitle>
              <CardDescription>Individual student attendance performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name or roll number..."
                    className="pl-10"
                  />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead className="text-center">Total Classes</TableHead>
                      <TableHead className="text-center">Attended</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[].map((name, index) => {
                      const percentage = 95 - (index * 8);
                      const status = percentage >= 85 ? 'good' : percentage >= 75 ? 'warning' : 'critical';
                      return (
                        <TableRow key={name}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell>STU00{index + 1}</TableCell>
                          <TableCell className="text-center">0</TableCell>
                          <TableCell className="text-center">{Math.floor(45 * percentage / 100)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{percentage}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                status === 'good'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : status === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {status === 'good' ? 'Good' : status === 'warning' ? 'Warning' : 'Critical'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Make changes to the attendance record
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Input value={selectedRecord.studentName} disabled />
              </div>
              <div>
                <Label>Course</Label>
                <Input value={selectedRecord.courseName} disabled />
              </div>
              <div>
                <Label>Date</Label>
                <Input value={format(new Date(selectedRecord.date), 'PPP')} disabled />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedRecord.status}
                  onValueChange={(value) =>
                    setSelectedRecord({ ...selectedRecord, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={selectedRecord.notes || ''}
                  onChange={(e) =>
                    setSelectedRecord({ ...selectedRecord, notes: e.target.value })
                  }
                  placeholder="Add notes..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
