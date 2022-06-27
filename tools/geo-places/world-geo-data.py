import overpy
import json
import numpy as np
import time
from decimal import *
import pickle
import pandas as pd


# from qwikidata.sparql import return_sparql_query_results


class DecimalEncoder(json.JSONEncoder):
    #alphonso baschiera
    def default(self, obj):
        # 👇️ if passed in object is instance of Decimal
        # convert it to a string
        if isinstance(obj, Decimal):
            return str(obj)
        # 👇️ otherwise use the default behavior
        return json.JSONEncoder.default(self, obj)


def graze_overpass(source_dataframe):
    n = 0
    api = overpy.Overpass()
    location_collection = {}

    while n < source_dataframe.shape[0]:
        wd = source_dataframe.iloc[n]
        print('n'+str(n).zfill(2))

        try:
            q = f"[out:json];node(around:25000, {wd['M_lat']}, {wd['M_lon']})[place~\"^(city|town|village)$\"];out;"
            result = api.query(q)

            for node in result.nodes:
                location_collection[node.id] = {
                    'lon': node.lon,
                    'lat': node.lat,
                    'region': int(wd['region']),
                    'geo': int(wd['geo']),
                    'tags': node.tags
                }

            n += 1
            time.sleep(0.25)

        except (overpy.exception.OverpassTooManyRequests, overpy.exception.OverpassGatewayTimeout) as error:
            print("RETRY?", error)
            time.sleep(1.0)
            pass

    return location_collection


if __name__ == '__main__':
    master_wudi_hybrid = pd.read_pickle("../../pythonProject/wudi/data/master_wudi_hybrid.pkl")
    locations = graze_overpass(master_wudi_hybrid)

    with open('location_collection_super.json', 'w') as f:
        json.dump(locations, f, indent=1, cls=DecimalEncoder)

    pass












#
# """
# SELECT DISTINCT ?townLabel ?area ?population ?elevation (group_concat(distinct ?waterLabel;separator=", " ) as ?waterLabels) WHERE {
#   wd:Q1410 wdt:P2046 ?area.
#   wd:Q1410 wdt:P1082 ?population.
#   wd:Q1410 wdt:P2044 ?elevation.
#
#   OPTIONAL{
#     wd:Q1410 wdt:P206 ?water.
#   }
#
#   SERVICE wikibase:label {
#     bd:serviceParam wikibase:language "fr".
#     wd:Q1410 rdfs:label ?townLabel .
#     ?water rdfs:label ?waterLabel .
#   }
#
# }group by ?townLabel ?area ?population ?elevation
# """





#
#
# place = 'Marseille'
# wq = """
# SELECT ?town ?townLabel ?area ?population ?elevation ?water WHERE {
#   ?town ?label "%s"@fr.
#   ?town wdt:P2046 ?area.
#   ?town wdt:P1082 ?population.
#   ?town wdt:P2044 ?elevation.
#   ?town wdt:P206 ?water.
#   SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],fr". }
# }
# """
#
# res = return_sparql_query_results(wq % place)
#
# print(json.dumps(res, indent=4, sort_keys=True))
#

#
#
#
#
#
# api = overpy.Overpass()
#
# for n in range(wudi_med_data.shape[0]):
#     wd = wudi_med_data[n] #(f"{wd['lat']},{wd['lon']}") // geom;
#     print('n'+str(n).zfill(2))
#
#     try:
#         q = f"[out:json];node(around:25000, {wd['lat']}, {wd['lon']})[place~\"^(city|town|village)$\"];out;"
#
#         result = api.query(q)
#
#         for node in result.nodes:
#             print(node.id, node.lon, node.lat, json.dumps(node.tags, indent=4, sort_keys=True))
#
#     except (overpy.exception.OverpassTooManyRequests,overpy.exception.OverpassGatewayTimeout):
#         print("RETRY?")
#         time.sleep(2)
#         pass
#
#     time.sleep(1)