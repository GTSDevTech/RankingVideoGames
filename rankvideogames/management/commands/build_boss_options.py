from django.core.management.base import BaseCommand
from django.core.cache import cache
from collections import Counter

from rankvideogames.models import VideoGame
from rankvideogames.services.parsing import split_pipe, parse_year

CACHE_KEY = "boss_options_v2"
CACHE_TTL = 60 * 60 * 24 * 30  # 30 días


class Command(BaseCommand):
    help = "Precalcula y guarda en cache las opciones de filtros (platform/genre/year/decade)."

    def handle(self, *args, **options):
        plat_counter = Counter()
        genre_counter = Counter()
        years = set()

        qs = VideoGame.objects.all().only("platforms", "genres", "first_release_date")
        for vg in qs.iterator(chunk_size=2000):
            for p in split_pipe(vg.platforms):
                plat_counter[p] += 1
            for g in split_pipe(vg.genres):
                genre_counter[g] += 1
            y = parse_year(vg.first_release_date)
            if y:
                years.add(y)

        data = {
            "platform_options": [k for k, _ in plat_counter.most_common(80)],
            "genre_options": [k for k, _ in genre_counter.most_common(80)],
            "year_options": sorted(years, reverse=True),
            "decade_options": sorted({(y // 10) * 10 for y in years}, reverse=True),
        }

        cache.set(CACHE_KEY, data, CACHE_TTL)
        self.stdout.write(self.style.SUCCESS(f"OK: cache '{CACHE_KEY}' generado con {len(data['platform_options'])} platforms y {len(data['genre_options'])} genres."))
