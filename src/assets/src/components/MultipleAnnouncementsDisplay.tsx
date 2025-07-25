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
        return null;
    }

    return (
        <div>
            {announcements.map((announcement) => (
                <div key={announcement.id} className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="border-bottom pb-2 mb-3">
                        <h6 className="mb-0 text-muted">Message from Host</h6>
                    </div>
                    <div className="bg-info bg-opacity-25 border border-info rounded p-3 mb-3">
                        <p className="mb-0 text-dark">{announcement.text}</p>
                    </div>
                    <small className="text-muted">
                        Posted by {announcement.created_by.first_name || announcement.created_by.last_name ? `${announcement.created_by.first_name} ${announcement.created_by.last_name}` : announcement.created_by.username} on{' '}
                        <DateTimeDisplay dateTime={announcement.created_at} />
                    </small>
                </div>
            ))}
        </div>
    );
};
