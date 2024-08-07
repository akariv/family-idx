import { SafeHtml } from "@angular/platform-browser";

export type Country = {
    name: string;
    flag: string;
};

export type Section = {
    name: string;
    slug: string;
    color: string;
    role: string | null;
    display?: string;
};

export type DataType = {
    name: string;
};

export type Value = {
    value: number;
    raw: number;
    estimated?: boolean;
    origValue?: number;
};

export type Datum = {
    country_name: string;
    flag: string;
    values: Value[];
    origValues: Value[];
    sum: number;
};

export type Indicator = {
    name: string;
    dimension: string;
    section: string;
    color: string;
    link_to_doc: string;
    chart_title: string;
    dimension_chart_title: string;
    raw_data_units: string;
    skip: number;
};

export type Indicators = { [key: string]: Indicator };

export type Data = {
    indicators: string[];
    non_indicators: string[];
    indicator_info: Indicators;
    countries: Datum[];
    average: number;
    max: number;
};

export type Slide = {
    content: string[];
    html: SafeHtml[];
    data_type: DataType;
    ascending_order: boolean;
    show_average: boolean;
    show_countries: boolean;
    show_value: boolean;
    hide_country_labels: boolean;
    start_from_zero: boolean;
    specific_countries: Country[] | null;
    highlight_countries: Country[] | null;
    expand_country: number | null;
    expand_country_photo: string | null;
    dimension_list: string[] | null;
    exploration: boolean;
    slider: string | null;
    slider_max: number | null;
    slider_result: string | null;
    resolution: string;
    chart_title: string;
    section: Section;
    data: Data;
    id: string;
};
