import * as React from "react";
import { useState } from "react";
import { FormStatus } from "./preferences";
import { validatePhoneNumber } from "../validation";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import PhoneInput from "react-phone-input-2";

interface PhoneVerificationProps {
    phoneField: string;
    setPhoneField: (phone: string) => void;
    countryDialCode: string;
    setCountryDialCode: (code: string) => void;
    onGetOneTimePassword: (phoneNumberToSubmit: string) => Promise<unknown>;
    onVerifyOneTimePassword: (otp: string) => Promise<unknown>;
    otpRequestBuffer: number;
    disabled: boolean;
    setValidationErrors: (errors: Error[]) => void;
    verifiedPhoneNumber: string;
    setFormStatus: (status: FormStatus) => void;
}

enum OtpStatusValue {
    NotSent,
    Sending,
    Sent,
    Verifying,
    Verified,
}

export function PhoneVerification(props: PhoneVerificationProps) {
    const [digits, setDigits] = useState(["", "", "", ""]);
    const [timeToResendCode, setTimeToResendCode] = useState(0);

    const alreadyVerified = props.verifiedPhoneNumber === props.phoneField && props.phoneField !== "";
    const [otpStatus, setOtpStatus] = useState(alreadyVerified ? OtpStatusValue.Verified : OtpStatusValue.NotSent);
    const phoneNumberToSubmit =  (props.phoneField.length <= props.countryDialCode.length) ? "" : props.phoneField;
    const formattedPhoneNumberToSubmit = phoneNumberToSubmit.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "+$1 ($2) $3-$4");

    const phoneInput = (
        <PhoneInput
            country={'us'}
            onlyCountries={['us', 'ca']}
            countryCodeEditable={false}
            value={props.phoneField}
            onChange={(value: any, data: any) => {
                props.setPhoneField(value);
                if ('dialCode' in data) props.setCountryDialCode(data.dialCode);
                if (props.phoneField === value && value !== "") setOtpStatus(OtpStatusValue.Verified)
            }}
            disabled={props.disabled}
            inputProps={{id: 'phone'}}
            placeholder=""
        />
    );

    const digitInput = (i: number, digit: string): React.JSX.Element => {
        return (
            <div style={{ width: 100 }}>
                <Col>
                    <Form.Control
                        key={`otp-digit-${i}`}
                        id={`otp-digit-${i}`}
                        className="text-center"
                        type="text"
                        value={digit}
                        onChange={(e) => updateDigits(i, e.target.value)}
                        onKeyUp={handleOtpEnter}
                        disabled={otpStatus === OtpStatusValue.Verifying}
                        autoFocus={i === 0}
                    />
                </Col>
            </div>);
    }

    const updateDigits = (index: number, value: string) => {
        const regex = /^[0-9]?$/;
        if (!regex.test(value)) return;

        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);

        const nextInput = document.getElementById(`otp-digit-${index + 1}`); // move to next input on input
        value.length && nextInput && nextInput.focus();
        const prevInput = document.getElementById(`otp-digit-${index - 1}`); // move to previous input on delete
        !value.length && prevInput && prevInput.focus();
    }

    const handleOtpEnter = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && digits.join("").length === 4) verifyOneTimePassword();
    }

    const oneTimePasswordTimer = () => {
        let timer = props.otpRequestBuffer;
        setTimeToResendCode(timer)
        console.log(timer);
        const interval = setInterval(() => {
            setTimeToResendCode(timer--);
            if (timer === -1) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }

    const getOneTimePassword = async (e: React.SyntheticEvent) => {
        e.preventDefault(); // Prevent page reload
        if (otpStatus === OtpStatusValue.Sending || otpStatus === OtpStatusValue.Verifying) return;
        setOtpStatus(OtpStatusValue.Sending);

        // check if time buffer has passed, phone number has changed, 
        // and phone number is valid
        const timeRemaining = timeToResendCode ?
            [new Error(`You must wait ${timeToResendCode} more seconds before requesting a new verification code.`)]
            : [];
        const phoneValidationErrors = validatePhoneNumber(phoneNumberToSubmit, props.countryDialCode);
        const errors = [...timeRemaining, ...phoneValidationErrors];

        if (errors.length) {
            props.setValidationErrors(errors);
            setOtpStatus(OtpStatusValue.NotSent);
            return;
        }

        try {
            await props.onGetOneTimePassword(phoneNumberToSubmit); // send otp & save in db
            oneTimePasswordTimer(); // start timer to resend code
        }
        catch (error: any) {
            props.setValidationErrors([error]) // display error
            setOtpStatus(OtpStatusValue.NotSent);
            return;
        }

        setDigits(["", "", "", ""]); // reset digits
        setOtpStatus(OtpStatusValue.Sent); 
    }

    const verifyOneTimePassword = async (e?: React.SyntheticEvent, otpValueIn?: string) => {
        if (e) e.preventDefault();
        console.log(otpStatus)

        if (otpStatus === OtpStatusValue.Sending || otpStatus === OtpStatusValue.Verifying) return;
        setOtpStatus(OtpStatusValue.Verifying);

        const otpValue = otpValueIn ? otpValueIn : digits.join("");
        console.log(otpValue);
        if (otpValue.length !== 4) {
            props.setValidationErrors([new Error("You must enter a 4-digit verification code.")]);
            setOtpStatus(OtpStatusValue.Sent);
            return;
        }

        try {
            await props.onVerifyOneTimePassword(otpValue);
            props.setPhoneField(phoneNumberToSubmit);
            props.setValidationErrors([]);
            props.setFormStatus(FormStatus.NotSubmitted)
        }
        catch (error: any) {
            console.log(error)
            props.setValidationErrors([error]);
            setOtpStatus(OtpStatusValue.Sent);
            return;
        }

        setDigits(["", "", "", ""]); // reset digits
        setOtpStatus(OtpStatusValue.Verified);
    }

    return (
        <>
        {otpStatus === OtpStatusValue.NotSent || otpStatus === OtpStatusValue.Sending || otpStatus === OtpStatusValue.Verified ? (
            <Form.Group>
                <div className="mb-3">
                    {phoneInput}
                </div>
                {alreadyVerified && <p className="text-success">This number has been verified, but if cleared and saved again, it may require re-verification</p>}
                {props.verifiedPhoneNumber !== props.phoneField && props.phoneField.length <= props.countryDialCode.length &&
                <p className="text-danger">You've cleared your saved number. If you submit, re-verification may be required.</p>}
                <Button variant="secondary" type="submit" disabled={props.disabled || alreadyVerified } onClick={getOneTimePassword}>Obtain a one-time phone verification code</Button>
            </Form.Group>
        ) :
        (
            <Form.Group>
                <p>Enter the verification code sent to {formattedPhoneNumberToSubmit} (
                    <a onClick={() => setOtpStatus(OtpStatusValue.NotSent)} className="link-primary">edit</a>
                    )
                </p>
                <Form className="mb-3">
                    <Row>
                        {digits.map((digit, i) => (
                            digitInput(i, digit)
                        ))}
                    </Row>
                </Form>
                {otpStatus !== OtpStatusValue.Verifying ?
                    <Button variant="primary" type="submit" disabled={props.disabled} onClick={verifyOneTimePassword}>Verify</Button>
                    : <Button variant="secondary"><Spinner animation="border" size="sm" as="span" role="status" /> Verifying...</Button>
                }
            </Form.Group>
        )
        }
        {otpStatus !== OtpStatusValue.NotSent && otpStatus !== OtpStatusValue.Verified && 
            (otpStatus !== OtpStatusValue.Sending ?
                <p className="mt-2">Didn't receive a code?&nbsp;
                    {timeToResendCode ? <a className="link-secondary">Resend Code in {timeToResendCode}s</a>
                        : <a onClick={getOneTimePassword} className={!timeToResendCode || otpStatus !== OtpStatusValue.Verifying ? "link-primary" : "link-secondary"}>Resend Code</a>
                    }
                </p>
                : <p className="mt-2"><Spinner animation="border" size="sm" as="span" role="status" /> Sending...</p>
                )
        }
        </>
    );

}