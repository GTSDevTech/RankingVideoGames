from django.shortcuts import render
from django.core.paginator import Paginator
from django.db.models import Count
from rankvideogames.models import VideoGame, Ranking, Review
from rankvideogames.services.ranking_stats import build_global_ranking

from django.shortcuts import render
from django.core.paginator import Paginator
from django.db.models import Count
from django.core.cache import cache
from rankvideogames.models import VideoGame, Ranking, Review
from rankvideogames.services.ranking_stats import build_global_ranking

def go_statistics(request):
    PER_CAROUSEL = 30

    p1 = int(request.GET.get("p1", 1))
    p2 = int(request.GET.get("p2", 1))
    p3 = int(request.GET.get("p3", 1))

    base = (
        VideoGame.objects
        .exclude(cover_url__isnull=True)
        .exclude(cover_url="")
    )

    # 1) TOP POPULAR (cache)
   
    ordered_ids_pop = cache.get("stats_pop_ids_v1")
    if ordered_ids_pop is None:
        stats = build_global_ranking(Ranking.objects.all())
        ordered_ids_pop = sorted(
            stats.keys(),
            key=lambda gid: (-stats[gid]["points"], -stats[gid]["appearances"], stats[gid]["pos_avg"] or 99, gid)
        )
        cache.set("stats_pop_ids_v1", ordered_ids_pop, 60 * 30)  # 30 min

    start1 = (p1 - 1) * PER_CAROUSEL
    end1 = start1 + PER_CAROUSEL
    pop_ids = ordered_ids_pop[start1:end1]

    games_map_pop = base.in_bulk(pop_ids)
    pop_slice = [games_map_pop[gid] for gid in pop_ids if gid in games_map_pop]


    # 2) TOP RATED (cache ids)

    ordered_ids_rated = cache.get("stats_rated_ids_v1")
    if ordered_ids_rated is None:
        review_counts = (
            Review.objects
            .values("videoGameCode")
            .annotate(votes=Count("_id"))
            .order_by("-votes", "videoGameCode")
        )
        ordered_ids_rated = [row["videoGameCode"] for row in review_counts]
        cache.set("stats_rated_ids_v1", ordered_ids_rated, 60 * 30) 

    start2 = (p2 - 1) * PER_CAROUSEL
    end2 = start2 + PER_CAROUSEL
    rated_ids = ordered_ids_rated[start2:end2]

    games_map_rated = base.in_bulk(rated_ids)
    rated_slice = [games_map_rated[gid] for gid in rated_ids if gid in games_map_rated]

    # 3) LAST RELEASES (paginado normal)

    qs_new = base.order_by("-first_release_date", "id")
    new_page = Paginator(qs_new, PER_CAROUSEL).get_page(p3)

    context = {
        "pop": pop_slice,
        "rated": rated_slice,
        "new_releases": new_page,
        "p1": p1, "p2": p2, "p3": p3,
    }

    if request.resolver_match and request.resolver_match.url_name == "go_admin_review":
        return render(request, "admin_review.html", context)

    return render(request, "review.html", context)
