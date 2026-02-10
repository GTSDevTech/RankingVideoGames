
from datetime import datetime

def split_pipe(value: str):
    if not value:
        return []
    s = str(value)
    if " | " in s:
        return [v.strip() for v in s.split(" | ") if v.strip()]

    # fallback al pipe simple
    return [v.strip() for v in s.split("|") if v.strip()]


def parse_year(value: str):
   
    if value is None:
        return None

    s = str(value).strip()
    if not s:
        return None

    # Caso: "2017-01-06" / "2017..."
    if len(s) >= 4 and s[:4].isdigit():
        y = int(s[:4])
        if 1970 <= y <= 2100:
            return y

    if s.isdigit():
        try:
            ts = int(s)
            if ts > 100000000:
                y = datetime.timezoneaware(ts).year
                if 1970 <= y <= 2100:
                    return y
        except Exception:
            return None

    return None


