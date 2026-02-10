import json
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.contrib import messages

from rankvideogames.models import Review, VideoGame



@login_required
@require_GET
def my_review_api(request):
    game = (request.GET.get("game") or "").strip()
    if not game.isdigit():
        return JsonResponse({"error": "game missing"}, status=400)

    r = Review.objects.filter(user=request.user.username, videoGameCode=int(game)).first()
    if not r:
        return JsonResponse({"error": "not found"}, status=404)

    return JsonResponse({
        "rating": int(r.rating),
        "comments": r.comments or "",
        "date": r.reviewDate.isoformat() if r.reviewDate else None,
    })


@login_required
@require_POST
def save_review_api(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        gameId = int(data.get("gameId"))
        rating = int(data.get("rating"))
    except Exception:
        return JsonResponse({"error": "gameId/rating invalid"}, status=400)

    if rating < 0 or rating > 5:
        return JsonResponse({"error": "rating must be 0..5"}, status=400)

    comments = (data.get("comments") or "").strip()
    user_key = request.user.username

    obj, created = Review.objects.update_or_create(
        user=user_key,
        videoGameCode=gameId,
        defaults={
            "rating": rating,
            "comments": comments,
            "reviewDate": timezone.now(),
        },
    )

    return JsonResponse({"ok": True, "updated": (not created)})


@login_required
@require_GET
def last_comments_api(request):
    game = (request.GET.get("game") or "").strip()
    if not game.isdigit():
        return JsonResponse({"error": "game missing"}, status=400)

    game_id = int(game)

    qs = (
        Review.objects
        .filter(videoGameCode=game_id)
        .exclude(comments="")
        .order_by("-reviewDate")
    )[:20]

    items = []
    for r in qs:
        items.append({
            "user": r.user,
            "rating": int(r.rating) if r.rating is not None else None,
            "comment": (r.comments or "").strip(),
            "date": r.reviewDate.isoformat() if r.reviewDate else None,
        })

    return JsonResponse({"items": items})


@login_required
@require_GET
def sidebar_last_review_api(request):
    r = Review.objects.order_by("-reviewDate").first()
    if not r:
        return JsonResponse({"item": None})

    try:
        gid = int(r.videoGameCode)
    except Exception:
        return JsonResponse({"item": None})

    vg = VideoGame.objects.filter(id=gid).only("id", "name", "cover_url").first()

    return JsonResponse({
        "item": {
            "user": (r.user or "").strip(),
            "gameId": gid,
            "gameName": (vg.name if vg else "") or "",
            "coverUrl": (vg.cover_url if vg else "") or "",
            "rating": int(r.rating) if r.rating is not None else None,
            "comment": (r.comments or "").strip(),
            "date": r.reviewDate.isoformat() if r.reviewDate else None,
        }
    })


@login_required
@require_GET
def sidebar_last_comments_api(request):
    qs = (
        Review.objects
        .exclude(comments="")
        .order_by("-reviewDate")
    )[:10]

    game_ids = []
    for r in qs:
        try:
            game_ids.append(int(r.videoGameCode))
        except Exception:
            pass

    games_map = {}
    if game_ids:
        for g in VideoGame.objects.filter(id__in=game_ids).only("id", "name", "cover_url"):
            games_map[int(g.id)] = g

    items = []
    for r in qs:
        try:
            gid = int(r.videoGameCode)
        except Exception:
            continue

        g = games_map.get(gid)

        items.append({
            "user": (r.user or "").strip(),
            "gameId": gid,
            "gameName": (g.name if g else "") or "",
            "coverUrl": (g.cover_url if g else "") or "",
            "rating": int(r.rating) if r.rating is not None else None,
            "comment": (r.comments or "").strip(),
            "date": r.reviewDate.isoformat() if r.reviewDate else None,
        })

    return JsonResponse({"items": items})





