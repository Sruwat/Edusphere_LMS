import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  Award,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';

// Props: studentId (string) and onBack (function) - fetch data from API in production.
export function StudentDetails({ studentId, onBack }) {
  // Student data should be fetched from API using studentId. Removed demo/sample data.
  const student = {
    id: studentId,
    name: '',
    email: '',
    phone: '',
    avatar: '',
    joinDate: '',
    location: '',
    status: 'Active',
    overallGrade: 0,
    totalCourses: 0,
    completedCourses: 0,
    studyHours: 0,
    rank: 0,
    achievements: 0,
    lastActivity: ''
  };

  const enrolledCourses = [];

  // Recent activity should be loaded from API. Removed demo/sample activity data.
  const recentActivity = [];

  // Achievements should be loaded from API. Removed demo/sample achievements.
  const achievements = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Student Details</h1>
          <p className="text-muted-foreground">Complete student information and progress</p>
        </div>
      </div>

      {/* Student Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-2xl">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{student.name}</h2>
                  <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                    {student.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{student.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{student.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {new Date(student.joinDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{student.overallGrade}%</div>
                  <div className="text-sm text-muted-foreground">Overall Grade</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">#{student.rank}</div>
                  <div className="text-sm text-muted-foreground">Class Rank</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{student.studyHours}h</div>
                  <div className="text-sm text-muted-foreground">Study Hours</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{student.achievements}</div>
                  <div className="text-sm text-muted-foreground">Achievements</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {enrolledCourses.map((course) => (
              <div key={course.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{course.title}</h4>
                  <Badge variant={course.status === 'Completed' ? 'default' : 'outline'}>
                    {course.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Grade: </span>
                    <span className="font-medium">{course.grade}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time: </span>
                    <span className="font-medium">{course.timeSpent}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assignments: </span>
                    <span className="font-medium">{course.completedAssignments}/{course.totalAssignments}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tests: </span>
                    <span className="font-medium">{course.completedTests}/{course.totalTests}</span>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last accessed: {new Date(course.lastAccessed).toLocaleDateString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'assignment' ? 'bg-blue-100' :
                  activity.type === 'test' ? 'bg-red-100' :
                  activity.type === 'class' ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  {activity.type === 'assignment' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                  {activity.type === 'test' && <Award className="h-4 w-4 text-red-600" />}
                  {activity.type === 'class' && <User className="h-4 w-4 text-green-600" />}
                  {activity.type === 'material' && <BookOpen className="h-4 w-4 text-purple-600" />}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.course}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                  
                  {activity.grade && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Grade: {activity.grade}%
                    </Badge>
                  )}
                  
                  {activity.duration && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Duration: {activity.duration}
                    </Badge>
                  )}
                  
                  {activity.file && (
                    <Badge variant="outline" className="text-xs mt-1">
                      File: {activity.file}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="p-4 border rounded-lg text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{achievement.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(achievement.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Study Pattern</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Most Active Day</span>
                  <span>Wednesday</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Preferred Time</span>
                  <span>2:00 PM - 4:00 PM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Session</span>
                  <span>45 minutes</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Strengths</h4>
              <div className="space-y-2">
                <Badge variant="outline">Mathematical Problem Solving</Badge>
                <Badge variant="outline">Consistent Attendance</Badge>
                <Badge variant="outline">Assignment Completion</Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Areas for Improvement</h4>
              <div className="space-y-2">
                <Badge variant="secondary">Physics Concepts</Badge>
                <Badge variant="secondary">Test Performance</Badge>
                <Badge variant="secondary">Time Management</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">Send Message</Button>
        <Button variant="outline">Schedule Meeting</Button>
        <Button>Generate Report</Button>
      </div>
    </div>
  );
}