import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Video, 
  FileText, 
  Download, 
  Eye, 
  Bot, 
  Send,
  User,
  Star,
  Clock,
  Bookmark,
  Edit,
  MessageCircle
} from 'lucide-react';

export function EnhancedLibrary() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [message, setMessage] = useState('');
  const [libraryItems, setLibraryItems] = useState([]);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    id: null,
    title: '',
    item_type: 'Book',
    category: '',
    course_id: '',
    subject: '',
    description: '',
    file_url: '',
    thumbnail_url: '',
    file_size_kb: '',
    duration_minutes: '',
    pages: '',
    tags: '',
    is_featured: false,
    access_level: 'all'
  });
  // Chat/messages and resources should come from API or user interactions. Removed seeded/demo chat and resource items.
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const resources = [];

  // Allow overriding API base during dev with Vite env var VITE_API_BASE
  const API_BASE = (import.meta.env?.VITE_API_BASE || '').replace(/\/+$|^\s+|\s+$/g, '');

  const typeIcons = {
    book: BookOpen,
    video: Video,
    document: FileText,
    article: FileText,
    audio: FileText,
    'research paper': FileText
  };

  useEffect(() => {
    // Fetch library items via centralized API helper (uses configured BASE)
    const fetchItems = async () => {
      try {
        const items = await api.getLibraryItems();
        setLibraryItems(items || []);
      } catch (err) {
        console.warn('Failed to load library items', err);
        setLibraryItems([]);
      }
    };
    fetchItems();
  }, []);

  const openAddModal = () => {
    setForm({
      id: null,
      title: '',
      item_type: 'Book',
      category: '',
      course_id: '',
      subject: '',
      description: '',
      file_url: '',
      thumbnail_url: '',
      file_size_kb: '',
      duration_minutes: '',
      pages: '',
      tags: '',
      is_featured: false,
      access_level: 'all'
    });
    setIsEditing(false);
    setIsManageOpen(true);
  };

  const openEditModal = (item) => {
    setForm({
      id: item.id,
      title: item.title || '',
      item_type: item.item_type || 'Book',
      category: item.category || '',
      course_id: item.course_id || '',
      subject: item.subject || '',
      description: item.description || '',
      file_url: item.file_url || '',
      thumbnail_url: item.thumbnail_url || '',
      file_size_kb: item.file_size_kb || '',
      duration_minutes: item.duration_minutes || '',
      pages: item.pages || '',
      tags: (item.tags || []).join(','),
      is_featured: !!item.is_featured,
      access_level: item.access_level || 'all'
    });
    setIsEditing(true);
    setIsManageOpen(true);
  };

  const submitForm = async () => {
    // Normalize payload: convert empty strings to null where appropriate and
    // ensure numeric fields are numbers so DRF IntegerField/FloatField validation passes.
    const rawTags = form.tags || '';
    const payload = Object.assign({}, form, {
      tags: rawTags.split(',').map(t => t.trim()).filter(Boolean),
      course_id: form.course_id ? Number(form.course_id) : null,
      file_size_kb: form.file_size_kb !== '' && form.file_size_kb !== null ? Number(form.file_size_kb) : null,
      duration_minutes: form.duration_minutes !== '' && form.duration_minutes !== null ? Number(form.duration_minutes) : null,
      pages: form.pages !== '' && form.pages !== null ? Number(form.pages) : null,
      is_featured: !!form.is_featured,
    });
    try {
      if (isEditing && form.id) {
        const updated = await api.updateLibraryItem(form.id, payload);
        setLibraryItems(prev => prev.map(it => it.id === updated.id ? updated : it));
        toast.success('Library item updated');
      } else {
        const created = await api.createLibraryItem(payload);
        setLibraryItems(prev => [created, ...prev]);
        toast.success('Library item added');
      }
      setIsManageOpen(false);
    } catch (err) {
      console.error('Create/Update library item failed', err);
      // Surface backend validation messages when available to help debugging
      const msg = err && err.data ? (typeof err.data === 'string' ? err.data : (err.data.detail || JSON.stringify(err.data))) : (err.message || 'Failed to save item');
      toast.error(msg);
    }
  };

  const handleViewResource = (resource) => {
    const url = resource && (resource.file_url || resource.url);
    if (!url) {
      toast.error('No file available to view');
      return;
    }
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to open file', err);
      toast.error('Unable to open file');
    }
  };

    const downloadResource = async (resource) => {
      const url = resource && (resource.file_url || resource.url);
      if (!url) {
        toast.error('No file available to download');
        return;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Network error ${res.status}`);
        const blob = await res.blob();
        const urlParts = url.split('/');
        let filename = urlParts[urlParts.length - 1].split('?')[0] || `${(resource.title || 'file')}.pdf`;
        if (!filename.includes('.')) filename = `${filename}.pdf`;
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        toast.success('Download started');

        try {
          const resp = await api.recordLibraryDownload(resource.id);
          if (resp && typeof resp.total_downloads !== 'undefined') {
            setLibraryItems(prev => prev.map(it => it.id === resource.id ? Object.assign({}, it, { total_downloads: resp.total_downloads }) : it));
          }
        } catch (e) {
          console.warn('Failed to record download', e);
        }
      } catch (err) {
        console.error('Download failed, falling back to opening in new tab', err);
        try {
          window.open(url, '_blank', 'noopener,noreferrer');
          toast('Opened file in new tab; use browser Save As to download');
          try {
            const resp = await api.recordLibraryDownload(resource.id);
            if (resp && typeof resp.total_downloads !== 'undefined') {
              setLibraryItems(prev => prev.map(it => it.id === resource.id ? Object.assign({}, it, { total_downloads: resp.total_downloads }) : it));
            }
          } catch (recErr) {
            console.warn('Failed to record download after fallback open', recErr);
          }
        } catch (e) {
          console.error('Fallback open failed', e);
          toast.error('Failed to download or open file');
        }
      }
    };

    const handleDelete = async (id) => {
      if (!confirm('Delete this item?')) return;
      try {
        await api.deleteLibraryItem(id);
        setLibraryItems(prev => prev.filter(i => i.id !== id));
        toast.success('Item deleted');
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete item');
      }
    };

    const callAIChat = async (text) => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        if (!res.ok) {
          const t = await res.text().catch(() => null);
          throw new Error(t || `Status ${res.status}`);
        }
        const data = await res.json().catch(() => null);
        if (!data) return null;
        if (typeof data === 'string') return data;
        return data.content || data.text || data.message || null;
      } catch (err) {
        console.error('AI chat error', err);
        toast.error('AI request failed');
        return null;
      }
    };

    const handleSendMessage = async () => {
      if (!message.trim()) return;
      const userMsg = {
        id: chatMessages.length + 1,
        type: 'user',
        content: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, userMsg]);
      const outgoing = message;
      setMessage('');
      setIsTyping(true);

      const aiResponse = await callAIChat(outgoing);
      setIsTyping(false);

      if (aiResponse) {
        const aiMsg = {
          id: chatMessages.length + 2,
          type: 'ai',
          content: aiResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);
      }
    };

    const quickPrompts = [];

    const filteredItems = libraryItems.filter(item => {
      const q = (searchQuery || '').toLowerCase();
      const matchesSearch = !q || ((item.title || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q) || (item.uploaded_by && (`${item.uploaded_by.first_name || ''} ${item.uploaded_by.last_name || ''}`).toLowerCase().includes(q)));
      const matchesCategory = categoryFilter === 'all' || item.item_type === categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    const sortedItems = [...filteredItems].sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.total_downloads || 0) - (a.total_downloads || 0);
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case 'author':
          const aName = (a.uploaded_by && (a.uploaded_by.last_name || a.uploaded_by.first_name)) || '';
          const bName = (b.uploaded_by && (b.uploaded_by.last_name || b.uploaded_by.first_name)) || '';
          return aName.localeCompare(bName);
        default:
          return new Date(b.upload_date || 0).getTime() - new Date(a.upload_date || 0).getTime();
      }
    });

    return ( <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Library</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search books, notes, research papers, videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-80"
            />
          </div>
          {user?.role === 'teacher' && (
            <Button onClick={openAddModal} className="bg-[#F59E0B] hover:bg-[#D97706] text-white">
              + Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Category Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
          className={categoryFilter === 'all' ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' : ''}
        >          All Categories
        </Button>
        <Button
          variant={categoryFilter === 'Book' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('Book')}
          className={categoryFilter === 'Book' ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' : ''}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Books
        </Button>
        <Button
          variant={categoryFilter === 'Document' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('Document')}
          className={categoryFilter === 'Document' ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' : ''}
        >
          <FileText className="h-4 w-4 mr-2" />
          Notes
        </Button>
        <Button
          variant={categoryFilter === 'Video' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('Video')}
          className={categoryFilter === 'Video' ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' : ''}
        >
          <Video className="h-4 w-4 mr-2" />
          Recorded Lectures
        </Button>
        <Button
          variant={categoryFilter === 'Research Paper' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('Research Paper')}
          className={categoryFilter === 'Research Paper' ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' : ''}
        >
          <FileText className="h-4 w-4 mr-2" />
          Research Papers
        </Button>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Library Items List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4">
            {sortedItems.map((item) => {
              const IconComponent = typeIcons[item.item_type?.toLowerCase()] || FileText;
              // Derive display-friendly fields
              const fileUrl = item.file_url || '';
              let formatText = '';
              try {
                if (fileUrl) {
                  const parts = fileUrl.split('/').pop().split('?')[0].split('.');
                  if (parts.length > 1) formatText = parts.pop().toUpperCase();
                }
              } catch (e) { formatText = ''; }

              const sizeText = item.file_size_kb ? `${item.file_size_kb} KB` : '';
              const downloadsCount = item.total_downloads || 0;
              const authorName = item.uploaded_by ? `${item.uploaded_by.first_name || ''} ${item.uploaded_by.last_name || ''}`.trim() : 'Unknown';

              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                        <IconComponent className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            <p className="text-muted-foreground">{authorName}</p>
                          </div>
                          {item.average_rating && typeof item.average_rating === 'number' && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{item.average_rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">{item.description}</p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <Badge variant="outline">{item.item_type}</Badge>
                          {item.subject && <Badge variant="outline">{item.subject}</Badge>}
                          {formatText && <span>{formatText}</span>}
                          {sizeText && <span>{sizeText}</span>}
                          <span>{downloadsCount} downloads</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewResource(item)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button size="sm" onClick={() => downloadResource(item)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>

                          {user?.role === 'teacher' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI Study Assistant */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                AI Study Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Prompts */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Actions:</p>
                <div className="grid grid-cols-1 gap-2">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto p-2"
                      onClick={() => setMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="bg-gray-50 rounded-lg p-3 h-64 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className={`text-xs ${msg.type === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>
                          {msg.type === 'ai' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`rounded-lg p-2 text-xs ${
                        msg.type === 'ai' ? 'bg-white border' : 'bg-blue-600 text-white'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.type === 'ai' ? 'text-muted-foreground' : 'text-blue-100'
                        }`}>
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask AI for study help..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    {/* Add / Edit Library Item Dialog */}
    <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogTitle>{isEditing ? 'Edit Library Item' : 'Add Library Item'}</DialogTitle>
        <DialogDescription>
          Teachers can add books, videos, documents, audio, articles or research papers here.
        </DialogDescription>

        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-1 gap-3">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} />

            <Label>Type</Label>
            <Select value={form.item_type} onValueChange={(v) => setForm(prev => ({ ...prev, item_type: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Book">Book</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Document">Document</SelectItem>
                <SelectItem value="Audio">Audio</SelectItem>
                <SelectItem value="Article">Article</SelectItem>
                <SelectItem value="Research Paper">Research Paper</SelectItem>
              </SelectContent>
            </Select>

            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} />

            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))} />

            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} />

            <Label>File URL</Label>
            <Input value={form.file_url} onChange={(e) => setForm(prev => ({ ...prev, file_url: e.target.value }))} />

            <Label>Thumbnail URL</Label>
            <Input value={form.thumbnail_url} onChange={(e) => setForm(prev => ({ ...prev, thumbnail_url: e.target.value }))} />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>File size (KB)</Label>
                <Input type="number" value={form.file_size_kb} onChange={(e) => setForm(prev => ({ ...prev, file_size_kb: e.target.value }))} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: e.target.value }))} />
              </div>
              <div>
                <Label>Pages</Label>
                <Input type="number" value={form.pages} onChange={(e) => setForm(prev => ({ ...prev, pages: e.target.value }))} />
              </div>
            </div>

            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))} />

            <div className="flex items-center gap-4">
              <Checkbox checked={form.is_featured} onCheckedChange={(v) => setForm(prev => ({ ...prev, is_featured: !!v }))} />
              <span>Featured</span>
            </div>

            <Label>Access Level</Label>
            <Select value={form.access_level} onValueChange={(v) => setForm(prev => ({ ...prev, access_level: v }))}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="teachers">Teachers</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsManageOpen(false)}>Cancel</Button>
            <Button onClick={submitForm} className="bg-[#F59E0B] text-white">{isEditing ? 'Save Changes' : 'Create Item'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </> );
}