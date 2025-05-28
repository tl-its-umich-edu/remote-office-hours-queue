import React from "react";
import { Helmet } from "react-helmet-async";

const BaseTitle = "Remote Office Hours Queue";

export const createTitle = (title: string) => {
    return `${title} - ${BaseTitle}`;
}

interface HelmetTitleProps {
    title: string;
}

export const HelmetTitle: React.FC<HelmetTitleProps> = ({ title }) => {
    return (
        <Helmet>
            <title>{createTitle(title)}</title>
        </Helmet>
    );
};