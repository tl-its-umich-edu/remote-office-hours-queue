import * as React from "react";
import { Alert } from "react-bootstrap";
import { QueueAnnouncement } from "../models";
import { DateTimeDisplay } from "./common";

interface QueueAnnouncementProps {
    announcement: QueueAnnouncement | null;
}

interface QueueAnnouncementsProps {
    announcements: QueueAnnouncement[] | QueueAnnouncement | null;
}

export const QueueAnnouncementDisplay: React.FC<QueueAnnouncementProps> = ({ announcement }) => {
    if (!announcement || !announcement.active) {
        return null;
    }

    return (
        <Alert variant="danger" className="mb-3">
            <Alert.Heading>Announcement {announcement.created_by.first_name || announcement.created_by.last_name ? `from ${announcement.created_by.first_name} ${announcement.created_by.last_name} (${announcement.created_by.username})` : `by ${announcement.created_by.username}`}</Alert.Heading>
            <p className="mb-1">{announcement.text}</p>
            <hr />
            <b className="mb-0 text-black small">
                Last updated at{' '}
                <DateTimeDisplay dateTime={announcement.created_at} />
            </b>
        </Alert>
    );
};

export const QueueAnnouncementsDisplay: React.FC<QueueAnnouncementsProps> = ({ announcements }) => {
    let announcementArray: QueueAnnouncement[] = [];
    
    if (!announcements) {
        return null;
    }
    
    if (Array.isArray(announcements)) {
        announcementArray = announcements.filter(ann => ann.active);
    } else {
        if (announcements.active) {
            announcementArray = [announcements];
        }
    }
    
    if (announcementArray.length === 0) {
        return null;
    }

    return (
        <>
            {announcementArray.map((announcement) => (
                <Alert key={announcement.id} variant="danger" className="mb-3">
                    <Alert.Heading>Announcement {announcement.created_by.first_name || announcement.created_by.last_name ? `from ${announcement.created_by.first_name} ${announcement.created_by.last_name} (${announcement.created_by.username})` : `by ${announcement.created_by.username}`}</Alert.Heading>
                    <p className="mb-1">{announcement.text}</p>
                    <hr />
                    <b className="mb-0 text-black small">
                        Last updated at{' '}
                        <DateTimeDisplay dateTime={announcement.created_at} />
                    </b>
                </Alert>
            ))}
        </>
    );
};
