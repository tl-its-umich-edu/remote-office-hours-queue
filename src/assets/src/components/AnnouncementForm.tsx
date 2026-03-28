import * as React from "react";
import { useState } from "react"; // no longer use useEffect
import { Button, Form } from "react-bootstrap";
import { QueueAnnouncement } from "../models";
import { ErrorDisplay } from "./common";
import { usePromise } from "../hooks/usePromise";
import * as api from "../services/api";

interface AnnouncementFormProps {
    queueId: number;
    disabled?: boolean;
    currentUser: { id: number; username: string };
    myAnnouncement: QueueAnnouncement | null;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
    queueId,
    disabled = false,
    currentUser,
    myAnnouncement
}) => {
   
    const [text, setText] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const createAnnouncement = async (announcementText: string) => {
        await api.createAnnouncement(queueId, announcementText);
        // remove trigger based callback, since after API call, django signal fires send_queue_update that pushes data through websocket, myAnnouncement prop is updataed automatically 
    };

    const updateAnnouncement = async (announcementText: string) => {
        if (myAnnouncement) {
            await api.updateAnnouncement(queueId, myAnnouncement.id, announcementText);
            // remove trigger based callback, since after API call, django signal fires send_queue_update that pushes data through websocket, myAnnouncement prop is updataed automatically 
        }
    };

    const deleteAnnouncement = async () => {
        if (myAnnouncement) {
            await api.deleteAnnouncement(queueId, myAnnouncement.id);
            // remove trigger based callback, since after API call, django signal fires send_queue_update that pushes data through websocket, myAnnouncement prop is updataed automatically 
        }
    };

    const [doCreateAnnouncement, createLoading, createError] = usePromise(createAnnouncement);
    const [doUpdateAnnouncement, updateLoading, updateError] = usePromise(updateAnnouncement);
    const [doDeleteAnnouncement, deleteLoading, deleteError] = usePromise(deleteAnnouncement);

    const operationLoading = createLoading || updateLoading || deleteLoading;
    const error = createError || updateError || deleteError;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            if (myAnnouncement) {
                doUpdateAnnouncement(text.trim());
            } else {
                doCreateAnnouncement(text.trim());
            }
            setShowForm(false);
        }
    };

    const handleEdit = () => {
        setText(myAnnouncement?.text || "");
        setShowForm(true);
    };

    const handleCancel = () => {
        setText(myAnnouncement?.text || "");
        setShowForm(false);
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            doDeleteAnnouncement();
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            {!myAnnouncement && !showForm && (
                <Button 
                    variant="primary" 
                    onClick={() => { setText(""); setShowForm(true); }} // myAnnouncement is a prop, not a local state so the internal text state is only w=use whil the form is open for edits
                    disabled={disabled || operationLoading}
                >
                    Add Announcement
                </Button>
            )}

            {showForm && (
                <div className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="border-bottom pb-2 mb-3">
                        <h6 className="mb-0 text-muted">{myAnnouncement ? 'Edit Announcement' : 'Add Announcement'}</h6>
                    </div>
                    
                    {error && <ErrorDisplay formErrors={[{source: 'Announcement', error}]} />}
                    
                    <p className="mb-3">
                        Announcements display on:<br />
                        • the initial queue screen (before a person has joined it)<br />
                        • the queue screens of those waiting
                    </p>
                    
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Text here"
                                disabled={disabled || operationLoading}
                            />
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCancel}
                                disabled={disabled || operationLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={disabled || operationLoading || !text.trim()}
                            >
                                Save
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {myAnnouncement && !showForm && (
                <div className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="border-bottom pb-2 mb-3">
                        <h6 className="mb-0 text-muted">Message from Host</h6>
                    </div>
                    <div className="bg-warning bg-opacity-25 border border-warning rounded p-3 mb-3" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        <p className="mb-0 text-dark" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>{myAnnouncement.text}</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            variant="link"
                            className="text-danger p-0"
                            onClick={handleDelete}
                            disabled={disabled || operationLoading}
                            style={{ textDecoration: 'none' }}
                        >
                            Delete
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleEdit}
                            disabled={disabled || operationLoading}
                        >
                            Edit
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
};
