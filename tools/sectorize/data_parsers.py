#!/usr/bin/env python3
import csv
import math
import os
from itertools import groupby
from operator import itemgetter
from typing import List

import fiona
import geopandas as gpd
import netCDF4 as nC
import numpy as np
import pandas as pd
from scipy.ndimage.filters import gaussian_filter
from shapely.affinity import translate, scale
from shapely.geometry import Point, box, LineString, MultiPolygon, MultiLineString, MultiPoint, Polygon
from shapely.ops import unary_union
from skimage import measure

import sqlite3
from sqlite3 import Error

import config as conf
import utilities as util
from Bezier import CubicBezier


# convert map geopackage to shapely multigeometry
def parse_map_geometry() -> MultiPolygon:
    min_x, min_y, max_x, max_y = conf.map_bounds_degrees
    geographic_bounds = box(min_x, min_y, max_x, max_y)

    geo_bounds = gpd.GeoDataFrame(index=[0], crs='epsg:4326', geometry=[geographic_bounds])
    map_regions = gpd.read_file(os.path.join(conf.data_path, 'GOaS_v1_20211214/goas_v01.shp'))
    map_med = gpd.overlay(geo_bounds, map_regions, how='intersection')

    print(map_med.info())
    print(map_med.head(20))

    group = map_med['geometry']
    map_multi_poly = geographic_bounds

    for g in group:
        print(type(g))
        for poly in util.poly_s_to_list(g):
            map_multi_poly = map_multi_poly.difference(poly)

    return map_multi_poly


# TODO: re-examine. create protected regions table
# source re-adaptation of pythonProject:marine_regions.py.
def parse_protected_regions() -> (pd.DataFrame, pd.DataFrame):
    area_filter = [
        "geometry",
        "NAME",
        "STATUS_YR",
        "STATUS_ENG",
        "MAPAMED_ID",
        "PARENT_ID",
        "REP_AREA",
        "SITE_TYPE_ENG",
        "DESIG_ENG",
        "IUCN_CAT_ENG",
        "WEBSITE"
    ]

    criteria_filter = ['Marine N2000 Proposed Site', 'MPA of National Statute']  #// WEIRD

    def load_sources():
        country_file = os.path.join(conf.data_path, 'MAPAMED_2019_edition/mapamed_2019_dataset_definition_countries.tsv')
        with open(country_file) as csvfile:
            reader = csv.DictReader(csvfile, delimiter='\t')
            country_data = [row for row in reader]

        shapes_file = os.path.join(conf.data_path, 'MAPAMED_2019_edition/MAPAMED_2019_spatial_data_epsg3035.gpkg')
        gpkg_tables = {}

        for layer_name in fiona.listlayers(shapes_file):
            print(layer_name)
            g_layer = gpd.read_file(shapes_file, layer=layer_name)
            print('converting crs to 4326')
            g_layer = g_layer.to_crs(crs=4326)
            gpkg_tables[layer_name] = g_layer

        return gpkg_tables, country_data

    def regions_parse(main_tables, country_data):
        regions_all = []
        elements_all = []
        for k, v in main_tables.items():

            print('loading regions', k)
            if k == 'Scope of the Barcelona Convention (IHO-MSFD)':
                regions_all = v.to_dict('records')

            print('loading elements', k)
            if k == 'MAPAMED 2019 edition - EPSG:3035':
                indx = v.shape[0]
                v = v.fillna(np.nan).replace([np.nan], [None])
                # #// HIFIVE TO SELF ^
                mct = [v.iloc[i] for i in range(0, indx) if v.iloc[i]['DESIG_CAT_ENG'] in criteria_filter]
                N = len(mct)
                max_area = 0
                avg_area = 0
                for mv in mct:
                    compare = mv['REP_AREA'] if mv['REP_AREA'] is not None else 0.0
                    avg_area += compare

                    if compare > max_area:
                        max_area = mv['REP_AREA']

                avg_area /= len(mct)

                print(avg_area, 'km')
                print(max_area, 'km')

                for i, elem in enumerate(mct):
                    area = {}
                    for f in area_filter:
                        area[f] = elem[f]  # if not math.isnan(elem[f]) else 'null'

                    if type(area['REP_AREA']) == float:
                        nsca = util.normalize_val(area['REP_AREA'], 0.1, avg_area)
                        area['scale'] = 1 if math.isnan(nsca) or nsca < 0 else math.ceil(nsca) if nsca < 4 else 4
                    else:
                        area['scale'] = 1

                    area['CENTROID'] = np.array(elem['geometry'].centroid.coords[0])
                    area['COUNTRY'] = [
                        p['COUNTRY_FRA'] for p in country_data if p['ISO3'] in elem['ISO3'][1:-1]
                    ]
                    area['MED_REGION'] = [
                        p['NAME_FRA'] for p in regions_all if p['MSFD_REGION'] in elem['MSFD_REGION'][1:-1]
                    ]

                    elements_all.append(area)

        return {'protected': elements_all, 'eco_regions_mapamed': regions_all}

    tables, country_data = load_sources()
    ref_table = regions_parse(tables, country_data)

    protected_df = pd.json_normalize(ref_table['protected'])

    map_a_med_regions_df = pd.json_normalize(ref_table['eco_regions_mapamed'])

    return protected_df, map_a_med_regions_df


