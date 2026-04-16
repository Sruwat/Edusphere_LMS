import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { getUserSettings, updateUserSettings, me, updateUserProfile } from '../services/api';
import { useTranslation } from '../services/translations';
import { useTheme } from '../contexts/ThemeContext';
import { 
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  BookOpen,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Languages,
  Clock,
  Database,
  Users,
  Settings as SettingsIcon
} from 'lucide-react';

// Props/types removed for JS build. Settings should be fetched from API/backend.
export function SettingsPanel({ userRole, userId, userName }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const { setTheme } = useTheme();
  const t = useTranslation(currentLanguage);
  const [settings, setSettings] = useState({
    profile: {
      name: userName || '',
      email: '',
      phone: '',
      bio: '',
      avatar: null
    },
    appearance: {
      theme: 'light',
      language: 'en',
      timezone: 'IST'
    },
    notifications: {
      email: true,
      inApp: true,
      sms: false,
      assignments: true,
      grades: true,
      announcements: true,
      reminders: true,
      discussionReplies: userRole === 'teacher',
      studentSubmissions: userRole === 'teacher'
    },
    privacy: {
      profileVisibility: 'public',
      emailVisible: false,
      phoneVisible: false,
      allowMessaging: true,
      twoFactorAuth: false
    },
    course: {
      autoEnrollment: false,
      deadlineReminders: true,
      lateSubmissionWarning: true
    },
    teaching: {
      defaultGradingScheme: 'percentage',
      lateSubmissionPolicy: 'partial_credit',
      courseVisibility: 'public',
      plagiarismCheck: true,
      studentMessaging: true
    },
    admin: {
      userRegistration: true,
      courseApproval: false,
      systemMaintenance: false,
      backupFrequency: 'daily',
      passwordPolicy: 'strong'
    }
  });

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const userProfile = await me();
        
        // Fetch user settings (may not exist yet)
        let userSettings = {};
        try {
          userSettings = await getUserSettings();
        } catch (settingsError) {
          // Settings don't exist yet - will use defaults
          console.warn('User settings not found, using defaults:', settingsError);
          userSettings = {};
        }
        
        // Map backend data to frontend state
        const lang = userSettings.language || 'en';
        const themeValue = userSettings.theme || 'light';
        setCurrentLanguage(lang);
        setTheme(themeValue);
        
        const mappedSettings = {
          profile: {
            name: userProfile.first_name && userProfile.last_name 
              ? `${userProfile.first_name} ${userProfile.last_name}` 
              : userProfile.username || '',
            email: userProfile.email || '',
            phone: userProfile.phone || '',
            bio: userProfile.bio || '',
            avatar: userProfile.avatar_url || null
          },
          appearance: {
            theme: userSettings.theme || 'light',
            language: lang,
            timezone: userSettings.timezone || 'UTC-5',
            dashboardView: userSettings.dashboard_view || 'default'
          },
          notifications: {
            email: userSettings.email_notifications ?? true,
            inApp: userSettings.inapp_notifications ?? true,
            sms: userSettings.sms_notifications ?? false,
            assignments: userSettings.notify_assignments ?? true,
            grades: userSettings.notify_grades ?? true,
            announcements: userSettings.notify_announcements ?? true,
            reminders: userSettings.notify_reminders ?? true,
            discussionReplies: userSettings.notify_discussion_replies ?? false,
            studentSubmissions: userSettings.notify_student_submissions ?? false
          },
          privacy: {
            profileVisibility: userSettings.profile_visibility || 'public',
            emailVisible: userSettings.email_visible ?? false,
            phoneVisible: userSettings.phone_visible ?? false,
            allowMessaging: userSettings.allow_messaging ?? true,
            twoFactorAuth: userSettings.two_factor_auth ?? false
          },
          course: {
            autoEnrollment: userSettings.auto_enrollment ?? false,
            deadlineReminders: userSettings.deadline_reminders ?? true,
            lateSubmissionWarning: userSettings.late_submission_warning ?? true
          },
          teaching: {
            defaultGradingScheme: userSettings.default_grading_scheme || 'percentage',
            lateSubmissionPolicy: userSettings.late_submission_policy || 'partial_credit',
            courseVisibility: userSettings.course_visibility || 'public',
            plagiarismCheck: userSettings.plagiarism_check ?? true,
            studentMessaging: userSettings.student_messaging ?? true
          },
          admin: {
            userRegistration: userSettings.user_registration ?? true,
            courseApproval: userSettings.course_approval ?? false,
            systemMaintenance: userSettings.system_maintenance ?? false,
            backupFrequency: userSettings.backup_frequency || 'daily',
            passwordPolicy: userSettings.password_policy || 'strong'
          }
        };

        setSettings(mappedSettings);
        setInitialSettings(mappedSettings);
        
        toast.success('Settings loaded successfully');
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load user profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    // Update language globally when it changes
    if (section === 'appearance' && key === 'language') {
      setCurrentLanguage(value);
    }
    // Update theme globally when it changes
    if (section === 'appearance' && key === 'theme') {
      setTheme(value);
    }
  };

  const handleSaveSettings = async () => {
    // Skip saving if nothing changed
    if (initialSettings && JSON.stringify(settings) === JSON.stringify(initialSettings)) {
      toast.info('No changes to save');
      return;
    }

    try {
      setSaving(true);

      // Update user profile (name, email, phone, bio)
      const [firstName, ...lastNameParts] = settings.profile.name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      await updateUserProfile(userId, {
        first_name: firstName,
        last_name: lastName,
        email: settings.profile.email,
        phone: settings.profile.phone,
        bio: settings.profile.bio
      });

      // Update user settings (all other settings)
      await updateUserSettings({
        theme: settings.appearance.theme,
        language: settings.appearance.language,
        timezone: settings.appearance.timezone,
        email_notifications: settings.notifications.email,
        inapp_notifications: settings.notifications.inApp,
        sms_notifications: settings.notifications.sms,
        notify_assignments: settings.notifications.assignments,
        notify_grades: settings.notifications.grades,
        notify_announcements: settings.notifications.announcements,
        notify_reminders: settings.notifications.reminders,
        notify_discussion_replies: settings.notifications.discussionReplies,
        notify_student_submissions: settings.notifications.studentSubmissions,
        profile_visibility: settings.privacy.profileVisibility,
        email_visible: settings.privacy.emailVisible,
        phone_visible: settings.privacy.phoneVisible,
        allow_messaging: settings.privacy.allowMessaging,
        two_factor_auth: settings.privacy.twoFactorAuth,
        auto_enrollment: settings.course.autoEnrollment,
        deadline_reminders: settings.course.deadlineReminders,
        late_submission_warning: settings.course.lateSubmissionWarning,
        default_grading_scheme: settings.teaching.defaultGradingScheme,
        late_submission_policy: settings.teaching.lateSubmissionPolicy,
        course_visibility: settings.teaching.courseVisibility,
        plagiarism_check: settings.teaching.plagiarismCheck,
        student_messaging: settings.teaching.studentMessaging,
        user_registration: settings.admin.userRegistration,
        course_approval: settings.admin.courseApproval,
        system_maintenance: settings.admin.systemMaintenance,
        backup_frequency: settings.admin.backupFrequency,
        password_policy: settings.admin.passwordPolicy
      });

      toast.success('Settings saved successfully');
      setInitialSettings(settings);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error.data ? JSON.stringify(error.data) : error.message;
      console.error('Detailed error:', errorMessage);
      toast.error(`Failed to save settings: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const ProfileSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t.profileInformation}
          </CardTitle> 
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-8 w-8 text-gray-500" />
            </div>
            <div className="flex-1">
              <Button variant="outline">{t.changeAvatar}</Button>
              <p className="text-sm text-muted-foreground mt-1">
                {t.avatarHint}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t.fullName}</Label>
              <Input 
                id="name"
                value={settings.profile.name}
                onChange={(e) => updateSettings('profile', 'name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">{t.emailAddress}</Label>
              <Input 
                id="email"
                type="email"
                value={settings.profile.email}
                onChange={(e) => updateSettings('profile', 'email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t.phoneNumber}</Label>
              <Input 
                id="phone"
                value={settings.profile.phone}
                onChange={(e) => updateSettings('profile', 'phone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bio">{t.bio}</Label>
              <Input 
                id="bio"
                value={settings.profile.bio}
                onChange={(e) => updateSettings('profile', 'bio', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AppearanceSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t.appearanceDisplay}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t.theme}</Label>
              <p className="text-sm text-muted-foreground">{t.chooseTheme}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={settings.appearance.theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings('appearance', 'theme', 'light')}
              >
                <Sun className="h-4 w-4 mr-1" />
                {t.light}
              </Button>
              <Button 
                variant={settings.appearance.theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSettings('appearance', 'theme', 'dark')}
              >
                <Moon className="h-4 w-4 mr-1" />
                {t.dark}
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="language">{t.language}</Label>
              <Select value={settings.appearance.language} onValueChange={(value) => updateSettings('appearance', 'language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t.english}</SelectItem>
                  <SelectItem value="hi">{t.hindi}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="timezone">{t.timezone}</Label>
              <Select value={settings.appearance.timezone} onValueChange={(value) => updateSettings('appearance', 'timezone', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IST">IST (UTC+05:30) - Official timezone of India</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (UTC+05:30) - Tech, servers, programming</SelectItem>
                  <SelectItem value="Asia/Calcutta">Asia/Calcutta (UTC+05:30) - Deprecated but same as Asia/Kolkata</SelectItem>
                  <SelectItem value="UTC">UTC (UTC±00:00) - Global standard</SelectItem>
                  <SelectItem value="GMT">GMT (UTC±00:00) - Reference timezone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.notificationPreferences}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-4">{t.deliveryMethods}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t.emailNotifications}</Label>
                  <p className="text-sm text-muted-foreground">{t.emailNotificationsDesc}</p>
                </div>
                <Switch 
                  checked={settings.notifications.email}
                  onCheckedChange={(value) => updateSettings('notifications', 'email', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t.inAppNotifications}</Label>
                  <p className="text-sm text-muted-foreground">{t.inAppNotificationsDesc}</p>
                </div>
                <Switch 
                  checked={settings.notifications.inApp}
                  onCheckedChange={(value) => updateSettings('notifications', 'inApp', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t.smsNotifications}</Label>
                  <p className="text-sm text-muted-foreground">{t.smsNotificationsDesc}</p>
                </div>
                <Switch 
                  checked={settings.notifications.sms}
                  onCheckedChange={(value) => updateSettings('notifications', 'sms', value)}
                />
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-4">{t.notificationTypes}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t.assignmentDueDates}</Label>
                <Switch 
                  checked={settings.notifications.assignments}
                  onCheckedChange={(value) => updateSettings('notifications', 'assignments', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.gradeUpdates}</Label>
                <Switch 
                  checked={settings.notifications.grades}
                  onCheckedChange={(value) => updateSettings('notifications', 'grades', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.announcements}</Label>
                <Switch 
                  checked={settings.notifications.announcements}
                  onCheckedChange={(value) => updateSettings('notifications', 'announcements', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.courseReminders}</Label>
                <Switch 
                  checked={settings.notifications.reminders}
                  onCheckedChange={(value) => updateSettings('notifications', 'reminders', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.discussionReplies}</Label>
                <Switch 
                  checked={settings.notifications.discussionReplies}
                  onCheckedChange={(value) => updateSettings('notifications', 'discussionReplies', value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.studentSubmissions}</Label>
                <Switch 
                  checked={settings.notifications.studentSubmissions}
                  onCheckedChange={(value) => updateSettings('notifications', 'studentSubmissions', value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PrivacySecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.privacySecurity}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-4">{t.privacySettings}</h4>
            <div className="space-y-4">
              <div>
                <Label>{t.profileVisibility}</Label>
                <Select value={settings.privacy.profileVisibility} onValueChange={(value) => updateSettings('privacy', 'profileVisibility', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t.public}</SelectItem>
                    <SelectItem value="students">{t.studentsOnly}</SelectItem>
                    <SelectItem value="teachers">{t.teachersOnly}</SelectItem>
                    <SelectItem value="private">{t.private}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label>{t.showEmailAddress}</Label>
                <Switch 
                  checked={settings.privacy.emailVisible}
                  onCheckedChange={(value) => updateSettings('privacy', 'emailVisible', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>{t.showPhoneNumber}</Label>
                <Switch 
                  checked={settings.privacy.phoneVisible}
                  onCheckedChange={(value) => updateSettings('privacy', 'phoneVisible', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>{t.allowDirectMessages}</Label>
                <Switch 
                  checked={settings.privacy.allowMessaging}
                  onCheckedChange={(value) => updateSettings('privacy', 'allowMessaging', value)}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-4">{t.securitySettings}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t.twoFactorAuth}</Label>
                  <p className="text-sm text-muted-foreground">{t.twoFactorAuthDesc}</p>
                </div>
                <Switch 
                  checked={settings.privacy.twoFactorAuth}
                  onCheckedChange={(value) => updateSettings('privacy', 'twoFactorAuth', value)}
                />
              </div>
              
              <div>
                <Button variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  {t.changePassword}
                </Button>
              </div>
              
              <div>
                <Button variant="outline">
                  <Smartphone className="h-4 w-4 mr-2" />
                  {t.manageConnectedDevices}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const CourseSettings = () => {
    if (userRole === 'admin') return null;
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {userRole === 'student' ? t.coursePreferences : t.teachingPreferences}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {userRole === 'student' ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t.autoEnrollmentConfirmation}</Label>
                    <p className="text-sm text-muted-foreground">{t.autoEnrollmentDesc}</p>
                  </div>
                  <Switch 
                    checked={settings.course.autoEnrollment}
                    onCheckedChange={(value) => updateSettings('course', 'autoEnrollment', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t.deadlineReminders}</Label>
                  <Switch 
                    checked={settings.course.deadlineReminders}
                    onCheckedChange={(value) => updateSettings('course', 'deadlineReminders', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t.lateSubmissionWarnings}</Label>
                  <Switch 
                    checked={settings.course.lateSubmissionWarning}
                    onCheckedChange={(value) => updateSettings('course', 'lateSubmissionWarning', value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>{t.defaultGradingScheme}</Label>
                  <Select value={settings.teaching.defaultGradingScheme} onValueChange={(value) => updateSettings('teaching', 'defaultGradingScheme', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t.percentage}</SelectItem>
                      <SelectItem value="letter">{t.letterGrade}</SelectItem>
                      <SelectItem value="points">{t.pointsBased}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t.lateSubmissionPolicy}</Label>
                  <Select value={settings.teaching.lateSubmissionPolicy} onValueChange={(value) => updateSettings('teaching', 'lateSubmissionPolicy', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_penalty">{t.noPenalty}</SelectItem>
                      <SelectItem value="partial_credit">{t.partialCredit}</SelectItem>
                      <SelectItem value="no_credit">{t.noCredit}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t.defaultCourseVisibility}</Label>
                  <Select value={settings.teaching.courseVisibility} onValueChange={(value) => updateSettings('teaching', 'courseVisibility', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">{t.public}</SelectItem>
                      <SelectItem value="unlisted">{t.unlisted}</SelectItem>
                      <SelectItem value="private">{t.private}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t.enablePlagiarismCheck}</Label>
                  <Switch 
                    checked={settings.teaching.plagiarismCheck}
                    onCheckedChange={(value) => updateSettings('teaching', 'plagiarismCheck', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>{t.allowStudentMessaging}</Label>
                  <Switch 
                    checked={settings.teaching.studentMessaging}
                    onCheckedChange={(value) => updateSettings('teaching', 'studentMessaging', value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const AdminSettings = () => {
    if (userRole !== 'admin') return null;
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {t.systemConfiguration}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-4">{t.userManagement}</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t.enableSelfRegistration}</Label>
                    <p className="text-sm text-muted-foreground">{t.enableSelfRegistrationDesc}</p>
                  </div>
                  <Switch 
                    checked={settings.admin.userRegistration}
                    onCheckedChange={(value) => updateSettings('admin', 'userRegistration', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t.courseApprovalRequired}</Label>
                    <p className="text-sm text-muted-foreground">{t.courseApprovalRequiredDesc}</p>
                  </div>
                  <Switch 
                    checked={settings.admin.courseApproval}
                    onCheckedChange={(value) => updateSettings('admin', 'courseApproval', value)}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-4">{t.systemSettings}</h4>
              <div className="space-y-4">
                <div>
                  <Label>{t.backupFrequency}</Label>
                  <Select value={settings.admin.backupFrequency} onValueChange={(value) => updateSettings('admin', 'backupFrequency', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">{t.hourly}</SelectItem>
                      <SelectItem value="daily">{t.daily}</SelectItem>
                      <SelectItem value="weekly">{t.weekly}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t.passwordPolicy}</Label>
                  <Select value={settings.admin.passwordPolicy} onValueChange={(value) => updateSettings('admin', 'passwordPolicy', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weak">{t.basicPolicy}</SelectItem>
                      <SelectItem value="medium">{t.mediumPolicy}</SelectItem>
                      <SelectItem value="strong">{t.strongPolicy}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t.maintenanceMode}</Label>
                    <p className="text-sm text-muted-foreground">{t.maintenanceModeDesc}</p>
                  </div>
                  <Switch 
                    checked={settings.admin.systemMaintenance}
                    onCheckedChange={(value) => updateSettings('admin', 'systemMaintenance', value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t.settings}</h2>
          <p className="text-muted-foreground">{t.managePreferences}</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving || loading}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t.saving : t.saveChanges}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <p className="text-muted-foreground">{t.loadingSettings}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">{t.profile}</TabsTrigger>
            <TabsTrigger value="appearance">{t.appearance}</TabsTrigger>
            <TabsTrigger value="notifications">{t.notifications}</TabsTrigger>
            <TabsTrigger value="privacy">{t.privacy}</TabsTrigger>
            <TabsTrigger value="course">
              {userRole === 'student' ? t.course : userRole === 'teacher' ? t.teaching : t.system}
            </TabsTrigger>
            {userRole === 'admin' && <TabsTrigger value="admin">{t.admin}</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <AppearanceSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <PrivacySecuritySettings />
          </TabsContent>

          <TabsContent value="course" className="space-y-4">
            {userRole === 'admin' ? <AdminSettings /> : <CourseSettings />}
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="admin" className="space-y-4">
              <AdminSettings />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}