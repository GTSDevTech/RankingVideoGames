from django.shortcuts import render

from rankvideogames.models import VideoGame


# Create your views here.
def go_home(request):
    return render(request, "home.html")


def show_games(request):
    #findAll
    list_games = VideoGame.objects.all()
    return render(request, "game.html", {"games": list_games})

def go_login(request):
    return render(request, "login.html")