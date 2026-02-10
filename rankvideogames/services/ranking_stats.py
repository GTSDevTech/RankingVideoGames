

from collections import defaultdict

def build_position_stats(qs_rankings):
    """
    game_id -> votes + media posición + conteo por posiciones (1..5)
    """
    acc_votes = defaultdict(int)
    acc_pos_sum = defaultdict(int)
    acc_pos_counts = defaultdict(lambda: defaultdict(int))

    for rk in qs_rankings:
        rating = rk.rating or []
        for idx, game_id in enumerate(rating):
            if game_id is None:
                continue
            gid = int(game_id)
            pos = idx + 1  # 1..5
            acc_votes[gid] += 1
            acc_pos_sum[gid] += pos
            acc_pos_counts[gid][pos] += 1

    out = {}
    for gid, votes in acc_votes.items():
        pos_sum = acc_pos_sum[gid]
        out[gid] = {
            "votes": votes,
            "pos_sum": pos_sum,
            "pos_avg": (pos_sum / votes) if votes else None,
            "pos_counts": {p: acc_pos_counts[gid].get(p, 0) for p in range(1, 6)},
        }
    return out

from collections import defaultdict
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from rankvideogames.models import Ranking, VideoGame


def build_global_ranking(qs_rankings):
    """
      game_id -> {
      points: int,
      appearances: int,
      pos_sum: int,
      pos_avg: float,
      pos_counts: {1..5}
    }
    Pesos: pos1=5, pos2=4, pos3=3, pos4=2, pos5=1
    """
    weights = {1: 5, 2: 4, 3: 3, 4: 2, 5: 1}

    appearances = defaultdict(int)
    points = defaultdict(int)
    pos_sum = defaultdict(int)
    pos_counts = defaultdict(lambda: defaultdict(int))

    for rk in qs_rankings:
        rating = rk.rating or []
        # seguridad: 1 aparición por ranking (por si hay duplicados raros)
        seen_in_this_ranking = set()

        for idx, game_id in enumerate(rating):
            if game_id is None:
                continue
            gid = int(game_id)
            pos = idx + 1
            if pos < 1 or pos > 5:
                continue

            points[gid] += weights[pos]
            pos_sum[gid] += pos
            pos_counts[gid][pos] += 1

            if gid not in seen_in_this_ranking:
                appearances[gid] += 1
                seen_in_this_ranking.add(gid)

    out = {}
    for gid in points.keys():
        app = appearances[gid]
        out[gid] = {
            "points": int(points[gid]),
            "appearances": int(app),
            "pos_sum": int(pos_sum[gid]),
            "pos_avg": (pos_sum[gid] / app) if app else None,
            "pos_counts": {p: pos_counts[gid].get(p, 0) for p in range(1, 6)},
        }
    return out