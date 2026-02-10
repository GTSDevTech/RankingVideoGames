from datetime import datetime
import json
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from rankvideogames.models import VideoGame, Review
from django.db.models import Q



@login_required
@require_GET
def game_rating_stats_api(request):
    game = (request.GET.get("game") or "").strip()
    if not game.isdigit():
        return JsonResponse({"error": "game missing"}, status=400)

    gid = int(game)

    qs = Review.objects.filter(videoGameCode=gid)
    count = qs.count()
    if count == 0:
        return JsonResponse({"gameId": gid, "avg": None, "count": 0})

    total = 0
    for r in qs.only("rating"):
        total += int(r.rating or 0)

    avg = round(total / count, 2)
    return JsonResponse({"gameId": gid, "avg": avg, "count": count})


@login_required
@require_GET
def boss_games_search_api(request):


    # ---- parse inputs ----
    q = (request.GET.get("q") or "").strip()

    def parse_json_list(param):
        raw = request.GET.get(param) or "[]"
        try:
            arr = json.loads(raw)
        except Exception:
            arr = []
        out = []
        for x in arr:
            s = str(x).strip()
            if s:
                out.append(s)
        return out

    platforms = parse_json_list("platforms_any_json")
    genres = parse_json_list("genres_any_json")

    year_from = (request.GET.get("year_from") or "").strip()
    year_to = (request.GET.get("year_to") or "").strip()

    try:
        page = int(request.GET.get("page") or 1)
    except Exception:
        page = 1
    page = max(page, 1)

    try:
        page_size = int(request.GET.get("page_size") or 60)
    except Exception:
        page_size = 60
    page_size = max(12, min(page_size, 120))

    # ---- base queryset----
    qs = VideoGame.objects.all().only(
        "id", "name", "cover_url", "platforms", "genres", "first_release_date", "total_rating_count"
    )

    # ---- filtros ----
    if q:
        qs = qs.filter(name__icontains=q)

    # platforms OR (sobre string)
    if platforms:
        q_plat = Q()
        for p in platforms:
            q_plat |= Q(platforms__icontains=p)
        qs = qs.filter(q_plat)

    # genres OR (sobre string)
    if genres:
        q_gen = Q()
        for g in genres:
            q_gen |= Q(genres__icontains=g)
        qs = qs.filter(q_gen)

    # years (first_release_date es string "YYYY-MM-DD" => rango ISO funciona)
    if year_from.isdigit() or year_to.isdigit():
        now_year = datetime.utcnow().year
        y1 = int(year_from) if year_from.isdigit() else 1970
        y2 = int(year_to) if year_to.isdigit() else now_year
        if y1 > y2:
            y1, y2 = y2, y1
        y2 = min(y2, now_year)

        start = f"{y1:04d}-01-01"
        end = f"{y2:04d}-12-31"
        qs = qs.filter(first_release_date__gte=start, first_release_date__lte=end)

    # Si hay q: orden alfabético
    # Si no hay q: popularidad
    if q:
        qs = qs.order_by("name")
    else:
        qs = qs.order_by("-total_rating_count")

    # ---- paginación ----
    offset = (page - 1) * page_size
    slice_qs = list(qs[offset: offset + page_size + 1]) 
    has_more = len(slice_qs) > page_size
    slice_qs = slice_qs[:page_size]

    items = []
    for vg in slice_qs:
        items.append({
            "id": str(vg.id),
            "name": vg.name or "",
            "coverUrl": vg.cover_url or "",
            "platforms": vg.platforms or "",
            "genres": vg.genres or "",
            "first_release_date": vg.first_release_date or "",
        })

    return JsonResponse({
        "items": items,
        "page": page,
        "page_size": page_size,
        "has_more": has_more,
    })
    