# convert newly acquired place data
# source generated by '/Users/sac/Sites/obspkg-lite/tools/geo-places'
def parse_places() -> pd.DataFrame:
    places = pd.read_json(os.path.join(conf.data_path, 'locations_super.json'))
    places = places.astype(object).where(pd.notnull(places), None)
    return places


# convert nat's netcdf to pandas dataframe for WUDI data
# source re-adaptation of /Users/sac/Sites/pythonProject/wudi/tests.py.
# parse wudi data positions and add selected meta regions.
def parse_wudi(eco_regions) -> pd.DataFrame:
    new_fn = os.path.join(conf.data_path, 'WUDI_daily_1979-2020_v1.nc')
    ds = nC.Dataset(new_fn)
    size = np.array(ds['geo']).size
    print('size:', size)
    column_values = ['A_lat', 'A_lon', 'M_lat', 'M_lon', 'B_lat', 'B_lon', 'geo', 'eco_region', 'sample']
    index_values = np.arange(0, size, 1, dtype=int)
    region_field = np.zeros(size, dtype=int)

    cols = list(ds.variables)
    print(list(ds.variables))
    for n, i in enumerate(cols):
        n_arr = np.array(ds[i])
        print(n, i, n_arr.shape)

    sample_field = ds['WUDI'][0]

    array = np.array([ds['latlim'][0],
                      ds['lonlim'][0],
                      ds['latitude'],
                      ds['longitude'],
                      ds['latlim'][1],
                      ds['lonlim'][1],
                      ds['geo'],
                      region_field,
                      sample_field])

    array = np.transpose(array, (1, 0))

    master_dtypes = {
        'A_lat': float,
        'A_lon': float,
        'M_lat': float,
        'M_lon': float,
        'B_lat': float,
        'B_lon': float,
        'geo': int,
        'eco_region': int,
        'sample': float,
    }

    master_wudi = pd.DataFrame(
        data=array,
        index=index_values,
        columns=column_values
    )

    master_wudi = master_wudi.astype(dtype=master_dtypes)

    for wi, wrow in master_wudi.iterrows():
        check_point = Point(wrow['M_lon'], wrow['M_lat'])
        for ri, rrow in eco_regions.iterrows():
            test_poly = rrow['geometry']
            if test_poly.contains(check_point):
                master_wudi.at[wi, 'eco_region'] = int(ri)
                break

    return master_wudi
    #master_wudi.to_pickle(os.path.join(conf.data_path, 'parsed_wudi_raw.pkl'))


#get eco_regions as dataframe
def parse_eco_regions() -> pd.DataFrame:
    regions = gpd.read_file(os.path.join(conf.data_path, 'MEOW/meow_ecos.shp'))
    med_regions = regions[regions.PROVINCE == "Mediterranean Sea"]
    return med_regions


