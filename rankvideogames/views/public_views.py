from django.shortcuts import render
from django.core.paginator import Paginator
from django.db.models import Q
from rankvideogames.models import VideoGame

def go_home(request):
    qs = (
        VideoGame.objects.all()
        .only(
            "id","name","slug","first_release_date",
            "platforms","genres","developers","publishers",
            "total_rating","total_rating_count","cover_url"
        )
    )

    # SEARCH 
    q = (request.GET.get("q") or "").strip()
    search_by = (request.GET.get("search_by") or "all").strip()

    if q:
        if search_by == "name":
            qs = qs.filter(name__icontains=q)
        elif search_by == "platform":
            qs = qs.filter(platforms__icontains=q)
        elif search_by == "genre":
            qs = qs.filter(genres__icontains=q)
        else:
            qs = qs.filter(
                Q(name__icontains=q) |
                Q(platforms__icontains=q) |
                Q(genres__icontains=q) |
                Q(developers__icontains=q) |
                Q(publishers__icontains=q)
            )

    # FILTERS ()
    category = (request.GET.get("category") or "").strip()
    platform = (request.GET.get("platform") or "").strip()
    status = (request.GET.get("status") or "").strip()
    time = (request.GET.get("time") or "").strip()

    if platform:
        qs = qs.filter(platforms__icontains=platform)
    # --- SORT ---
    sort = (request.GET.get("sort") or "popular").strip()

    if sort == "new":
        qs = qs.order_by("-first_release_date", "id")
    elif sort == "name":
        qs = qs.order_by("name", "id")
    else:
        qs = qs.order_by("-total_rating_count", "-total_rating", "name", "id")

    paginator = Paginator(qs, 36)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "home.html", {
        "page_obj": page_obj,
    })