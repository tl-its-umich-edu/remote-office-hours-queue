import { faFileDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { Button, Modal, Form } from "react-bootstrap";

interface DownloadQueueHistoryModalProps {
    onDownload: () => Promise<void>;
}

const DownloadQueueHistoryModal: React.FC<DownloadQueueHistoryModalProps> = ({ onDownload }) => {
    const [modalShow, setModalShow] = useState(false);

    const handleModalClose = () => setModalShow(false);
    const handleModalShow = () => setModalShow(true);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevent the default form submission
        await onDownload();
        handleModalClose();
    };

    return (
        <>
            <span style={{marginLeft:"4px"}}>
                <Button variant='primary' onClick={handleModalShow} aria-label='Download All Queue History'>
                    <span style={{paddingRight:"8px"}}><FontAwesomeIcon icon={faFileDownload} /></span>
                    Download All Queue History
                </Button>
            </span>

            <Modal show={modalShow} onHide={handleModalClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Download</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <p>Are you sure you want to download all queue history? This will also include deleted queues.</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleModalClose}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Confirm Download
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

export default DownloadQueueHistoryModal;
