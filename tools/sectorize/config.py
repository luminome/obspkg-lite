DEBUG = True

data_path = '/Users/sac/Sites/obspkg-lite/tools/data'

static_data_path = '/Users/sac/Sites/obspkg-lite/static/data'

assets_path = '/Users/sac/Sites/obspkg-lite/tools/assets'

master_bounds = [[-7.0, 29.0, 37.0, 49.0], 44.0, 20.0]

master_degree_intervals = [2]  #, 1, 0.5]

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