# create pandas dataframe for nat's netcdf "geonames" csv (pickled)
# source re-adaptation of /Users/sac/Sites/pythonProject/wudi/tests.py.
def parse_geonames() -> pd.DataFrame:
    geonames = np.genfromtxt(os.path.join(conf.data_path, 'geonames.csv'), dtype='str')
    index_values = np.arange(1, geonames.size+1, 1, dtype=int)
    column_values = ['geoname']
    master_geonames = pd.DataFrame(
        data=geonames,
        index=index_values,
        columns=column_values)
    return master_geonames
    #master_geonames.to_pickle(os.path.join(conf.data_path, 'parsed_geonames.pkl'))


# add 'closed' column to geo_locs table
# source re-adaptation of 'update_assert_geometries' in /Users/sac/Sites/pythonProject/wudi/tests-v4.py
def attach_geoms_to_geonames(parsed_wudi_df, parsed_geo_locs_df) -> pd.DataFrame:
    geo = parsed_wudi_df.geo.unique()
    closed = []
    for area in geo:
        resume = parsed_wudi_df.loc[(parsed_wudi_df['geo'] == area)]
        points = [[n, i['A_lon'], i['A_lat'], i['B_lon'], i['B_lat']] for n, i in resume.iterrows()]
        start = Point(points[0][1], points[0][2])
        stend = Point(points[-1][3], points[-1][4])
        closed.append(start.distance(stend) < conf.guide_geom_closed_distance)

    parsed_geo_locs_df.insert(1, "closed", closed, True)
    return parsed_geo_locs_df
    #geolocs.to_pickle("data/master_geonames_mod.pkl")


# build guides master table (beziers et al.).
# source re-adaptation of 'update_build_guides_source' in /Users/sac/Sites/pythonProject/wudi/tests-v4.py
def parse_guides(parsed_wudi_df, parsed_eco_regions_df, parsed_geo_locs_df) -> pd.DataFrame:
    guide_points_table = {
        'shape': [],
        'point': [],
        'term': [],
        'wudi_point': [],
        'place': [],
        'protected_region': [],
        'eco_region': []
    }

    geo = parsed_wudi_df.geo.unique()

    def g_point_validate_region(g_point, eco_regions):
        for n, e_reg in eco_regions.iterrows():
            if e_reg.geometry.contains(g_point):
                return n

    def get_even_wudi_m_path_bezier(points, is_closed=None):

        distance_delta = 0.02
        prev = None
        start = None
        coords = []
        first = None

        for n in range(len(points)):
            A = Point(points[n][1])
            B = Point(points[n][2])
            M = Point(A.x + ((B.x - A.x) / 2), A.y + ((B.y - A.y) / 2))

            if prev is None:
                start = {'a': A, 'b': B, 'm': M}
            else:
                bez = CubicBezier(prev['m'], prev['b'], A, M)
                bverts = bez.calc_curve(granuality=conf.bezier_granularity)
                if first is None:
                    first = bverts[2][0]

                for p in bverts[2]:
                    coords.append(p)

                if n == len(points)-1 and is_closed is not None:
                    bez = CubicBezier(M, B, start['a'], start['m'])
                    bverts = bez.calc_curve(granuality=conf.bezier_granularity)
                    for p in bverts[2]:
                        coords.append(p)
            prev = {'a': A, 'b': B, 'm': M}

        full_str = LineString(coords)
        distances = np.arange(0, full_str.length, distance_delta)
        s_points = [full_str.interpolate(distance) for distance in distances]

        if is_closed is not None:
            s_points.append((s_points[0].x, s_points[0].y))

        mp = LineString(s_points)
        return mp.coords

    for area in geo:
        resume = parsed_wudi_df.loc[(parsed_wudi_df['geo'] == area)]
        guide_points = [[n, (i['A_lon'], i['A_lat']), (i['B_lon'], i['B_lat'])] for n, i in resume.iterrows()]
        guide_is_closed = None if str(parsed_geo_locs_df.iloc[int(area)-1].closed) == 'False' else True

        coords = get_even_wudi_m_path_bezier(guide_points, guide_is_closed)

        for i, cg in enumerate(coords):
            g_index = len(guide_points_table['shape'])
            guide_points_table['shape'].append(int(area))
            guide_points_table['point'].append(None)
            guide_points_table['term'].append(None)
            guide_points_table['wudi_point'].append(None)
            guide_points_table['place'].append(None)
            guide_points_table['protected_region'].append(None)
            guide_points_table['eco_region'].append(None)

            if i == 0:
                guide_points_table['term'][g_index] = 'start'
            if i == len(coords)-1:
                guide_points_table['term'][g_index] = 'end'

            g = Point(cg[0], cg[1], g_index)
            guide_points_table['point'][g_index] = g

            guide_points_table['eco_region'][g_index] = g_point_validate_region(g, parsed_eco_regions_df)

    return pd.DataFrame.from_dict(guide_points_table)


