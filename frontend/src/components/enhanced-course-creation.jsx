import React, { useState } from 'react';
import api from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import {
  Plus,
  Upload,
  Video,
  FileText,
  Calendar,
  Users,
  Save,
  Eye,
  Edit,
  Trash2,
  Copy,
  BookOpen,
  Play,
  Download,
  Clock,
  Star,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Props/types removed for JS build. Course data should be fetched from API in edit mode.
  export function EnhancedCourseCreation({ mode, courseId, onBack }) {
    const [activeTab, setActiveTab] = useState('basic');
    const [courseData, setCourseData] = useState({
      title: '',
      description: '',
      thumbnail_url: '',
      category: '',
      level: '',
      duration: '',
      language: '',
      isPublished: false,
      allowDiscussions: true,
      requireApproval: false
    });

    const [lectures, setLectures] = useState([]);
    const [studyMaterials, setStudyMaterials] = useState([]);

    // Dialogs / form state for creating items
    const [isLectureDialogOpen, setIsLectureDialogOpen] = useState(false);
    const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

    const [newLecture, setNewLecture] = useState({
      title: '',
      description: '',
      video_url: '',
      video_file: '',
      duration_minutes: '',
      is_published: false,
      is_free_preview: false,
      content_text: ''
    });

    const [newStudyMaterial, setNewStudyMaterial] = useState({
      title: '',
      file_url: '',
      file_type: '',
      file_size_kb: '',
      category: '',
      description: ''
    });

    const handleCreateLecture = () => {
      const id = Date.now();
      setLectures(prev => [...prev, { id, order_index: prev.length + 1, ...newLecture, materials: [] }]);
      setIsLectureDialogOpen(false);
      setNewLecture({ title: '', description: '', video_url: '', video_file: '', duration_minutes: '', is_published: false, is_free_preview: false, content_text: '' });
    };

    const handleCreateStudyMaterial = () => {
      const id = Date.now();
      setStudyMaterials(prev => [...prev, { id, created_at: new Date().toISOString(), ...newStudyMaterial }]);
      setIsMaterialDialogOpen(false);
      setNewStudyMaterial({ title: '', file_url: '', file_type: '', file_size_kb: '', category: '', description: '' });
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveCourse = async () => {
      setIsSaving(true);
      try {
        // map frontend fields to backend model names where needed
        const payload = {
          title: courseData.title,
          subtitle: courseData.subtitle || '',
          description: courseData.description,
          thumbnail_url: courseData.thumbnail_url || '',
          category: courseData.category,
          level: courseData.level,
          duration_weeks: courseData.duration || null,
          language: courseData.language,
          is_published: courseData.isPublished,
          allow_discussions: courseData.allowDiscussions,
          require_approval: courseData.requireApproval
        };

        const res = await api.createCourse(payload);
        // If API returned created course, persist nested content
        const courseId = res && (res.id || res.pk || res.course?.id) ? (res.id || res.pk || res.course.id) : null;

        if (!courseId) {
          // backend may return the created object directly; try to infer
          console.warn('Could not determine created course id from response', res);
        }

        // persist lectures
        for (const lecture of lectures) {
          try {
            const lecturePayload = Object.assign({}, lecture, { course: courseId });
            // remove local-only fields
            delete lecturePayload.id;
            delete lecturePayload.materials;
            const lectureRes = await api.createLecture(lecturePayload);
            const lectureId = lectureRes && (lectureRes.id || lectureRes.pk) ? (lectureRes.id || lectureRes.pk) : null;
            // persist materials attached to this lecture (if any)
            if (lecture.materials && lecture.materials.length && lectureId) {
              for (const mat of lecture.materials) {
                try {
                  const matPayload = Object.assign({}, mat, { lecture: lectureId });
                  delete matPayload.id;
                  await api.createLectureMaterial(matPayload);
                } catch (e) {
                  console.error('Failed to create lecture material', e);
                }
              }
            }
          } catch (e) {
            console.error('Failed to create lecture', e);
          }
        }

        // persist study materials
        for (const mat of studyMaterials) {
          try {
            const matPayload = Object.assign({}, mat, { course: courseId });
            delete matPayload.id;
            await api.createStudyMaterial(matPayload);
          } catch (e) {
            console.error('Failed to create study material', e);
          }
        }

        alert(`Course ${mode === 'create' ? 'created' : 'updated'} successfully!`);
        if (onBack) onBack(res);
      } catch (err) {
        console.error('Failed to save course', err);
        const msg = err && err.message ? err.message : 'Failed to save course';
        alert(msg);
      } finally {
        setIsSaving(false);
      }
    };

    const handlePublishCourse = () => {
      setCourseData(prev => ({ ...prev, isPublished: true }));
      alert('Course published successfully!');
    };

    const BasicInfoTab = () => (
      <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  type="text"
                  value={courseData.title}
                  onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter course title"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={courseData.category} onValueChange={(value) => setCourseData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Biology">Biology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                value={courseData.description}
                onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what students will learn in this course"
                rows={4}
              />
            
              <div className="mt-3">
                <Label htmlFor="thumbnail">Course Thumbnail (image URL)</Label>
                <Input
                  id="thumbnail"
                  type="text"
                  value={courseData.thumbnail_url}
                  onChange={(e) => setCourseData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="level">Difficulty Level</Label>
                <Select value={courseData.level} onValueChange={(value) => setCourseData(prev => ({ ...prev, level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duration (weeks)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={courseData.duration}
                  onChange={(e) => setCourseData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="16"
                />
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={courseData.language} onValueChange={(value) => setCourseData(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Course Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Student Discussions</Label>
                    <p className="text-sm text-muted-foreground">Enable discussion forums for this course</p>
                  </div>
                  <Switch
                    checked={courseData.allowDiscussions}
                    onCheckedChange={(checked) => setCourseData(prev => ({ ...prev, allowDiscussions: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Enrollment Approval</Label>
                    <p className="text-sm text-muted-foreground">Manually approve student enrollments</p>
                  </div>
                  <Switch
                    checked={courseData.requireApproval}
                    onCheckedChange={(checked) => setCourseData(prev => ({ ...prev, requireApproval: checked }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
    );

    const LecturesTab = () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Course Lectures</h3>
          <Button onClick={() => setIsLectureDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lecture
          </Button>
        </div>

        <div className="space-y-4">
          {lectures.map((lecture, index) => (
            <Card key={lecture.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <h4 className="font-medium">{lecture.title}</h4>
                      {lecture.is_published ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{lecture.description}</p>
                  
                    <div className="flex items-center gap-4 text-sm">
                      {lecture.video_url ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Video className="h-4 w-4" />
                          <span>{lecture.video_url}</span>
                          <span>({lecture.duration_minutes})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600">
                          <Video className="h-4 w-4" />
                          <span>No video uploaded</span>
                        </div>
                      )}
                    
                      {lecture.materials.length > 0 && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <FileText className="h-4 w-4" />
                          <span>{lecture.materials.length} material(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {!lecture.videoFile && (
                  <div className="mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-muted-foreground">Upload lecture video</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        Choose File
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Add New Lecture</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload videos, add descriptions, and attach study materials
            </p>
            <Button onClick={() => setIsLectureDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Lecture
            </Button>
          </CardContent>
        </Card>
      </div>
    );

    const MaterialsTab = () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Study Materials</h3>
          <Button onClick={() => setIsMaterialDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studyMaterials.map((material) => (
            <Card key={material.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge variant="secondary">{material.category}</Badge>
                </div>
              
                <h4 className="font-medium mb-1">{material.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span>{material.file_type}</span>
                  <span>•</span>
                  <span>{material.file_size_kb} KB</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card
            className="border-dashed hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setIsMaterialDialogOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsMaterialDialogOpen(true); }}
          >
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Plus className="h-5 w-5 text-gray-400" />
              </div>
              <h4 className="font-medium mb-1">Add Material</h4>
              <p className="text-sm text-muted-foreground">
                Upload PDFs, documents, or other resources
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {mode === 'create' ? 'Create New Course' : 'Edit Course'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'create' 
                  ? 'Set up your course content, lectures, and materials' 
                  : 'Update course information and manage content'
                }
              </p>
            </div>
          </div>
        
          <div className="flex items-center gap-3">
            {mode === 'edit' && (
              <Badge className={courseData.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                {courseData.isPublished ? 'Published' : 'Draft'}
              </Badge>
            )}
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={handleSaveCourse}>
              {mode === 'create' ? 'Create Course' : 'Update Course'}
            </Button>
            {!courseData.isPublished && (
              <Button onClick={handlePublishCourse} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Course Creation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoTab />
          </TabsContent>

          <TabsContent value="lectures">
            <LecturesTab />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsTab />
          </TabsContent>
        </Tabs>

        {/* Add / Edit Dialogs for Lecture, Material, Schedule (always mounted) */}
        <Dialog open={isLectureDialogOpen} onOpenChange={setIsLectureDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Lecture</DialogTitle>
              <DialogDescription>Provide lecture details to attach to this course.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              <Label>Title</Label>
              <Input value={newLecture.title} onChange={(e) => setNewLecture(prev => ({ ...prev, title: e.target.value }))} />

              <Label>Description</Label>
              <Textarea value={newLecture.description} onChange={(e) => setNewLecture(prev => ({ ...prev, description: e.target.value }))} rows={4} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Video URL</Label>
                  <Input value={newLecture.video_url} onChange={(e) => setNewLecture(prev => ({ ...prev, video_url: e.target.value }))} />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={newLecture.duration_minutes} onChange={(e) => setNewLecture(prev => ({ ...prev, duration_minutes: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Switch checked={!!newLecture.is_published} onCheckedChange={(v) => setNewLecture(prev => ({ ...prev, is_published: v }))} />
                <span>Published</span>
                <Switch checked={!!newLecture.is_free_preview} onCheckedChange={(v) => setNewLecture(prev => ({ ...prev, is_free_preview: v }))} className="ml-6" />
                <span>Free preview</span>
              </div>

              <Label>Content (optional)</Label>
              <Textarea value={newLecture.content_text} onChange={(e) => setNewLecture(prev => ({ ...prev, content_text: e.target.value }))} rows={4} />

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLectureDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateLecture} className="bg-[#F59E0B]">Create Lecture</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Study Material</DialogTitle>
              <DialogDescription>Upload or link study material for this course.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              <Label>Title</Label>
              <Input value={newStudyMaterial.title} onChange={(e) => setNewStudyMaterial(prev => ({ ...prev, title: e.target.value }))} />

              <Label>File URL</Label>
              <Input value={newStudyMaterial.file_url} onChange={(e) => setNewStudyMaterial(prev => ({ ...prev, file_url: e.target.value }))} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>File Type</Label>
                  <Input value={newStudyMaterial.file_type} onChange={(e) => setNewStudyMaterial(prev => ({ ...prev, file_type: e.target.value }))} />
                </div>
                <div>
                  <Label>File Size (KB)</Label>
                  <Input type="number" value={newStudyMaterial.file_size_kb} onChange={(e) => setNewStudyMaterial(prev => ({ ...prev, file_size_kb: e.target.value }))} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={newStudyMaterial.category} onChange={(e) => setNewStudyMaterial(prev => ({ ...prev, category: e.target.value }))} />
                </div>
              </div>

              <Label>Description</Label>
              <Textarea value={newStudyMaterial.description} onChange={(e) => setNewStudyMaterial(prev => ({ ...prev, description: e.target.value }))} rows={3} />

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateStudyMaterial} className="bg-[#F59E0B]">Create Material</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
