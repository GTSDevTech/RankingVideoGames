import csv
from django.views.decorators.http import require_GET, require_POST
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from collections import Counter
from django.contrib import messages
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
from django.core.paginator import Paginator
from rankvideogames.forms import *
from rankvideogames.models import VideoGame, Category, Ranking, Review
import json
from datetime import datetime
from django.utils import timezone




def _split_pipe(value: str):
    if not value:
        return []
    s = str(value)
    if " | " in s:
        return [v.strip() for v in s.split(" | ") if v.strip()]

    # fallback al pipe simple
    return [v.strip() for v in s.split("|") if v.strip()]


def _parse_year(value: str):
   
    if value is None:
        return None

    s = str(value).strip()
    if not s:
        return None

    # Caso: "2017-01-06" / "2017..."
    if len(s) >= 4 and s[:4].isdigit():
        y = int(s[:4])
        if 1970 <= y <= 2100:
            return y

    if s.isdigit():
        try:
            ts = int(s)
            if ts > 100000000:
                y = datetime.timezoneaware(ts).year
                if 1970 <= y <= 2100:
                    return y
        except Exception:
            return None

    return None


def go_home(request):

    qs = VideoGame.objects.all().only(
    "id","name","slug","first_release_date",
    "platforms","genres","developers","publishers",
    "total_rating","total_rating_count","cover_url"
    ).order_by("name")   

    paginator = Paginator(qs, 36)  
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "home.html", {
        "page_obj": page_obj,
    })


@login_required
def go_users(request):

    qu = Usuario.objects.all().exclude(role=1)
    paginator = Paginator(qu, 10)
    page_number = request.GET.get("page")
    page_user = paginator.get_page(page_number)

    return render(request, "users.html", {
        "page_user": page_user,
    })


def go_games(request):
    return render(request, "games.html")


    
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

    last_rankings = list(
        Ranking.objects
        .order_by("-ranking_date")[:3]
    )

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
        return JsonResponse({"error": "Top5 incompleto"}, status=400)

    top5_clean = []
    for x in top5:
        try:
            top5_clean.append(int(x))
        except Exception:
            return JsonResponse({"error": "Top5 inválido"}, status=400)

    obj, created = Ranking.objects.update_or_create(
        user=request.user.username,
        categoryCode=category,
        defaults={
            "ranking_date": timezone.now().date(),
            "rating": top5_clean,
            "name": data.get("name") or "Mi ranking",
        },
    )

    return JsonResponse({"ok": True, "updated": (not created)})


def go_statistics(request):
    PER_CAROUSEL = 30
    games = VideoGame.objects.all()
    p1 = int(request.GET.get("p1", 1))
    p2 = int(request.GET.get("p2", 1))
    p3 = int(request.GET.get("p3", 1))

    qs_popular = VideoGame.objects.exclude(cover_url__isnull=True).exclude(cover_url="").order_by("platforms").reverse()
    qs_rated = VideoGame.objects.exclude(cover_url__isnull=True).exclude(cover_url="").order_by("total_rating_count")
    qs_new = VideoGame.objects.exclude(cover_url__isnull=True).exclude(cover_url="").order_by("first_release_date")
    pop_page = Paginator(qs_popular, PER_CAROUSEL).get_page(p1)
    rated_page = Paginator(qs_rated, PER_CAROUSEL).get_page(p2)
    new_page = Paginator(qs_new, PER_CAROUSEL).get_page(p3)
    return render(request, "review.html", {
        "pop": pop_page,
        "rated": rated_page,
        "new_releases": new_page,
    })


def auth_view(request):
    mode = request.POST.get("mode") or request.GET.get("mode") or "login"

    login_form = LoginForm(request, data=request.POST or None)
    register_form = RegisterForm(request.POST or None)

    if request.method == "POST":
        if mode == "login":
            if login_form.is_valid():
                username = login_form.cleaned_data.get("username")
                password = login_form.cleaned_data.get("password")
                user = authenticate(request, username=username, password=password)
                if user is not None:
                    login(request, user)
                    if user.role == 2:
                        return redirect("go_home")
                    else:
                        return redirect("go_data")

                login_form.add_error(None, "Usuario o contraseña incorrectos.")

        elif mode == "register":
            if register_form.is_valid():
                register_form.save()
                return redirect("go_login")

    return render(request, "login.html", {
        "mode": mode,
        "login_form": login_form,
        "register_form": register_form,
    })


