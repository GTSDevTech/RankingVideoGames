from django.urls import path, include
from rankvideogames.views import *



urlpatterns = [
    path("", auth_view, name="go_login"),
    path("login/", auth_view, name="go_login"),
    path("logout/", logout_user, name="logout"),

    path("home/", go_home, name="go_home"),
    path("ranking/", go_ranking, name="go_ranking"),
    path("review/", go_statistics, name="go_review"),
    path("data/", go_data, name="go_data"),

    # ADMIN
    path("users/", go_admin, name="go_admin"),
    path("users/stats/", go_admin_stats, name="go_admin_stats"),
    path("users/global/", go_admin_global_ranking, name="go_admin_global_ranking"),

    # CSV
    path("boss/load-data/", load_data_movies, name="load_data_movies"),

    # Categories
    path("boss/create-news-categories/", create_news_categories, name="create_news_categories"),
    path("boss/categories/<int:code>/edit/", update_category, name="update_category"),
    path("boss/categories/<int:code>/delete/", delete_category, name="delete_category"),
    path("boss/games/search/", boss_games_search_api, name="boss_games_search_api"),

    # Ranking
    path("ranking/my/", my_ranking_api, name="my_ranking_api"),
    path("ranking/pool/", ranking_pool_api, name="ranking_pool_api"),
    path("ranking/save/", save_ranking, name="save_ranking"),

    # Reviews
    path("reviews/my/", my_review_api, name="my_review_api"),
    path("reviews/save/", save_review_api, name="save_review_api"),
    path("reviews/last/", last_comments_api, name="last_comments_api"),

    # Reviews sidebar
    path("reviews/sidebar/last-review/", sidebar_last_review_api, name="sidebar_last_review_api"),
    path("reviews/sidebar/last-comments/", sidebar_last_comments_api, name="sidebar_last_comments_api"),
    path("reviews/game-stats/", game_rating_stats_api, name="game_rating_stats_api"),
]