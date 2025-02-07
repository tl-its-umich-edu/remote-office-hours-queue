import * as React from "react";
import { useState, useRef } from "react";
import { MyUser } from "../models";
import { Link } from "react-router-dom";
import { Button, Col, Form, InputGroup, Row, Alert } from "react-bootstrap";

import { ErrorDisplay, FormError, JoinedQueueAlert, Breadcrumbs } from "./common";
import { PageProps } from "./page";
import { useUserWebSocket } from "../services/sockets";

function QueueLookup() {
    const [lookup, setLookup] = useState("");
    const formRef = useRef<HTMLFormElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLookup(value);
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const processedLookup = lookup.replace(/@umich\.edu/gi, '');
        if (formRef.current) {
            const inputElement = formRef.current.elements.namedItem("term") as HTMLInputElement;
            if (inputElement) {
                inputElement.value = processedLookup;
            }
            formRef.current.submit();
        }
    }
    return (
        <Row className="mt-3">
            <Col sm={12} md={8} lg={6}>
                <Form ref={formRef} method="get" action="/search/" onSubmit={handleSubmit}>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            required
                            aria-label="Queue name or host uniqname"
                            placeholder="Queue name or host uniqname..."
                            name="term"
                            value={lookup}
                            onChange={handleChange}
                        />
                        <Button type="submit" variant="primary">Search Queues</Button>
                    </InputGroup>
                </Form>
            </Col>
        </Row>
    );
}

export function HomePage(props: PageProps) {
    const [user, setUser] = useState(undefined as MyUser | undefined);
    const userWebSocketError = useUserWebSocket(props.user?.id, (u) => setUser(u as MyUser));

    const errorSources = [
        { source: 'User Connection', error: userWebSocketError }
    ].filter(e => e.error) as FormError[];
    const errorDisplay = <ErrorDisplay formErrors={errorSources} />
    const queueAlert = user?.my_queue
        && <JoinedQueueAlert joinedQueue={user.my_queue} />
    const body = props.user
        ? (
            <>
                <p className="lead">
                    Enter the name of the queue or the uniqname of the host to get started!
                </p>
                {queueAlert}
                <QueueLookup />
                <hr />
                <Link to="/manage">
                    Manage Queues
                </Link>
            </>
        )
        : (
            <>
                <p className="lead">Join or host a queue for office hours!</p>
                <a href={props.loginUrl} className="btn btn-primary btn-lg">Login</a>
            </>
        );
    return (
        <div>
            <Breadcrumbs currentPageTitle="Home" />
            <div>
                {errorDisplay}
                <h1 className="display-4">Remote Office Hours Queue</h1>
                {body}
            </div>
        </div>
    );
}
