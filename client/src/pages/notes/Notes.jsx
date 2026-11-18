import { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Pencil, 
    History, 
    Clock, 
    Plus, 
    Check, 
    RotateCcw, 
    FileText, 
    ChevronDown, 
    ChevronUp, 
    AlertCircle,
    Sparkles 
} from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { CardSkeleton } from '../../components/common/Skeleton';
import './Notes.css';

export default function Notes() {
    const confirmAction = useConfirm();
    const formCardRef = useRef(null);

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state (Create or Edit)
    const [editingNote, setEditingNote] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [successBanner, setSuccessBanner] = useState('');

    // Revision History / Logs state
    // activeHistoryNoteId: noteId currently displaying change logs
    const [activeHistoryNoteId, setActiveHistoryNoteId] = useState(null);
    const [historyData, setHistoryData] = useState({}); // { [noteId]: { loading: boolean, logs: [], error: '' } }

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notes');
            setNotes(res.data.data || []);
        } catch (err) {
            setError('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    // Check if note has been edited
    const isNoteEdited = (note) => {
        if (!note) return false;
        if (Number(note.edit_count) > 0) return true;
        if (!note.updated_at || !note.created_at) return false;
        const diffMs = Math.abs(new Date(note.updated_at).getTime() - new Date(note.created_at).getTime());
        return diffMs > 2000;
    };

    // Format date nicely
    const formatNoteDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Start editing an existing note
    const handleStartEdit = (note) => {
        setEditingNote(note);
        setTitle(note.title || '');
        setContent(note.content || '');
        setFormError('');
        setSuccessBanner('');

        // Smooth scroll to form on mobile/small screens
        if (formCardRef.current) {
            formCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(() => {
                const titleInput = document.getElementById('title');
                if (titleInput) titleInput.focus();
            }, 100);
        }
    };

    // Cancel edit mode and reset form
    const handleCancelEdit = () => {
        setEditingNote(null);
        setTitle('');
        setContent('');
        setFormError('');
    };

    // Submit Create or Update
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSuccessBanner('');

        if (!title.trim()) {
            setFormError('Title is required.');
            return;
        }

        setSubmitting(true);
        try {
            if (editingNote) {
                // UPDATE existing note
                const res = await api.put(`/notes/${editingNote.note_id}`, {
                    title: title.trim(),
                    content
                });

                const updatedNote = res.data.data;

                // Update note in list
                setNotes(prev => prev.map(n => n.note_id === updatedNote.note_id ? updatedNote : n));

                // Invalidate or refresh history cache for this note
                if (historyData[updatedNote.note_id]) {
                    fetchLogsForNote(updatedNote.note_id);
                }

                setSuccessBanner(`Note "${updatedNote.title}" updated successfully! Revision logged.`);
                setTimeout(() => setSuccessBanner(''), 4000);

                // Exit edit mode
                setEditingNote(null);
                setTitle('');
                setContent('');
            } else {
                // CREATE new note
                const res = await api.post('/notes', { title: title.trim(), content });
                setNotes([res.data.data, ...notes]);
                setTitle('');
                setContent('');
                setSuccessBanner('New note created successfully!');
                setTimeout(() => setSuccessBanner(''), 3000);
            }
        } catch (err) {
            setFormError(err.response?.data?.message || (editingNote ? 'Failed to update note' : 'Failed to create note'));
        } finally {
            setSubmitting(false);
        }
    };

    // Delete note with confirmation
    const handleDelete = async (id, noteTitle) => {
        confirmAction({
            title: 'Delete Note',
            message: `Are you sure you want to delete "${noteTitle || 'this note'}"? All revision history for this note will also be removed.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/notes/${id}`);
                    setNotes(notes.filter(n => n.note_id !== id));
                    if (editingNote?.note_id === id) {
                        handleCancelEdit();
                    }
                    if (activeHistoryNoteId === id) {
                        setActiveHistoryNoteId(null);
                    }
                } catch (err) {
                    alert('Failed to delete note');
                }
            }
        });
    };

    // Toggle and fetch revision history logs for a note
    const toggleHistory = async (noteId) => {
        if (activeHistoryNoteId === noteId) {
            setActiveHistoryNoteId(null);
            return;
        }

        setActiveHistoryNoteId(noteId);
        if (!historyData[noteId] || !historyData[noteId].logs) {
            await fetchLogsForNote(noteId);
        }
    };

    const fetchLogsForNote = async (noteId) => {
        setHistoryData(prev => ({
            ...prev,
            [noteId]: { loading: true, logs: [], error: '' }
        }));

        try {
            const res = await api.get(`/notes/${noteId}/logs`);
            setHistoryData(prev => ({
                ...prev,
                [noteId]: { loading: false, logs: res.data.data || [], error: '' }
            }));
        } catch (err) {
            setHistoryData(prev => ({
                ...prev,
                [noteId]: { loading: false, logs: [], error: 'Failed to load change history.' }
            }));
        }
    };

    // Load a historical revision into the editor form
    const handleRestoreRevision = (log) => {
        confirmAction({
            title: 'Restore Historical Version',
            message: `Load the version from ${formatNoteDate(log.created_at)} into the editor? You can review and click "Save Changes" to apply it.`,
            onConfirm: () => {
                const note = notes.find(n => n.note_id === log.note_id);
                if (note) {
                    setEditingNote(note);
                    setTitle(log.previous_title || note.title);
                    setContent(log.previous_content !== null ? log.previous_content : '');
                    setFormError('');
                    setSuccessBanner(`Historical version from ${formatNoteDate(log.created_at)} loaded into editor.`);
                    if (formCardRef.current) {
                        formCardRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        });
    };

    return (
        <div className="page">
            <div className="page__header">
                <div>
                    <h2 className="page__title">Notepad</h2>
                    <div className="page__subtitle">
                        Manage your personal notes, to-do lists, SOPs, and reference sheets with full audit logs.
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            <button 
                className="fab show-mobile" 
                onClick={() => {
                    handleCancelEdit();
                    document.getElementById('title')?.focus();
                }} 
                title="Create Note"
            >
                <Plus size={20} />
            </button>

            <div className="grid-stack-mobile two-col">
                {/* ── Left Column: Note Form (Create or Edit) ── */}
                <div ref={formCardRef}>
                    <Card 
                        className={`sticky-mobile-reset ${editingNote ? 'notes-form-card--editing' : ''}`} 
                        style={{ position: 'sticky', top: '80px' }}
                    >
                        {/* Edit Mode Banner */}
                        {editingNote ? (
                            <div className="notes-editing-banner">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Pencil size={14} />
                                    <span>Editing: <strong>{editingNote.title}</strong></span>
                                </div>
                                <button 
                                    type="button" 
                                    className="notes-editing-cancel-btn" 
                                    onClick={handleCancelEdit}
                                    title="Cancel editing and create a new note instead"
                                >
                                    <X size={12} /> Cancel Edit
                                </button>
                            </div>
                        ) : (
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-md)' }}>
                                + Create Note
                            </h3>
                        )}

                        {successBanner && (
                            <div className="alert alert--success" style={{ marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
                                <Check size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                {successBanner}
                            </div>
                        )}

                        {formError && (
                            <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
                                <AlertCircle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <Input
                                id="title"
                                label="Title"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="To-Do list, SOP, Important links…"
                                required
                            />

                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label className="form-label">Note Content</label>
                                <textarea
                                    className="form-input"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Write your notes, checklist, or thesis here…"
                                    rows={8}
                                    style={{ lineHeight: 1.5, resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'var(--space-lg)' }}>
                                {editingNote && (
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        onClick={handleCancelEdit} 
                                        style={{ flex: 1 }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    disabled={submitting} 
                                    style={{ flex: editingNote ? 2 : 1, width: '100%' }}
                                >
                                    {submitting ? (
                                        editingNote ? 'Saving Changes…' : 'Saving…'
                                    ) : (
                                        editingNote ? (
                                            <><Check size={16} /> Save Changes</>
                                        ) : (
                                            <><Plus size={16} /> Save Note</>
                                        )
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* ── Right Column: Notes List with Revision History ── */}
                <div>
                    {loading && (
                        <CardSkeleton 
                            count={3} 
                            caption="Loading personal notes & reference sheets..." 
                            subcaption="Retrieving recorded checklists, SOPs, and edit history" 
                        />
                    )}

                    {error && <div className="alert alert--error">{error}</div>}

                    {!loading && notes.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                            <FileText size={36} color="var(--color-text-dim)" style={{ margin: '0 auto var(--space-sm)' }} />
                            <h3 style={{ color: 'var(--color-text-muted)' }}>No Notes Yet</h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-sm)', color: 'var(--color-text-dim)' }}>
                                Use the form to create your first note or SOP.
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                        {notes.map(note => {
                            const isCurrentlyEditing = editingNote?.note_id === note.note_id;
                            const isHistoryOpen = activeHistoryNoteId === note.note_id;
                            const noteHist = historyData[note.note_id] || {};
                            const edited = isNoteEdited(note);

                            return (
                                <Card 
                                    key={note.note_id} 
                                    className={`note-card ${isCurrentlyEditing ? 'note-card--being-edited' : ''}`}
                                >
                                    {/* Action Buttons in Top Right */}
                                    <div className="note-card__actions">
                                        <button
                                            type="button"
                                            className="note-card-action-btn note-card-action-btn--edit"
                                            onClick={() => handleStartEdit(note)}
                                            title="Edit this note"
                                        >
                                            <Pencil size={14} />
                                        </button>

                                        <button
                                            type="button"
                                            className={`note-card-action-btn note-card-action-btn--history ${isHistoryOpen ? 'active' : ''}`}
                                            onClick={() => toggleHistory(note.note_id)}
                                            title="View revision history & change logs"
                                        >
                                            <History size={14} />
                                        </button>

                                        <button
                                            type="button"
                                            className="note-card-action-btn note-card-action-btn--delete"
                                            onClick={() => handleDelete(note.note_id, note.title)}
                                            title="Delete note"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>

                                    {/* Note Title */}
                                    <h3 style={{ 
                                        fontSize: '1.05rem', 
                                        fontWeight: 700, 
                                        color: 'var(--color-gold)', 
                                        marginBottom: '0.35rem', 
                                        paddingRight: '6rem' 
                                    }}>
                                        {note.title}
                                    </h3>

                                    {/* Metadata Bar (Created & Last Edited) */}
                                    <div className="note-card__meta-bar">
                                        <span>Created: {formatNoteDate(note.created_at)}</span>

                                        {edited && (
                                            <span className="note-edited-tag" title={`Last updated on ${formatNoteDate(note.updated_at)}`}>
                                                <Clock size={11} /> Last edited: {formatNoteDate(note.updated_at)}
                                            </span>
                                        )}

                                        {Number(note.edit_count) > 0 && (
                                            <button 
                                                type="button"
                                                className={`note-history-pill ${isHistoryOpen ? 'active' : ''}`}
                                                onClick={() => toggleHistory(note.note_id)}
                                                title="Click to view full revision logs"
                                            >
                                                <History size={11} />
                                                {note.edit_count} {Number(note.edit_count) === 1 ? 'revision' : 'revisions'}
                                                {isHistoryOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Note Body */}
                                    {note.content && (
                                        <div style={{
                                            whiteSpace: 'pre-wrap',
                                            fontSize: '0.9rem',
                                            color: 'var(--color-text)',
                                            background: 'var(--color-surface-alt)',
                                            padding: 'var(--space-md)',
                                            borderRadius: 'var(--radius-md)',
                                            lineHeight: 1.6,
                                            wordBreak: 'break-word'
                                        }}>
                                            {note.content}
                                        </div>
                                    )}

                                    {/* ── Revision History & Change Logs Panel ── */}
                                    {isHistoryOpen && (
                                        <div className="note-history-panel">
                                            <div className="note-history-header">
                                                <div className="note-history-title">
                                                    <Sparkles size={14} color="var(--color-gold)" />
                                                    Audit Trail & Change Logs
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleHistory(note.note_id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}
                                                >
                                                    Close Logs ✕
                                                </button>
                                            </div>

                                            {noteHist.loading && (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                                    Loading revision diff logs…
                                                </div>
                                            )}

                                            {noteHist.error && (
                                                <div className="alert alert--error" style={{ fontSize: '0.82rem' }}>
                                                    {noteHist.error}
                                                </div>
                                            )}

                                            {!noteHist.loading && (!noteHist.logs || noteHist.logs.length === 0) && (
                                                <div style={{ padding: '0.85rem', background: 'var(--color-surface-alt)', borderRadius: '6px', color: 'var(--color-text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
                                                    This note is in its original state. No prior revisions logged yet.
                                                </div>
                                            )}

                                            {!noteHist.loading && noteHist.logs && noteHist.logs.length > 0 && (
                                                <div className="note-history-timeline">
                                                    {noteHist.logs.map((log, idx) => {
                                                        const diff = log.diff_summary || {};
                                                        const stats = diff.stats || {};
                                                        const lineDiff = diff.lineDiff || [];
                                                        const titleChanged = diff.titleChanged;

                                                        return (
                                                            <div key={log.id} className="note-history-entry">
                                                                <div className="note-history-entry__header">
                                                                    <div className="note-history-rev-tag">
                                                                        <span>Revision #{noteHist.logs.length - idx}</span>
                                                                        <span className="note-history-date">
                                                                            • {formatNoteDate(log.created_at)}
                                                                        </span>
                                                                    </div>

                                                                    {/* Change Stats Badges */}
                                                                    <div className="diff-stats-group">
                                                                        {titleChanged && (
                                                                            <span className="diff-badge diff-badge--title" title="Title was modified">
                                                                                Title Edited
                                                                            </span>
                                                                        )}
                                                                        {stats.addedLines > 0 && (
                                                                            <span className="diff-badge diff-badge--added">
                                                                                +{stats.addedLines} {stats.addedLines === 1 ? 'line' : 'lines'}
                                                                            </span>
                                                                        )}
                                                                        {stats.removedLines > 0 && (
                                                                            <span className="diff-badge diff-badge--removed">
                                                                                -{stats.removedLines} {stats.removedLines === 1 ? 'line' : 'lines'}
                                                                            </span>
                                                                        )}
                                                                        {stats.addedWords > 0 && (
                                                                            <span className="diff-badge diff-badge--added">
                                                                                +{stats.addedWords} words
                                                                            </span>
                                                                        )}
                                                                        {stats.removedWords > 0 && (
                                                                            <span className="diff-badge diff-badge--removed">
                                                                                -{stats.removedWords} words
                                                                            </span>
                                                                        )}

                                                                        <button 
                                                                            type="button"
                                                                            className="btn-restore-version"
                                                                            onClick={() => handleRestoreRevision(log)}
                                                                            title="Load this previous revision into the editor to restore or revise it"
                                                                        >
                                                                            <RotateCcw size={11} /> Load in Editor
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Title Change Diff (if title was edited) */}
                                                                {titleChanged && (
                                                                    <div className="diff-title-box">
                                                                        <div style={{ color: '#f87171', textDecoration: 'line-through', marginBottom: '2px' }}>
                                                                            - {log.previous_title}
                                                                        </div>
                                                                        <div style={{ color: '#34d399', fontWeight: 600 }}>
                                                                            + {log.new_title}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Content Line Diff (Added vs Removed) */}
                                                                {lineDiff.length > 0 && (
                                                                    <div className="diff-box">
                                                                        {lineDiff.map((item, lineIdx) => (
                                                                            <div 
                                                                                key={lineIdx} 
                                                                                className={`diff-line diff-line--${item.type}`}
                                                                            >
                                                                                <span className="diff-gutter">
                                                                                    {item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' '}
                                                                                </span>
                                                                                <span>{item.text || ' '}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
