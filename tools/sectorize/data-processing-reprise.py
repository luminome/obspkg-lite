#!/usr/bin/env python3
import os
import sys
import config as conf
import pandas as pd
import overpy
import json
import numpy as np
import time
from decimal import *
import pickle
import requests

from shapely.geometry import Point

import utilities as util
from db_manage import create_connection


class DecimalEncoder(json.JSONEncoder):
    #alphonso baschiera
    def default(self, obj):
        # 👇️ if passed in object is instance of Decimal
        # convert it to a string
        if isinstance(obj, Decimal):
            return str(obj)
        # 👇️ otherwise use the default behavior
        return json.JSONEncoder.default(self, obj)


def mpa_s_to_database(source_dataframe):
    table_name = 'protected_regions'
    conn = create_connection(conf.database_path)

    df = pd.read_pickle(os.path.join(conf.assets_path, source_dataframe))

    df = df.drop(columns=['geometry', 'LON', 'LAT'])

    mods = [['CENTROID', 'number', 'centroid'], ['COUNTRY', 'string', 'COUNTRY'], ['MED_REGION', 'string', 'MED_REGION']]
    for m in mods:
        df[m[0]] = df[m[0]].apply(util.db_value_cleaner, args=(conf.db_float_precision, m[1],))

    df.NAME = df.NAME.apply(util.db_make_title)

    #df = df.drop('CENTROID', axis=1)

    df.to_sql(table_name, conn, if_exists='replace', index=False)
    conn.close()
    pass


def places_graze_wikimedia(places_data_json):
    query = """
    SELECT DISTINCT ?townLabel ?countryLabel ?area ?population ?elevation 
    (group_concat(distinct ?regionLabel;separator=", " ) as ?regionLabels)
    (group_concat(distinct ?waterLabel;separator=", " ) as ?waterLabels) WHERE {

        wd:%(q)s wdt:P17 ?country.
        wd:%(q)s wdt:P2044 ?elevation.
        wd:%(q)s wdt:P1082 ?population.
        wd:%(q)s wdt:P131 ?region.

      OPTIONAL{
        wd:%(q)s wdt:P206 ?water. 
        wd:%(q)s wdt:P2046 ?area.
      }

      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en". 
        wd:%(q)s rdfs:label ?townLabel.
        ?country rdfs:label ?countryLabel.
        ?region rdfs:label ?regionLabel.
        ?water rdfs:label ?waterLabel.
      } 

    }group by ?townLabel ?countryLabel ?area ?population ?elevation 
    """
    data_flat_list = []

    for i, loc in enumerate(places_data_json):
        print(i, loc)
        q_data = None

        if 'tags' in places_data_json[loc]:
            tmp = places_data_json[loc]
            tmp['node'] = loc

            if 'population' in tmp['tags']:
                try:
                    tmp['population'] = int(float(tmp['tags']['population']))
                except ValueError:
                    pass

            if 'name' in tmp['tags']:
                tmp['name'] = tmp['tags']['name']

            if 'name:en' in tmp['tags']:
                tmp['name'] = tmp['tags']['name:en']

            if 'int_name' in tmp['tags']:
                tmp['name'] = tmp['tags']['int_name']

            if 'wikidata' in places_data_json[loc]['tags']:
                q_data = places_data_json[loc]['tags']['wikidata']
                #print(i, loc, q_data)

                wikidata_sparql_url = "https://query.wikidata.org/sparql"
                query_string = query % {'q': q_data}
                response = requests.get(wikidata_sparql_url, params={"query": query_string, "format": "json"})
                jso = json.loads(response.text)
                time.sleep(1.125)

                for di, k in enumerate(jso['head']['vars']):
                    bindings = jso['results']['bindings']
                    if len(bindings):
                        try:
                            tmp[k] = bindings[0][k]['value']
                        except KeyError:
                            pass

                if 'waterLabels' in tmp and len(tmp['waterLabels']) == 0:
                    del tmp['waterLabels']

                tmp['source'] = q_data

            if 'place' in tmp['tags']:
                tmp['type'] = tmp['tags']['place']

            if 'capital' in tmp['tags']:
                tmp['capital'] = tmp['tags']['capital']
                del tmp['tags']['capital']

            if 'townLabel' not in tmp:
                try:
                    tmp['townLabel'] = tmp['tags']['name']
                    del tmp['tags']['name']
                except KeyError:
                    print(tmp)

            tmp['place_id'] = i

            del tmp['tags']
            data_flat_list.append(tmp)

            if q_data is not None:
                print(tmp)

    return data_flat_list


