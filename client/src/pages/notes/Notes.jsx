import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function Notes() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/notes');
            setNotes(res.data.data || []);
        } catch (err) {
            setError('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!title.trim()) {
            setFormError('Title is required.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (file) {
            formData.append('file', file);
        }

        setSubmitting(true);
        try {
            const res = await api.post('/api/notes', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setNotes([res.data.data, ...notes]);
            setTitle('');
            setContent('');
            setFile(null);
            // Reset file input safely via ref
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create note');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this note completely?')) return;
        try {
            await api.delete(`/api/notes/${id}`);
            setNotes(notes.filter(n => n.note_id !== id));
        } catch (err) {
            alert('Failed to delete note');
        }
    };

    const getFileDownloadUrl = (filename) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        return `${baseUrl}/uploads/${filename}`;
    };

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Notepad</h2>
                <div className="page__subtitle">Manage your personal notes, to-do lists, standard operating procedures, and reference sheets.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
                {/* Creation Form */}
                <Card style={{ position: 'sticky', top: '80px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-md)' }}>+ Create Note</h3>
                    
                    {formError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>{formError}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <Input 
                            id="title" 
                            label="Title" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="To-Do list, Important links..." 
                            required 
                        />
                        
                        <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                            <label className="form-label">Note Content</label>
                            <textarea 
                                className="form-input" 
                                value={content} 
                                onChange={e => setContent(e.target.value)} 
                                placeholder="Write your notes here..." 
                                rows={6} 
                            />
                        </div>

                        <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                            <label className="form-label">Attach File (CSV, Excel, Images)</label>
                            <input 
                                id="file-upload"
                                ref={fileInputRef}
                                type="file" 
                                className="form-input" 
                                onChange={e => setFile(e.target.files[0])}
                                style={{ padding: '0.4rem', background: 'transparent' }}
                            />
                        </div>

                        <Button type="submit" variant="primary" disabled={submitting} style={{ marginTop: 'var(--space-lg)', width: '100%' }}>
                            {submitting ? 'Saving...' : 'Save Note'}
                        </Button>
                    </form>
                </Card>

                {/* Notes List */}
                <div>
                    {loading && <p className="status-text">Loading references...</p>}
                    {error && <div className="alert alert--error">{error}</div>}

                    {!loading && notes.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                            <h3 style={{ color: 'var(--color-text-muted)' }}>No Notes Yet</h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)', color: 'var(--color-text-dim)' }}>
                                Use the form to upload your first reference sheet or text note.
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        {notes.map(note => (
                            <Card key={note.note_id} style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => handleDelete(note.note_id)} 
                                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', outline: 'none' }}
                                    title="Delete Note"
                                >
                                    ✕
                                </button>

                                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-gold)', marginBottom: 'var(--space-xs)' }}>
                                    {note.title}
                                </h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: 'var(--space-md)' }}>
                                    Added {note.created_at ? new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                                
                                {note.content && (
                                    <div style={{ 
                                        whiteSpace: 'pre-wrap', 
                                        fontSize: '0.9rem', 
                                        color: 'var(--color-text)',
                                        background: 'var(--color-surface-alt)',
                                        padding: 'var(--space-md)',
                                        borderRadius: 'var(--radius-md)',
                                        lineHeight: '1.5'
                                    }}>
                                        {note.content}
                                    </div>
                                )}

                                {note.original_file_name && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>📎 {note.original_file_name}</span>
                                        </div>
                                        <a 
                                            href={getFileDownloadUrl(note.file_name)} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'var(--color-gold-soft)', color: 'var(--color-gold)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            Open View
                                        </a>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
