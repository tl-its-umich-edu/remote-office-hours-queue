import { faFileDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { Button, Modal, Form } from "react-bootstrap";

interface DownloadQueueHistoryModalProps {
    onDownload: (includeDeleted: boolean) => Promise<void>;
}

const DownloadQueueHistoryModal: React.FC<DownloadQueueHistoryModalProps> = ({ onDownload }) => {
    const [modalShow, setModalShow] = useState(false);
    const [includeDeleted, setIncludeDeleted] = useState(false);

    const handleModalClose = () => setModalShow(false);
    const handleModalShow = () => setModalShow(true);

    const handleIncludeDeletedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIncludeDeleted(e.target.checked);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevent the default form submission
        await onDownload(includeDeleted);
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
                            <Form.Group controlId="formIncludeDeleted">
                                <Form.Check 
                                    type="checkbox" 
                                    label="Include deleted queues in the CSV" 
                                    checked={includeDeleted} 
                                    onChange={handleIncludeDeletedChange}
                                />
                            </Form.Group>
                        
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
