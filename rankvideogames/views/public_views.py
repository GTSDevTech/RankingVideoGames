from django.shortcuts import render
from django.core.paginator import Paginator
from rankvideogames.models import VideoGame


def go_home(request):

    qs = VideoGame.objects.all().only(
    "id","name","slug","first_release_date",
    "platforms","genres","developers","publishers",
    "total_rating","total_rating_count","cover_url"
    ).order_by("name")   

    paginator = Paginator(qs, 36)  
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "home.html", {
        "page_obj": page_obj,
    })
