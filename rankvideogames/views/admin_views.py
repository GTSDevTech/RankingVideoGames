from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render
from django.db.models import Count
from rankvideogames.models import Usuario, Category, Ranking, VideoGame, Review
from rankvideogames.services.ranking_stats import build_position_stats, build_global_ranking



@login_required
def go_admin(request):
    qu = Usuario.objects.all().exclude(role=1).order_by("username")

    paginator = Paginator(qu, 10)
    page_number = request.GET.get("page")
    page_user = paginator.get_page(page_number)

    usernames = [u.username for u in page_user.object_list]

    if not usernames:
        return render(request, "users.html", {"page_user": page_user})

    rankings_map = {
        row["user"]: row["c"]
        for row in (
            Ranking.objects
            .filter(user__in=usernames)
            .values("user")
            .annotate(c=Count("_id"))
        )
    }

    reviews_map = {
        row["user"]: row["c"]
        for row in (
            Review.objects
            .filter(user__in=usernames)
            .values("user")
            .annotate(c=Count("_id"))
        )
    }

    for u in page_user.object_list:
        u.rankings_count = rankings_map.get(u.username, 0)
        u.ratings_count = reviews_map.get(u.username, 0)

    return render(request, "users.html", {
        "page_user": page_user,
    })


@login_required
def go_admin_stats(request):
    category_code = int(request.GET.get("category", 1))
    qs_rankings = Ranking.objects.filter(categoryCode=category_code)

    stats = build_position_stats(qs_rankings)

    game_ids = list(stats.keys())
    games_map = {g.id: g for g in VideoGame.objects.filter(id__in=game_ids)}

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


@login_required
def go_admin_global_ranking(request):
    limit = int(request.GET.get("limit", 50))

    qs_rankings = Ranking.objects.all()  # GLOBAL
    stats = build_global_ranking(qs_rankings)

    game_ids = list(stats.keys())
    games_map = {g.id: g for g in VideoGame.objects.filter(id__in=game_ids).only("id", "name", "cover_url")}

    rows = []
    for gid, s in stats.items():
        g = games_map.get(gid)
        rows.append({
            "game_id": gid,
            "name": g.name if g else f"Game {gid}",
            "cover": g.cover_url if (g and g.cover_url) else "",
            "points": s["points"],
            "appearances": s["appearances"],
            "pos_avg": round(s["pos_avg"], 2) if s["pos_avg"] is not None else None,
            "pos_counts": s["pos_counts"],
        })

    rows.sort(key=lambda x: (-x["points"], -x["appearances"], x["pos_avg"] or 99, x["game_id"]))
    limit = int(request.GET.get("limit", 50))
    limit_options = [25, 50, 100]

    return render(request, "admin_global_ranking.html", {
        "rows": rows,
        "limit": limit,
        "limit_options": limit_options,
    })