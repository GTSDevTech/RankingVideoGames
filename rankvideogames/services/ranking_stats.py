

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