import { useState, useEffect, useRef } from 'react';
import { useSession } from '../../contexts/AppContext';
import { CommentDB, genId, timeAgo, getSession } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { Send, Trash2, MessageSquare } from 'lucide-react';

export default function CommentPanel({ recordType, recordId }) {
  const session = useSession();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!recordId) return;
    loadComments();
  }, [recordId]);

  async function loadComments() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vlcrm_comments')
        .select('*')
        .eq('record_type', recordType)
        .eq('record_id', recordId)
        .order('created_at', { ascending: true });
      if (!error && data) setComments(data.map(r => ({
        id: r.id, body: r.body,
        authorId: r.author_id, authorName: r.author_name,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('[CommentPanel] load error', e);
    }
    setLoading(false);
  }

  async function postComment() {
    if (!body.trim()) return;
    setPosting(true);
    const s = session || getSession();
    const comment = {
      id: genId('cmt'),
      record_type: recordType,
      record_id: recordId,
      body: body.trim(),
      author_id: s?.id || 'system',
      author_name: s?.name || 'Team',
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('vlcrm_comments').insert(comment).select().single();
    if (!error && data) {
      setComments(prev => [...prev, {
        id: data.id, body: data.body,
        authorId: data.author_id, authorName: data.author_name,
        createdAt: data.created_at,
      }]);
      setBody('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setPosting(false);
  }

  async function deleteComment(id) {
    if (!confirm('Delete this comment?')) return;
    await supabase.from('vlcrm_comments').delete().eq('id', id);
    setComments(prev => prev.filter(c => c.id !== id));
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); }
  }

  function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const COLORS = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444','#ec4899','#0891b2'];
  function colorFor(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return COLORS[Math.abs(h) % COLORS.length];
  }

  return (
    <div className="comment-panel">
      <div className="comment-panel-header">
        <MessageSquare size={14} />
        <span>Notes & Comments</span>
        <span className="comment-count">{comments.length}</span>
      </div>

      <div className="comment-list">
        {loading && (
          <div className="comment-empty">Loading comments…</div>
        )}
        {!loading && comments.length === 0 && (
          <div className="comment-empty">
            <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: 6 }} />
            <span>No comments yet. Add the first note!</span>
          </div>
        )}
        {comments.map(c => {
          const isOwn = session?.id === c.authorId;
          const color = colorFor(c.authorName);
          return (
            <div key={c.id} className={`comment-item ${isOwn ? 'comment-own' : ''}`}>
              <div className="comment-avatar" style={{ background: color }}>
                {getInitials(c.authorName)}
              </div>
              <div className="comment-bubble">
                <div className="comment-meta">
                  <span className="comment-author">{c.authorName}</span>
                  <span className="comment-time">{timeAgo(c.createdAt)}</span>
                  {(isOwn || session?.role === 'admin' || session?.role === 'founder') && (
                    <button className="comment-delete" onClick={() => deleteComment(c.id)}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <div className="comment-body">{c.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="comment-input-row">
        <div className="comment-input-avatar" style={{ background: colorFor(session?.name || '') }}>
          {getInitials(session?.name || 'U')}
        </div>
        <textarea
          className="comment-input"
          placeholder="Add a note or comment… (Enter to send)"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
        />
        <button
          className="comment-send"
          onClick={postComment}
          disabled={!body.trim() || posting}
          title="Send (Enter)"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