# for wudi and places points, attach to guide points by distance
def attach_guide_points_get_proximity(table, dataframe, cols, col_name) -> pd.DataFrame:
    points_trap = [None] * dataframe.shape[0]
    s_d = conf.bez_point_tolerance[col_name]
    ndf = dataframe

    for n, row in table.iterrows():
        g = row.point
        rf = ndf[[cols[0], cols[1]]][((ndf[cols[0]] > g.x - s_d) & (ndf[cols[0]] < g.x + s_d)) & ((ndf[cols[1]] > g.y - s_d) & (ndf[cols[1]] < g.y + s_d))]

        for j, li in rf.iterrows():
            dp = Point(li[cols[0]], li[cols[1]])
            d = g.distance(dp)
            if points_trap[j] is None or points_trap[j][2] > d:
                points_trap[j] = [n, j, d]

    trapped = [e for e in points_trap if e is not None]
    print('trapped', col_name, len(trapped))

    for t in trapped:
        table.at[t[0], col_name] = int(t[1])

    return table


# for eco_region, attach to guide points by intersection
def attach_guide_points_get_intersection(table, dataframe, form) -> pd.DataFrame:
    points_trap = [None] * table.shape[0]
    pos = []
    for n, row in table.iterrows():
        pos.append([int(row.point.z), row.point.x, row.point.y])
    dpf = pd.DataFrame(pos, columns=['id', 'x', 'y'])

    for rn, row in dataframe.iterrows():
        geom = row.geometry
        b = geom.bounds
        rf = dpf[(dpf.x > b[0]) & (dpf.x < b[2]) & (dpf.y > b[1]) & (dpf.y < b[3])]

        points = []
        for poly in geom.geoms:
            for n, point in rf.iterrows():
                if poly.contains(Point(point.x, point.y)):
                    i = int(point.id)
                    if points_trap[i] is None:
                        points_trap[i] = [[n, rn]]
                    else:
                        points_trap[i].append([n, rn])
                    #points.append(int(point.id))

        print(row.NAME, points)

    final_points = [e for e in points_trap if e is not None]

    for f in final_points:
        table.at[f[0][0], 'protected_region'] = [i[1] for i in f]
        # print(f[0][0], [i[1] for i in f])

    return table


# load depths as dict with custom numpy arrays.
# old school from '/Users/sac/Sites/pythonProject/obspkg/main.py' @ def builder
def parse_depth_points() -> dict:
    depth_points = {
        "data": np.loadtxt(open(os.path.join(conf.data_path, 'bathy_med_tt.csv'), "rb"), delimiter=";", encoding=None, skiprows=0),
        "lons": np.loadtxt(open(os.path.join(conf.data_path, 'bathy_lon_vector_t.csv'), "rb"), delimiter=";", encoding=None, skiprows=0),
        "lats": np.loadtxt(open(os.path.join(conf.data_path, 'bathy_lat_vector_t.csv'), "rb"), delimiter=";", encoding=None, skiprows=0),
        "reso": [10, 6, 2, 1],
        "degs": 60,
        "levels": 4,
        "dimension": 1
    }

    depth_points['origin'] = util.get_data_scale_extents(depth_points)
    return depth_points


