export type Country = {
    name: string;
    flag: string;
};

export type Section = {
    name: string;
    color: string;
    role: string | null;
};

export type DataType = {
    name: string;
};

export type Datum = {
    country_name: string;
    flag: string;
    values: {
        value: number;
        estimated?: boolean;
    }[];
    sum: number;
};

export type Indicator = {
    name: string;
    dimension: string;
    section: string;
    color: string;
    skip: number;
};

export type Indicators = { [key: string]: Indicator };

export type Data = {
    indicators: string[];
    non_indicators: string[];
    indicator_info: Indicators;
    countries: Datum[];
    average: number;
};

export type Slide = {
    content: string[];
    data_type: DataType;
    ascending_order: boolean;
    show_average: boolean;
    show_countries: boolean;
    show_value: boolean;
    start_from_zero: boolean;
    specific_countries: Country[] | null;
    highlight_countries: Country[] | null;
    expand_country: number | null;
    expand_country_photo: string | null;
    dimension_list: string[] | null;
    resolution: string;
    section: Section;
    data: Data;
};
