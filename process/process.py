import os
import dataflows as DF
import dataflows_airtable as DFA

import requests
import codecs

try:
    import dotenv
    dotenv.load_dotenv()
except:
    ...

AIRTABLE_BASE=os.environ['AIRTABLE_BASE']
AIRTABLE_API_KEY=os.environ['AIRTABLE_API_KEY']
print('AIRTABLE_API_KEY ', AIRTABLE_BASE[:3] + '...' + AIRTABLE_BASE[-3:])

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
    countries = load_table('Countries', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'flag'])
    sections = load_table('Sections', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'color', 'role', 'Dimensions'])
    data_types = load_table('DataTypes', map=DFA.AIRTABLE_ID_FIELD, keep=['name'])
    indicators = load_table('Indicators', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'dimension'])
    dimensions = load_table('Dimensions', map=DFA.AIRTABLE_ID_FIELD, keep=['name', 'indicators', 'section'])
    data = load_table('Data', map=['country_name', 'data_type_name', 'indicator_name'], keep=[
        'country_name', 'data_type_name', 'indicator_name', 'value', 'estimated'
    ])
    for dimension in dimensions.values():
        dimension['indicators'] = [indicators[i] for i in dimension['indicators']]
    for section in sections.values():
        section['slug'] = section['name'].lower().replace(' ', '_').replace(',', '')
    section_dimensions = dict(
        (s['name'], s.pop('Dimensions')) for s in sections.values()
    )
    slides = load_table('Slides', keep=[
        'section', 'data_type', 'specific_indicator', 'specific_dimension',
        'ascending_order', 'show_average', 'show_countries', 'show_value', 'start_from_zero',
        'specific_countries', 'highlight_countries', 'expand_country', 'expand_country_photo',
        'content', 'resolution', 'chart_title'
    ])
    prev_slider = None
    for slide_idx, slide in enumerate(slides):
        assert len(slide['section']) == 1, 'Slide {0} requires a section'.format(slide['id'])
        slide['section'] = sections[slide.pop('section')[0]]
        if slide['data_type']:
            slide['data_type'] = data_types[slide.pop('data_type')[0]]
        for k in [
            'ascending_order',
            'show_average',
            'show_countries',
            'show_value',
            'start_from_zero',
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

        for k in ['specific_countries', 'highlight_countries', 'expand_country']:
            if slide[k]:
                slide[k] = [countries[c] for c in slide[k]]
            else:
                slide[k] = None
        slide['data'] = None
        if not slide['specific_countries']:
            slide['specific_countries'] = list(countries.values())
            country_names = [c['name'] for c in slide['specific_countries']]
            if slide_idx > 0:
                prev_country_names = [c['name'] for c in slides[slide_idx-1]['specific_countries']]
                if set(country_names) == set(prev_country_names):
                    print('Slide {0} has the same countries as the previous slide, copying'.format(slide_idx))
                    slide['specific_countries'] = slides[slide_idx-1]['specific_countries'][:]
        country_values = []
        indicators_ = []
        if slide['specific_indicator']:
            indicators_ = [slide['specific_indicator']['name']]
        elif slide['specific_dimension']:
            indicators_ = [i['name'] for i in slide['specific_dimension']['indicators']]
        else:
            indicators_ = [i['name'] for i in indicators.values() if i['dimension'] is not None]
        non_indicators_ = [i['name'] for i in indicators.values() if i['name'] not in indicators_]

        data_type_ = None
        if slide['data_type']:
            data_type_ = slide['data_type']['name']
        else:
            non_indicators_.extend(indicators_)
            indicators_ = []

        countries_ = [(x['name'], x['flag']) for x in slide['specific_countries']]
        for country, flag in countries_:
            values = []
            record = dict(
                country_name=country,
                flag=flag,
                values=values,
            )
            for indicator in indicators_:
                val = data.get((country, data_type_, indicator))
                if val is None and '-' in data_type_:
                    val = data.get((country, data_type_.split('-')[0], indicator))
                if val is not None:
                    if val['value'] is not None:
                        val['value'] = float(val['value'])
                    if 'estimated' in val and not val.get('estimated'):
                        val.pop('estimated')
                    values.append(val)
            record['sum'] = sum(v['value'] for v in values if v and 'value' in v)
            country_values.append(record)
        if max(country_values, key=lambda x: x['sum'])['sum'] > 0:
            if slide['ascending_order']:
                country_values.sort(key=lambda x: x['sum'])
            else:
                country_values.sort(key=lambda x: -x['sum'])
            slide['specific_countries'] = [dict(name=x['country_name'], flag=x['flag']) for x in country_values]
        if slide['expand_country'] and slide['expand_country_photo']:
            slide['expand_country'] = [
                i for (i, v) in enumerate(country_values)
                if v['country_name'] == slide['expand_country'][0]['name']
            ][0]
            url = slide['expand_country_photo'][0]['thumbnails']['large']['url']
            # convert to data url
            r = requests.get(url).content
            slide['expand_country_photo'] = 'data:image/png;base64,' + codecs.encode(r, 'base64').decode('ascii').replace('\n', '')
            print(slide['expand_country_photo'][:400])
        else:
            slide['expand_country'] = None

        resolution = slide['resolution'] or None
        indicator_info = []
        skip = 0
        for indicator_name in indicators_:
            for indicator in indicators.values():
                if indicator['name'] != indicator_name:
                    continue
                if indicator['dimension']:
                    dimension = dimensions[indicator['dimension'][0]]
                    section = sections[dimension['section'][0]]
                    if len(indicator_info) == 0:
                        pass
                    elif resolution == 'dimension' and dimension['name'] != indicator_info[-1]['dimension']:
                        skip += 1
                    elif resolution == 'indicator':
                        skip += 1
                    
                    item = dict(
                        name=indicator['name'],
                        dimension=dimension['name'],
                        section=section['name'],
                        color=section['color'],
                        skip=skip
                    )
                    indicator_info.append(item)
        indicator_info = dict((i['name'], i) for i in indicator_info)

        if prev_slider:
            slide['slider_result'] = prev_slider
            prev_slider = None

        if '<רשימה>' in slide['content']:
            slide['dimension_list'] = [
                i['name'] for i in 
                dimensions[section_dimensions[slide['section']['name']][0]]['indicators']
            ]
            slide['content'] = [x.strip() for x in slide['content'].split('<רשימה>')]
        elif '<משקלות>' in slide['content']:
            slide['exploration'] = True
            slide['content'] = [x.strip() for x in slide['content'].split('<משקלות>')]

            for country_rec in country_values:
                raw_values = []
                for indicator, value_rec in zip(indicators_, country_rec['values']):
                    val = data.get((country_rec['country_name'], 'גולמי', indicator)) or 0
                    value_rec['raw'] = float(val['value'])

        elif '<סליידר>' in slide['content']:
            assert len(country_values) == 1
            assert len(indicators_) == 1

            slide['slider'] = indicators_[0]
            prev_slider = slide['slider']
            slide['content'] = [x.strip() for x in slide['content'].split('<סליידר>')]

            raw_values = [
                float(data.get((country_rec['name'], 'גולמי', indicators_[0]))['value'])
                for country_rec in countries.values()
            ]
            slide['slider_max'] = max(raw_values)            
            indicators_ = []
            non_indicators_ = [i['name'] for i in indicators.values()]
            country_values[0]['values'] = []
            country_values[0]['sum'] = 0

        if isinstance(slide['content'], str):
            slide['content'] = [slide['content']]

        slide['data'] = dict(
            indicators=indicators_,
            non_indicators=non_indicators_,
            indicator_info=indicator_info,
            countries=country_values,
            average=sum(c['sum'] for c in country_values) / len(country_values),
        )

    out = dict(
        slides=slides,
    )
    import json
    with open('projects/family-idx/src/assets/slides.json', 'w') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    # print(json.dumps(slides[16], indent=2, ensure_ascii=False))
    # import pprint
    # pprint.pprint(slides[16])