# build depth contours as list of dicts with LineStrings.
# old school from '/Users/sac/Sites/pythonProject/obspkg/main.py' @ def build_contour_levels
def parse_contour_levels(points_data, attributes, depth_range, poly_origin) -> tuple:
    contours_all = [[]] * depth_range
    iso_bath_100m = []

    eco_regions_mask = load_eco_regions_mask()

    def contour_getter(data, level):
        f_contours = measure.find_contours(data, level)
        contours = []
        for ep in f_contours:
            ep = LineString(np.flip(ep))
            ep = scale(ep, xfact=1 / 60, yfact=-1 / 60, origin=(0, 0))
            ep = translate(ep, xoff=poly_origin[0], yoff=poly_origin[1])
            ep = ep.intersection(eco_regions_mask)
            contours.append(ep)
        return contours

    for ra in range(depth_range):
        contours_all[ra] = []
        g_data = gaussian_filter(points_data, sigma=attributes["filter"][ra])
        g_range = np.arange(0, attributes["depth_max"], attributes["depth_interval"][ra])
        for i, lv in enumerate(g_range):
            clutch = contour_getter(g_data, -lv)
            contours_all[ra].append({'d': float(lv), 'contours': clutch})
            util.show_progress(f"generate contours {ra} {lv}m", i, len(g_range))

    print('generating iso_bath_100m')
    g_data = gaussian_filter(points_data, sigma=attributes["isobath_filter"])
    iso_bath_100m.append({'d': -100.0, 'contours': contour_getter(g_data, -100.0)})

    return contours_all, iso_bath_100m


# partition guides and regions as new DataFrame
def partition_eco_regions(guides_df, eco_regions_df, geo_names) -> (pd.DataFrame, List):

    def check_segment(seg, guide_points):
        A = seg[0]
        B = seg[-1]
        if guide_points.iloc[A]['term'] == 'start' or guide_points.iloc[B]['term'] == 'start':
            return 1
        if guide_points.iloc[A]['term'] == 'end' or guide_points.iloc[B]['term'] == 'end':
            return 0
        return 2

    ref_shapes = guides_df['shape'].unique()

    ref_regions = guides_df['eco_region'].unique()
    eco_ix = [int(r) for r in ref_regions if not np.isnan(r)]
    eco_regions_ix = eco_regions_df.loc[eco_ix]

    count = 0
    out_data = []
    mast_main_aggregate = []

    for j, e in eco_regions_ix.iterrows():
        out_data.append(f"{e.ECOREGION} ({j})")
        mast = {
            'eco_region_id': j,
            'eco_region_str': e.ECOREGION,
            'eco_region_geom': e.geometry,
            'geo_name_ids': [],
            'geo_name_strs': [],
            'geometries': [],
            'geometry_indices': [],
            'bounds': []
        }
        for h in ref_shapes:

            dhf = guides_df[(guides_df['shape'] == h)]
            shape_data = geo_names.iloc[h-1]

            points_group = []
            for i, g in dhf.iterrows():
                if not np.isnan(g.eco_region) and int(g.eco_region) == j:
                    points_group.append(int(g.point.z))

            groups = []
            for key, value in groupby(enumerate(points_group), lambda x: x[0] - x[1]):
                group = list(map(itemgetter(1), value))
                groups.append([check_segment(group, guides_df), group])

            groups.sort()
            if len(groups) > 1 and bool(shape_data['closed']) is True:
                hatch = ['merged', []]
                for n in groups:
                    [(hatch[1].append(i)) for i in n[1]]
                groups = [hatch]

            if len(groups):
                mast['geo_name_ids'].append(h)
                mast['geo_name_strs'].append(shape_data.geoname)
                geoms = []
                indices = []
                out_data.append(f"\N{HT}{shape_data.geoname} ({h})")
                for i, group in enumerate(groups):
                    dhc = guides_df.iloc[group[1]]
                    out_data.append(f"\N{HT}\N{HT}grp {i} ct({dhc.shape[0]})")
                    points = []
                    for n, g in dhc.iterrows():
                        points.append((round(g.point.x, 4), round(g.point.y, 4)))
                    geoms.append(LineString(points))
                    indices.append(group[1])

                geometry = MultiLineString(geoms)
                gb = geometry.bounds
                mast['geometries'].append(geometry.geoms)
                mast['geometry_indices'].append(indices)
                mast['bounds'].append((box(round(gb[0], 3), round(gb[1], 3), round(gb[2], 3), round(gb[3], 3))))

        mast_main_aggregate.append(mast)

        out_data.append(' ')
        util.show_progress(f"partition_eco_regions", count, eco_regions_ix.shape[0])
        count += 1

    table_dict = {}
    columns = [
        'eco_region_id',
        'eco_region_str',
        'eco_region_geom',
        'geo_name_ids',
        'geo_name_strs',
        'geometries',
        'geometry_indices',
        'bounds'
    ]

    for col in columns:
        table_dict[col] = [m[col] for m in mast_main_aggregate]

    #aggregate bounds for region
    if len(table_dict['bounds']):
        region_bounds = []
        for bounds_group in table_dict['bounds']:
            point_cloud = []
            #fancy foot-work nested list comprehensions
            gb = MultiPoint([(Point(c[0], c[1])) for poly in bounds_group for c in poly.exterior.coords]).bounds

            region_bounds.append(box(round(gb[0], 3), round(gb[1], 3), round(gb[2], 3), round(gb[3], 3)))
        table_dict['eco_region_bounds'] = region_bounds

    table_dict['geo_shape_count'] = [len(x) for x in table_dict['geo_name_ids']]
    eco_regions_table = pd.DataFrame.from_dict(table_dict)
    print(' ')

    return eco_regions_table, out_data


