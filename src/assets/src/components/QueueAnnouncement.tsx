import * as React from "react";
import { QueueAnnouncement } from "../models";
import { DateTimeDisplay } from "./common";

interface QueueAnnouncementProps {
  announcement: QueueAnnouncement | null;
}

interface QueueAnnouncementsProps {
  announcements: QueueAnnouncement[] | QueueAnnouncement | null;
  isUserAssignedToHost?: boolean;
}

export const QueueAnnouncementsDisplay: React.FC<QueueAnnouncementsProps> = ({
  announcements,
  isUserAssignedToHost = false,
}) => {
  let announcementArray: QueueAnnouncement[] = [];

  if (!announcements) {
    return null;
  }

  if (Array.isArray(announcements)) {
    announcementArray = announcements.filter((ann) => ann.active);
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
        <React.Fragment key={announcement.id}>
          <div
            className="d-flex align-items-start mb-3 p-3"
            style={{
              backgroundColor: "#d1ecf1",
              border: "1px solid #bee5eb",
              borderRadius: "0.375rem",
            }}
          >
            <i
              className="fa-solid fa-bullhorn me-3"
              style={{
                fontSize: "1.2rem",
                marginTop: "1.85rem",
                color: "#015060",
              }}
            ></i>
            <div className="flex-grow-1">
              <div className="d-flex align-items-center mb-1">
                <h4 className="mb-0 fw-bold me-2" style={{ color: "#015060" }}>
                  {isUserAssignedToHost
                    ? "Message From Your Host"
                    : "Message From Host"}
                </h4>
              </div>
              <p
                className="mb-2"
                style={{
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  color: "#015060",
                }}
              >
                {announcement.text}
              </p>
              <hr className="my-3" />
              <small className="text-muted">
                Posted by{" "}
                {announcement.created_by.first_name ||
                announcement.created_by.last_name
                  ? `${announcement.created_by.first_name} ${announcement.created_by.last_name}`
                  : announcement.created_by.username}{" "}
                on <DateTimeDisplay dateTime={announcement.created_at} />
              </small>
            </div>
          </div>
        </React.Fragment>
      ))}
    </>
  );
};
