import * as React from "react";
import { useState, useEffect } from "react";
import { Alert, Card, Badge } from "react-bootstrap";
import { QueueAnnouncement } from "../models";
import { DateTimeDisplay } from "./common";
import * as api from "../services/api";

interface MultipleAnnouncementsDisplayProps {
    queueId: number;
    currentUser: { id: number; username: string };
    refreshTrigger?: number;
}

export const MultipleAnnouncementsDisplay: React.FC<MultipleAnnouncementsDisplayProps> = ({ 
    queueId, 
    currentUser,
    refreshTrigger
}) => {
    const [announcements, setAnnouncements] = useState<QueueAnnouncement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllAnnouncements = async () => {
        try {
            setLoading(true);
            const announcements = await api.getAllActiveAnnouncements(queueId);
            setAnnouncements(announcements);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllAnnouncements();
    }, [queueId, refreshTrigger]);

    if (loading) {
        return <div>Loading announcements...</div>;
    }

    if (error) {
        return <Alert variant="danger">Error loading announcements: {error}</Alert>;
    }

    if (announcements.length === 0) {
        return (
            <Alert variant="info">
                No active announcements from any hosts.
            </Alert>
        );
    }

    return (
        <div>
            <h5>All Active Announcements</h5>
            {announcements.map((announcement) => (
                <Card key={announcement.id} className="mb-3">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>
                            <strong>
                                {announcement.created_by.first_name} {announcement.created_by.last_name}
                            </strong>
                            {announcement.created_by.username && (
                                <small className="text-muted ms-2">({announcement.created_by.username})</small>
                            )}
                        </span>
                        {announcement.created_by.id === currentUser.id && (
                            <Badge bg="primary">Your announcement</Badge>
                        )}
                    </Card.Header>
                    <Card.Body>
                        <Card.Text>{announcement.text}</Card.Text>
                        <small className="text-muted">
                            Posted at <DateTimeDisplay dateTime={announcement.created_at} />
                        </small>
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
};
