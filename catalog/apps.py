from django.apps import AppConfig

class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "catalog"

    def ready(self):
        # import our signals handler so profiles get auto-created
        import catalog.signals

