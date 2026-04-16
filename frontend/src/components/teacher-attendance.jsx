import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Calendar as CalendarIcon, 
  Check, 
  X, 
  Clock, 
  Users, 
  BookOpen,
  Search,
  Edit,
  Save,
  AlertCircle,
  FileText,
  ChevronDown,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

// Removed TypeScript-only declarations. Data should be fetched from API.
export function TeacherAttendance() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [currentNotes, setCurrentNotes] = useState('');
  const [currentStudentId, setCurrentStudentId] = useState('');

  // Courses, students, and attendance history should be loaded from API
  const courses = [];
  const students = [];
  const attendanceHistory = [];

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        status
      }
    }));
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        notes
      }
    }));
  };

  const openNotesDialog = (studentId) => {
    setCurrentStudentId(studentId);
    setCurrentNotes(attendance[studentId]?.notes || '');
    setShowNotesDialog(true);
  };

  const saveNotes = () => {
    handleNotesChange(currentStudentId, currentNotes);
    setShowNotesDialog(false);
  };

  const handleSubmitAttendance = () => {
    // Here you would submit to API
    console.log('Submitting attendance:', attendance);
    alert('Attendance marked successfully!');
    setEditMode(false);
  };

  const markAllPresent = () => {
    const newAttendance = {};
    filteredStudents.forEach(student => {
      newAttendance[student.id] = {
        studentId: student.id,
        status: 'present'
      };
    });
    setAttendance(newAttendance);
  };

  const getAttendanceStats = () => {
    const total = Object.keys(attendance).length;
    const present = Object.values(attendance).filter(a => a.status === 'present').length;
    const absent = Object.values(attendance).filter(a => a.status === 'absent').length;
    const late = Object.values(attendance).filter(a => a.status === 'late').length;
    const percentage = total > 0 ? ((present + late * 0.5) / total * 100).toFixed(1) : 0;
    
    return { total, present, absent, late, percentage };
  };

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground">Mark and manage student attendance for your courses</p>
      </div>

      {/* Course and Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Course</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{course.name}</span>
                      <span className="text-xs text-muted-foreground">{course.code} - Section {course.section}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Session Info</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCourse ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{courses.find(c => c.id === selectedCourse)?.totalStudents} Students</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{courses.find(c => c.id === selectedCourse)?.schedule}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a course to view details</p>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedCourse && (
        <Tabs defaultValue="mark" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="history">Attendance History</TabsTrigger>
          </TabsList>

          <TabsContent value="mark" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-green-700">Present</p>
                    <p className="text-3xl font-bold text-green-700">{stats.present}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-red-700">Absent</p>
                    <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-yellow-700">Late</p>
                    <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-blue-700">Percentage</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.percentage}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={markAllPresent} variant="outline">
                      <Check className="h-4 w-4 mr-2" />
                      Mark All Present
                    </Button>
                    <Button onClick={() => setEditMode(!editMode)} variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      {editMode ? 'View Mode' : 'Edit Mode'}
                    </Button>
                  </div>
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or roll number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Student List</CardTitle>
                <CardDescription>
                  Mark attendance for {format(selectedDate, 'MMMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Roll No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.rollNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell className="text-muted-foreground">{student.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant={attendance[student.id]?.status === 'present' ? 'default' : 'outline'}
                              className={attendance[student.id]?.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                              onClick={() => handleAttendanceChange(student.id, 'present')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendance[student.id]?.status === 'absent' ? 'default' : 'outline'}
                              className={attendance[student.id]?.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                              onClick={() => handleAttendanceChange(student.id, 'absent')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={attendance[student.id]?.status === 'late' ? 'default' : 'outline'}
                              className={attendance[student.id]?.status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                              onClick={() => handleAttendanceChange(student.id, 'late')}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openNotesDialog(student.id)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button variant="outline">Save as Draft</Button>
              <Button onClick={handleSubmitAttendance} size="lg">
                <Save className="h-4 w-4 mr-2" />
                Submit Attendance
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>
                  View past attendance records for {courses.find(c => c.id === selectedCourse)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Late</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceHistory.map((record) => (
                      <TableRow key={record.date}>
                        <TableCell className="font-medium">
                          {format(new Date(record.date), 'MMMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {record.present}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {record.absent}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            {record.late}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {record.percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
            <DialogDescription>
              Add remarks or notes for this student's attendance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notes</Label>
              <Textarea
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Enter notes or remarks..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveNotes}>
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
