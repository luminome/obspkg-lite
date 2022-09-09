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

mod_trace = {}
formatter = {'set': ''}


def flatten_list(element):
    return sum(map(flatten_list, element), []) if isinstance(element, list) else [element]
    # see notes.


def flatten_coords(coords, dec):
    arr = [[round(c[0], dec), round(c[1], dec)] for c in coords]
    return list(itertools.chain(*arr))
    #return seq[0] if len(seq) else seq


#for complex polygons w/ins and outs.
def polygon_to_serialized_obj(poly, decimal_places):
    out = flatten_coords(poly.exterior.coords, decimal_places)
    ins = [flatten_coords(interior.coords, decimal_places) for interior in poly.interiors]
    return {'out': out, 'in': ins}


def geometry_to_coords(geom, decimal_places=4):
    def getter(element):
        if element.type in ['Polygon']:
            return flatten_coords(element.exterior.coords, decimal_places)
        if element.type in ['LineString']:
            return flatten_coords(element.coords, decimal_places)

    if geom.type == 'MultiPolygon' or geom.type == 'MultiLineString':
        return [getter(element) for element in geom.geoms]
    else:
        return [getter(geom)]


def value_floated(obj, fmt):
    if obj.__class__ == int:
        return obj
    elif obj.is_integer():
        return int(obj)
    elif np.isnan(obj):
        return 'null'
    else:
        return float(fmt.format(obj))


def value_as_string(s):
    return '\"{:s}\"'.format(s)


def value_from_list(s, fmt=None):
    if fmt is None:
        fmt = formatter['set']
    if s.__class__ == str:
        return s  #value_as_string(s)
    elif s.__class__ == float or s.__class__ == int:
        return value_floated(s, fmt)


def value_in_place(s):
    return list(map(value_in_place, s)) if isinstance(s, list) else value_from_list(s)


# VALUE CLEANER FOR TEXT-ASSETS
def value_cleaner(obj, decimal_places=4, special_poly=None):
    # global format
    obj_cls = obj.__class__
    obj_str = None
    f_fmt = '{:.%if}' % decimal_places
    formatter['set'] = f_fmt

    print(obj_cls)

    if obj_cls == str:
        obj_str = value_as_string(obj)

    if obj_cls == int:
        obj_str = obj

    if obj_cls == float:
        obj_str = value_floated(obj, f_fmt)

    if obj_cls == List or obj_cls == tuple or obj_cls == list:
        obj_str = value_in_place(obj)

    if obj_cls == np.ndarray:
        float_fmt = ['float64', 'float32']
        if obj.dtype in float_fmt:
            obj = np.round(obj, decimal_places)
        obj_str = str(obj.tolist()).replace("'", "\"")

    if obj_cls == MultiPolygon:
        obj_str = value_as_string(obj.__class__.__name__)

    if obj_cls == Polygon and special_poly:
        obj_str = str(polygon_to_serialized_obj(obj, decimal_places)).replace(" ", "")

    if obj_cls == Polygon or obj_cls == LineString or obj_cls == MultiPolygon or obj_cls == MultiLineString:
        obj_str = str(geometry_to_coords(obj, decimal_places)).replace(" ", "")

    if obj_str is None:
        print('no cleaner for', str(obj.__class__))
        return 'null'
    else:
        #print(obj_str)
        return obj_str


def db_value_floated(obj, fmt):
    #print(obj.__class__.__name__)
    if obj.__class__ == int:
        return str(obj)
    elif obj.is_integer():
        return str(int(obj))
    elif np.isnan(obj):
        return 'null'
    else:
        return fmt.format(obj)


def db_make_title(string):
    return string.title()


def db_value_cleaner(obj, precision, o_type):
    obj_cls = obj.__class__
    obj_str = None
    formatter['set'] = '{:.%if}' % precision
    fmt = formatter['set']
    print(obj.__class__.__name__)

    if obj_cls == Point:
        cale = [round(obj.x, precision), round(obj.y, precision)]
        return ",".join([fmt.format(c) for c in cale])

    if obj_cls == list:
        if o_type == 'number':
            return ",".join([db_value_floated(c, fmt) for c in obj])
        if o_type == 'string':
            return ",".join(obj)
            pass

    if obj_cls == np.ndarray:
        return ",".join([db_value_floated(c, fmt) for c in obj.tolist()])

    if obj_cls == float:
        return db_value_floated(obj, fmt)

    if obj_cls == int:
        return obj
    #return obj.__class__.__name__+' '+str(arg)


def show_progress(item_name, count, total):
    if total > 0:
        pit = math.ceil((count / (total-1)) * 100)
    else:
        pit = 'NaN'

    if count == total-1:
        print(f"\r{item_name} completed")
    else:
        print(f"\r{item_name} {pit}% complete", end='')


def normalize_val(val, mi, ma):
    return (val - mi) / (ma - mi)


def get_data_scale_extents(data_packet):
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


