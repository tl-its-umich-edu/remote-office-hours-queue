import * as React from "react";
import { useState, useEffect } from "react";
import { Alert, Accordion } from "react-bootstrap";
import { QueueAnnouncement } from "../models";
import { DateTimeDisplay } from "./common";
import * as api from "../services/api";

interface MultipleAnnouncementsDisplayProps {
    queueId?: number;
    refreshTrigger?: number;
    announcements?: QueueAnnouncement[] | QueueAnnouncement | null;
    isUserAssignedToHost?: boolean;
}

export const MultipleAnnouncementsDisplay: React.FC<MultipleAnnouncementsDisplayProps> = ({ 
    queueId, 
    refreshTrigger,
    announcements: propAnnouncements,
    isUserAssignedToHost = false
}) => {
    const [fetchedAnnouncements, setFetchedAnnouncements] = useState<QueueAnnouncement[]>([]);
    const [loading, setLoading] = useState(!!queueId && !propAnnouncements);
    const [error, setError] = useState<string | null>(null);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [previousAnnouncementIds, setPreviousAnnouncementIds] = useState<Set<number>>(new Set());
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const fetchAllAnnouncements = async () => {
        if (!queueId) return;
        try {
            setLoading(true);
            const announcements = await api.getAllActiveAnnouncements(queueId);
            setFetchedAnnouncements(announcements);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!propAnnouncements && queueId) {
            fetchAllAnnouncements();
        }
    }, [queueId, refreshTrigger, propAnnouncements]);

    // Determine which announcements to display
    let announcementArray: QueueAnnouncement[] = [];
    if (propAnnouncements) {
        // Use provided announcements
        if (Array.isArray(propAnnouncements)) {
            announcementArray = propAnnouncements.filter((ann) => ann.active);
        } else if (propAnnouncements.active) {
            announcementArray = [propAnnouncements];
        }
    } else {
        // Use fetched announcements
        announcementArray = fetchedAnnouncements;
    }

    // Auto-expand new announcements
    useEffect(() => {
        if (announcementArray.length > 0) {
            const currentIds = new Set(announcementArray.map(a => a.id));
            const newAnnouncements = announcementArray.filter(a => !previousAnnouncementIds.has(a.id));
            
            // Only auto-expand if it's not the initial load and there are new announcements
            if (!isInitialLoad && newAnnouncements.length > 0) {
                // New announcement detected, expand the first one
                setActiveKey('0');
            }
            
            setPreviousAnnouncementIds(currentIds);
            setIsInitialLoad(false);
        }
    }, [announcementArray]);

    if (loading) {
        return <div>Loading announcements...</div>;
    }

    if (error) {
        return <Alert variant="danger">Error loading announcements: {error}</Alert>;
    }

    if (announcementArray.length === 0) {
        return <p className="text-muted">No current announcements</p>;
    }

    const messageTitle = isUserAssignedToHost ? "Message From Your Host" : "Message From Host";

    return (
        <div role="alert" aria-live="assertive" aria-atomic="true">
            <Accordion activeKey={activeKey} onSelect={(key) => setActiveKey(key as string | null)}>
                {announcementArray.map((announcement, index) => {
                    const authorName = announcement.created_by.first_name || announcement.created_by.last_name
                        ? `${announcement.created_by.first_name} ${announcement.created_by.last_name}`.trim()
                        : announcement.created_by.username;
                    
                    return (
                        <Accordion.Item key={announcement.id} eventKey={index.toString()}>
                            <Accordion.Header>
                                <div className="d-flex align-items-center w-100">
                                    <i className="fa-solid fa-bullhorn me-2"></i>
                                    <span className="fw-semibold">{messageTitle} ({authorName})</span>
                                    <small className="text-muted ms-auto me-2">
                                        <DateTimeDisplay dateTime={announcement.created_at} />
                                    </small>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <div className="bg-info bg-opacity-25 border border-info rounded p-3">
                                    <p className="mb-0 text-dark">{announcement.text}</p>
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>
                    );
                })}
            </Accordion>
        </div>
    );
};
