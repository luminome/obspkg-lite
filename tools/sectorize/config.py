DEBUG = True

data_path = '/Users/sac/Sites/obspkg-lite/tools/data'

database_path = '/Users/sac/Sites/obspkg-lite/data-resources/sample.db'

static_data_path = '/Users/sac/Sites/obspkg-lite/static/data'

assets_path = '/Users/sac/Sites/obspkg-lite/tools/assets'

wudi_assets_path = '/Users/sac/Sites/obspkg-lite/tools/assets/wudi'


time_intervals = ['hours', 'minutes', 'seconds']

prog_ct = 0

# wudi_UPWthr wudi_DNWthr
wudi_UPWthr = 0.4325  # (cad si WUDI >= UPWthr, alors on considère qu'il y a un upwelling)
wudi_DNWthr = -0.3905   #(cad si WUDI <= DNWthr, alors on considère qu'il y a un downwelling)
wudi_event_num_days = 7

master_bounds = [[-7.0, 29.0, 37.0, 49.0], 44.0, 20.0]

master_degree_intervals = [2]  #, 1, 0.5]

db_float_precision = 4

guide_geom_closed_distance = 0.01

bezier_granularity = 20

accept_classes = ['str', 'int', 'float', 'List']
#// used by main map build (data_parsers).
map_bounds_degrees = [-12, 26, 44, 50]

area_limits = [
    0.01,
    0.005
]

simp_limits = [
    0.1,
    0.0001
]

pop_limits = [
    5000,
    50000,
    500000,
]

min_population = 3000

bez_point_tolerance = {
    'wudi_point': 0.1,
    'place': 0.05,
    'protected_region': 0.5
}

levels_range = 5

contour_ranges = {
    "filter": [
        2.5,
        1.5,
        0.5,
        0.1,
        0.05
    ],
    "isobath_filter": 0.01,
    "depth_interval": [
        1000,
        500,
        250,
        125,
        62.5
    ],
    "depth_max": 5000
    # "depth_max": 5000
}
