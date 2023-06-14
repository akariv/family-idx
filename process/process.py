import os
import dataflows as DF
import dataflows_airtable as DFA

import dotenv
dotenv.load_dotenv()

AIRTABLE_BASE=os.environ['AIRTABLE_BASE']
AIRTABLE_API_KEY=os.environ['AIRTABLE_API_KEY']

def load_table(table, map=None, keep=None):
    ret = DF.Flow(
        DFA.load_from_airtable(AIRTABLE_BASE, table, view='Grid view', apikey=AIRTABLE_API_KEY),
        DF.checkpoint(table),
        DF.select_fields(keep + ([DFA.AIRTABLE_ID_FIELD] if map==DFA.AIRTABLE_ID_FIELD else [])) if keep else None,
    ).results()[0][0]
    # print('Loaded {0} rows from {1}'.format(len(ret), table))
    if map:
        if isinstance(map, str):
            ret = dict(
                (r.pop(map), r)
                for r in ret
            )
        else:
            ret = dict(
                (tuple(r.pop(k)[0] for k in map), r)
                for r in ret
            )
            
    return ret


if __name__ == '__main__':
    countries = load_table('Countries', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'filename'])
    sections = load_table('Sections', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'color'])
    data_types = load_table('DataTypes', map=DFA.AIRTABLE_ID_FIELD, keep=['name'])
    indicators = load_table('Indicators', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'dimension'])
    dimensions = load_table('Dimensions', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'indicators'])
    data = load_table('Data', map=['country_name', 'data_type_name', 'indicator_name'], keep=[
        'country_name', 'data_type_name', 'indicator_name', 'value', 'estimated'
    ])
    for dimension in dimensions.values():
        dimension['indicators'] = [indicators[i] for i in dimension['indicators']]
    slides = load_table('Slides', keep=[
        'section', 'data_type', 'specific_indicator', 'specific_dimension',
        'ascending_order', 'show_average', 'show_countries', 'show_value',
        'specific_countries', 'highlight_countries',
        'content', 'resolution', 
    ])
    for slide in slides:
        assert len(slide['section']) == 1, 'Slide {0} requires a section'.format(slide['id'])
        slide['section'] = sections[slide.pop('section')[0]]
        if slide['data_type']:
            slide['data_type'] = data_types[slide.pop('data_type')[0]]
        for k in [
            'ascending_order',
            'show_average',
            'show_countries',
            'show_value',
        ]:
            slide[k] = bool(slide[k])
        if slide['specific_indicator']:
            assert len(slide['specific_indicator']) == 1, 'Slide {0} allows only one specific_indicator'.format(slide['id'])
            slide['specific_indicator'] = indicators[slide['specific_indicator'][0]]
        else:
            slide['specific_indicator'] = None
        if slide['specific_dimension']:
            assert len(slide['specific_dimension']) == 1, 'Slide {0} allows only one dimension'.format(slide['id'])
            slide['specific_dimension'] = dimensions[slide['specific_dimension'][0]]
        else:
            slide['specific_dimension'] = None
        assert not (slide['specific_indicator'] and slide['specific_dimension']), 'Slide {0} allows only one of specific_indicator and dimension'.format(slide['id'])

        for k in ['specific_countries', 'highlight_countries']:
            if slide[k]:
                slide[k] = [countries[c] for c in slide[k]]
            else:
                slide[k] = None
        slide['data'] = None
        if slide['data_type']:
            if not slide['specific_countries']:
                slide['specific_countries'] = list(countries.values())
            country_values = []
            data_type_ = slide['data_type']['name']
            indicators_ = []
            if slide['specific_indicator']:
                indicators_ = [slide['specific_indicator']['name']]
            elif slide['specific_dimension']:
                indicators_ = [i['name'] for i in slide['specific_dimension']['indicators']]
            else:
                indicators_ = [i['name'] for i in indicators.values() if i['dimension'] is not None]
            countries_ = [x['name'] for x in slide['specific_countries']]
            for country in countries_:
                values = []
                record = dict(
                    country_name=country,
                    values=values,
                )
                for indicator in indicators_:
                    val = data.get((country, data_type_, indicator))
                    if val is not None:
                        if val['value'] is not None:
                            val['value'] = float(val['value'])
                        if 'estimated' in val and not val.get('estimated'):
                            val.pop('estimated')
                    values.append(val)
                record['sum'] = sum(v['value'] for v in values if v and 'value' in v)
                country_values.append(record)
            if slide['ascending_order']:
                country_values.sort(key=lambda x: x['sum'])
            else:
                country_values.sort(key=lambda x: -x['sum'])
            slide['data'] = dict(
                indicators=indicators_,
                countries=country_values,
                average=sum(c['sum'] for c in country_values) / len(country_values),
            )

    import json
    with open('projects/family-idx/src/assets/slides.json', 'w') as f:
        json.dump(slides, f, indent=2, ensure_ascii=False)
    # print(json.dumps(slides[16], indent=2, ensure_ascii=False))
    # import pprint
    # pprint.pprint(slides[16])