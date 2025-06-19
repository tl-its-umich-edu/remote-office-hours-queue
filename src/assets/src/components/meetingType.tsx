import * as React from "react";
import { Form } from "react-bootstrap";

import { EnabledBackendName, MeetingBackend } from "../models";


export const getBackendByName = (name: EnabledBackendName, backends: MeetingBackend[]) => {
    return backends.find(b => b.name === name) as MeetingBackend;
}

interface AllowedMeetingBackendsFormProps {
    backends: MeetingBackend[];
    allowed: Set<string>;
    onChange: (allowedBackends: Set<string>) => void;
    disabled: boolean;
}

export function AllowedBackendsForm(props: AllowedMeetingBackendsFormProps) {
    const enabledBackends = props.backends.filter((value) => value.enabled);

    const toggleAllowed = (backend_type: string) => {
        const newAllowed = new Set(props.allowed);
        if (newAllowed.has(backend_type)) {
            newAllowed.delete(backend_type);
        } else {
            newAllowed.add(backend_type);
        }
        props.onChange(newAllowed);
    }
    const allowedMeetingTypeEditors = enabledBackends
        .map((b) =>
            <Form.Group key={b.name} controlId={b.name} className="mb-3">
                <Form.Check
                    type="checkbox"
                    label={b.friendly_name}
                    checked={props.allowed.has(b.name)}
                    onChange={() => toggleAllowed(b.name)}
                />
            </Form.Group>
        );
    return (
        <>
            {allowedMeetingTypeEditors}
        </>
    );
}


interface BackendSelectorProps {
    allowedBackends: Set<string>;
    backends: MeetingBackend[];
    selectedBackend: string;
    onChange: (backend: string) => void;
}

export const BackendSelector: React.FC<BackendSelectorProps> = (props) => {
    const enabledAllowedBackends = props.backends.filter(
        (b) => b.enabled && props.allowedBackends.has(b.name)
    );

    const options = enabledAllowedBackends.map(
        (a) => <option key={a.name} value={a.name}>{a.friendly_name}</option>
    );

    const handleChange = (event: React.FormEvent<HTMLSelectElement>) => {
        props.onChange(event.currentTarget.value);
    }
    return (
        <Form.Select className="select-dropdown" onChange={handleChange} value={props.selectedBackend} required>
            {options}
        </Form.Select>
    );
}