def save_asset(asset, file_name, alt_path=None):
    class_name = type(asset).__name__.split('.')[-1]
    print(class_name, type(asset))
    asset_path, path, status = None, None, None

    if alt_path is None:
        asset_path = conf.assets_path
    else:
        asset_path = alt_path

    if type(asset) in [np.ndarray, np.array]:
        path = os.path.join(asset_path, f"{file_name}-{class_name}.npy")
        np.save(str(path), asset, allow_pickle=True)

    if type(asset) in [np.ma.core.MaskedArray]:
        path = os.path.join(asset_path, f"{file_name}-{class_name}.npy")
        b = {'data': asset}
        np.save(str(path), b, allow_pickle=True)

    if type(asset) in [pd.DataFrame, gpd.GeoDataFrame]:
        path = os.path.join(asset_path, f"{file_name}-{class_name}.pkl")
        asset.to_pickle(path)

    if type(asset) in [list, MultiPolygon]:
        path = os.path.join(asset_path, f"{file_name}-{class_name}.pkl")
        with open(path, "wb") as file:
            pickle.dump(asset, file, pickle.HIGHEST_PROTOCOL)

    if type(asset) is dict:
        path = os.path.join(asset_path, f"{file_name}-{class_name}.json")
        with open(path, "w") as file:
            json.dump(asset, file, cls=JsonSafeEncoder)  #, indent=2,

    if path is not None:
        status = f"{str(datetime.now())}\n{path} {os.path.getsize(path)/1000}k\n"
        with open(os.path.join(asset_path, 'history.txt'), 'a+') as history:
            history.write(status)

    print(status)


def simplify_multi_poly(source_poly, f_range=None) -> tuple:
    #// simplest -> most complex
    s_range = conf.levels_range-1  # if f_range is None else f_range-1

    area_limits = conf.area_limits
    simp_limits = conf.simp_limits

    simplifications = np.linspace(area_limits[0], area_limits[1], s_range)
    area_limits = np.linspace(simp_limits[0], simp_limits[1], s_range)
    mod_trace['simplify_multi_poly'] = {'simplifications': list(simplifications), 'area_limits': list(area_limits)}

    poly_levels = []

    for b in range(s_range):
        this_map = []
        for i, poly in enumerate(source_poly.geoms):
            simp_poly = poly.simplify(simplifications[b])
            if simp_poly.area >= area_limits[b]:
                this_map.append(simp_poly)

        poly_levels.append(MultiPolygon(this_map))

        if s_range > 1:
            show_progress('simplify_multi_poly', b, s_range)

    poly_levels.append(source_poly)

    for i, source_multi_poly in enumerate(poly_levels):
        mod_trace['simplify_multi_poly'][f'result-{i}'] = [
            f'{len(source_multi_poly.geoms)} polygons',
            f'{sum([len(p.exterior.coords) for p in source_multi_poly.geoms])} coordinates'
        ]

    return poly_levels, mod_trace


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


def make_other_plot(iterable: list, plot_label=None):
    p = figure(title=str(plot_label),
               # sizing_mode='stretch_both',
               # sizing_mode='stretch_width',
               match_aspect=True,
               active_scroll="wheel_zoom",
               lod_threshold=None)

    # list of grouped datum
    plot_data_sources = {}

    for plot_element in iterable:
        el_id = plot_element['id']
        geoms = plot_element['geometry']
        x, y, poly_id, line_id, area, line_x, line_y, length, line_color, color = [], [], [], [], [], [], [], [], [], []

        for i, geom in enumerate(geoms):
            print(type(geom), geom.type)
            poly_load = [geom]
            t_color = 'blue'
            if geom.type == 'MultiPolygon' or geom.type == 'MultiLineString':
                t_color = 'black'
                poly_load = geom.geoms

            for element in poly_load:
                print(element.type)
                if element.type in ['Polygon']:
                    x.append(list(element.exterior.coords.xy[0]))
                    y.append(list(element.exterior.coords.xy[1]))
                    poly_id.append(i)
                    area.append(str(round(element.area, 3)))
                    color.append(t_color)

                if element.type in ['LineString']:
                    line_id.append(i)
                    line_color.append(t_color)
                    line_x.append(list(element.coords.xy[0]))
                    line_y.append(list(element.coords.xy[1]))
                    length.append(element.length)

        plot_data_sources[el_id] = {'fills': ColumnDataSource(dict(x=x, y=y, id=poly_id, area=area, color=color)), 'lines': []}
        plot_data_sources[el_id]['lines'] = ColumnDataSource(dict(x=line_x, y=line_y, id=line_id, color=line_color, length=length))

    for k, v in plot_data_sources.items():
        fillplot = p.patches(
            'x',
            'y',
            source=v['fills'],
            fill_color="color",
            fill_alpha=0.5,
            line_color=None
        )

        lineplot = p.multi_line(
            'x',
            'y',
            source=v['lines'],
            line_color="color",
            line_width=1.0
        )

        p.add_tools(HoverTool(renderers=[fillplot], tooltips=[('id', '@id'), ('area', '@area')]))
        p.add_tools(HoverTool(renderers=[lineplot], tooltips=[('id', '@id'), ('length', '@length')]))

    show(p)




    #
    #
    #     plot_list = plot_element['entries']
    #     plot_geometry_flags = plot_element['geometry']
    #     entries = [dict(p) for p in plot_list]
    #
    #     print(len(plot_list))
    #
    #     for geometry in plot_geometry_flags:
    #
    #         x, y, poly_id, area = [], [], [], []
    #         for i, e_dict in enumerate(entries):
    #             polygon = e_dict[geometry]
    #             x.append(list(polygon.exterior.coords.xy[0]))
    #             y.append(list(polygon.exterior.coords.xy[1]))
    #             poly_id.append(i)
    #             area.append(str(round(polygon.area, 3)))
    #
    #             print(type(polygon))
    #
    #         plot_data_sources[geometry] = ColumnDataSource(dict(x=x, y=y, id=poly_id, area=area))
    #
    #     print(plot_geometry_flags)
    #
    #     for k, v in plot_data_sources.items():
    #         plot = p.patches(
    #             'x',
    #             'y',
    #             source=v,
    #             fill_alpha=0.5,
    #             line_color="black",
    #             line_width=0.5)
    #
    #         p.add_tools(HoverTool(renderers=[plot], tooltips=[('id', '@id'), ('area', '@area')]))
    #
    # show(p)
    #
    # exit()
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

