#!/usr/bin/env python3
from typing import List
import json
import math
import os
from datetime import datetime
import config as conf
import numpy as np
import pandas as pd
import geopandas as gpd
import pickle

import itertools

from shapely.geometry import Point, box, LineString, Polygon, MultiPolygon, MultiLineString, LinearRing
from bokeh.plotting import figure, output_file, show
from bokeh.models import GeoJSONDataSource, ColumnDataSource
from bokeh.models.tools import HoverTool, WheelZoomTool, PanTool, CrosshairTool, LassoSelectTool

from json_encoder import JsonSafeEncoder


def polygon_to_serialized_obj(poly, decimal_places):
    def flatten_coords(coords, dec):
        arr = [[round(c[0], dec), round(c[1], dec)] for c in coords]
        return list(itertools.chain(*arr))

    out = flatten_coords(poly.exterior.coords, decimal_places)
    ins = [flatten_coords(interior.coords, decimal_places) for interior in poly.interiors]

    return {'out': out, 'in': ins}


def value_cleaner(obj, decimal_places=4):
    obj_str = None
    f_fmt = '{:.%if}' % decimal_places

    def as_string(s):
        return '\"{:s}\"'.format(s)

    def from_list(s):
        if isinstance(s, str):
            return as_string(s)
        else:
            return f_fmt.format(s)

    if isinstance(obj, str):
        obj_str = as_string(obj)
    if isinstance(obj, type(np.nan)):
        obj_str = 'null'
    if isinstance(obj, int):
        obj_str = str(obj)
    if isinstance(obj, float):
        if obj.is_integer():
            obj_str = str(int(obj))
        elif np.isnan(obj):
            obj_str = 'null'
        else:
            obj_str = f_fmt.format(obj)
    if isinstance(obj, List) or isinstance(obj, np.ndarray):

        obj_str = '[{:s}]'.format(','.join([from_list(x) for x in obj]))

    if isinstance(obj, type(np.ndarray)):
        obj_str = f'ndarray({len(obj)})'
    if isinstance(obj, MultiPolygon):
        obj_str = as_string(obj.__class__.__name__)
    if isinstance(obj, Point):
        obj_str = as_string(obj.__class__.__name__)
    if isinstance(obj, Polygon):
        obj_str = str(polygon_to_serialized_obj(obj, decimal_places)).replace(" ", "")  #;//as_string(obj.__class__.__name__)

    if obj_str is None:
        print(obj, str(obj.__class__))
        return 'null'
    else:
        return obj_str


def show_progress(item_name, count, total):
    if total > 0:
        pit = math.ceil((count / (total-1)) * 100)
    else:
        pit = 'NaN'
    print(f"\r{item_name} {pit}% complete", end='')


def normalize_val(val, mi, ma):
    return (val - mi) / (ma - mi)


def get_data_scale_extents(data_packet):
    d = data_packet['data']
    lo = data_packet['lons']
    la = data_packet['lats']
    return lo[0], la[0]


def poly_s_to_list(reso, min_length=0.0) -> List:
    result = []
    if reso.type == 'MultiPolygon':
        result = [line for line in reso.geoms if line.length > min_length]
    elif reso.type == 'Polygon':
        if reso.length > min_length:
            result.append(reso)
    return result


def save_asset(asset, file_name):
    class_name = type(asset).__name__.split('.')[-1]
    print(class_name, type(asset))
    path, status = None, None

    if type(asset) in [pd.DataFrame, gpd.GeoDataFrame]:
        path = os.path.join(conf.assets_path, f"{file_name}-{class_name}.pkl")
        asset.to_pickle(path)

    if type(asset) in [list, MultiPolygon]:
        path = os.path.join(conf.assets_path, f"{file_name}-{class_name}.pkl")
        with open(path, "wb") as file:
            pickle.dump(asset, file, pickle.HIGHEST_PROTOCOL)

    if type(asset) is dict:
        path = os.path.join(conf.assets_path, f"{file_name}-{class_name}.json")
        with open(path, "w") as file:
            json.dump(asset, file, cls=JsonSafeEncoder)  #, indent=2,

    if path is not None:
        status = f"{str(datetime.now())}\n{path} {os.path.getsize(path)/1000}k\n"
        with open(os.path.join(conf.assets_path, 'history.txt'), 'a+') as history:
            history.write(status)

    print(status)


#//should accept list of dict of attributes and shapes. kinda brill atm.
def make_plot(iterable: list, plot_label=None):

    p = figure(title=str(plot_label),
               sizing_mode='stretch_both',
               match_aspect=True,
               active_scroll="wheel_zoom",
               lod_threshold=None)

    # list of grouped datum
    for plot_element in iterable:
        plot_list = plot_element['entries']
        plot_geometry_flags = plot_element['geometry']
        entries = [dict(p) for p in plot_list]
        plot_data_sources = {}
        print(len(plot_list))
        for geometry in plot_geometry_flags:
            x, y, poly_id, area = [], [], [], []
            for i, e_dict in enumerate(entries):
                polygon = e_dict[geometry]
                x.append(list(polygon.exterior.coords.xy[0]))
                y.append(list(polygon.exterior.coords.xy[1]))
                poly_id.append(i)
                area.append(str(round(polygon.area, 3)))

                print(type(polygon))

            plot_data_sources[geometry] = ColumnDataSource(dict(x=x, y=y, id=poly_id, area=area))

        print(plot_geometry_flags)

        for k, v in plot_data_sources.items():
            plot = p.patches(
                'x',
                'y',
                source=v,
                fill_alpha=0.5,
                line_color="black",
                line_width=0.5)

            p.add_tools(HoverTool(renderers=[plot], tooltips=[('id', '@id'), ('area', '@area')]))

    show(p)

    exit()
    # plot_label = None
    # for plot_layer in plot_object:
    #     plot_source = None
    #     if type(plot_object) is MultiPolygon:
    #         x, y, poly_id, area = [], [], [], []
    #         for i, polygon in enumerate(plot_object.geoms):
    #             if type(polygon.boundary) == LineString:
    #                 x.append(list(polygon.exterior.coords.xy[0]))
    #                 y.append(list(polygon.exterior.coords.xy[1]))
    #                 poly_id.append(i)
    #                 area.append(str(round(polygon.area, 3)))
    #
    #         plot_source = ColumnDataSource(dict(x=x, y=y, id=poly_id, area=area))
    #         plot_label = MultiPolygon