def load_eco_regions_mask() -> Polygon:
    df = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_eco_regions-GeoDataFrame.pkl'))
    region_polys = []
    for j, e in df.iterrows():
        region_polys.append(e.geometry)
    return unary_union(region_polys)


#———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
#FOLLOWING ARE DATABASE (sqlite3) FUNCTIONS
#///Users/sac/Sites/wudi-db

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        print('connected', sqlite3.version)
    except Error as e:
        print(e)
    return conn


def parse_wudi_build_db():
    table_name = 'test-protected'
    conn = create_connection(conf.database_path)
    df = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_protected_regions-DataFrame.pkl'))
    df = df.drop('geometry', axis=1)
    df = df.drop('CENTROID', axis=1)

    df['country'] = df.COUNTRY.apply(', '.join)
    df['region'] = df.MED_REGION.apply(', '.join)

    df = df.drop('COUNTRY', axis=1)
    df = df.drop('MED_REGION', axis=1)


    print(df.info())
    for j, e in df.iterrows():
        print(j,e)

    df.to_sql(table_name, conn, if_exists='replace', index=False)

    conn.close()
    pass


#———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
#FOLLOWING ARE FUNCTIONS FOR FORMATTING
def save_iso_bath_as_raw():
    p_list = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_iso_bath_100m-list.pkl'))
    #list of one entry as dict of contour data
    contours = [util.value_cleaner(x) for x in p_list[0]['contours']]
    filtered = [c for c in contours if c != '[[]]']

    haste = '"raw-isobath-100m",{:s}'.format(','.join(filtered)) + ','

    file_name = 'raw-isobath-100m-1'
    path = os.path.join(conf.static_data_path, f"{file_name}.txt")
    with open(path, "w") as file:
        file.write(haste[:-1])


def save_protected_test():
    df = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_protected_regions-DataFrame.pkl'))


def build_guides_attach_data():
    geo_names = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_geo_names-DataFrame.pkl'))
    eco_regions = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_eco_regions-GeoDataFrame.pkl'))
    wudi = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_wudi-DataFrame.pkl'))
    places = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_places-DataFrame.pkl'))
    protected = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_protected_regions-DataFrame.pkl'))

    print('loaded')
    df = parse_guides(wudi, eco_regions, geo_names)
    print('made guides')
    df = attach_guide_points_get_proximity(df, wudi, ('M_lon', 'M_lat'), 'wudi_point')
    print('updated wudi')
    df = attach_guide_points_get_proximity(df, places, ('lon', 'lat'), 'place')
    print('updated place')
    df = attach_guide_points_get_intersection(df, protected, 'protected_region')
    print('updated protected regions')

    util.save_asset(df, 'parsed_guides')
    #df.to_pickle("data/guide_points_w_wudi_places_protected.pkl")


