import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { 
  BookOpen, 
  Video, 
  Star,
  Users,
  Clock,
  Plus,
  Search,
  Eye,
  Edit,
  Play,
  UserPlus,
  StarIcon
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { EnhancedCourseDetail } from './enhanced-course-detail';
import { EnhancedCourseCreation } from './enhanced-course-creation';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// Props/types removed for JS build. Courses should be fetched from an API.
export function SimpleCourses({ userRole }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseCreationMode, setCourseCreationMode] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [courseEnrollmentCounts, setCourseEnrollmentCounts] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [ratingDialogOpen, setRatingDialogOpen] = useState(null);
  const [tempRating, setTempRating] = useState(0);
  const [tempReview, setTempReview] = useState('');
  const apiBase = (
    import.meta.env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_API_BASE ||
    'http://localhost:8000/api'
  ).replace(/\/+$|^\s+|\s+$/g, '');
  const assetBase = apiBase.replace(/\/api\/?$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const [coursesData, enrollmentsData] = await Promise.all([
          api.getCourses(),
          userRole === 'student' ? api.getEnrollments() : Promise.resolve([])
        ]);
        
        if (mounted) {
          setCourses(coursesData || []);
          setEnrollments(enrollmentsData || []);
          
          // Fetch all enrollments to count per course
          try {
            const allEnrollments = await api.getEnrollments();
            const enrollmentsByCount = {};
            const enrollmentList = Array.isArray(allEnrollments) ? allEnrollments : allEnrollments.results || [];
            
            enrollmentList.forEach(enrollment => {
              const courseId = enrollment.course;
              if (courseId) {
                enrollmentsByCount[courseId] = (enrollmentsByCount[courseId] || 0) + 1;
              }
            });
            
            if (mounted) {
              setCourseEnrollmentCounts(enrollmentsByCount);
            }
          } catch (err) {
            console.warn('Failed to fetch enrollment counts:', err);
            if (mounted) {
              setCourseEnrollmentCounts({});
            }
          }
          
          // Fetch user's ratings for enrolled courses
          if (userRole === 'student' && user && user.id) {
            try {
              const allRatings = await api.getCourseRatings();
              const ratingsByUser = {};
              const ratingsList = Array.isArray(allRatings) ? allRatings : allRatings.results || [];
              
              ratingsList.forEach(rating => {
                if (rating.student === user.id) {
                  ratingsByUser[rating.course] = rating;
                }
              });
              
              if (mounted) {
                setUserRatings(ratingsByUser);
              }
            } catch (err) {
              // Silently fail if ratings endpoint doesn't exist yet (migration not run)
              console.warn('Ratings not available yet. Run migrations to enable this feature.');
              if (mounted) {
                setUserRatings({});
              }
            }
          }
        }
      } catch (error) {
        if (mounted) {
          setCourses([]);
          setEnrollments([]);
          setCourseEnrollmentCounts({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { mounted = false; };
  }, [userRole, user]);

  const handleEnroll = async (courseId) => {
    if (!user || !user.id) {
      toast.error('Please log in to enroll in courses');
      return;
    }

    setEnrollingCourseId(courseId);
    try {
      await api.enrollInCourse(courseId, user.id);
      toast.success('Successfully enrolled in the course!');
      
      // Refresh enrollments
      const updatedEnrollments = await api.getEnrollments();
      setEnrollments(updatedEnrollments || []);
    } catch (error) {
      console.error('Enrollment error:', error);
      toast.error(error.message || 'Failed to enroll in course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const isEnrolled = (courseId) => {
    if (!user || !user.id) return false;
    return enrollments.some(e => e.course === courseId && e.student === user.id);
  };

  const handleRating = async (courseId) => {
    // Only allow rating if student hasn't rated yet
    if (userRatings[courseId]) {
      toast.error('You have already rated this course. Ratings cannot be updated.');
      return;
    }
    setTempRating(0);
    setTempReview('');
    setRatingDialogOpen(courseId);
  };

  const submitRating = async () => {
    if (!ratingDialogOpen || tempRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    try {
      // Only allow creating new ratings, not updating
      await api.rateCourse(ratingDialogOpen, tempRating, tempReview);
      toast.success('Rating submitted successfully!');
      
      // Add the new rating to local state
      setUserRatings(prev => ({
        ...prev,
        [ratingDialogOpen]: {
          id: 'new',
          course: ratingDialogOpen,
          rating: tempRating,
          review: tempReview
        }
      }));
      
      // Refresh courses to get updated average rating
      const updatedCourses = await api.getCourses();
      setCourses(updatedCourses || []);
      
      setRatingDialogOpen(null);
      setTempRating(0);
      setTempReview('');
    } catch (error) {
      console.error('Rating error:', error);
      // Check if it's a 500 error indicating migrations need to be run
      if (error.message && error.message.includes('500')) {
        toast.error('Rating feature not yet enabled. Please contact administrator.');
      } else {
        toast.error(error.message || 'Failed to submit rating');
      }
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedCourse) {
    return (
      <EnhancedCourseDetail 
        courseId={selectedCourse} 
        userRole={userRole}
        onBack={() => setSelectedCourse(null)} 
      />
    );
  }

  if (courseCreationMode) {
    return (
      <EnhancedCourseCreation
        mode={courseCreationMode.mode}
        courseId={courseCreationMode.courseId}
        onBack={() => setCourseCreationMode(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">
          {userRole === 'student' ? 'My Courses' : userRole === 'admin' ? 'All Courses' : 'Course Management'}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          {userRole === 'teacher' && (
            <Button onClick={() => setCourseCreationMode({ mode: 'create' })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          )}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div>Loading courses...</div>
        ) : filteredCourses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <div className="aspect-video relative">
              {(() => {
                const raw = course.thumbnail_url || course.image || course.thumbnail || '';
                const transformDriveUrl = (u) => {
                  if (!u) return '';
                  try {
                    const url = new URL(u);
                    const host = url.host || '';
                    if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
                      // Extract file id from typical Drive patterns
                      const m = u.match(/\/d\/([a-zA-Z0-9_-]+)/) || u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                      const id = m && m[1] ? m[1] : url.searchParams.get('id');
                      if (id) {
                        // googleusercontent is more reliable for direct image fetch than uc view
                        return `https://lh3.googleusercontent.com/d/${id}`;
                      }
                    }
                  } catch (e) {
                    // ignore URL parse errors
                  }
                  return u;
                };

                const normalizeImageUrl = (u) => {
                  if (!u) return '';
                  const driveSafe = transformDriveUrl(u.trim());
                  if (!driveSafe) return '';
                  if (/^https?:\/\//i.test(driveSafe) || driveSafe.startsWith('data:')) return driveSafe;
                  if (driveSafe.startsWith('//')) {
                    return `${window.location?.protocol || 'https:'}${driveSafe}`;
                  }
                  const base = assetBase || apiBase;
                  if (!base) return driveSafe;
                  if (driveSafe.startsWith('/')) return `${base}${driveSafe}`;
                  return `${base}/${driveSafe}`;
                };

                const src = normalizeImageUrl(raw);
                if (!src) {
                  return (
                    <div className="w-full h-full bg-gray-100 rounded-t-lg flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  );
                }
                return (
                  <ImageWithFallback
                    src={src}
                    alt={course.title}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                );
              })()}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">{course.average_rating || 0}★</Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{
                    (() => {
                      const instr = course.instructor;
                      if (!instr) return '';
                      if (typeof instr === 'string') return instr;
                      return instr.first_name || instr.last_name ? `${instr.first_name || ''} ${instr.last_name || ''}`.trim() : instr.username || instr.email || '';
                    })()
                  }</p>
                </div>
                
                {userRole === 'student' ? (
                  <>
                    {isEnrolled(course.id) ? (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{course.progress || 0}%</span>
                          </div>
                          <Progress value={course.progress || 0} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="flex-1 min-w-[140px]" onClick={() => setSelectedCourse(course.id)}>
                            <Play className="h-3 w-3 mr-1" />
                            Continue Learning
                          </Button>
                          <Button 
                            size="sm"
                            variant={userRatings[course.id] ? "secondary" : "outline"}
                            onClick={() => handleRating(course.id)}
                            disabled={userRatings[course.id]}
                            title={userRatings[course.id] ? 'You have already rated this course' : 'Rate this course'}
                            className="min-w-[140px]"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {userRatings[course.id] ? `Rated ${userRatings[course.id].rating}★` : 'Rate'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 min-w-[140px]" 
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrollingCourseId === course.id}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          {enrollingCourseId === course.id ? 'Enrolling...' : 'Enroll Now'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{courseEnrollmentCounts[course.id] || 0} students</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{course.average_rating || 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedCourse(course.id)}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {userRole === 'teacher' && (
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          setCourseCreationMode({ mode: 'edit', courseId: course.id });
                        }}>
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rating Dialog */}
      {ratingDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">Rate This Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setTempRating(star)}
                      className="focus:outline-none hover:scale-110 transition-transform"
                      type="button"
                    >
                      <Star
                        className={`h-8 w-8 cursor-pointer ${
                          star <= tempRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {tempRating > 0 && (
                  <p className="mt-2 text-sm text-gray-600">Your rating: {tempRating} star{tempRating !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Review (Optional)</label>
                <textarea
                  value={tempReview}
                  onChange={(e) => setTempReview(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your thoughts about this course..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRatingDialogOpen(null);
                    setTempRating(0);
                    setTempReview('');
                  }}
                  type="button"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitRating}
                  disabled={tempRating === 0}
                  type="button"
                >
                  Submit Rating
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}