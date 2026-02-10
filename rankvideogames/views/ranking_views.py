import json
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.contrib import messages

from rankvideogames.models import VideoGame, Category, Ranking


@login_required
@require_GET
def my_ranking_api(request):
    code = (request.GET.get("category") or "").strip()
    if not code.isdigit():
        return JsonResponse({"error": "category missing"}, status=400)

    rk = Ranking.objects.filter(user=request.user.username, categoryCode=int(code)).first()
    if not rk:
        return JsonResponse({"error": "not found"}, status=404)

    return JsonResponse({
        "categoryCode": int(rk.categoryCode),
        "top5": list(rk.rating or []),
        "date": rk.ranking_date.isoformat() if rk.ranking_date else None,
        "name": rk.name or "",
    })

@login_required
def go_ranking(request):
    categories = list(
        Category.objects
        .order_by("code")
        .only("code", "name", "description", "games", "sort_by")
    )

    ranked_codes = set(
        Ranking.objects
        .filter(user=request.user.username)
        .values_list("categoryCode", flat=True)
    )

    for c in categories:
        c.is_ranked = int(c.code) in ranked_codes

    last_rankings = list(
        Ranking.objects
        .order_by("-ranking_date")[:3]
    )

    ids = []
    for rk in last_rankings:
        ids.extend(list(rk.rating or []))

    games_map = VideoGame.objects.in_bulk(ids)  # {id: VideoGame}

    for rk in last_rankings:
        rk.top5_items = []
        for gid in (rk.rating or []):
            g = games_map.get(gid)
            rk.top5_items.append({
                "id": gid,
                "name": g.name if g else f"Game {gid}",
                "cover": g.cover_url if (g and g.cover_url) else "",
            })

    return render(request, "ranking.html", {
        "categories": categories,
        "last_rankings": last_rankings,
    })


@login_required
@require_POST
def save_ranking(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        category = int(data["categoryCode"])
        top5 = data["top5"]
    except Exception:
        return JsonResponse({"error": "invalid payload"}, status=400)

    if not isinstance(top5, list) or len(top5) != 5:
        return JsonResponse({"error": "Top5 not filled"}, status=400)

    top5_clean = []
    for x in top5:
        try:
            top5_clean.append(int(x))
        except Exception:
            return JsonResponse({"error": "Top5 invalid"}, status=400)

    obj, created = Ranking.objects.update_or_create(
        user=request.user.username,
        categoryCode=category,
        defaults={
            "ranking_date": timezone.now().date(),
            "rating": top5_clean,
            "name": data.get("name") or "Mi ranking",
        },
    )
    messages.success(request, "Ranking created successfully.")
    return JsonResponse({"ok": True, "updated": (not created)})


@require_GET
def ranking_pool_api(request):
    code = (request.GET.get("category") or "").strip()
    if not code.isdigit():
        return JsonResponse({"items": [], "error": "category missing"}, status=400)

    cat = Category.objects.filter(code=int(code)).only("code", "name", "games", "pool_limit").first()
    if not cat:
        return JsonResponse({"items": [], "error": "category not found"}, status=404)

    ids = []
    for x in (cat.games or []):
        try:
            ids.append(int(x))
        except Exception:
            pass

    if not ids:
        return JsonResponse({"category": {"code": cat.code, "name": cat.name}, "items": []})

    # límite (si quieres respetar pool_limit)
    pool_limit = int(getattr(cat, "pool_limit", 200) or 200)
    ids = ids[:pool_limit]

    games = list(
        VideoGame.objects
        .filter(id__in=ids)
        .only("id", "name", "cover_url", "platforms")
    )

    # preservar orden de cat.games
    gmap = {int(g.id): g for g in games}
    items = []
    for gid in ids:
        g = gmap.get(gid)
        if not g:
            continue
        items.append({
            "id": str(g.id),
            "name": g.name or "",
            "coverUrl": g.cover_url or "",
            "platforms": g.platforms or "",
        })

    return JsonResponse({
        "category": {"code": cat.code, "name": cat.name},
        "items": items,
    })