def places_graze_overpass(source_dataframe):
    n = 0
    api = overpy.Overpass()
    location_collection = {}

    while n < source_dataframe.shape[0]:
        wd = source_dataframe.iloc[n]
        print('n'+str(n).zfill(2)+'/'+str(source_dataframe.shape[0]))

        try:
            q = f"[out:json];node(around:25000, {wd['M_lat']}, {wd['M_lon']})[place~\"^(city|town|village)$\"];out;"

            result = api.query(q)

            for node in result.nodes:
                location_collection[node.id] = {
                    'lon': node.lon,
                    'lat': node.lat,
                    'region': int(wd['eco']),
                    'geo': int(wd['geo']),
                    'tags': node.tags
                }

            n += 1
            time.sleep(0.5)

        except (overpy.exception.OverpassTooManyRequests, overpy.exception.OverpassGatewayTimeout) as error:
            print("RETRY?", error)
            time.sleep(1.0)
            pass

    return location_collection


def places_parse_places(source_file) -> pd.DataFrame:
    places = pd.read_json(os.path.join(conf.assets_path, source_file))
    places = places.astype(object).where(pd.notnull(places), None)
    # status_field = [None] * places.shape[0]
    # places['status'] = status_field
    return places


def places_filter_to_db(source_file):
    df = pd.read_pickle(os.path.join(conf.assets_path, source_file))
    print(df.info())
    # exit()
    # df = df.where(df['population'] >= 1000)
    #df = df.replace(to_replace='None', value=np.nan).dropna()
    df = df.replace(to_replace='None', value=np.nan)
    df = df.drop(df[(df.population < 1000) | (df.population.isnull())].index)
    #df = df.drop(df[(df.population < 1000) | (df.population.isnull()) | (df.source.isnull())].index)

    for wi, row in df.iterrows():
        print(wi, list(row.values))

    dtypes = {
        'lon': 'REAL',
        'lat': 'REAL',
        'region': 'INT',
        'geo': 'INT',
        'name': 'TEXT',
        'townLabel': 'TEXT',
        'countryLabel': 'TEXT',
        'area': 'REAL',
        'population': 'INT',
        'elevation': 'REAL',
        'regionLabels': 'TEXT',
        'waterLabels': 'TEXT',
        'capital': 'TEXT',
        'type': 'TEXT',
        'place_id': 'INT',
        'source': 'TEXT',
    }

    conn = create_connection(conf.database_path)
    df.to_sql('places_test', conn, if_exists='replace', dtype=dtypes, index=False)
    conn.close()


def wudi_associations_to_db(source_file):
    assoc_df = pd.read_pickle(os.path.join(conf.assets_path, source_file))

    def pack(v):
        if v.__class__.__name__ == 'list':
            if not len(v):
                return None
            return ','.join([str(vi) for vi in v])
        else:
            if not v:
                return None
            if np.isnan(v):
                return None
            return int(v)

    assoc_df = assoc_df.applymap(pack)

    for w in range(assoc_df.shape[0]):
        print(assoc_df.iloc[w].values)

    dtypes = {
        'nearest_protected': 'INT',
        'within_protected': 'BLOB',
        'nearest_place': 'INT'
    }

    conn = create_connection(conf.wudi_database_path)
    assoc_df.to_sql('wudi_assoc_att', conn, if_exists='replace', dtype=dtypes, index=False)
    conn.close()

    pass


