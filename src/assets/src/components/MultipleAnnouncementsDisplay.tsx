import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Alert, Accordion } from "react-bootstrap";
import { QueueAnnouncement } from "../models";
import { DateTimeDisplay, formatDateTimeConcise } from "./common";

interface MultipleAnnouncementsDisplayProps {
    announcements?: QueueAnnouncement[] | QueueAnnouncement | null;
    isUserAssignedToHost?: boolean;
    loading?: boolean;
    error?: string | null;
}

export const MultipleAnnouncementsDisplay: React.FC<MultipleAnnouncementsDisplayProps> = ({ 
    announcements,
    isUserAssignedToHost = false,
    loading = false,
    error = null
}) => {
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const previousAnnouncementIdsRef = useRef<Set<number>>(new Set());
    const isInitialLoadRef = useRef(true);

    // Determine which announcements to display (memoized to prevent infinite re-renders)
    const announcementArray = useMemo(() => {
        if (announcements) {
            if (Array.isArray(announcements)) {
                return announcements.filter((ann) => ann.active);
            } else if (announcements.active) {
                return [announcements];
            }
            return [];
        }
        return [];
    }, [announcements]);

    // Auto-expand new announcements
    useEffect(() => {
        if (announcementArray.length > 0) {
            const currentIds = new Set(announcementArray.map(a => a.id));
            const newAnnouncements = announcementArray.filter(a => !previousAnnouncementIdsRef.current.has(a.id));
            
            // Only auto-expand if it's not the initial load and there are new announcements
            if (!isInitialLoadRef.current && newAnnouncements.length > 0) {
                // Find the index of the first new announcement in the array
                const firstNewAnnouncementIndex = announcementArray.findIndex(
                    a => a.id === newAnnouncements[0].id
                );
                if (firstNewAnnouncementIndex !== -1) {
                    setActiveKey(firstNewAnnouncementIndex.toString());
                }
            }
            
            previousAnnouncementIdsRef.current = currentIds;
        }
        
        // Mark as initialized after first run, regardless of whether there are announcements
        isInitialLoadRef.current = false;
    }, [announcementArray]);

    if (loading) {
        return <div>Loading announcements...</div>;
    }

    if (error) {
        return <Alert variant="danger">Error loading announcements: {error}</Alert>;
    }

    if (announcementArray.length === 0) {
        return (
            <div role="status" aria-live="polite" aria-atomic="true">
                <p className="text-muted">No current announcements</p>
            </div>
        );
    }

    const messageTitle = isUserAssignedToHost ? "Message From Your Host" : "Message From Host";
    const latestAnnouncement = announcementArray[0];
    const latestCreatedBy = latestAnnouncement?.created_by;

    return (
        <>
            {/* Live region for announcement notifications */}
            <div role="status" aria-live="assertive" aria-atomic="false" className="visually-hidden">
                {latestAnnouncement && latestCreatedBy && (() => {
                    const author = latestCreatedBy.first_name || latestCreatedBy.last_name
                        ? `${latestCreatedBy.first_name} ${latestCreatedBy.last_name}`.trim()
                        : latestCreatedBy.username;
                    return `New announcement from ${author} at ${formatDateTimeConcise(latestAnnouncement.created_at)}: ${latestAnnouncement.text}`;
                })()}
            </div>
            
            <Accordion activeKey={activeKey} onSelect={(key) => setActiveKey(key as string | null)} className="border border-secondary border-2 rounded">
                {announcementArray.map((announcement, index) => {
                    const authorName = announcement.created_by.first_name || announcement.created_by.last_name
                        ? `${announcement.created_by.first_name} ${announcement.created_by.last_name}`.trim()
                        : announcement.created_by.username;
                    
                    return (
                        <Accordion.Item key={announcement.id} eventKey={index.toString()}>
                            <Accordion.Header>
                                <div className="d-flex align-items-center w-100">
                                    <i className="fa-solid fa-bullhorn me-2" aria-hidden="true"></i>
                                    <span className="fw-semibold mb-0">{messageTitle} ({authorName})</span>
                                    <small className="text-muted ms-auto me-2">
                                        <DateTimeDisplay dateTime={announcement.created_at} />
                                    </small>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <div className="bg-warning bg-opacity-25 border border-warning rounded p-3">
                                    <p className="mb-0 text-dark">{announcement.text}</p>
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>
                    );
                })}
            </Accordion>
        </>
    );
};
