import csv
from hmac import new
from django.contrib import messages
from django.shortcuts import redirect, render
from rankvideogames.forms import *
from django.core.paginator import Paginator
from django.contrib.auth import authenticate, login, logout
from rankvideogames.models import VideoGame
import json


# Create your views here.
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
    return render(request, "data.html")

def go_ranking(request):
    
    return render(request,"ranking.html")


def go_review(request):
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
    if request.method == "POST":
        name = request.POST.get("name")
        description = request.POST.get("description")

        year_from = request.POST.get("year_from")
        year_to = request.POST.get("year_to")
        platforms_any = request.POST.get("platforms_any")
        genres_any = request.POST.get("genres_any")
        min_votes = int(request.POST.get("min_votes") or 0)
        pool_limit = int(request.POST.get("pool_limit") or 200)
        sort_by = request.POST.get("sort_by") or "popular"

        # build filter_json
        filter_json = {}

        if year_from:
            filter_json["date_from"] = f"{year_from}-01-01"
        if year_to:
            filter_json["date_to"] = f"{year_to}-12-31"

        if platforms_any:
            filter_json["platform_any"] = [
                p.strip() for p in platforms_any.split(",") if p.strip()
            ]

        if genres_any:
            filter_json["genres_any"] = [
                g.strip() for g in genres_any.split(",") if g.strip()
            ]

        if min_votes > 0:
            filter_json["min_votes"] = min_votes

        last = Category.objects.order_by("code").last()
        next_code = (last.code if last else 0) + 1

        Category.objects.create(
            code=next_code,
            name=name,
            description=description,
            filter_json=filter_json,
            pool_limit=pool_limit,
            sort_by=sort_by,
        )

        return redirect("go_data")

    return redirect("go_data")