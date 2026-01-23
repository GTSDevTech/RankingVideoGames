from django.urls import path, include
from rankvideogames.views import *

urlpatterns = [
    path('', auth_view, name='go_login'),
    path('login/', auth_view, name='go_login'),
    path('logout/', logout_user, name='logout'),
    path('home/', go_home, name='go_home'),
    path('ranking/', go_ranking, name='go_ranking'),
    path('review/', go_review, name='go_review'),
    path('data/', go_data, name='go_data'),
    path('games/', go_games, name='go_games'),
    path('users/', go_users, name='go_users'),
    path("boss/load-data/", load_data_movies, name="load_data_movies"),
    path("boss/create-news-categories/", create_news_categories, name="create_news_categories"),

]
