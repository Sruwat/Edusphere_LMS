import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Clock,
  Eye,
  Download,
  Upload,
  Shield,
  GraduationCap,
  Users as TeacherIcon
} from 'lucide-react';

// All user data is fetched from backend API. No sample data is shown.
export function UserManagement({ userType, onSelectStudent, currentUser }) {

  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [studentsData, setStudentsData] = useState([]);
  const [teachersData, setTeachersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: 'edu123',
    rollNumber: '',
    gradeLevel: '',
    parentContact: '',
    address: '',
    emergencyContact: '',
    employeeId: '',
    department: '',
    qualification: '',
    specialization: '',
    officeHours: '',
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    rollNumber: '',
    gradeLevel: '',
    parentContact: '',
    address: '',
    emergencyContact: '',
    employeeId: '',
    department: '',
    qualification: '',
    specialization: '',
    officeHours: '',
  });

  const isTeacher = userType === 'teacher';

  const handleTabChange = (tab) => {
    if (isTeacher && tab !== 'students') return;
    setActiveTab(tab);
  };

  const isThisMonth = (dateString) => {
    if (!dateString) return false;
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return false;
    const now = new Date();
    return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
  };

  // Fetch students and teachers from backend with all profile fields
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        // Fetch all courses first
        let coursesMap = {};
        try {
          const coursesRes = await api.request('/courses/');
          const courses = (coursesRes.results || coursesRes || []);
          coursesMap = courses.reduce((acc, course) => {
            acc[course.id] = course.title || course.name || 'Unknown Course';
            return acc;
          }, {});
        } catch (err) {
          console.warn('Failed to fetch courses:', err);
        }

        // Fetch student profiles with related user data
        const studentsRes = await api.request('/student-profiles/');
        const students = (studentsRes.results || studentsRes || []).map(s => {
          const user = s.user || s;
          return {
            id: s.id || user.id,
            username: user.username || s.username,
            firstName: user.first_name || s.first_name,
            lastName: user.last_name || s.last_name,
            email: user.email || s.email,
            name: `${user.first_name || s.first_name || ''} ${user.last_name || s.last_name || ''}`.trim() || user.username || s.username,
            phone: user.phone || s.phone,
            avatarUrl: user.avatar_url || s.avatar_url,
            dateJoined: user.date_joined || s.date_joined,
            lastLogin: user.last_login || s.last_login,
            rollNumber: s.roll_number,
            gradeLevel: s.grade_level,
            dateOfBirth: s.date_of_birth,
            parentContact: s.parent_contact,
            address: s.address,
            emergencyContact: s.emergency_contact,
            averageGrade: parseFloat(s.average_grade) || 0,
            createdAt: s.created_at,
            totalCourses: 0,
            coursesEnrolled: [],
            attendance: 0,
            status: 'active',
          };
        });

        // Fetch teacher profiles with related user data
        const teachersRes = await api.request('/teacher-profiles/');
        const teachers = (teachersRes.results || teachersRes || []).map(t => {
          const user = t.user || t;
          return {
            id: t.id || user.id,
            userId: typeof user === 'object' ? user.id : user,
            username: user.username || t.username,
            firstName: user.first_name || t.first_name,
            lastName: user.last_name || t.last_name,
            email: user.email || t.email,
            name: `${user.first_name || t.first_name || ''} ${user.last_name || t.last_name || ''}`.trim() || user.username || t.username,
            phone: user.phone || t.phone,
            avatarUrl: user.avatar_url || t.avatar_url,
            dateJoined: user.date_joined || t.date_joined,
            lastLogin: user.last_login || t.last_login,
            employeeId: t.employee_id,
            department: t.department,
            qualification: t.qualification,
            specialization: t.specialization,
            hireDate: t.hire_date,
            officeHours: t.office_hours,
            averageRating: parseFloat(t.average_rating) || 0,
            createdAt: t.created_at,
            totalStudents: 0,
            coursesTeaching: [],
            status: 'active',
          };
        });

        // Fetch enrollments for each student
        try {
          const enrollmentsRes = await api.request('/enrollments/');
          const enrollments = enrollmentsRes.results || enrollmentsRes || [];
          students.forEach(student => {
            const studentEnrollments = enrollments.filter(e => e.student === student.id);
            student.totalCourses = studentEnrollments.length;
            student.coursesEnrolled = studentEnrollments.map(e => ({
              id: e.id,
              courseId: e.course,
              courseName: coursesMap[e.course] || 'Unknown Course',
              status: e.status,
              progressPercentage: e.progress_percentage,
              enrollmentDate: e.enrollment_date,
            }));
          });
        } catch (err) {
          console.warn('Failed to fetch enrollments:', err);
        }

        // Fetch courses for each teacher
        try {
          const coursesRes = await api.request('/courses/');
          const allCourses = (coursesRes.results || coursesRes || []);
          
          // Fetch all enrollments to count students per teacher's courses
          const enrollmentsRes = await api.request('/enrollments/');
          const allEnrollments = enrollmentsRes.results || enrollmentsRes || [];
          
          teachers.forEach(teacher => {
            const teacherCourses = allCourses.filter(c => {
              const instructorId = typeof c.instructor === 'object' ? c.instructor.id : c.instructor;
              const createdById = typeof c.created_by === 'object' ? c.created_by.id : c.created_by;
              return instructorId === teacher.userId || createdById === teacher.userId || instructorId === teacher.id || createdById === teacher.id;
            });
            
            teacher.coursesTeaching = teacherCourses.map(c => ({
              id: c.id,
              courseId: c.id,
              courseName: c.title || c.name || 'Unknown Course',
            }));
            
            // Count unique students enrolled in this teacher's courses
            const teacherCourseIds = teacherCourses.map(c => c.id);
            const studentSet = new Set();
            allEnrollments.forEach(enrollment => {
              if (teacherCourseIds.includes(enrollment.course)) {
                studentSet.add(enrollment.student);
              }
            });
            teacher.totalStudents = studentSet.size;
          });
        } catch (err) {
          console.warn('Failed to fetch teacher courses:', err);
        }

        // Fetch attendance records for each student
        try {
          const attendanceRes = await api.request('/attendance/');
          const records = attendanceRes.results || attendanceRes || [];
          students.forEach(student => {
            const studentAttendance = records.filter(r => r.student === student.id);
            if (studentAttendance.length > 0) {
              const presentCount = studentAttendance.filter(r => r.status === 'present').length;
              student.attendance = Math.round((presentCount / studentAttendance.length) * 100);
            }
          });
        } catch (err) {
          console.warn('Failed to fetch attendance:', err);
        }

        // If teacher, filter students to only those enrolled in their courses
        if (isTeacher && currentUser) {
          try {
            const coursesRes = await api.request('/courses/');
            const allCourses = (coursesRes.results || coursesRes || []);
            const enrollmentsRes = await api.request('/enrollments/');
            const allEnrollments = enrollmentsRes.results || enrollmentsRes || [];
            
            // Find teacher's courses
            const teacherCourses = allCourses.filter(c => {
              const instructorId = typeof c.instructor === 'object' ? c.instructor.id : c.instructor;
              const createdById = typeof c.created_by === 'object' ? c.created_by.id : c.created_by;
              return instructorId === currentUser.id || createdById === currentUser.id;
            });
            
            const teacherCourseIds = teacherCourses.map(c => c.id);
            
            // Get unique student IDs enrolled in teacher's courses
            const enrolledStudentIds = new Set(
              allEnrollments
                .filter(e => teacherCourseIds.includes(e.course))
                .map(e => e.student)
            );
            
            // Filter students to only those enrolled in teacher's courses
            const filteredStudents = students.filter(s => enrolledStudentIds.has(s.id));
            setStudentsData(filteredStudents);
          } catch (err) {
            console.warn('Failed to filter students for teacher:', err);
            setStudentsData(students);
          }
        } else {
          setStudentsData(students);
        }
        
        setTeachersData(teachers);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
      setLoading(false);
    }
    fetchUsers();
  }, [isTeacher, currentUser]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return UserCheck;
      case 'inactive': return UserX;
      default: return Users;
    }
  };

  const filteredStudents = studentsData.filter(student =>
    (student.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (student.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (student.rollNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachersData.filter(teacher =>
    (teacher.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (teacher.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (teacher.department?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const studentsJoinedThisMonth = studentsData.filter((s) => isThisMonth(s.dateJoined)).length;
  const teachersJoinedThisMonth = teachersData.filter((t) => isThisMonth(t.dateJoined)).length;
  const totalUsers = studentsData.length + teachersData.length;
  const activeUsers = [...studentsData, ...teachersData].filter((u) => u.status === 'active').length;
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  // Add User Dialog with backend integration
  const handleAddUser = async () => {
    // Prevent multiple submissions and empty forms
    if (isSubmittingAdd) return;
    if (!addForm.firstName || !addForm.lastName || !addForm.email) {
      alert('Please fill in required fields: First Name, Last Name, Email');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      // Create user account directly without logging out admin
      const username = addForm.username || addForm.email.split('@')[0];
      const registerData = {
        username,
        email: addForm.email,
        password: addForm.password || 'edu123',
        first_name: addForm.firstName,
        last_name: addForm.lastName,
        role: activeTab === 'students' ? 'student' : 'teacher',
      };

      // Call register endpoint without using api.register() to avoid logout
      const registerRes = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerData),
        skipAuth: true, // Don't require auth for registration
      });

      const userId = registerRes?.user?.id || registerRes?.id;

      if (userId) {
        if (activeTab === 'students') {
          // Create student profile with additional fields
          await api.request('/student-profiles/', {
            method: 'POST',
            body: JSON.stringify({
              user: userId,
              roll_number: addForm.rollNumber,
              grade_level: addForm.gradeLevel,
              parent_contact: addForm.parentContact,
              address: addForm.address,
              emergency_contact: addForm.emergencyContact,
            })
          });
        } else {
          // Create teacher profile with additional fields
          await api.request('/teacher-profiles/', {
            method: 'POST',
            body: JSON.stringify({
              user: userId,
              employee_id: addForm.employeeId,
              department: addForm.department,
              qualification: addForm.qualification,
              specialization: addForm.specialization,
              office_hours: addForm.officeHours,
            })
          });
        }
      }
      
      // Only reset after successful submission
      setShowAddDialog(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        username: '',
        password: 'edu123',
        rollNumber: '',
        gradeLevel: '',
        parentContact: '',
        address: '',
        emergencyContact: '',
        employeeId: '',
        department: '',
        qualification: '',
        specialization: '',
        officeHours: '',
      });
      // Refresh users
      await refreshUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      console.error('Error data:', err.data);
      // Show user-friendly error message with backend details
      let errorMessage = err.message || 'Failed to add user. Please try again.';
      if (err.data) {
        const details = JSON.stringify(err.data, null, 2);
        errorMessage += `\n\nBackend error details:\n${details}`;
      }
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (user, type) => {
    setEditingUser({ ...user, type });
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      rollNumber: user.rollNumber || '',
      gradeLevel: user.gradeLevel || '',
      parentContact: user.parentContact || '',
      address: user.address || '',
      emergencyContact: user.emergencyContact || '',
      employeeId: user.employeeId || '',
      department: user.department || '',
      qualification: user.qualification || '',
      specialization: user.specialization || '',
      officeHours: user.officeHours || '',
    });
    setShowEditDialog(true);
  };

  // Handle edit user
  const handleEditUser = async () => {
    try {
      const type = editingUser.type;
      const userId = editingUser.id;
      
      if (type === 'student') {
        const updateData = {
          roll_number: editForm.rollNumber,
          grade_level: editForm.gradeLevel,
          parent_contact: editForm.parentContact,
          address: editForm.address,
          emergency_contact: editForm.emergencyContact,
        };
        await api.request(`/student-profiles/${userId}/`, { 
          method: 'PATCH', 
          body: JSON.stringify(updateData) 
        });
      } else {
        const updateData = {
          employee_id: editForm.employeeId,
          department: editForm.department,
          qualification: editForm.qualification,
          specialization: editForm.specialization,
          office_hours: editForm.officeHours,
        };
        await api.request(`/teacher-profiles/${userId}/`, { 
          method: 'PATCH', 
          body: JSON.stringify(updateData) 
        });
      }
      
      setShowEditDialog(false);
      setEditingUser(null);
      setEditForm({});
      // Refresh users
      await refreshUsers();
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  // Handle remove user
  const handleRemoveUser = async (user, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }
    try {
      if (type === 'student') {
        await api.request(`/student-profiles/${user.id}/`, { method: 'DELETE' });
      } else {
        await api.request(`/teacher-profiles/${user.id}/`, { method: 'DELETE' });
      }
      setSelectedUser(null);
      // Refresh users
      await refreshUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // Refresh users from backend
  const refreshUsers = async () => {
    try {
      const studentsRes = await api.request('/student-profiles/');
      const students = (studentsRes.results || studentsRes || []).map(s => {
        const user = s.user || s;
        return {
          id: s.id || user.id,
          username: user.username || s.username,
          firstName: user.first_name || s.first_name,
          lastName: user.last_name || s.last_name,
          email: user.email || s.email,
          name: `${user.first_name || s.first_name || ''} ${user.last_name || s.last_name || ''}`.trim() || user.username || s.username,
          phone: user.phone || s.phone,
          avatarUrl: user.avatar_url || s.avatar_url,
          dateJoined: user.date_joined || s.date_joined,
          lastLogin: user.last_login || s.last_login,
          rollNumber: s.roll_number,
          gradeLevel: s.grade_level,
          dateOfBirth: s.date_of_birth,
          parentContact: s.parent_contact,
          address: s.address,
          emergencyContact: s.emergency_contact,
          averageGrade: parseFloat(s.average_grade) || 0,
          createdAt: s.created_at,
          totalCourses: 0,
          coursesEnrolled: [],
          attendance: 0,
          status: 'active',
        };
      });

      const teachersRes = await api.request('/teacher-profiles/');
      const teachers = (teachersRes.results || teachersRes || []).map(t => {
        const user = t.user || t;
        return {
          id: t.id || user.id,
          userId: typeof user === 'object' ? user.id : user,
          username: user.username || t.username,
          firstName: user.first_name || t.first_name,
          lastName: user.last_name || t.last_name,
          email: user.email || t.email,
          name: `${user.first_name || t.first_name || ''} ${user.last_name || t.last_name || ''}`.trim() || user.username || t.username,
          phone: user.phone || t.phone,
          avatarUrl: user.avatar_url || t.avatar_url,
          dateJoined: user.date_joined || t.date_joined,
          lastLogin: user.last_login || t.last_login,
          employeeId: t.employee_id,
          department: t.department,
          qualification: t.qualification,
          specialization: t.specialization,
          hireDate: t.hire_date,
          officeHours: t.office_hours,
          averageRating: parseFloat(t.average_rating) || 0,
          createdAt: t.created_at,
          totalStudents: 0,
          coursesTeaching: [],
          status: 'active',
        };
      });

      try {
        const enrollmentsRes = await api.request('/enrollments/');
        const enrollments = enrollmentsRes.results || enrollmentsRes || [];
        students.forEach(student => {
          const studentEnrollments = enrollments.filter(e => e.student === student.id);
          student.totalCourses = studentEnrollments.length;
          student.coursesEnrolled = studentEnrollments.map(e => ({
            id: e.id,
            courseId: e.course,
            courseName: e.course_title || 'Unknown Course',
            status: e.status,
            progressPercentage: e.progress_percentage,
            enrollmentDate: e.enrollment_date,
          }));
        });
      } catch (err) {
        console.warn('Failed to fetch enrollments:', err);
      }

      try {
        const coursesRes = await api.request('/courses/');
        const allCourses = (coursesRes.results || coursesRes || []);
        
        // Fetch all enrollments to count students per teacher's courses
        const enrollmentsRes = await api.request('/enrollments/');
        const allEnrollments = enrollmentsRes.results || enrollmentsRes || [];
        
        teachers.forEach(teacher => {
          const teacherCourses = allCourses.filter(c => {
            const instructorId = typeof c.instructor === 'object' ? c.instructor.id : c.instructor;
            const createdById = typeof c.created_by === 'object' ? c.created_by.id : c.created_by;
            return instructorId === teacher.userId || createdById === teacher.userId || instructorId === teacher.id || createdById === teacher.id;
          });
          teacher.coursesTeaching = teacherCourses.map(c => ({
            id: c.id,
            courseId: c.id,
            courseName: c.title || c.name || 'Unknown Course',
          }));
          
          // Count unique students enrolled in this teacher's courses
          const teacherCourseIds = teacherCourses.map(c => c.id);
          const studentSet = new Set();
          allEnrollments.forEach(enrollment => {
            if (teacherCourseIds.includes(enrollment.course)) {
              studentSet.add(enrollment.student);
            }
          });
          teacher.totalStudents = studentSet.size;
        });
      } catch (err) {
        console.warn('Failed to fetch teacher courses:', err);
      }

      try {
        const attendanceRes = await api.request('/attendance/');
        const records = attendanceRes.results || attendanceRes || [];
        students.forEach(student => {
          const studentAttendance = records.filter(r => r.student === student.id);
          if (studentAttendance.length > 0) {
            const presentCount = studentAttendance.filter(r => r.status === 'present').length;
            student.attendance = Math.round((presentCount / studentAttendance.length) * 100);
          }
        });
      } catch (err) {
        console.warn('Failed to fetch attendance:', err);
      }

      // If teacher, filter students to only those enrolled in their courses
      if (isTeacher && currentUser) {
        try {
          const coursesRes = await api.request('/courses/');
          const allCourses = (coursesRes.results || coursesRes || []);
          const enrollmentsRes = await api.request('/enrollments/');
          const allEnrollments = enrollmentsRes.results || enrollmentsRes || [];
          
          // Find teacher's courses
          const teacherCourses = allCourses.filter(c => {
            const instructorId = typeof c.instructor === 'object' ? c.instructor.id : c.instructor;
            const createdById = typeof c.created_by === 'object' ? c.created_by.id : c.created_by;
            return instructorId === currentUser.id || createdById === currentUser.id;
          });
          
          const teacherCourseIds = teacherCourses.map(c => c.id);
          
          // Get unique student IDs enrolled in teacher's courses
          const enrolledStudentIds = new Set(
            allEnrollments
              .filter(e => teacherCourseIds.includes(e.course))
              .map(e => e.student)
          );
          
          // Filter students to only those enrolled in teacher's courses
          const filteredStudents = students.filter(s => enrolledStudentIds.has(s.id));
          setStudentsData(filteredStudents);
        } catch (err) {
          console.warn('Failed to filter students for teacher:', err);
          setStudentsData(students);
        }
      } else {
        setStudentsData(students);
      }
      
      setTeachersData(teachers);
    } catch (err) {
      console.error('Error refreshing users:', err);
    }
  };

  const EditUserDialog = () => (
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {editingUser?.type === 'student' ? 'Student' : 'Teacher'} Profile</DialogTitle>
          <DialogDescription>
            Update {editingUser?.type === 'student' ? 'student' : 'teacher'} information and details.
          </DialogDescription>
        </DialogHeader>
        {editingUser && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.firstName}
                  onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.lastName}
                  onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>
            {editingUser.type === 'student' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-roll-number">Roll Number</Label>
                    <Input
                      id="edit-roll-number"
                      value={editForm.rollNumber}
                      onChange={e => setEditForm(f => ({ ...f, rollNumber: e.target.value }))}
                      placeholder="Roll number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-grade-level">Grade Level</Label>
                    <Input
                      id="edit-grade-level"
                      value={editForm.gradeLevel}
                      onChange={e => setEditForm(f => ({ ...f, gradeLevel: e.target.value }))}
                      placeholder="Grade level"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-parent-contact">Parent/Guardian Contact</Label>
                  <Input
                    id="edit-parent-contact"
                    value={editForm.parentContact}
                    onChange={e => setEditForm(f => ({ ...f, parentContact: e.target.value }))}
                    placeholder="Parent contact"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Address"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-emergency-contact">Emergency Contact</Label>
                  <Input
                    id="edit-emergency-contact"
                    value={editForm.emergencyContact}
                    onChange={e => setEditForm(f => ({ ...f, emergencyContact: e.target.value }))}
                    placeholder="Emergency contact"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-employee-id">Employee ID</Label>
                    <Input
                      id="edit-employee-id"
                      value={editForm.employeeId}
                      onChange={e => setEditForm(f => ({ ...f, employeeId: e.target.value }))}
                      placeholder="Employee ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-department">Department</Label>
                    <Input
                      id="edit-department"
                      value={editForm.department}
                      onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                      placeholder="Department"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-qualification">Qualification</Label>
                    <Input
                      id="edit-qualification"
                      value={editForm.qualification}
                      onChange={e => setEditForm(f => ({ ...f, qualification: e.target.value }))}
                      placeholder="Qualification"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-specialization">Specialization</Label>
                    <Input
                      id="edit-specialization"
                      value={editForm.specialization}
                      onChange={e => setEditForm(f => ({ ...f, specialization: e.target.value }))}
                      placeholder="Specialization"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-office-hours">Office Hours</Label>
                  <Input
                    id="edit-office-hours"
                    value={editForm.officeHours}
                    onChange={e => setEditForm(f => ({ ...f, officeHours: e.target.value }))}
                    placeholder="Office hours"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser}>
                <Shield className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const AddUserDialog = () => (
    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog} modal={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New {activeTab === 'students' ? 'Student' : 'Teacher'}</DialogTitle>
          <DialogDescription>
            Add a new {activeTab === 'students' ? 'student' : 'teacher'} to the platform with their information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-first-name">First Name</Label>
              <Input 
                id="add-first-name"
                placeholder="Enter first name" 
                value={addForm.firstName} 
                onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} 
              />
            </div>
            <div>
              <Label htmlFor="add-last-name">Last Name</Label>
              <Input 
                id="add-last-name"
                placeholder="Enter last name" 
                value={addForm.lastName} 
                onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-email">Email Address</Label>
              <Input 
                id="add-email"
                type="email" 
                placeholder="Enter email" 
                value={addForm.email} 
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} 
              />
            </div>
            <div>
              <Label htmlFor="add-phone">Phone Number</Label>
              <Input 
                id="add-phone"
                placeholder="Enter phone number" 
                value={addForm.phone} 
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="add-username">Username</Label>
              <Input 
                id="add-username"
                placeholder="Enter username (auto-generated if empty)" 
                value={addForm.username} 
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} 
              />
            </div>
            <div>
              <Label htmlFor="add-password">Password</Label>
              <Input 
                id="add-password"
                type="password"
                placeholder="Default: edu123" 
                value={addForm.password} 
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} 
              />
            </div>
          </div>

          {activeTab === 'students' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-roll-number">Roll Number</Label>
                  <Input 
                    id="add-roll-number"
                    placeholder="Enter roll number" 
                    value={addForm.rollNumber} 
                    onChange={e => setAddForm(f => ({ ...f, rollNumber: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label htmlFor="add-grade-level">Grade Level</Label>
                  <Input 
                    id="add-grade-level"
                    placeholder="Enter grade level" 
                    value={addForm.gradeLevel} 
                    onChange={e => setAddForm(f => ({ ...f, gradeLevel: e.target.value }))} 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-parent-contact">Parent/Guardian Contact</Label>
                <Input 
                  id="add-parent-contact"
                  placeholder="Enter parent contact" 
                  value={addForm.parentContact} 
                  onChange={e => setAddForm(f => ({ ...f, parentContact: e.target.value }))} 
                />
              </div>
              <div>
                <Label htmlFor="add-address">Address</Label>
                <Input 
                  id="add-address"
                  placeholder="Enter address" 
                  value={addForm.address} 
                  onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} 
                />
              </div>
              <div>
                <Label htmlFor="add-emergency-contact">Emergency Contact</Label>
                <Input 
                  id="add-emergency-contact"
                  placeholder="Enter emergency contact" 
                  value={addForm.emergencyContact} 
                  onChange={e => setAddForm(f => ({ ...f, emergencyContact: e.target.value }))} 
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-employee-id">Employee ID</Label>
                  <Input 
                    id="add-employee-id"
                    placeholder="Enter employee ID" 
                    value={addForm.employeeId} 
                    onChange={e => setAddForm(f => ({ ...f, employeeId: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label htmlFor="add-department">Department</Label>
                  <Select value={addForm.department} onValueChange={val => setAddForm(f => ({ ...f, department: val }))}>
                    <SelectTrigger id="add-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="computer-science">Computer Science</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-qualification">Qualification</Label>
                  <Input 
                    id="add-qualification"
                    placeholder="Enter qualification" 
                    value={addForm.qualification} 
                    onChange={e => setAddForm(f => ({ ...f, qualification: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label htmlFor="add-specialization">Specialization</Label>
                  <Input 
                    id="add-specialization"
                    placeholder="Enter specialization" 
                    value={addForm.specialization} 
                    onChange={e => setAddForm(f => ({ ...f, specialization: e.target.value }))} 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-office-hours">Office Hours</Label>
                <Input 
                  id="add-office-hours"
                  placeholder="Enter office hours" 
                  value={addForm.officeHours} 
                  onChange={e => setAddForm(f => ({ ...f, officeHours: e.target.value }))} 
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)} 
              disabled={isSubmittingAdd}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser} 
              disabled={isSubmittingAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isSubmittingAdd ? 'Adding...' : `Add ${activeTab === 'students' ? 'Student' : 'Teacher'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const UserDetailDialog = ({ user, type }) => (
    <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === 'student' ? 'Student' : 'Teacher'} Details</DialogTitle>
          <DialogDescription>
            View detailed information about this {type === 'student' ? 'student' : 'teacher'} including their profile and activity.
          </DialogDescription>
        </DialogHeader>
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback>{selectedUser.name?.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                <p className="text-muted-foreground">{selectedUser.email}</p>
                <Badge className={`mt-2 ${getStatusColor(selectedUser.status)}`}>
                  {selectedUser.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Account Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Username:</span> {selectedUser.username}</div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedUser.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined: {selectedUser.dateJoined ? new Date(selectedUser.dateJoined).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Last Login: {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">First Name:</span> {selectedUser.firstName || 'N/A'}</div>
                  <div><span className="font-medium">Last Name:</span> {selectedUser.lastName || 'N/A'}</div>
                  {type === 'student' && selectedUser.dateOfBirth && (
                    <div><span className="font-medium">Date of Birth:</span> {new Date(selectedUser.dateOfBirth).toLocaleDateString()}</div>
                  )}
                  {type === 'student' && selectedUser.address && (
                    <div><span className="font-medium">Address:</span> {selectedUser.address}</div>
                  )}
                </div>
              </div>
            </div>

            {type === 'student' ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Academic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Roll Number:</span> {selectedUser.rollNumber || 'N/A'}</div>
                      <div><span className="font-medium">Grade Level:</span> {selectedUser.gradeLevel || 'N/A'}</div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Courses Enrolled:</span> {selectedUser.totalCourses}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Attendance:</span> {selectedUser.attendance}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Avg Grade:</span> {selectedUser.averageGrade}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Contact Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Parent/Guardian Contact:</span> {selectedUser.parentContact || 'N/A'}</div>
                      <div><span className="font-medium">Emergency Contact:</span> {selectedUser.emergencyContact || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Enrolled Courses</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedUser.coursesEnrolled || []).map((course) => (
                      <Badge key={course.id || course.courseId} variant="outline" className="text-sm">
                        {course.courseName || 'Unknown Course'} ({course.status || 'N/A'})
                      </Badge>
                    ))}
                    {(!selectedUser.coursesEnrolled || selectedUser.coursesEnrolled.length === 0) && (
                      <span className="text-sm text-muted-foreground">No courses enrolled</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Professional Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Employee ID:</span> {selectedUser.employeeId || 'N/A'}</div>
                      <div className="flex items-center gap-2">
                        <TeacherIcon className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Department:</span> {selectedUser.department || 'N/A'}</span>
                      </div>
                      <div><span className="font-medium">Qualification:</span> {selectedUser.qualification || 'N/A'}</div>
                      <div><span className="font-medium">Specialization:</span> {selectedUser.specialization || 'N/A'}</div>
                      {selectedUser.hireDate && (
                        <div><span className="font-medium">Hire Date:</span> {new Date(selectedUser.hireDate).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Performance Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Students Taught:</span> {selectedUser.totalStudents}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span><span className="font-medium">Average Rating:</span> {selectedUser.averageRating}/5</span>
                      </div>
                      {selectedUser.officeHours && (
                        <div><span className="font-medium">Office Hours:</span> {selectedUser.officeHours}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Teaching Courses</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedUser.coursesTeaching || []).map((course) => (
                      <Badge key={course.id || course.courseId} variant="outline" className="text-sm">
                        {course.courseName || 'Unknown Course'}
                      </Badge>
                    ))}
                    {(!selectedUser.coursesTeaching || selectedUser.coursesTeaching.length === 0) && (
                      <span className="text-sm text-muted-foreground">No courses assigned</span>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {/* Teachers can edit students but not delete; admins can do both */}
            {(!isTeacher || type === 'student') && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setSelectedUser(null);
                  openEditDialog(selectedUser, type);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {!isTeacher && (
                  <Button variant="destructive" onClick={() => {
                    handleRemoveUser(selectedUser, type);
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const UserCard = ({ user, type }) => {
    const StatusIcon = getStatusIcon(user.status);
    return (
      <Card className="h-full hover:shadow-lg transition-shadow flex flex-col">
        <CardContent className="p-3 sm:p-4 flex flex-col flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 flex-1">
            <Avatar className="h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0">
              <AvatarFallback className="text-xs sm:text-sm">{user.name?.split(' ').map((n) => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                <h3 className="font-semibold text-sm sm:text-base truncate flex-1">{user.name}</h3>
                <Badge className={`${getStatusColor(user.status)} flex-shrink-0 text-xs`}>
                  <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  {user.status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {type === 'student' ? `Roll: ${user.rollNumber}` : `Dept: ${user.department}`}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-muted-foreground flex-wrap">
                <span className="whitespace-nowrap">
                  {type === 'student' ? `${user.totalCourses} courses` : `${user.totalStudents} students`}
                </span>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                <span className="whitespace-nowrap">
                  {type === 'student' ? `${user.attendance}% attendance` : `${user.averageRating}★ rating`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-3 sm:mt-auto sm:pt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => {
                    if (type === 'student' && onSelectStudent) {
                      onSelectStudent(user.id.toString());
                    } else {
                      setSelectedUser(user);
                    }
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">View</span>
                </Button>
                {/* Teachers can edit students but not delete them or manage teachers */}
                {(!isTeacher || type === 'student') && (
                  <>
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9" onClick={() => openEditDialog(user, type)}>
                      <Edit className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    {!isTeacher && (
                      <Button size="sm" variant="destructive" className="flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9" onClick={() => handleRemoveUser(user, type)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {isTeacher ? (
            <>
              <h2 className="text-3xl font-bold">Students Management</h2>
              <p className="text-muted-foreground">Manage students and their information</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold">User Management</h2>
              <p className="text-muted-foreground">Manage students, teachers, and their information</p>
            </>
          )}
        </div>
        {!isTeacher && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add {activeTab === 'students' ? 'Student' : 'Teacher'}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <span className="text-lg">Loading users...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className={`grid grid-cols-1 ${isTeacher ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isTeacher ? 'My Students' : 'Total Students'}</p>
                    <p className="text-2xl font-bold">{studentsData.length}</p>
                    {isTeacher ? (
                      <p className="text-xs text-blue-600">Enrolled in my courses</p>
                    ) : (
                      <p className="text-xs text-green-600">{studentsJoinedThisMonth} joined this month</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {!isTeacher && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <TeacherIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Teachers</p>
                      <p className="text-2xl font-bold">{teachersData.length}</p>
                      <p className="text-xs text-blue-600">{teachersJoinedThisMonth} joined this month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Students</p>
                    <p className="text-2xl font-bold">{studentsData.filter(s => s.status === 'active').length}</p>
                    {isTeacher ? (
                      <p className="text-xs text-green-600">
                        {studentsData.length > 0 ? Math.round((studentsData.filter(s => s.status === 'active').length / studentsData.length) * 100) : 0}% active rate
                      </p>
                    ) : (
                      <p className="text-xs text-green-600">{activeRate}% active rate</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {!isTeacher && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Enrollments</p>
                      <p className="text-2xl font-bold">
                        {studentsData.reduce((sum, s) => sum + (typeof s.totalCourses === 'number' ? s.totalCourses : 0), 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Course enrollments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {isTeacher && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Enrollments</p>
                      <p className="text-2xl font-bold">
                        {studentsData.reduce((sum, s) => sum + (typeof s.totalCourses === 'number' ? s.totalCourses : 0), 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">In my courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="students">Students ({studentsData.length})</TabsTrigger>
                {userType !== 'teacher' && userType !== 'student' && (
                  <TabsTrigger value="teachers">Teachers ({teachersData.length})</TabsTrigger>
                )}
              </TabsList>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            </div>
            <TabsContent value="students" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student, idx) => (
                  <UserCard key={student.id ? 'student-' + student.id : 'student-' + idx} user={student} type="student" />
                ))}
              </div>
              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your search criteria</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="teachers" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map((teacher, idx) => (
                  <UserCard key={teacher.id ? 'teacher-' + teacher.id : 'teacher-' + idx} user={teacher} type="teacher" />
                ))}
              </div>
              {filteredTeachers.length === 0 && (
                <div className="text-center py-12">
                  <TeacherIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Teachers Found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your search criteria</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
      <AddUserDialog />
      <EditUserDialog />
      <UserDetailDialog user={selectedUser} type={activeTab === 'students' ? 'student' : 'teacher'} />
    </div>
  );
}