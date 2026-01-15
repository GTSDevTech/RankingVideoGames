from django.urls import path, include
from rankvideogames.views import go_home, show_games


urlpatterns = [
    path('', go_home, name='go_home'),
    path('videogames/', show_games, name='go_game'),
]
