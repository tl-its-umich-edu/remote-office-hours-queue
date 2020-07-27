import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import * as api from "../services/api";
import { redirectToLogin } from "../utils";
import { PageProps } from "./page";

export function AddQueuePage(props: PageProps) {
    if (!props.user) {
        redirectToLogin(props.loginUrl);
    }

    const addQueue = async (name: string, description: string, bluejeansAllowed: boolean, inpersonAllowed: boolean, hostUsernames: string[]) {
        
    }
}