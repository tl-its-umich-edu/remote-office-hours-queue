import { faFileDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";

interface SingleQueueHistoryDownloadProps {
    queueId: number;
    onDownload: (queueId: number, days?: number) => Promise<void>;
}

const SingleQueueHistoryDownload: React.FC<SingleQueueHistoryDownloadProps> = ({ queueId, onDownload }) => {
    const [selectedDays, setSelectedDays] = useState<number | undefined>(undefined);

    const handleDownload = async () => {
        await onDownload(queueId, selectedDays);
    };

    return (
        <div className="queue-history-filter">
            <Form.Group controlId={`queueHistoryFilter-${queueId}`}>
                <Form.Label visuallyHidden>
                    {`Date range filter for Queue ID ${queueId}`}
                </Form.Label>
                <Form.Select
                    className="queue-history-filter-select"
                    value={selectedDays ?? ''}
                    onChange={(e) => setSelectedDays(e.target.value ? Number(e.target.value) : undefined)}
                >
                    <option value="">All history</option>
                    <option value="90">Last 90 days</option>
                    <option value="180">Last 180 days</option>
                    <option value="365">Last 365 days</option>
                </Form.Select>
            </Form.Group>
            <Button className="queue-history-filter-btn" onClick={handleDownload}>
                <span style={{paddingRight:"8px"}}><FontAwesomeIcon icon={faFileDownload} /></span>
                Download
            </Button>
        </div>
    );
};

export default SingleQueueHistoryDownload;