def logout_user(request):
    logout(request)
    return redirect("go_login")


def load_data_movies(request):

    if request.method != "POST":
        messages.error(request, "Elige un archivo.")
        return redirect("go_data")

    update_file = request.FILES.get("update_file")
    if not update_file:
        messages.error(request, "No se ha seleccionado ningún archivo.")
        return redirect("go_data")

    decoded_file = update_file.read().decode("utf-8-sig").splitlines()
    reader = csv.DictReader(decoded_file)

    required_cols = {
        "id", "name", "slug", "first_release_date", "platforms", "genres",
        "developers", "publishers", "total_rating", "total_rating_count",
        "cover_id", "cover_url",
    }

    header = reader.fieldnames or []
    header_set = {h.strip() for h in header if h and h.strip()}

    missing = sorted(required_cols - header_set)
    if missing:
        messages.error(request, "CSV inválido. Faltan columnas: " + ", ".join(missing))
        return redirect("go_data")

    count = 0
    skipped = 0

    for row in reader:
        row_id = (row.get("id") or "").strip()
        if not row_id:
            skipped += 1
            continue
        try:
            game_id = int(row_id)
        except:
            skipped += 1
            continue

        if VideoGame.objects.filter(id=game_id).exists():
            skipped += 1
            continue

        try:
            videogame = VideoGame()
            videogame.id = game_id

            videogame.name = (row.get("name") or "").strip()
            videogame.slug = (row.get("slug") or "").strip()

            videogame.first_release_date = (row.get("first_release_date") or "").strip()
            videogame.platforms = (row.get("platforms") or "").strip()
            videogame.genres = (row.get("genres") or "").strip()
            videogame.developers = (row.get("developers") or "").strip()
            videogame.publishers = (row.get("publishers") or "").strip()

            tr = (row.get("total_rating") or "").strip()
            trc = (row.get("total_rating_count") or "").strip()

            videogame.total_rating = tr if tr != "" else 0
            videogame.total_rating_count = trc if trc != "" else 0
            cid = (row.get("cover_id") or "").strip()
            videogame.cover_id = int(cid) if cid.isdigit() else None

            videogame.cover_url = (row.get("cover_url") or "").strip()

            videogame.save()
            count += 1

        except Exception:
            skipped += 1
            continue

    if count == 0:
        messages.warning(request, f"No se insertó ningún registro. O ya existían o el CSV tenía filas inválidas (omitidas: {skipped}).")
    else:
        messages.success(request, f"CSV cargado: {count} registros. Omitidos: {skipped}.")

    return redirect("go_data")


