import React, { useMemo, useState } from 'react';
import { EyeOff, Flag, Lock, MessageSquare, Pin, Send, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import {
  useCreateForumPostMutation,
  useCreateForumReportMutation,
  useCreateForumThreadMutation,
  useForumPostHideMutation,
  useForumThreadActionMutation,
  useForumThreadsQuery,
} from '../features/forum/queries';

export function CourseDiscussions({ courseId, userRole, enabled }) {
  const { user } = useAuth();
  const { data: threads = [], isLoading } = useForumThreadsQuery(courseId);
  const createThreadMutation = useCreateForumThreadMutation(courseId);
  const createPostMutation = useCreateForumPostMutation(courseId);
  const reportMutation = useCreateForumReportMutation();
  const pinThreadMutation = useForumThreadActionMutation(courseId, 'pin');
  const lockThreadMutation = useForumThreadActionMutation(courseId, 'lock');
  const resolveThreadMutation = useForumThreadActionMutation(courseId, 'resolve');
  const hideThreadMutation = useForumThreadActionMutation(courseId, 'hide');
  const hidePostMutation = useForumPostHideMutation(courseId);
  const [threadForm, setThreadForm] = useState({ title: '', body: '' });
  const [replyDrafts, setReplyDrafts] = useState({});
  const [busyThreadId, setBusyThreadId] = useState(null);
  const [busyPostId, setBusyPostId] = useState(null);

  const canModerate = userRole === 'teacher' || userRole === 'admin';
  const visibleThreads = useMemo(
    () => threads.filter((thread) => canModerate || thread.status !== 'hidden'),
    [canModerate, threads],
  );

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Course Discussions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Discussions are disabled for this course right now.
        </CardContent>
      </Card>
    );
  }

  const handleCreateThread = async () => {
    if (!threadForm.title.trim() || !threadForm.body.trim()) return;
    await createThreadMutation.mutateAsync({
      course_id: courseId,
      title: threadForm.title.trim(),
      body: threadForm.body.trim(),
    });
    setThreadForm({ title: '', body: '' });
  };

  const handleReply = async (threadId) => {
    const body = replyDrafts[threadId];
    if (!body?.trim()) return;
    await createPostMutation.mutateAsync({ threadId, payload: { body: body.trim() } });
    setReplyDrafts((prev) => ({ ...prev, [threadId]: '' }));
  };

  const handleThreadAction = async (threadId, fn) => {
    setBusyThreadId(threadId);
    try {
      await fn(threadId);
    } finally {
      setBusyThreadId(null);
    }
  };

  const handleReport = async (postId) => {
    const reason = window.prompt('Why are you reporting this post?');
    if (!reason) return;
    await reportMutation.mutateAsync({ post: postId, reason });
    alert('Post reported.');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Course Discussions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user && (
          <div className="space-y-3 rounded-lg border p-4">
            <Input
              placeholder="Start a new discussion"
              value={threadForm.title}
              onChange={(event) => setThreadForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Textarea
              rows={3}
              placeholder="Describe your question or share an idea..."
              value={threadForm.body}
              onChange={(event) => setThreadForm((prev) => ({ ...prev, body: event.target.value }))}
            />
            <div className="flex justify-end">
              <Button onClick={handleCreateThread} disabled={createThreadMutation.isPending}>
                <Send className="mr-2 h-4 w-4" />
                Post Thread
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading discussions...</p>
        ) : visibleThreads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No discussion threads yet. Start the first one.</p>
        ) : (
          visibleThreads.map((thread) => (
            <div key={thread.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{thread.title}</h4>
                    {thread.is_pinned && <Pin className="h-4 w-4 text-amber-500" />}
                    {thread.is_locked && <Lock className="h-4 w-4 text-red-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{thread.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Started by {thread.created_by?.username || 'Unknown'} • {thread.reply_count || 0} replies
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {thread.status}
                </Badge>
              </div>

              {canModerate && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busyThreadId === thread.id} onClick={() => handleThreadAction(thread.id, (id) => pinThreadMutation.mutateAsync(id))}>
                    <Pin className="mr-2 h-4 w-4" />
                    {thread.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyThreadId === thread.id} onClick={() => handleThreadAction(thread.id, (id) => lockThreadMutation.mutateAsync(id))}>
                    <Lock className="mr-2 h-4 w-4" />
                    {thread.is_locked ? 'Unlock' : 'Lock'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyThreadId === thread.id} onClick={() => handleThreadAction(thread.id, (id) => resolveThreadMutation.mutateAsync(id))}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {thread.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyThreadId === thread.id} onClick={() => handleThreadAction(thread.id, (id) => hideThreadMutation.mutateAsync(id))}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    {thread.status === 'hidden' ? 'Unhide' : 'Hide'}
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {(thread.posts || []).map((post) => (
                  <div key={post.id} className="rounded-md bg-muted/40 p-3">
                    <p className="text-sm">{post.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {post.author?.username || 'Unknown'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleReport(post.id)}>
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                      </Button>
                      {canModerate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyPostId === post.id}
                          onClick={async () => {
                            setBusyPostId(post.id);
                            try {
                              await hidePostMutation.mutateAsync(post.id);
                            } finally {
                              setBusyPostId(null);
                            }
                          }}
                        >
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide Post
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!thread.is_locked && (
                <div className="flex gap-2">
                  <Input
                    value={replyDrafts[thread.id] || ''}
                    onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [thread.id]: event.target.value }))}
                    placeholder={userRole === 'teacher' ? 'Reply to students...' : 'Reply to this thread...'}
                  />
                  <Button variant="outline" onClick={() => handleReply(thread.id)} disabled={createPostMutation.isPending}>
                    Reply
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
