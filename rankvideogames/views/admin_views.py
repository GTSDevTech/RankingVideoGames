from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Avg, Count
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

    stats = build_global_ranking(qs_rankings)

    game_ids = list(stats.keys())
    games_map = {g.id: g for g in VideoGame.objects.filter(id__in=game_ids)}

    rows = []
    for gid, s in stats.items():
        g = games_map.get(gid)
        rows.append({
            "game_id": gid,
            "name": g.name if g else f"Game {gid}",
            "cover": g.cover_url if (g and g.cover_url) else "",
            "points": s["points"],                 
            "votes": s["appearances"],            
            "pos_avg": round(s["pos_avg"], 2) if s["pos_avg"] is not None else None,
            "pos_counts": s["pos_counts"],
        })

    rows.sort(key=lambda x: (-x["points"], -x["votes"], x["pos_avg"] or 99, x["game_id"]))

    categories = Category.objects.order_by("code")

    return render(request, "admin_stats.html", {
        "rows": rows,
        "categories": categories,
        "category_code": category_code,
    })


@login_required
def go_admin_global_ranking(request):
    limit = int(request.GET.get("limit", 50))

    qs_rankings = Ranking.objects.all()  
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
    

@login_required
def go_admin_top_rated(request):
 
    page = int(request.GET.get("page", 1))
    per_page = int(request.GET.get("per_page", 50))
    per_page = max(10, min(per_page, 200))

    qs = (
        Review.objects
        .values("videoGameCode")
        .annotate(
            avg_rating=Avg("rating"),
            votes=Count("_id"),
        )
        .filter(votes__gt=0)
        .order_by("-avg_rating", "-votes", "videoGameCode")
    )

    paginator = Paginator(qs, per_page)
    page_obj = paginator.get_page(page)

    
    game_ids = [row["videoGameCode"] for row in page_obj.object_list]
    games_map = {
        g.id: g
        for g in VideoGame.objects.filter(id__in=game_ids).only("id", "name", "cover_url")
    }

    rows = []
    for row in page_obj.object_list:
        gid = row["videoGameCode"]
        g = games_map.get(gid)
        rows.append({
            "game_id": gid,
            "name": g.name if g else f"Game {gid}",
            "cover": g.cover_url if (g and g.cover_url) else "",
            "avg_rating": round(float(row["avg_rating"] or 0), 2),
            "votes": int(row["votes"] or 0),
        })

    per_page_options = [25, 50, 100, 200]

    return render(request, "admin_top_rated.html", {
        "rows": rows,
        "page_obj": page_obj,
        "per_page": per_page,
        "per_page_options": per_page_options,
    })


@login_required
def admin_game_comments_json(request):
    game_id = int(request.GET.get("game", "0") or "0")
    offset = int(request.GET.get("offset", "0") or "0")
    limit = int(request.GET.get("limit", "20") or "20")
    limit = max(5, min(limit, 50))

    if not game_id:
        return JsonResponse({"items": [], "count": 0, "avg_rating": None, "has_more": False})

    base_qs = Review.objects.filter(videoGameCode=game_id)

    meta = base_qs.aggregate(
        avg_rating=Avg("rating"),
        count=Count("_id"),
    )

    qs = base_qs.order_by("-reviewDate")[offset:offset + limit]

    items = []
    for r in qs:
        items.append({
            "user": r.user,
            "rating": r.rating,
            "comments": r.comments,
            "reviewDate": r.reviewDate.isoformat() if r.reviewDate else "",
        })

    total = int(meta["count"] or 0)
    has_more = (offset + limit) < total

    return JsonResponse({
        "avg_rating": round(float(meta["avg_rating"]), 2) if meta["avg_rating"] is not None else None,
        "count": total,
        "items": items,
        "has_more": has_more,
    })