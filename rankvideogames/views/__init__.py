from .public_views import go_home
from .auth_views import auth_view, logout_user
from .admin_views import go_admin, go_admin_stats, go_admin_global_ranking
from .ranking_views import go_ranking, save_ranking, my_ranking_api, ranking_pool_api
from .review_views import go_statistics
from .data_views import (
    go_data, load_data_movies, create_news_categories,
    update_category, delete_category
)
from .rating_views import (
    my_review_api, save_review_api, last_comments_api,
    sidebar_last_review_api, sidebar_last_comments_api,
)
from .stats_views import game_rating_stats_api, boss_games_search_api