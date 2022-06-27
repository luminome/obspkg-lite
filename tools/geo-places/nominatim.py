from geopy.adapters import AioHTTPAdapter
from geopy.extra.rate_limiter import AsyncRateLimiter
import geopy.geocoders
from geopy.geocoders import Nominatim

import json
import numpy as np
import asyncio

data_path = f'../pythonProject/data/wudi/sample_data_summer_days_corsica.csv'
wudi_med_data = np.genfromtxt(data_path, delimiter=',', names=True)
print(wudi_med_data.shape, wudi_med_data)


wholesale = {}
locations = []

async def some_function():    
    async with Nominatim(
        user_agent="sac_obspkg_testing",
        adapter_factory=AioHTTPAdapter,
    ) as geolocator:
        reverse = AsyncRateLimiter(geolocator.reverse, min_delay_seconds=2)
        for n,wd in enumerate(wudi_med_data[:2]):
            location = await reverse(f"{wd['lat']},{wd['lon']}")
            wholesale['n'+str(n).zfill(2)] = location.raw;
        
loop = asyncio.get_event_loop()
loop.run_until_complete(some_function())


print(json.dumps(wholesale, indent=4, sort_keys=True))

#
#
# for wd in wudi_med_data:
#     print(f"{wd['lat']},{wd['lon']}")  #str([wd['lat'],wd['lon']]))
#
# geolocator = Nominatim(user_agent="sac_obspkg_testing")
# from geopy.extra.rate_limiter import RateLimiter
# geocode = RateLimiter(geolocator.reverse, min_delay_seconds=2)
#
# wholesale = {}
#
# async def some_function():
#
#     async with Nominatim(
#         user_agent="sac_obspkg_testing",
#         adapter_factory=AioHTTPAdapter,
#     ) as geolocator:
#         for n,wd in enumerate(wudi_med_data):
#             location = await geolocator.reverse(f"{wd['lat']},{wd['lon']}")
#             print(json.dumps(location.raw, indent=4, sort_keys=True))
#             wholesale['n'+str(n).zfill(2)] = location.raw;
#             await asyncio.sleep(3)
#     # return wholesale
#
# loop = asyncio.get_event_loop()
# loop.run_until_complete(some_function())
# #
# # proof = some_function()
#
# with open('./json_data.json', 'w') as outfile:
#     json.dump(wholesale, outfile, indent=4)
#
#
#
#
#
#
# geolocator = Nominatim(user_agent="sac_obspkg_testing")
# location = geolocator.reverse("43.0271,9.4053")
#
# # parsed = json.loads(location.raw)
# print(json.dumps(location.raw, indent=4, sort_keys=True))
#
# print(location)