#———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
#//TODO MAKE THESE proper ƒ's
def tests():

    #
    # test_poly = Polygon(
    #     ((0, 0), (0, 1), (1, 1), (1, 0), (0, 0)),
    #     [
    #         ((0.1, 0.1), (0.1, 0.2), (0.2, 0.2), (0.2, 0.1), (0.1, 0.1)),
    #         ((0.8, 0.8), (0.8, 0.9), (0.9, 0.9), (0.9, 0.8), (0.8, 0.8))
    #     ])
    #
    # print(test_poly.is_valid)
    # test_case_poly_str = util.value_cleaner(test_poly)
    #
    # df = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_eco_regions-GeoDataFrame.pkl'))
    # cols = list(df)
    # col_count = len(cols)+1

    # #add ID column for x-cross
    # haste = '"ID",'+','.join([util.value_cleaner(x) for x in cols]) + ','
    #
    # print(df)
    # print(haste, f'({col_count})')
    # for j, e in df.iterrows():
    #
    #     t_str = str(j)+',{:s}'.format(','.join([util.value_cleaner(x,4,True) for x in e]))+','
    #     haste += t_str
    #     print(t_str)
    #
    # test_case = f'0, 1,"HOTNESS",1000,"test",1000,"totally nowhere",0,0,"hot as hell",{test_case_poly_str},'
    # haste += test_case
    #
    # file_name = 'raw-georegions'
    # path = os.path.join(conf.static_data_path, f"{file_name}-{col_count}.txt")
    # with open(path, "w") as file:
    #     file.write(haste[:-1])

    # #/f = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_wudi-DataFrame.pkl'))
    # df = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_protected_regions-DataFrame.pkl'))
    # #df = df.replace({np.nan: None})  #//works
    # #df = np.trunc(1000 * df) / 1000
    #
    # cols = list(df)
    # col_count = len(cols)
    #
    # haste = ','.join([util.value_cleaner(x) for x in cols])+','
    # print(col_count, haste)
    #
    # for j, e in df.iterrows():
    #     t_str = '{:s}'.format(','.join([util.value_cleaner(x) for x in e]))+','
    #     haste += t_str
    #     print(t_str)
    #
    # file_name = 'raw-protected'
    # path = os.path.join(conf.static_data_path, f"{file_name}-{col_count}.txt")
    # with open(path, "w") as file:
    #     file.write(haste[:-1])


    #
    # d_dict = {}
    # for n in list(df.columns):
    #     d_dict[n] = list(df[n])
    #
    # util.save_asset(d_dict, 'temp')

    #print(type(d_dict))

    #df.to_json(os.path.join(conf.assets_path, 'temp.json'), orient='records', lines=False)

    # parse_wudi
    # parse guides
    # add 'closed' attribute to geonames table
    # ///////////////////////////////////////////////////////////
    # eco_regions = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_eco_regions-GeoDataFrame.pkl'))
    # # print(eco_regions.info())
    # # for a in range(eco_regions.shape[0]):
    # #     print(eco_regions.iloc[a])  #())
    #
    # geo_names = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_geo_names-DataFrame.pkl'))
    # guides = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_guides-DataFrame.pkl'))
    # eco_regions_df, print_stats_data = partition_eco_regions(guides, eco_regions, geo_names)
    # # for d in data:
    # #     print(d)
    # # print(eco_regions_df.dtypes)
    # util.save_asset(eco_regions_df, 'parsed_eco_regions_partitioned')
    # ///////////////////////////////////////////////////////////
    # eco_regions_df = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_eco_regions_partitioned-DataFrame.pkl'))
    # plot_instance = {
    #     'entries': [eco_regions_df.iloc[i] for i in range(eco_regions_df.shape[0])],
    #     'geometry': ['eco_region_geom', 'eco_region_bounds']
    # }
    # util.make_plot([plot_instance])
    # ///////////////////////////////////////////////////////////
    #
    # for n, g in df.iterrows():
    #     for k, v in g.items():
    #         print(k, v, type(v))
    #     print(' ')
    #     #print(g)

    # for a in range(df.shape[0]):
    #     print(df.iloc[a])  #())

    # ///////////////////////////////////////////////////////////
    # eco_regions = parse_eco_regions()
    # util.save_asset(eco_regions, 'parsed_eco_regions')
    # ///////////////////////////////////////////////////////////
    # places = parse_places()
    # util.save_asset(places, 'parsed_places')
    # ///////////////////////////////////////////////////////////
    # protected_regions, map_a_med_regions = parse_protected_regions()
    # util.save_asset(protected_regions, 'parsed_protected_regions')
    # util.save_asset(map_a_med_regions, 'parsed_map_a_med_regions')
    # ///////////////////////////////////////////////////////////
    # n = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_wudi-DataFrame.pkl'))
    # print(n.info())
    # print(n.head())
    # ///////////////////////////////////////////////////////////
    # geo_names = parse_geonames()
    # #util.save_asset(geo_names, 'parsed_geonames')
    #
    # eco_regions = parse_eco_regions()
    # util.save_asset(eco_regions, 'parsed_eco_regions')
    #
    # wudi = parse_wudi(eco_regions)
    # util.save_asset(wudi, 'parsed_wudi')
    #
    # geonames_mixin = parse_append_geoms_to_geonames(wudi, geo_names)
    # util.save_asset(geonames_mixin, 'parsed_geo_names')
    #
    # print(geonames_mixin.info())
    # print(geonames_mixin.head())
    # ///////////////////////////////////////////////////////////
    # path = os.path.join(conf.data_path, 'map_polygon_geom.pkl')
    # print(path)
    # with open(path, "rb") as poly_file:
    #     med_poly = pickle.load(poly_file)
    #     make_plot(med_poly)
    # ///////////////////////////////////////////////////////////
    # depth_points = parse_depth_points()
    # depth_contours, iso_bath = parse_contour_levels(depth_points['data'], conf.contour_ranges, conf.levels_range, depth_points['origin'])
    #
    # # print(depth_contours)
    # util.save_asset(depth_contours, 'parsed_depth_contours')
    # util.save_asset(iso_bath, 'parsed_iso_bath_100m')

    # ///////////////////////////////////////////////////////////
    # n = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_wudi_raw-DataFrame.pkl'))
    # print(n.head(20))
    # print(n.iloc[0])
    # exit()

    # ///////////////////////////////////////////////////////////
    # df = parse_wudi()
    # save_asset(df, 'parsed_wudi_raw')
    # ///////////////////////////////////////////////////////////
    # geom = parse_map_geometry()
    # util.save_asset(geom, 'parsed_map_geometry')
    # ///////////////////////////////////////////////////////////

    # util.value_cleaner('hello')
    # util.value_cleaner(2)
    # util.value_cleaner(2.0)
    # util.value_cleaner(2.6)
    # util.value_cleaner(np.nan)
    # util.value_cleaner(np.ndarray(shape=(2,2), dtype=float, order='F'))
    # util.value_cleaner(np.array([['cats','dogs'],['cats','dogs']]))
    # util.value_cleaner(np.array(['cats','dogs']))
    # util.value_cleaner([[6],[[5,3],2.4567]])
    # util.value_cleaner(["allo?", "bonjour d'avant",['ça marche',"pas l'mal!"]])

    # ///////////////////////////////////////////////////////////
    # p_list = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_iso_bath_100m-list.pkl'))
    # #list of one entry as dict of contour data
    # contours = [util.value_cleaner(x) for x in p_list[0]['contours']]
    # filtered = [c for c in contours if c != '[[]]']
    #
    # haste = '"raw-isobath-100m",{:s}'.format(','.join(filtered)) + ','
    #
    # file_name = 'raw-isobath-100m-1'
    # path = os.path.join(conf.static_data_path, f"{file_name}.txt")
    # with open(path, "w") as file:
    #     file.write(haste[:-1])

    # ///////////////////////////////////////////////////////////
    pass


if __name__ == '__main__':
    #tests()

    parse_wudi_build_db()
    pass
