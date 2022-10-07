import json
import numpy as np
import time
from decimal import *
from qwikidata.sparql import return_sparql_query_results
import requests


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        # 👇️ if passed in object is instance of Decimal
        # convert it to a string
        if isinstance(obj, Decimal):
            return str(obj)
        # 👇️ otherwise use the default behavior
        return json.JSONEncoder.default(self, obj)


query = """
SELECT DISTINCT ?townLabel ?countryLabel ?area ?population ?elevation 
(group_concat(distinct ?regionLabel;separator=", " ) as ?regionLabels)
(group_concat(distinct ?waterLabel;separator=", " ) as ?waterLabels) WHERE {
  wd:%(q)s wdt:P2046 ?area.
  wd:%(q)s wdt:P1082 ?population.
  wd:%(q)s wdt:P2044 ?elevation.
  wd:%(q)s wdt:P17 ?country.
  wd:%(q)s wdt:P131 ?region.
  
  OPTIONAL{
    wd:%(q)s wdt:P206 ?water. 
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

# with open('location_collection.json', 'w') as f:
#     source_locations = json.load(f.read())
with open('locations_super.json', 'r') as f:
    source_locations = json.load(f)


if __name__ == '__main__':

    # print(query % {'q': 'test'})
    # print(len(source_locations.keys()))
    data_flat_list = []

    for i, loc in enumerate(source_locations):
        print(i, loc)

        if 'tags' in source_locations[loc]:
            tmp = source_locations[loc]
            tmp['node'] = loc

            if 'wikidata' in source_locations[loc]['tags']:
                q_data = source_locations[loc]['tags']['wikidata']
                print(i, loc, q_data)

                wikidata_sparql_url = "https://query.wikidata.org/sparql"
                query_string = query % {'q': q_data}
                response = requests.get(wikidata_sparql_url, params={"query": query_string, "format": "json"})
                jso = json.loads(response.text)
                time.sleep(1.125)

                for i, k in enumerate(jso['head']['vars']):
                    bindings = jso['results']['bindings']
                    if len(bindings):
                        try:
                            tmp[k] = bindings[0][k]['value']
                        except KeyError:
                            pass

                if 'waterLabels' in tmp and len(tmp['waterLabels']) == 0:
                    del tmp['waterLabels']

                #//print(json.dumps(tmp, indent=2, sort_keys=True))

            if 'capital' in tmp['tags']:
                tmp['capital'] = tmp['tags']['capital']
                del tmp['tags']['capital']

            if 'townLabel' not in tmp:
                try:
                    tmp['townLabel'] = tmp['tags']['name']
                    del tmp['tags']['name']
                except KeyError:
                    print(tmp)

            data_flat_list.append(tmp)
            print(tmp)

    # with open('locations_super.json', 'w') as f:
    #     json.dump(data_flat_list, f, indent=1, cls=DecimalEncoder)
