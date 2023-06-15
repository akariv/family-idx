export type Country = {
    name: string;
    filename: string;
};

export type Section = {
    name: string;
    color: string;
};

export type DataType = {
    name: string;
};

export type Datum = {
    country_name: string;
    values: {
        value: number;
        estimated?: boolean;
    }[];
    sum: number;
};

export type Data = {
    indicators: string[];
    non_indicators: string[];
    countries: Datum[];
    average: number;
};

export type Slide = {
    content: string;
    data_type: DataType;
    ascending_order: boolean;
    show_average: boolean;
    show_countries: boolean;
    show_value: boolean;
    specific_countries: Country[] | null;
    highlight_countries: Country[] | null;
    resolution: string;
    section: Section;
    data: Data;
};