from django import template
print("✅ CARGADO text_filters")
register = template.Library()

@register.filter
def split(value, sep="|"):
    if not value:
        return []
    return [v.strip() for v in str(value).split(sep) if v.strip()]