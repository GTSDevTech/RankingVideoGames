from django.shortcuts import render
from django.core.paginator import Paginator
from rankvideogames.models import VideoGame

def go_statistics(request):
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

