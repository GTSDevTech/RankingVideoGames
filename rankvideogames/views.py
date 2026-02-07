import csv
from django.core.cache import cache
from collections import Counter
from django.contrib import messages
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
from django.core.paginator import Paginator
from rankvideogames.forms import *
from rankvideogames.models import VideoGame, Category, Ranking
import json
from datetime import datetime




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
    )   

    paginator = Paginator(qs, 36)  
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "home.html", {
        "page_obj": page_obj,
    })


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


def go_data(request):
    cached = cache.get("boss_options_v1")
    if cached:
        return render(request, "data.html", cached)

    plat_counter = Counter()
    genre_counter = Counter()
    years = set()

    qs = VideoGame.objects.all().only("platforms", "genres", "first_release_date")

    # esto evita petar RAM
    for vg in qs.iterator(chunk_size=2000):
        for p in _split_pipe(vg.platforms):
            plat_counter[p] += 1

        # genres viene como "A | B | C" -> _split_pipe ya lo soporta
        for g in _split_pipe(vg.genres):
            genre_counter[g] += 1

        y = _parse_year(vg.first_release_date)
        if y:
            years.add(y)

    # Opciones (top N para que el modal sea usable)
    platform_options = [k for k, _ in plat_counter.most_common(80)]
    genre_options = [k for k, _ in genre_counter.most_common(80)]

    # Años para selects y décadas para chips
    year_options = sorted(years, reverse=True)
    decade_options = sorted({(y // 10) * 10 for y in years}, reverse=True)

    ctx = {
        "platform_options": platform_options,
        "genre_options": genre_options,
        "year_options": year_options,
        "decade_options": decade_options,
    }

    cache.set("boss_options_v1", ctx, 60 * 60 * 12)
    return render(request, "data.html", ctx)


def go_ranking(request):
    categories = list(Category.objects.order_by("code").only("code", "name", "description"))
    return render(request, "ranking.html", {
        "categories": categories,
        "ranking_pool_api_url": "/api/ranking/pool/",  # simple, sin reverse para tocar lo mínimo
    })
    

def save_ranking(request):
    data = json.loads(request.body.decode("utf-8"))
    category = int(data["categoryCode"])
    top5 = data["top5"]  # lista de 5 ids (int)

    if len(top5) != 5:
        return JsonResponse({"error": "Top5 incompleto"}, status=400)

    Ranking.objects.create(
        user=str(request.user),           # o request.user.username
        ranking_date=timezone.now().date(),
        categoryCode=category,
        rating=top5
    )
    return JsonResponse({"ok": True})





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


def create_news_categories(request):
    if request.method != "POST":
        return redirect("go_data")

    name = (request.POST.get("name") or "").strip()
    description = (request.POST.get("description") or "").strip()

    year_from = (request.POST.get("year_from") or "").strip()
    year_to = (request.POST.get("year_to") or "").strip()
    min_votes = int(request.POST.get("min_votes") or 0)
    pool_limit = int(request.POST.get("pool_limit") or 200)
    sort_by = request.POST.get("sort_by") or "popular"

    platforms_raw = request.POST.get("platforms_any_json") or "[]"
    genres_raw = request.POST.get("genres_any_json") or "[]"

    try:
        platforms = [str(x).strip() for x in json.loads(platforms_raw) if str(x).strip()]
        genres = [str(x).strip() for x in json.loads(genres_raw) if str(x).strip()]
    except Exception:
        messages.error(request, "Platforms/Genres inválidos.")
        return redirect("go_data")

    if not name or not description:
        messages.error(request, "Name y Description son obligatorios.")
        return redirect("go_data")

    filter_json = {
        "platform_any": platforms,
        "genres_any": genres,
        "min_votes": min_votes,
    }

    if year_from.isdigit():
        filter_json["year_from"] = int(year_from)
    if year_to.isdigit():
        filter_json["year_to"] = int(year_to)

    last_code = Category.objects.order_by("-code").values_list("code", flat=True).first() or 0
    next_code = last_code + 1

    Category.objects.create(
        code=next_code,
        name=name,
        description=description,
        filter_json=filter_json,
        pool_limit=pool_limit,
        sort_by=sort_by,
    )

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