def wudi_make_associations(wudi_file, places_file, protected_reg_file):
    wudi_df = pd.read_pickle(os.path.join(conf.assets_path, wudi_file))
    places_df = pd.read_pickle(os.path.join(conf.assets_path, places_file))
    protected_df = pd.read_pickle(os.path.join(conf.assets_path, protected_reg_file))

    places_df = places_df.drop(places_df[places_df.population.isnull()].index)

    all_wudi_points = []
    for n in range(wudi_df.shape[0]):
        point = Point(wudi_df.iloc[n].M_lon, wudi_df.iloc[n].M_lat)
        all_wudi_points.append(point)

    r_meta_wudi = {}
    for w in range(wudi_df.shape[0]):
        r_meta_wudi[w] = {'pid': w, 'adj_protected': None, 'nearest_protected': None, 'within_protected': None, 'nearest_place': None}

    def get_closest_places():
        closest_places = []
        cols = ['lon', 'lat', 'population', 'place_id']

        for k, p in enumerate(all_wudi_points):
            s_d = 0.25
            dist = []
            rf = places_df[[cols[0], cols[1], cols[2], cols[3]]][((places_df[cols[0]] > p.x - s_d) & (places_df[cols[0]] < p.x + s_d)) & (
                        (places_df[cols[1]] > p.y - s_d) & (places_df[cols[1]] < p.y + s_d))]

            for wi, row in rf.iterrows():
                dist.append([k, int(row.place_id), Point(row.lon, row.lat).distance(p), int(row.population)])
                #dist.append([k, wi, Point(row.lon, row.lat).distance(p), int(row.population)])

            by_distance = sorted(dist, key=lambda x: (x[3], x[2]))[::-1]
            #print(by_distance)
            #by_pop = sorted(by_distance, key=lambda x: x[3])

            if len(by_distance) and by_distance[0][2] < 0.125:
                closest_places.append(by_distance[0])  #for all of these closest points

            util.show_progress(f"places", k, len(all_wudi_points))

        #eliminate redundancy here
        d_filter = {}
        for r in closest_places:
            if not r[1] in d_filter:
                d_filter[r[1]] = []
            d_filter[r[1]].append(r)

        for rf in d_filter.keys():
            #print(d_filter[rf][0])
            reso = sorted(d_filter[rf], key=lambda x: x[2])
            if len(reso):
                r_meta_wudi[reso[0][0]]['nearest_place'] = reso[0][1]

            #r_meta_wudi[d_filter[rf][0][0]]['nearest_place'] = d_filter[rf][0][1]

    def get_closest_regions():
        cols = {'lon': [], 'lat': []}

        for wi, row in protected_df.iterrows():
            cen = row['CENTROID']
            cols['lon'].append(cen[0])
            cols['lat'].append(cen[1])

        protected_df['lon'] = cols['lon']
        protected_df['lat'] = cols['lat']

        cols = ['lon', 'lat']
        filtered = {}

        for k, p in enumerate(all_wudi_points):
            s_d = 1.0
            dist = []
            rf = protected_df[((protected_df[cols[0]] > p.x - s_d) & (protected_df[cols[0]] < p.x + s_d)) & (
                        (protected_df[cols[1]] > p.y - s_d) & (protected_df[cols[1]] < p.y + s_d))]

            contained = []

            closest = None

            for wi, row in rf.iterrows():
                dist.append([k, wi, Point(row.lon, row.lat).distance(p)])
                if row.geometry.contains(p):
                    contained.append(wi)
                res = sorted(dist, key=lambda x: x[2])
                closest = res[0]

                if wi not in filtered:
                    filtered[wi] = []
                if closest[1] == wi:
                    filtered[wi].append(closest)

            if closest is not None:
                r_meta_wudi[k]['nearest_protected'] = closest[1]
            if len(contained):
                r_meta_wudi[k]['within_protected'] = contained
            util.show_progress(f"protected", k, len(all_wudi_points))
            # print(k, closest, contained)

        for k in filtered.keys():
            res = sorted(filtered[k], key=lambda x: x[2])
            if len(res):
                r_meta_wudi[res[0][0]]['adj_protected'] = k





                # print(k, res[0], res)


            #     dist.append([k, wi, Point(row.lon, row.lat).distance(p)])
            # res = sorted(dist, key=lambda x: x[2])

        # for n, row in protected.iterrows():
        #     contained = []
        #     dist = []
        #     for k, p in enumerate(all_wudi_points):
        #         dist.append([k, n, Point(protected.iloc[n].CENTROID).distance(p)])
        #         if protected.iloc[n].geometry.contains(p):
        #             contained.append(k)
        #
        #     res = sorted(dist, key=lambda x: x[2])
        #     closest_regions.append([res[0], contained])
        #     print('reg', n, [res[0], contained])

        #util.show_progress(f"protected", n, protected.shape[0])
        # if n > 10:
        #     break

        # exit()
        #
        #
        # p_filter = {}
        # for r in closest_regions:
        #     if not r[0] in p_filter:
        #         p_filter[r[0]] = []
        #     p_filter[r[0]].append(r)
        #
        # meta = []
        # for rf in p_filter.keys():
        #     reso = sorted(p_filter[rf], key=lambda x: x[2])
        #     meta.append(reso[0])
        #     if len(reso):
        #         r_meta_wudi[reso[0][0]]['nearest_protected'] = reso[0][1]
        #
        # for r in contained:
        #     if len(r):
        #         r_meta_wudi[r[0]]['within_protected'].append(r[1])
        #
        # with open(os.path.join(conf.assets_path, 'v2_wudi_protected_closest.pkl'), 'wb') as fp:
        #     pickle.dump(r_meta_wudi, fp)
        #
        # print(r_meta_wudi)

    get_closest_places()
    get_closest_regions()

    for k in r_meta_wudi.keys():
        print(k, r_meta_wudi[k])

    tabled = pd.DataFrame.from_dict(r_meta_wudi)
    tabled_transposed = tabled.transpose()
    util.save_asset(tabled_transposed, 'v2_wudi_associated_reprise')

    # v2_places = pd.read_pickle(os.path.join(conf.assets_path, 'v2_wudi_places_closest.pkl'))
    # v2_protec = pd.read_pickle(os.path.join(conf.assets_path, 'v2_wudi_protected_closest.pkl'))
    #
    # for k in v2_places:
    #     v2_protec[k[0]]['nearest_place'] = k[1]
    #
    # for k in v2_protec.keys():
    #     print(k, v2_protec[k])
    #
    # tabled = pd.DataFrame.from_dict(v2_protec)
    # tabled_transposed = tabled.transpose()
    # util.save_asset(tabled_transposed, 'v2_wudi_associated')

    # v2_assoc = pd.read_pickle(os.path.join(conf.assets_path, 'v2_wudi_associated-DataFrame.pkl'))
    # print(v2_assoc.info())
    #
    # def pack(v):
    #     #//print(v, v.__class__.__name__, 's')
    #     if v.__class__.__name__ == 'list':
    #         if not len(v):
    #             return None
    #         return ','.join([str(vi) for vi in v])
    #     else:
    #         if not v:
    #             return None
    #         if np.isnan(v):
    #             return None
    #         return int(v)
    #
    # v2_assoc = v2_assoc.applymap(pack)
    #
    # for w in range(v2_assoc.shape[0]):
    #     print(v2_assoc.iloc[w].values)
    #
    # dtypes = {
    #     'nearest_protected': 'INT',
    #     'within_protected': 'BLOB',
    #     'nearest_place': 'INT'
    # }
    #
    # conn = create_connection(conf.wudi_database_path)
    # v2_assoc.to_sql('wudi_assoc', conn, if_exists='replace', dtype=dtypes, index=False)
    # conn.close()



    #
    #     # mods = [['CENTROID', 'number', 'centroid'], ['COUNTRY', 'string', 'COUNTRY'], ['MED_REGION', 'string', 'MED_REGION']]
    #     # for m in mods:
    #     #     df[m[2]] = df[m[0]].apply(util.db_value_cleaner, args=(conf.db_float_precision, m[1],))
    #
    #     print(v2_assoc.iloc[w])
    #     #
    #     # for v in v2_assoc.iloc[w]:
    #     #     print(v)
    #
    #         #print(v.apply(util.db_value_cleaner, args=(conf.db_float_precision,'number',)))
    #
    #     #print(list(v2_assoc.iloc[w].values))

    #exit()
    #
    # for n in range(places.shape[0]):
    #     try:
    #         dist = []
    #         for k, p in enumerate(all_wudi_points):
    #             dist.append([k, n, Point(places.iloc[n].lon, places.iloc[n].lat).distance(p)])
    #
    #         res = sorted(dist, key=lambda x: x[2])
    #         closest_to_center.append(res[0])
    #         util.show_progress(f"places", n, places.shape[0])
    #     except KeyboardInterrupt:
    #         print(closest_to_center)
    #         pass
    #
    # with open('parrot.pkl', 'wb') as f:
    #     pickle.dump(closest_to_center, f)
    #
    # print(closest_to_center)
    #
    # exit()
    # contained = []
    # closest_to_center = []
    #
    # for n in range(protected.shape[0]):
    #     dist = []
    #     for k, p in enumerate(all_wudi_points):
    #         dist.append([k, n, Point(protected.iloc[n].CENTROID).distance(p)])
    #         if protected.iloc[n].geometry.contains(p):
    #             contained.append([k, n])
    #
    #     res = sorted(dist, key=lambda x: x[2])
    #     closest_to_center.append(res[0])
    #     util.show_progress(f"protected", n, protected.shape[0])
    #
    # print(contained)
    # print(closest_to_center


