#!/usr/bin/env python3
import os
import config as conf
import math
import json
from shapely.geometry import box, LineString
from typing import List
import pandas as pd
import numpy as np
import utilities as util
from pathlib import Path
whole_map_simplified_levels = []


class Sector:
    def __init__(self, s_id, bounding_box, loc, degree_scale):
        self.s_id = s_id
        self.box = bounding_box
        self.path = f"Sector-{s_id}"
        self.degree_scale = degree_scale
        self.data_layers = {}
        self.loc = loc

    def save(self):
        s_path = os.path.join(conf.static_data_path, f"deg_{str(self.degree_scale).replace('.', '_')}", self.path)
        Path(s_path).mkdir(parents=True, exist_ok=True)
        bytes_saved = 0
        meta = {}
        for k, v in self.data_layers.items():
            meta[k] = []
            for nk, nv in v.items():
                if any(nv):
                    meta[k].append(int(nk))
                    sector_asset_path = os.path.join(s_path, f"{k}-{nk}.json")
                    with open(sector_asset_path, 'w') as fp:
                        json.dump(nv, fp)
                    bytes_saved += os.path.getsize(sector_asset_path)

        meta_asset_path = os.path.join(s_path, "meta.json")
        with open(meta_asset_path, 'w') as fp:
            json.dump(meta, fp, indent=2)
        print(self.path, 'saved', f"{bytes_saved/1000}k")

    def add_data(self, level: int, label: str, flat_coords: list):
        if label not in self.data_layers.keys():
            self.data_layers[label] = {}
        self.data_layers[label][str(level)] = flat_coords


def init_sector(num, m_wid, m_deg, m_bnd) -> Sector:
    y = math.floor(num / m_wid)
    x = num % m_wid
    sector_box = box(
        m_bnd[0] + x * m_deg,
        m_bnd[3] - y * m_deg,
        m_bnd[0] + x * m_deg + m_deg,
        m_bnd[3] - y * m_deg - m_deg)
    sector_tuple = (m_bnd[0] + (x * m_deg), m_bnd[3] - (y * m_deg),)
    return Sector(num, sector_box, sector_tuple, m_deg)


def build_sectors(m_deg) -> List:
    width = math.ceil(conf.master_bounds[1] * (1 / m_deg))
    height = math.ceil(conf.master_bounds[2] * (1 / m_deg))
    sector_count = width * height
    print("sector instance count", sector_count)
    return [init_sector(n, width, m_deg, conf.master_bounds[0]) for n in range(int(sector_count))]


def load_map(force_range_limit=None):
    whole_map = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_map_geometry-MultiPolygon.pkl'))
    datum, stats = util.simplify_multi_poly(whole_map, force_range_limit)
    print(json.dumps(stats, indent=2))
    print('whole_map_simplified_levels loaded')
    return datum


def load_contours():
    return pd.read_pickle(os.path.join(conf.assets_path, 'parsed_depth_contours-list.pkl'))


def save_parsed_map_data(map_range):
    contour_levels = load_contours()
    map_levels = load_map(map_range)
    map_sets = []

    for m, map_level in enumerate(map_levels):
        if m >= force_range:
            break
        p_polys = [p for p in map_level.geoms]
        p_lines = [LineString(ref.exterior.coords) for ref in map_level.geoms]

        map_sets.append({'polygons': p_polys, 'line_strings': p_lines, 'contours': contour_levels[m]})
        print('level', m, len(polys), len(lines))

    util.save_asset(map_sets, 'parsed_sector_map_layers')


if __name__ == '__main__':
    print(conf.master_bounds)
    force_range = conf.levels_range
    #// save_parsed_map_data(force_range)
    whole_map_poly_sets = pd.read_pickle(os.path.join(conf.assets_path, 'parsed_sector_map_layers-list.pkl'))

    for deg in conf.master_degree_intervals:
        sector_group = build_sectors(deg)
        print("sectors:", len(sector_group))
        for i, sector in enumerate(sector_group):
            print("sector", i)
            for j, geometry in enumerate(whole_map_poly_sets):
                if j >= force_range:
                    break
                relevant_indices = [r for (r, k) in enumerate(geometry['polygons']) if k.intersects(sector.box)]
                polys = [sector.box.intersection(geometry['polygons'][p]) for p in relevant_indices]
                lines = [sector.box.intersection(geometry['line_strings'][p]) for p in relevant_indices]

                contour_set = []
                for contour_depth in geometry['contours']:
                    relevant_indices = [r for (r, k) in enumerate(contour_depth['contours']) if k.intersects(sector.box)]
                    contours = [sector.box.intersection(contour_depth['contours'][p]) for p in relevant_indices]
                    if len(contours):
                        contour_set.append({'d': contour_depth['d'], 'line_strings': [util.geometry_to_coords(fp) for fp in contours]})

                sector.add_data(j, 'polygons', [util.geometry_to_coords(fp) for fp in polys])
                sector.add_data(j, 'line_strings', [util.geometry_to_coords(fp) for fp in lines])
                sector.add_data(j, 'contours', contour_set)

            sector.save()
