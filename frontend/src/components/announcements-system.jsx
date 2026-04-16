import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Pin,
  Eye,
  Send,
  Archive,
  Search,
  AlertCircle,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';
import * as api from '../services/api';

// Clean, single implementation of AnnouncementsSystem
export function AnnouncementsSystem({ userRole, userId }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [descOpen, setDescOpen] = useState(false);
  const [descTitle, setDescTitle] = useState('');
  const [descBody, setDescBody] = useState('');

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  async function loadAnnouncements() {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAnnouncements(); }, []);

  const filteredAnnouncements = (announcements || []).filter(a => {
    const hay = ((a.title || '') + ' ' + ((a.content || a.body) || '')).toLowerCase();
    return hay.includes((searchQuery || '').toLowerCase());
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'important': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return AlertCircle;
      case 'important': return Info;
      default: return CheckCircle;
    }
  };

  // Date helpers: accept multiple possible API field names
  const getCreatedRaw = (a) => a && (a.createdAt || a.created_at || a.created || a.createdOn || a.created_on || a.createdAtUtc || a.created_at_utc);
  const getExpiresRaw = (a) => a && (a.expiresAt || a.expires_at || a.expires || a.expiry || a.expiresAtUtc || a.expires_at_utc);
  const formatDate = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };
  const formatDateTime = (raw) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  function AnnouncementCard({ announcement, onShowDescription }) {
    const PriorityIcon = getPriorityIcon(announcement.priority);
    return (
      <Card className={`relative ${announcement.isPinned ? 'border-blue-200 bg-blue-50' : ''}`}>
        {announcement.isPinned && <div className="absolute top-2 right-2"><Pin className="h-4 w-4 text-blue-500" /></div>}
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getPriorityColor(announcement.priority)}>
                  <PriorityIcon className="h-3 w-3 mr-1" />{announcement.priority}
                </Badge>
                {userRole === 'admin' && <Badge variant="outline">{announcement.audience}</Badge>}
              </div>
              <CardTitle className="text-lg">{announcement.title}</CardTitle>
              {userRole === 'admin' ? (
                <p className="text-sm text-muted-foreground">
                  Created: {formatDateTime(getCreatedRaw(announcement))}
                  {getExpiresRaw(announcement) ? ` • Expires: ${formatDate(getExpiresRaw(announcement))}` : ''}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{formatDate(getCreatedRaw(announcement))}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const body = announcement.content || announcement.body || '';
            const preview = body.length > 180 ? `${body.slice(0, 180)}…` : body;
            return (
              <div className="text-sm mb-4">
                <div className="text-sm mb-2">
                  <strong className="block mb-1">Description</strong>
                  <div role="button" tabIndex={0} onClick={() => onShowDescription && onShowDescription(announcement.title, body)} onKeyPress={(e) => { if (e.key === 'Enter') onShowDescription && onShowDescription(announcement.title, body); }} className="cursor-pointer hover:underline">
                    {preview}
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {userRole === 'admin' && (
                <div className="flex items-center gap-1"><Eye className="h-3 w-3" /><span>{announcement.views || 0} views</span></div>
              )}
            </div>
            {userRole === 'admin' && announcement.expiresAt && (<div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span></div>)}
          </div>

          {userRole === 'admin' && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button size="sm" variant="outline" onClick={() => { setEditingAnnouncement(announcement); setShowCreateDialog(true); }}><Edit className="h-3 w-3 mr-1" />Edit</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  const ok = window.confirm('Archive this announcement?');
                  if (!ok) return;
                  // mark archived via patch; backend field assumed `is_archived`
                  await api.updateAnnouncement(announcement.id, { is_archived: true });
                  try { const { toast } = await import('sonner'); toast.success('Announcement archived'); } catch (e) {}
                  await loadAnnouncements();
                } catch (err) { console.error('archive error', err); try { const { toast } = await import('sonner'); toast.error('Failed to archive'); } catch (e) {} }
              }}><Archive className="h-3 w-3 mr-1" />Archive</Button>
              <Button size="sm" variant="destructive" onClick={async () => {
                try {
                  const ok = window.confirm('Delete this announcement? This cannot be undone.');
                  if (!ok) return;
                  await api.deleteAnnouncement(announcement.id);
                  try { const { toast } = await import('sonner'); toast.success('Announcement deleted'); } catch (e) {}
                  await loadAnnouncements();
                } catch (err) { console.error('delete error', err); try { const { toast } = await import('sonner'); toast.error('Failed to delete'); } catch (e) {} }
              }}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Analytics removed - not required for the simplified views

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Announcements</h2>
          <p className="text-muted-foreground">{userRole === 'admin' ? 'Create and manage platform-wide announcements' : 'Stay updated with important announcements and notices'}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search announcements..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-64 pl-10" />
          </div>

          {userRole === 'admin' && (
            <Button onClick={() => { setEditingAnnouncement(null); setShowCreateDialog(true); }}><Plus className="h-4 w-4 mr-2" />Create Announcement</Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading && <div className="p-4">Loading announcements...</div>}
        {fetchError && <div className="p-4 text-red-600">Failed to load announcements</div>}
        {!loading && !fetchError && filteredAnnouncements.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Announcements Found</h3>
            <p className="text-muted-foreground">Check back later for new announcements</p>
          </div>
        )}

        {!loading && !fetchError && filteredAnnouncements.map(a => (
          <AnnouncementCard key={a.id} announcement={a} onShowDescription={(t, b) => { setDescTitle(t); setDescBody(b); setDescOpen(true); }} />
        ))}
      </div>

      {userRole === 'admin' && (
        <CreateAnnouncementDialog open={showCreateDialog} editingAnnouncement={editingAnnouncement} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setEditingAnnouncement(null); }} onCreated={loadAnnouncements} />
      )}

      {/** Description dialog bound to local state */}
      <Dialog open={descOpen} onOpenChange={setDescOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{descTitle}</DialogTitle>
          </DialogHeader>
          <div className="prose max-h-[60vh] overflow-y-auto mt-2">
            <p>{descBody}</p>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setDescOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateAnnouncementDialog({ open, onOpenChange, onCreated, editingAnnouncement }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [audienceSel, setAudienceSel] = useState('all');
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelEmail, setChannelEmail] = useState(false);
  const [channelSms, setChannelSms] = useState(false);
  const [scheduleOption, setScheduleOption] = useState('immediate');
  const [scheduledFor, setScheduledFor] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (editingAnnouncement) {
      setTitle(editingAnnouncement.title || '');
      setContent(editingAnnouncement.content || editingAnnouncement.body || '');
      setPriority(editingAnnouncement.priority || 'normal');
      setAudienceSel(editingAnnouncement.audience || 'all');
      setChannelInApp((editingAnnouncement.channels || []).includes('in-app'));
      setChannelEmail((editingAnnouncement.channels || []).includes('email'));
      setChannelSms((editingAnnouncement.channels || []).includes('sms'));
      setScheduleOption(editingAnnouncement.scheduled_for ? 'scheduled' : 'immediate');
      setScheduledFor(editingAnnouncement.scheduled_for || '');
      setExpiresAt(editingAnnouncement.expires_at || editingAnnouncement.expiresAt || '');
    } else {
      setTitle(''); setContent(''); setPriority('normal'); setAudienceSel('all'); setChannelInApp(true); setChannelEmail(false); setChannelSms(false); setScheduleOption('immediate'); setScheduledFor(''); setExpiresAt('');
    }
  }, [editingAnnouncement]);

  const isEditing = !!(editingAnnouncement && editingAnnouncement.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="announcement-dialog-desc">
        <p id="announcement-dialog-desc" className="sr-only">Dialog to create and schedule announcements for users.</p>
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Enter announcement title..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="content">Message Content</Label>
            <Textarea id="content" placeholder="Enter your announcement message..." rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v)}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="audience">Audience</Label>
              <Select value={audienceSel} onValueChange={(v) => setAudienceSel(v)}>
                <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notification Channels</Label>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center space-x-2"><Switch id="in-app" checked={channelInApp} onCheckedChange={(v) => setChannelInApp(!!v)} /><Label htmlFor="in-app">In-App</Label></div>
              <div className="flex items-center space-x-2"><Switch id="email" checked={channelEmail} onCheckedChange={(v) => setChannelEmail(!!v)} /><Label htmlFor="email">Email</Label></div>
              <div className="flex items-center space-x-2"><Switch id="sms" checked={channelSms} onCheckedChange={(v) => setChannelSms(!!v)} /><Label htmlFor="sms">SMS</Label></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="schedule">Schedule</Label>
              <Select value={scheduleOption} onValueChange={(v) => setScheduleOption(v)}>
                <SelectTrigger><SelectValue placeholder="Send immediately" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Send Immediately</SelectItem>
                  <SelectItem value="scheduled">Schedule for Later</SelectItem>
                </SelectContent>
              </Select>
              {scheduleOption === 'scheduled' && (<div className="mt-2"><Label htmlFor="scheduled_for">Scheduled Date & time</Label><Input id="scheduled_for" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} /></div>)}
            </div>

            <div>
              <Label htmlFor="expiry">Expiration Date</Label>
              <Input id="expiry" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!title || !title.trim()) { try { const { toast } = await import('sonner'); toast.error('Title is required'); } catch (e) {} return; }
              if (!content || !content.trim()) { try { const { toast } = await import('sonner'); toast.error('Message content is required'); } catch (e) {} return; }
              const channels = [];
              if (channelInApp) channels.push('in-app'); if (channelEmail) channels.push('email'); if (channelSms) channels.push('sms');
              const payload = { title: title.trim(), body: content.trim(), audience: audienceSel, priority, channels, scheduled_for: scheduleOption === 'scheduled' && scheduledFor ? new Date(scheduledFor).toISOString() : null, expires_at: expiresAt ? new Date(expiresAt).toISOString() : null };
              try {
                let res;
                if (isEditing) {
                  res = await api.updateAnnouncement(editingAnnouncement.id, payload);
                } else {
                  res = await api.createAnnouncement(payload);
                }
                try { if (onCreated) await onCreated(res); } catch (e) { console.error('onCreated handler failed', e); }
                onOpenChange(false);
                // reset handled by effect watching editingAnnouncement
                try { const { toast } = await import('sonner'); toast.success(isEditing ? 'Announcement updated' : 'Announcement created'); } catch (e) {}
              } catch (err) {
                try { const { toast } = await import('sonner'); const msg = (err && err.data && (err.data.detail || JSON.stringify(err.data))) || (isEditing ? 'Failed to update announcement' : 'Failed to create announcement'); toast.error(msg); } catch (e) {}
                console.error('create/update announcement error', err);
              }
            }}><Send className="h-4 w-4 mr-2" />{isEditing ? 'Save Changes' : 'Send Announcement'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}