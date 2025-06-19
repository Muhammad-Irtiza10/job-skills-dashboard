# catalog/signals.py
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch       import receiver
from django.contrib.auth   import get_user_model
from .models               import StudentProfile , FacultyProfile

User = get_user_model()

##@receiver(post_save, sender=User)
##def ensure_profile(sender, instance, created, **kwargs):
  ##  if created:
    ##    StudentProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def sync_profiles(sender, instance, created, **kwargs):
    """
    Whenever a User is saved:
     - if is_staff → ensure they have a FacultyProfile and delete any StudentProfile
     - else       → ensure they have a StudentProfile and delete any FacultyProfile
    """
    if instance.is_staff:
        FacultyProfile.objects.get_or_create(user=instance)
        StudentProfile.objects.filter(user=instance).delete()
    else:
        StudentProfile.objects.get_or_create(user=instance)
        FacultyProfile.objects.filter(user=instance).delete()      
