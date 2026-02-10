from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render

from rankvideogames.models import Usuario, Category, Ranking, VideoGame
from rankvideogames.services.ranking_stats import build_position_stats



@login_required
def go_admin(request):

    qu = Usuario.objects.all().exclude(role=1)
    paginator = Paginator(qu, 10)
    page_number = request.GET.get("page")
    page_user = paginator.get_page(page_number)

    return render(request, "users.html", {
        "page_user": page_user,
    })



@login_required
def go_admin_stats(request):
    category_code = int(request.GET.get("category", 1))

    qs_rankings = Ranking.objects.filter(categoryCode=category_code)
    stats = build_position_stats(qs_rankings)

    game_ids = list(stats.keys())
    games = VideoGame.objects.filter(id__in=game_ids)
    games_map = {g.id: g for g in games}

    rows = []
    for gid, s in stats.items():
        g = games_map.get(gid)
        rows.append({
            "game_id": gid,
            "name": g.name if g else f"Game {gid}",
            "cover": g.cover_url if g else "",
            "votes": s["votes"],
            "pos_avg": round(s["pos_avg"], 2) if s["pos_avg"] else None,
            "pos_counts": s["pos_counts"],
        })

    rows.sort(key=lambda x: (-x["votes"], x["pos_avg"] or 99))

    categories = Category.objects.order_by("code")

    return render(request, "admin_stats.html", {
        "rows": rows,
        "categories": categories,
        "category_code": category_code,
    })
