#!/usr/bin/env python3
import os
import config as conf
import math
import json
from shapely.geometry import box, LineString, Polygon

from typing import List
import pandas as pd
import numpy as np
import utilities as util
import data_parsers as data_parse
from pathlib import Path

whole_map_simplified_levels = []
force_range = conf.levels_range


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
                if any(util.flatten_list(nv)):
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
    whole_map = pd.read_pickle(os.path.join(conf.assets_path, 'v2_map_geometry-MultiPolygon.pkl'))
    datum, stats = util.simplify_multi_poly(whole_map, force_range_limit)
    print(json.dumps(stats, indent=2))
    print('whole_map_simplified_levels loaded')
    return datum


def load_contours():
    return pd.read_pickle(os.path.join(conf.assets_path, 'v2_depth_contours-list.pkl'))


def load_marine_protected_areas():
    df = pd.read_pickle(os.path.join(conf.assets_path, 'v2_protected_regions-DataFrame.pkl'))
    mpa_lines = []
    for n, g in df.iterrows():
        if g['STATUS_ENG'] == 'Designated':
            print(n, g)

    #     if g['STATUS_ENG'] == 'Designated':
    #
    #         part = {'id': g['NAME'], 'geometry': g['geometry']}
    #         mpa_lines.append(part)
    #         #
    #         # rpco = util.poly_s_to_list(g['geometry'])
    #         # print(n, len(rpco))
    #         #
    #         # for r in rpco:
    #         #
    #         #     s_poly = r.simplify(0.001)
    #         #     # poly_levels, mod_trace = util.simplify_multi_poly(r)
    #         #     # print(poly_levels, mod_trace)
    #         #      #;//LineString(s_poly.exterior.coords))
    #         # # if g['STATUS_ENG'] == 'Designated':
    #         # #     print(n, g)
    #
    # util.make_other_plot(mpa_lines)
    exit()
    pass


def save_parsed_map_data(map_range):
    contour_levels = load_contours()
    eco_regions_mask = data_parse.load_eco_regions_mask()
    map_levels = load_map(map_range)
    map_sets = []

    for m, map_level in enumerate(map_levels):
        if m >= force_range:
            break

        p_polys = [p for p in map_level.geoms]
        #DONE: SETUP CLIPS BY ECO REGION. (eliminate brittany and Black Sea)
        p_lines = [LineString(ref.exterior.coords).intersection(eco_regions_mask) for ref in map_level.geoms]

        map_sets.append({'polygons': p_polys, 'line_strings': p_lines, 'contours': contour_levels[m]})
        print('level', m, len(p_polys), len(p_lines))
        # util.make_other_plot([{'id': 0, 'geometry': p_lines}])
        # exit()

    util.save_asset(map_sets, 'v2_sector_map_layers')


def make_sectors():
    print(conf.master_bounds)
    # save_parsed_map_data(force_range)
    # exit()

    whole_map_poly_sets = pd.read_pickle(os.path.join(conf.assets_path, 'v2_sector_map_layers-list.pkl'))

    for deg in conf.master_degree_intervals:
        sector_group = build_sectors(deg)
        print("sectors:", len(sector_group))

        for j, geometry in enumerate(whole_map_poly_sets):
            print('level:', j)
            if j >= force_range:
                break
            for i, sector in enumerate(sector_group):
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

                util.show_progress('sectors', i, len(sector_group))

        #// important
        #[sector.save() for sector in sector_group]

        # util.make_other_plot([{'id': 0, 'geometry': plot_lines}])
        # exit()


if __name__ == '__main__':
    make_sectors()

    # save_parsed_map_data(force_range)

    # load_map()
    # load_marine_protected_areas()
    pass
