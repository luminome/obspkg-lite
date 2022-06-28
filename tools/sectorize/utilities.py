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

from shapely.geometry import Point, box, LineString, Polygon, MultiPolygon
from bokeh.plotting import figure, output_file, show
from bokeh.models import GeoJSONDataSource, ColumnDataSource
from bokeh.models.tools import HoverTool, WheelZoomTool, PanTool, CrosshairTool, LassoSelectTool

from json_encoder import JsonSafeEncoder


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
            json.dump(asset, file, indent=2, cls=JsonSafeEncoder)

    if path is not None:
        status = f"{str(datetime.now())}\n{path} {os.path.getsize(path)/1000}k\n"
        with open(os.path.join(conf.assets_path, 'history.txt'), 'a+') as history:
            history.write(status)

    print(status)


#//should accept list of dict of attributes and shapes. kinda brill atm.
def make_plot(iterable: list):
    # list of grouped datum
    for plot_element in iterable:
        plot_list = plot_element['entries']
        plot_geometry_flags = plot_element['geometry']
        entries = [dict(p) for p in plot_list]
        plot_data_sources = []
        print(len(plot_list))
        for e_dict in entries:
            plot_data_sources.append(e_dict)
            print(e_dict)
            for geometry in plot_geometry_flags:
                print(type(e_dict[geometry]))

        print(plot_geometry_flags)





    exit()
    plot_label = None





    for plot_layer in plot_object:
        plot_source = None
        if type(plot_object) is MultiPolygon:
            x, y, poly_id, area = [], [], [], []
            for i, polygon in enumerate(plot_object.geoms):
                if type(polygon.boundary) == LineString:
                    x.append(list(polygon.exterior.coords.xy[0]))
                    y.append(list(polygon.exterior.coords.xy[1]))
                    poly_id.append(i)
                    area.append(str(round(polygon.area, 3)))

            plot_source = ColumnDataSource(dict(x=x, y=y, id=poly_id, area=area))
            plot_label = MultiPolygon

        if type(plot_object) is list:
            #//assume list of polygons
            x, y, poly_id, area = [], [], [], []
            for i, polygon in enumerate(plot_object):
                x.append(list(polygon.exterior.coords.xy[0]))
                y.append(list(polygon.exterior.coords.xy[1]))
                poly_id.append(i)
                area.append(str(round(polygon.area, 3)))

            plot_source = ColumnDataSource(dict(x=x, y=y, id=poly_id, area=area))
            plot_label = Polygon

    p = figure(title=str(plot_label),
               sizing_mode='stretch_both',
               match_aspect=True,
               active_scroll="wheel_zoom",
               lod_threshold=None)

    plot = p.patches(
        'x',
        'y',
        source=plot_source,
        fill_alpha=0.5,
        line_color="black",
        line_width=0.5)

    p.add_tools(HoverTool(renderers=[plot], tooltips=[('id', '@id'), ('area', '@area')]))

    show(p)