def places_df_sanitize(assoc_file, places_file):
    v2_assoc = pd.read_pickle(os.path.join(conf.assets_path, assoc_file))
    places_df = pd.read_pickle(os.path.join(conf.assets_path, places_file))
    #v2_assoc = v2_assoc.drop(v2_assoc[v2_assoc.nearest_place.isnull()].index)

    def pack(v):
        print(v, v.__class__)
        if v.__class__.__name__ == 'float':
            try:
                return int(float(v))
            except ValueError:
                return None

    #v2_assoc = v2_assoc.applymap(pack)
    #//this is unexpected

    rfi = places_df[(places_df['place_id'].isin(v2_assoc['nearest_place'])) & (places_df['population'] > 1000) & (places_df['region'] != 0)]

    for wi, row in rfi.iterrows():
        print(wi, list(row.values))

    print(rfi.info())

    util.save_asset(rfi, 'v2_places_reprised_clean')
    pass


if __name__ == '__main__':
    commands = ['places_overpass', 'places_wikimedia', 'places_parse', 'places_view', 'places_make_db', 'places_clean', 'mpa_s_make_db', 'wudi_assoc_make','wudi_assoc_view', 'wudi_assoc_make_db']
    style = None
    m_args = list(sys.argv)
    if len(m_args) == 1:
        print(commands)
    if len(m_args) > 1:
        if m_args[1] in commands:
            style = m_args[1]
        else:
            print(m_args, 'command not found')
            exit()
    # print(list(sys.argv))

    if style == 'places_overpass':
        wudi_asset = pd.read_pickle(os.path.join(conf.assets_path, "v2_wudi-DataFrame.pkl"))
        locations = places_graze_overpass(wudi_asset)
        with open(os.path.join(conf.assets_path, 'v2_places_overpass.json'), 'w') as f:
            json.dump(locations, f, indent=1, cls=DecimalEncoder)

    if style == 'places_wikimedia':
        with open(os.path.join(conf.assets_path, 'v2_places_overpass.json'), 'r') as f:
            locations = json.load(f)

        locations_wikimedia = places_graze_wikimedia(locations)

        with open(os.path.join(conf.assets_path, 'v2_places_overpass_wikimedia.json'), 'w') as f:
            json.dump(locations_wikimedia, f, indent=1, cls=DecimalEncoder)

    if style == 'places_parse':
        v2_places = places_parse_places('v2_places_overpass_wikimedia.json')
        util.save_asset(v2_places, 'v2_places_reprised')

    if style == 'places_view':
        v2_places_asset = pd.read_pickle(os.path.join(conf.assets_path, "v2_places_reprised-DataFrame.pkl"))
        print(v2_places_asset.info())
        if len(m_args) == 3 and m_args[2 == 'long']:
            for index, obj in v2_places_asset.iterrows():
                print('--------------')
                print(index, obj)

    if style == 'places_make_db':
        #places_filter_to_db('v2_places_reprised-DataFrame.pkl')
        places_filter_to_db('v2_places_reprised_clean-DataFrame.pkl')

    if style == 'places_clean':
        places_df_sanitize('v2_wudi_associated_reprise-DataFrame.pkl', 'v2_places_reprised-DataFrame.pkl')
        pass

    if style == 'mpa_s_make_db':
        mpa_s_to_database('v2_protected_regions-DataFrame.pkl')

    if style == 'wudi_assoc_make':
        # we might like this but not sure...would be good to test this.
        wudi_make_associations("v2_wudi-DataFrame.pkl", "v2_places_reprised-DataFrame.pkl", "v2_protected_regions-DataFrame.pkl")

    if style == 'wudi_assoc_make_db':
        wudi_associations_to_db('v2_wudi_associated_reprise-DataFrame.pkl')

    if style == 'wudi_assoc_view':
        v2_places_asset = pd.read_pickle(os.path.join(conf.assets_path, "v2_wudi_associated_reprise-DataFrame.pkl"))
        print(v2_places_asset.info())