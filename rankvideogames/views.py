import csv
from hmac import new
from django.contrib import messages
from django.shortcuts import redirect, render
from rankvideogames.forms import *
from django.core.paginator import Paginator
from django.contrib.auth import authenticate, login, logout
from rankvideogames.models import VideoGame


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
    
    if request.method == "POST":
        update_file = request.FILES.get("update_file")
        if not update_file:
            messages.error(request, "No se ha seleccionado ningún archivo.")
            return redirect("go_data")

        decode_file = update_file.read().decode("utf-8").splitlines()
        reader = csv.DictReader(decode_file)

        required_cols = {
        "id", "name", "slug", "first_release_date", "platforms", "genres",
        "developers", "publishers", "total_rating", "total_rating_count",
        "cover_id", "cover_url",
        }
        
        header = reader.fieldnames or []
        header_set = {h.strip() for h in header if h}

        missing = sorted(required_cols - header_set)
        if missing:
            messages.error(
                request,
                "CSV inválido. Faltan columnas: " + ", ".join(missing)
            )
            return redirect("go_data")

        count = 0
        skipped = 0

        for row in reader:
            row_id = (row.get("id") or "").strip()
            if not row_id:
                skipped += 1
                continue

            if VideoGame.objects.filter(id=row_id).exists():
                skipped += 1
                continue
            try:
                videogame = VideoGame()
                videogame.id = row['id']
                videogame.name = row['name']
                videogame.slug = row['slug']
                videogame.first_release_date = row['first_release_date']
                videogame.platforms = row['platforms']
                videogame.genres = row['genres']
                videogame.developers = row['developers']
                videogame.publishers = row['publishers']
                videogame.total_rating = row['total_rating']
                videogame.total_rating_count = row['total_rating_count']
                videogame.cover_id = row['cover_id']
                videogame.cover_url = row['cover_url']

                videogame.save()
                count += 1
            except Exception as e:  
                skipped += 1
                continue

        if count == 0:
            messages.warning(request, f"No se insertó ningún registro. O ya existían o el CSV tenía filas inválidas (omitidas: {skipped}).")
        else:
            messages.success(request, f"CSV cargado: {count} registros. Omitidos: {skipped}.")
        return redirect("go_data")
    

def create_news_categories(request):
    
    
    return render(request, "go_data.html")


