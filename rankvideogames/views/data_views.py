import csv
import json
from collections import Counter

from django.contrib import messages
from django.core.cache import cache
from django.shortcuts import redirect, render

from rankvideogames.models import VideoGame, Category
from rankvideogames.services.parsing import split_pipe, parse_year


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
        except Exception:
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
        messages.warning(
            request,
            f"No se insertó ningún registro. O ya existían o el CSV tenía filas inválidas (omitidas: {skipped})."
        )
    else:
        messages.success(request, f"CSV cargado: {count} registros. Omitidos: {skipped}.")

    return redirect("go_data")


def go_data(request):
    categories = list(Category.objects.order_by("code"))

    cached = cache.get("boss_options_v2")
    if cached:
        cached["categories"] = categories
        return render(request, "data.html", cached)

    plat_counter = Counter()
    genre_counter = Counter()
    years = set()

    qs = VideoGame.objects.all().only("platforms", "genres", "first_release_date")

    for vg in qs.iterator(chunk_size=2000):
        for p in split_pipe(vg.platforms):
            plat_counter[p] += 1
        for g in split_pipe(vg.genres):
            genre_counter[g] += 1
        y = parse_year(vg.first_release_date)
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
    }

    cache.set("boss_options_v2", ctx, 60 * 60 * 12)
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

    cache.delete("boss_options_v2")
    messages.success(request, f"Categoría creada: {name}")
    return redirect("go_data")



    



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
    cat.games = games        
    cat.save()

    cache.delete("boss_options_v2")
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