def go_data(request):

    categories = list(Category.objects.order_by("code"))

    for c in categories:
        c.filter_json_str = json.dumps(getattr(c, "filter_json", {}) or {}, ensure_ascii=False)


    saved_game_ids = set()
    for c in categories:
        for gid in (getattr(c, "games", None) or []):
            try:
                saved_game_ids.add(int(gid))
            except:
                pass

    preview_games = list(
        VideoGame.objects
        .exclude(name__isnull=True).exclude(name="")
        .only("id", "name", "platforms", "genres", "first_release_date", "cover_url", "total_rating_count")
        .order_by("-total_rating_count")[:500]
    )

    if saved_game_ids:
        existing_ids = {vg.id for vg in preview_games}
        missing_ids = [gid for gid in saved_game_ids if gid not in existing_ids]
        if missing_ids:
            extra_games = list(
                VideoGame.objects
                .filter(id__in=missing_ids)
                .only("id", "name", "platforms", "genres", "cover_url")
            )

            preview_games.extend(extra_games)

    cached = cache.get("boss_options_v1")
    if cached:
        cached["categories"] = categories
        cached["preview_games"] = preview_games
        return render(request, "data.html", cached)

    plat_counter = Counter()
    genre_counter = Counter()
    years = set()

    qs = VideoGame.objects.all().only("platforms", "genres", "first_release_date")

    for vg in qs.iterator(chunk_size=2000):
        for p in _split_pipe(vg.platforms):
            plat_counter[p] += 1
        for g in _split_pipe(vg.genres):
            genre_counter[g] += 1
        y = _parse_year(vg.first_release_date)
        if y:
            years.add(y)

    platform_options = [k for k, _ in plat_counter.most_common(80)]
    genre_options = [k for k, _ in genre_counter.most_common(80)]
    year_options = sorted(years, reverse=True)
    decade_options = sorted({(y // 10) * 10 for y in years}, reverse=True)

    ctx = {
        "platform_options": platform_options,
        "genre_options": genre_options,
        "year_options": year_options,
        "decade_options": decade_options,
        "categories": categories,
        "preview_games": preview_games,
    }

    cache.set("boss_options_v1", ctx, 60 * 60 * 12)
    return render(request, "data.html", ctx)




def create_news_categories(request):
    if request.method != "POST":
        return redirect("go_data")

    name = (request.POST.get("name") or "").strip()
    description = (request.POST.get("description") or "").strip()
    games_raw = request.POST.get("games") or "[]"

    try:
        games = []
        for x in json.loads(games_raw):
            s = str(x).strip()
            if s.isdigit():
                games.append(int(s))
    except Exception:
        messages.error(request, "Lista de juegos inválida.")
        return redirect("go_data")

    if not name or not description:
        messages.error(request, "Name y Description son obligatorios.")
        return redirect("go_data")

    last_code = Category.objects.order_by("-code").values_list("code", flat=True).first() or 0
    next_code = last_code + 1

    Category.objects.create(
        code=next_code,
        name=name,
        description=description,
        games=games,          
        filter_json={},       
    )

    cache.delete("boss_options_v1")
    messages.success(request, f"Categoría creada: {name}")
    return redirect("go_data")



    


def ranking_pool_api(request):
  
    code = request.GET.get("category", "").strip()
    if not code.isdigit():
        return JsonResponse({"items": [], "error": "category missing"}, status=400)

    cat = Category.objects.filter(code=int(code)).first()
    if not cat:
        return JsonResponse({"items": [], "error": "category not found"}, status=404)

    f = cat.filter_json or {}
    platforms = [p for p in (f.get("platform_any") or []) if str(p).strip()]
    genres = [g for g in (f.get("genres_any") or []) if str(g).strip()]
    min_votes = int(f.get("min_votes") or 0)

    year_from = f.get("year_from")
    year_to = f.get("year_to")

    pool_limit = int(getattr(cat, "pool_limit", 200) or 200)
    sort_by = getattr(cat, "sort_by", "popular") or "popular"

    qs = VideoGame.objects.all().only(
        "id", "name", "platforms", "genres", "first_release_date",
        "cover_url", "total_rating", "total_rating_count"
    )

    # votos
    if min_votes > 0:
        qs = qs.filter(total_rating_count__gte=min_votes)

    # platforms (OR)
    if platforms:
        q_plat = Q()
        for p in platforms:
            # p será por ejemplo "PlayStation 5" o "PC (Microsoft Windows)"
            q_plat |= Q(platforms__icontains=p)
        qs = qs.filter(q_plat)

    # genres (OR)
    if genres:
        q_gen = Q()
        for g in genres:
            q_gen |= Q(genres__icontains=g)
        qs = qs.filter(q_gen)

    # sorting
    if sort_by == "rating":
        qs = qs.order_by("-total_rating")
    elif sort_by == "new":
        qs = qs.order_by("-first_release_date")
    else:
        qs = qs.order_by("-total_rating_count")

     # years (APLICAR EN BD antes del sort para no reventar memoria en Mongo)
    if isinstance(year_from, int) or isinstance(year_to, int):
        now_year = datetime.utcnow().year
        y1 = int(year_from) if isinstance(year_from, int) else 1970
        y2 = int(year_to) if isinstance(year_to, int) else now_year
        if y1 > y2:
            y1, y2 = y2, y1
        y2 = min(y2, now_year)

        # first_release_date es string tipo "YYYY-MM-DD"
        #  límites ISO
        start = f"{y1:04d}-01-01"
        end = f"{y2:04d}-12-31"

        qs = qs.filter(first_release_date__gte=start, first_release_date__lte=end)
        items = []
        for vg in qs.iterator(chunk_size=2000):
            y = _parse_year(vg.first_release_date)
            if y is None:
                continue
            if y1 <= y <= y2:
                items.append({
                    "id": str(vg.id),
                    "name": vg.name or "",
                    "coverUrl": vg.cover_url or "",
                    "platforms": vg.platforms or "",
                })
                if len(items) >= pool_limit:
                    break

        return JsonResponse({
            "category": {"code": cat.code, "name": cat.name},
            "items": items,
        })

    # construir items (sin years)
    items = []
    for vg in qs[:pool_limit]:
        items.append({
            "id": str(vg.id),
            "name": vg.name or "",
            "coverUrl": vg.cover_url or "",
            "platforms": vg.platforms or "",
        })

    return JsonResponse({
        "category": {"code": cat.code, "name": cat.name},
        "items": items,
    })
    

def boss_preview_pool_api(request):
 
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"items": [], "error": "invalid json"}, status=400)

    platforms = data.get("platforms") or []
    genres = data.get("genres") or []
    q = (data.get("q") or "").strip()

    year_from = str(data.get("year_from") or "").strip()
    year_to = str(data.get("year_to") or "").strip()

    try:
        min_votes = int(data.get("min_votes") or 0)
    except Exception:
        min_votes = 0

    try:
        pool_limit = int(data.get("pool_limit") or 200)
    except Exception:
        pool_limit = 200
    pool_limit = max(20, min(pool_limit, 500))

    sort_by = (data.get("sort_by") or "popular").strip()

    qs = VideoGame.objects.all().only(
        "id", "name", "platforms", "genres", "first_release_date",
        "cover_url", "total_rating", "total_rating_count"
    )

    if q:
        qs = qs.filter(name__icontains=q)

    if min_votes > 0:
        qs = qs.filter(total_rating_count__gte=min_votes)

    if platforms:
        q_plat = Q()
        for p in platforms:
            p = str(p).strip()
            if p:
                q_plat |= Q(platforms__icontains=p)
        qs = qs.filter(q_plat)

    if genres:
        q_gen = Q()
        for g in genres:
            g = str(g).strip()
            if g:
                q_gen |= Q(genres__icontains=g)
        qs = qs.filter(q_gen)

    # years
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

    if sort_by == "rating":
        qs = qs.order_by("-total_rating")
    elif sort_by == "new":
        qs = qs.order_by("-first_release_date")
    else:
        qs = qs.order_by("-total_rating_count")

    items = []
    for vg in qs[:pool_limit]:
        items.append({
            "id": str(vg.id),
            "name": vg.name or "",
            "coverUrl": vg.cover_url or "",
            "platforms": vg.platforms or "",
        })

    return JsonResponse({"items": items})



def update_category(request, code):
    if request.method != "POST":
        return redirect("go_data")

    cat = Category.objects.filter(code=code).first()
    if not cat:
        messages.error(request, "Categoría no encontrada.")
        return redirect("go_data")

    name = (request.POST.get("name") or "").strip()
    description = (request.POST.get("description") or "").strip()
    games_raw = request.POST.get("games") or "[]"

    try:
        games = []
        for x in json.loads(games_raw):
            s = str(x).strip()
            if s.isdigit():
                games.append(int(s))
    except Exception:
        messages.error(request, "Lista de juegos inválida.")
        return redirect("go_data")

    if not name or not description:
        messages.error(request, "Name y Description son obligatorios.")
        return redirect("go_data")

    cat.name = name
    cat.description = description
    cat.games = games        # <-- MODO PROFE
    cat.save()

    cache.delete("boss_options_v1")
    messages.success(request, f"Categoría actualizada: {name}")
    return redirect("go_data")



def delete_category(request, code):
    if request.method != "POST":
        return redirect("go_data")

    cat = Category.objects.filter(code=code).first()
    if not cat:
        messages.error(request, "Categoría no encontrada.")
        return redirect("go_data")

    cat.delete()
    messages.success(request, "Categoría eliminada.")
    return redirect("go_data")


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