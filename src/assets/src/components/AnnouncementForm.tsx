import * as React from "react";
import { useState, useEffect } from "react";
import { Alert, Button, Card, Col, Form, Row } from "react-bootstrap";
import { QueueAnnouncement } from "../models";
import { ErrorDisplay } from "./common";
import { usePromise } from "../hooks/usePromise";
import * as api from "../services/api";

interface AnnouncementFormProps {
    queueId: number;
    onAnnouncementChange: () => void;
    disabled?: boolean;
    currentUser: { id: number; username: string };
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
    queueId,
    onAnnouncementChange,
    disabled = false,
    currentUser
}) => {
    const [myAnnouncement, setMyAnnouncement] = useState<QueueAnnouncement | null>(null);
    const [text, setText] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch the current user's own announcement
    useEffect(() => {
        const fetchMyAnnouncement = async () => {
            try {
                setLoading(true);
                const announcement = await api.getMyActiveAnnouncement(queueId);
                setMyAnnouncement(announcement);
                setText(announcement?.text || "");
            } catch (error) {
                console.error("Error fetching my announcement:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchMyAnnouncement();
    }, [queueId]);

    const createAnnouncement = async (announcementText: string) => {
        await api.createAnnouncement(queueId, announcementText);
        onAnnouncementChange();
        // Refresh the form by fetching the new announcement
        const newAnnouncement = await api.getMyActiveAnnouncement(queueId);
        setMyAnnouncement(newAnnouncement);
        setText(newAnnouncement?.text || "");
    };

    const updateAnnouncement = async (announcementText: string) => {
        if (myAnnouncement) {
            await api.updateAnnouncement(queueId, myAnnouncement.id, announcementText);
            onAnnouncementChange();
            // Refresh the form by fetching the updated announcement
            const updatedAnnouncement = await api.getMyActiveAnnouncement(queueId);
            setMyAnnouncement(updatedAnnouncement);
            setText(updatedAnnouncement?.text || "");
        }
    };

    const deleteAnnouncement = async () => {
        if (myAnnouncement) {
            await api.deleteAnnouncement(queueId, myAnnouncement.id);
            onAnnouncementChange();
            setMyAnnouncement(null);
            setText("");
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
            setIsEditing(false);
        }
    };

    const handleEdit = () => {
        setText(myAnnouncement?.text || "");
        setIsEditing(true);
    };

    const handleCancel = () => {
        setText(myAnnouncement?.text || "");
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            doDeleteAnnouncement();
        }
    };

    if (loading) {
        return (
            <Card className="mb-3">
                <Card.Header>
                    <Card.Title className="mb-0">Queue Announcement</Card.Title>
                </Card.Header>
                <Card.Body>
                    <div>Loading...</div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="mb-3">
            <Card.Header>
                <Card.Title className="mb-0">Queue Announcement</Card.Title>
            </Card.Header>
            <Card.Body>
                {error && <ErrorDisplay formErrors={[{source: 'Announcement', error}]} />}
                
                {myAnnouncement && !isEditing ? (
                    <div>
                        <Alert variant="info" className="mb-3">
                            <p className="mb-0">{myAnnouncement.text}</p>
                            <small className="text-muted">
                               Posted {myAnnouncement.created_by.first_name || myAnnouncement.created_by.last_name ? `from ${myAnnouncement.created_by.first_name} ${myAnnouncement.created_by.last_name} (${myAnnouncement.created_by.username})` : `by ${myAnnouncement.created_by.username}`}
                            </small>
                        </Alert>
                        {myAnnouncement.created_by.id === currentUser.id && (
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleEdit}
                                    disabled={disabled || operationLoading}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={disabled || operationLoading}
                                >
                                    Remove
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col>
                                <Form.Group>
                                    <Form.Label>Announcement Text</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="Enter announcement for queue participants..."
                                        disabled={disabled || operationLoading}
                                        maxLength={160}
                                    />
                                    <Form.Text className="text-muted">
                                        {text.length}/160 characters
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="mt-3">
                            <Col>
                                <div className="d-flex gap-2">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={disabled || operationLoading || !text.trim()}
                                    >
                                        {myAnnouncement ? "Update" : "Post"} Announcement
                                    </Button>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={handleCancel}
                                            disabled={disabled || operationLoading}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </Form>
                )}
                
                {!myAnnouncement && !isEditing && (
                    <div className="text-muted">
                        <p className="mb-2">No active announcement for this queue.</p>
                        <Button
                            variant="outline-primary"
                            onClick={() => setIsEditing(true)}
                            disabled={disabled || operationLoading}
                        >
                            Create Announcement
                        </Button>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};
