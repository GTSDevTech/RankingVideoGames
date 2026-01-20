import csv
from hmac import new

from django.shortcuts import render, redirect
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

def go_admin(request):

    return render(request, "admin.html")


def go_review(request):
    
    return render(request,"review.html")


def go_ranking(request):
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
    return render(request, "ranking.html", {
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
                if user is not None and user:
                    login(request, user)
                    return redirect("go_home")

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
    if request.method == "POST":
        update_file = request.FILES.get("update_file")
        # if not update_file:
            # return redirect(request, admin.html)

        decode_file = update_file.read().decode("utf-8").splitlines()
        reader = csv.DictReader(decode_file)

        for row in reader:
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



