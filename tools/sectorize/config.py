DEBUG = True

data_path = '/Users/sac/Sites/obspkg-lite/tools/data'

assets_path = '/Users/sac/Sites/obspkg-lite/tools/assets'

guide_geom_closed_distance = 0.01

bezier_granularity = 20

map_bounds_degrees = [-12, 28, 44, 48]

area_limits = [
    0.001,
    0.00025
]

simp_limits = [
    0.01,
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
    "depth_interval": [
      1000,
      500,
      250,
      125,
      62.5
    ],
    "depth_max": 5000
}