from django.urls import path, include
from rankvideogames.views import *

urlpatterns = [
    path('', auth_view, name='go_login'),
    path('login/', auth_view, name='go_login'),
    path('logout/', logout_user, name='logout_user'),
    path('home/', go_home, name='go_home'),
    path('ranking/', go_ranking, name='go_ranking'),
    path('review/', go_review, name='go_review'),
    path('admin/', go_admin, name='go_admin'),

]
