import * as React from "react";
import { Form } from "react-bootstrap";


interface AllowedMeetingBackendsFormProps {
    backends: {[backend_type: string]: string};
    allowed: Set<string>;
    onChange: (allowedBackends: Set<string>) => void;
    disabled: boolean;
}

export function AllowedBackendsForm(props: AllowedMeetingBackendsFormProps) {
    const toggleAllowed = (backend_type: string) => {
        const newAllowed = new Set(props.allowed);
        if (newAllowed.has(backend_type)) {
            newAllowed.delete(backend_type);
        } else {
            newAllowed.add(backend_type);
        }
        props.onChange(newAllowed);
    }
    const allowedMeetingTypeEditors = Object.keys(props.backends)
        .map((b) =>
            <Form.Group key={b} controlId={b}>
                <Form.Check
                    type="checkbox"
                    label={props.backends[b]}
                    checked={props.allowed.has(b)}
                    onChange={() => toggleAllowed(b)}
                />
            </Form.Group>
        );
    return (
        <Form>
            {allowedMeetingTypeEditors}
        </Form>
    );
}


interface BackendSelectorProps {
    allowedBackends: Set<string>;
    backends: {[backend_type: string]: string};
    selectedBackend: string;
    onChange: (backend: string) => void;
}

export const BackendSelector: React.FC<BackendSelectorProps> = (props) => {  
    const options = Array.from(props.allowedBackends)
        .map(a => <option key={a} value={a}>{props.backends[a]}</option>);
    const handleChange = (event: React.FormEvent<HTMLSelectElement>) => {
        props.onChange(event.currentTarget.value);
    }
    return (
        <select className="btn btn-sm select-dropdown" onChange={handleChange} value={props.selectedBackend}>
            {options}
        </select>
    );
}
