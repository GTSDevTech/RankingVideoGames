from django.urls import path, include
from rankvideogames.views import go_home, show_games, go_login

urlpatterns = [
    path('', go_login, name='go_login'),
    path('games/', show_games, name='go_game'),
    path('login', go_login, name='go_login'),
]
