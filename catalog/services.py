from django.db.models import Count
from .models import Certification

def get_candidate_certs(job_skill_names, min_matches=1):
    """
    Returns Certifications that cover ≥ min_matches of the given job_skill_names,
    sorted by descending match_count.
    """
    return (
        Certification.objects
            .filter(skills__name__in=job_skill_names)
            .annotate(match_count=Count('skills'))
            .filter(match_count__gte=min_matches)
            .order_by('-match_count')
            .distinct()
    )
