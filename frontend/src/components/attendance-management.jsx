import React, { useState } from 'react';
import { TeacherAttendance } from './teacher-attendance';
import { StudentAttendance } from './student-attendance';
import { AdminAttendance } from './admin-attendance';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, GraduationCap, Shield } from 'lucide-react';

// Props/types removed for JS build.
export function AttendanceManagement({ userRole = 'student' }) {
  const [activeTab, setActiveTab] = useState('self');

  // Student view: Only their own attendance
  if (userRole === 'student') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">My Attendance</h2>
            <p className="text-muted-foreground">Track your attendance records</p>
          </div>
        </div>
        <StudentAttendance />
      </div>
    );
  }

  // Teacher view: Students' attendance + own attendance
  if (userRole === 'teacher') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Attendance Management</h2>
            <p className="text-muted-foreground">Manage student attendance and view your records</p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Student Attendance
            </TabsTrigger>
            <TabsTrigger value="self" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              My Attendance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="students" className="space-y-4">
            <TeacherAttendance />
          </TabsContent>
          
          <TabsContent value="self" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Your Attendance Record</h3>
                <StudentAttendance />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Admin view: Students' + Teachers' + own attendance
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-muted-foreground">Monitor and manage all attendance records</p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="self" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            My Attendance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Student Attendance Records</h3>
              <TeacherAttendance viewMode="students" />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teachers" className="space-y-4">
          <AdminAttendance />
        </TabsContent>
        
        <TabsContent value="self" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Your Attendance Record</h3>
              <StudentAttendance />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
