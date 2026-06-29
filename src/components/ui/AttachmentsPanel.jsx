import { useState, useEffect, useRef } from 'react';
import { useSession } from '../../contexts/AppContext';
import { AttachmentDB, uploadFile, deleteFile, genId, formatDate } from '../../lib/data';
import { supabase } from '../../lib/supabase';
import { Paperclip, Upload, Trash2, Download, FileText, Image, File, X, AlertCircle } from 'lucide-react';

const BUCKET = 'vlcrm-attachments';

function fileIcon(type = '') {
  if (type.startsWith('image/')) return <Image size={16} />;
  if (type === 'application/pdf') return <FileText size={16} />;
  return <File size={16} />;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsPanel({ recordType, recordId, recordName = '' }) {
  const session = useSession();
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!recordId) return;
    loadAttachments();
  }, [recordId]);

  async function loadAttachments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vlcrm_attachments')
      .select('*')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setAttachments(data.map(r => ({
        id: r.id, fileName: r.file_name, fileUrl: r.file_url,
        fileType: r.file_type, fileSize: r.file_size,
        uploadedBy: r.uploaded_by, uploadedByName: r.uploaded_by_name,
        createdAt: r.created_at, storagePath: r.storage_path,
      })));
    }
    setLoading(false);
  }

  async function handleFiles(files) {
    if (!files || !files.length) return;
    const MAX = 10 * 1024 * 1024; // 10 MB
    for (const file of Array.from(files)) {
      if (file.size > MAX) {
        setError(`"${file.name}" exceeds 10 MB limit`);
        continue;
      }
      setError('');
      setUploading(true);
      const storagePath = `${recordType}/${recordId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(BUCKET, storagePath, file);
      if (url) {
        const meta = {
          id: genId('att'),
          record_type: recordType,
          record_id: recordId,
          file_name: file.name,
          file_url: url,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: session?.id,
          uploaded_by_name: session?.name || 'Team',
          created_at: new Date().toISOString(),
        };
        const { data: inserted } = await supabase.from('vlcrm_attachments').insert(meta).select().single();
        if (inserted) {
          setAttachments(prev => [{
            id: inserted.id, fileName: inserted.file_name, fileUrl: inserted.file_url,
            fileType: inserted.file_type, fileSize: inserted.file_size,
            uploadedByName: inserted.uploaded_by_name, createdAt: inserted.created_at,
            storagePath: inserted.storage_path,
          }, ...prev]);
        }
      } else {
        setError(`Failed to upload "${file.name}". Check Supabase Storage bucket.`);
      }
      setUploading(false);
    }
  }

  async function removeAttachment(att) {
    if (!confirm(`Delete "${att.fileName}"?`)) return;
    if (att.storagePath) await deleteFile(BUCKET, att.storagePath);
    await supabase.from('vlcrm_attachments').delete().eq('id', att.id);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  const canDelete = (att) =>
    session?.id === att.uploadedBy ||
    session?.role === 'admin' ||
    session?.role === 'founder';

  return (
    <div className="attachments-panel">
      <div className="comment-panel-header">
        <Paperclip size={14} />
        <span>Attachments</span>
        <span className="comment-count">{attachments.length}</span>
      </div>

      {/* Drop zone */}
      <div
        className={`attach-dropzone ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
          accept="*/*"
        />
        <Upload size={20} style={{ opacity: 0.5 }} />
        <span>{uploading ? 'Uploading…' : 'Drop files here or click to browse'}</span>
        <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>PDF, images, docs — max 10 MB each</span>
      </div>

      {error && (
        <div className="attach-error">
          <AlertCircle size={13} /> {error}
          <button onClick={() => setError('')}><X size={11} /></button>
        </div>
      )}

      {/* File list */}
      <div className="attach-list">
        {loading && <div className="comment-empty">Loading…</div>}
        {!loading && attachments.length === 0 && (
          <div className="comment-empty" style={{ padding: '12px 0' }}>
            <Paperclip size={20} style={{ opacity: 0.3, marginBottom: 4 }} />
            <span>No files attached yet</span>
          </div>
        )}
        {attachments.map(att => (
          <div key={att.id} className="attach-item">
            <div className="attach-icon">{fileIcon(att.fileType)}</div>
            <div className="attach-info">
              <a href={att.fileUrl} target="_blank" rel="noreferrer" className="attach-name">
                {att.fileName}
              </a>
              <div className="attach-meta">
                {formatSize(att.fileSize)} · {att.uploadedByName} · {formatDate(att.createdAt)}
              </div>
            </div>
            <div className="attach-actions">
              <a href={att.fileUrl} download={att.fileName} target="_blank" rel="noreferrer"
                className="btn btn-icon btn-ghost" title="Download">
                <Download size={13} />
              </a>
              {canDelete(att) && (
                <button className="btn btn-icon btn-ghost" onClick={() => removeAttachment(att)} title="Delete">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
