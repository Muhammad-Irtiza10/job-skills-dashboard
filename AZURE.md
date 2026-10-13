# CareerPath Analyzer on Azure

Live site: **https://careerpath-frontend.salmonbay-1726c684.uaenorth.azurecontainerapps.io**

Commands are written for **Command Prompt** on one line each. Replace `UPPER_CASE` placeholders with
your own values and never paste real passwords or keys into chats, docs or git.

## What runs where

```
 browser ──https──► careerpath-frontend   (Container App, public)   nginx + built React site
                         │  /api /media /admin /static
                         ▼
                    careerpath-backend    (Container App, internal)  Django + gunicorn ──► Azure Files share "media" (photos)
                         │
                         ▼
                    careerpath-db-irtiza  (PostgreSQL Flexible Server 18, B1ms)

 careerpath-refresh-jobs (Container Apps Job, every Monday 06:00 UTC): python manage.py fetch_jsearch_jobs
```

| Resource | Name | Notes |
|---|---|---|
| Resource group | `careerpath-rg` | UAE North (Dubai). Deleting it deletes everything below. |
| PostgreSQL | `careerpath-db-irtiza` | Burstable B1ms, 32 GB, HA off: inside the 12-month free allowance. DB `skillgap`, admin `careerpathadmin`. |
| Storage | `careerpathmediairtiza` / share `media` | Profile photos, mounted in the backend at `/app/media`. |
| Environment | `careerpath-env` | **Workload profiles** (Consumption). Not "express": express has no Azure Files or jobs. |
| Apps | `careerpath-frontend`, `careerpath-backend` | Scale to zero when idle (first visit after a quiet period takes 10–20 s). |
| Job | `careerpath-refresh-jobs` | Weekly live-jobs refresh (JSearch). |
| Images | `ghcr.io/muhammad-irtiza10/careerpath-{backend,frontend}:vN` | GitHub Container Registry, public packages (no secrets inside). |

## Releasing a new version

After changing code, in the project folder (Docker Desktop running):

```
docker build -t ghcr.io/muhammad-irtiza10/careerpath-backend:vN .
docker push ghcr.io/muhammad-irtiza10/careerpath-backend:vN
az containerapp update --name careerpath-backend --resource-group careerpath-rg --image ghcr.io/muhammad-irtiza10/careerpath-backend:vN
az containerapp job update --name careerpath-refresh-jobs --resource-group careerpath-rg --image ghcr.io/muhammad-irtiza10/careerpath-backend:vN
```

Frontend: same with `careerpath-frontend`, `./frontend` as the build folder, and no job update.
Use a new tag each time (`v3`, `v4` …) so you can always go back. Database migrations run automatically
when the backend starts.

**Roll back:** run the same `az containerapp update` with the previous tag.

If `docker push` says unauthorized, the GitHub token expired: create a new classic token with
`write:packages` and run `docker login ghcr.io -u Muhammad-Irtiza10` again.

## Everyday checks

```
az containerapp logs show --name careerpath-backend --resource-group careerpath-rg --tail 40
az containerapp logs show --name careerpath-backend --resource-group careerpath-rg --type system --tail 40
az containerapp revision list --name careerpath-backend --resource-group careerpath-rg --query "[].{revision:name, health:properties.healthState, state:properties.runningState}" --output table
az containerapp job start --name careerpath-refresh-jobs --resource-group careerpath-rg
az containerapp job execution list --name careerpath-refresh-jobs --resource-group careerpath-rg --query "[].{run:name, status:properties.status, started:properties.startTime}" --output table
```

"Could not find a replica" just means the app is asleep (scaled to zero). Open the site to wake it.

## Changing settings and secrets

```
az containerapp update --name careerpath-backend --resource-group careerpath-rg --set-env-vars NAME=value
az containerapp secret set --name careerpath-backend --resource-group careerpath-rg --secrets db-password=NEW_VALUE
az containerapp revision restart --name careerpath-backend --resource-group careerpath-rg --revision REVISION_NAME
```

A secret change only takes effect after a restart (or the next new revision).
Database password: `az postgres flexible-server update --resource-group careerpath-rg --name careerpath-db-irtiza --admin-password NEW_PASSWORD`, then update the `db-password` secret on the backend **and** the job.

## Working with the database from your laptop

The firewall only admits Azure services. To connect (e.g. `pg_restore`, `psql`), allow your IP, work, then remove it:

```
curl -s https://api.ipify.org
az postgres flexible-server firewall-rule create --resource-group careerpath-rg --server-name careerpath-db-irtiza --name my-laptop --start-ip-address YOUR_IP --end-ip-address YOUR_IP
set PGPASSWORD=DB_PASSWORD
set PGSSLMODE=require
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -h careerpath-db-irtiza.postgres.database.azure.com -U careerpathadmin -d skillgap
set PGPASSWORD=
az postgres flexible-server firewall-rule delete --resource-group careerpath-rg --server-name careerpath-db-irtiza --name my-laptop --yes
```

## How it was built (first-time setup, for reference)

1. `az login` (subscription *Azure for Students*), `az extension add --name containerapp --upgrade`,
   `az provider register` for `Microsoft.App`, `Microsoft.OperationalInsights`, `Microsoft.DBforPostgreSQL`, `Microsoft.Storage`.
   `Microsoft.App` stayed in *Registering* for about a day before it completed.
2. `az group create --name careerpath-rg --location uaenorth`
3. PostgreSQL:
   `az postgres flexible-server create --resource-group careerpath-rg --name careerpath-db-irtiza --location uaenorth --version 18 --tier Burstable --sku-name Standard_B1ms --storage-size 32 --backup-retention 7 --admin-user careerpathadmin --admin-password DB_PASSWORD --public-access 0.0.0.0`
   then `az postgres flexible-server db create --resource-group careerpath-rg --server-name careerpath-db-irtiza --name skillgap`,
   then data loaded with `pg_restore --no-owner --no-privileges` from a `pg_dump -Fc` of the local database.
4. Images pushed to `ghcr.io` (token with `write:packages`), packages set to Public.
5. Storage: `az storage account create … --sku Standard_LRS`, `az storage share-rm create … --name media --quota 5`.
6. Environment: `az containerapp env create --name careerpath-env --resource-group careerpath-rg --location uaenorth --environment-mode WorkloadProfiles`,
   then `az containerapp env storage set … --storage-name media … --access-mode ReadWrite`.
7. Backend: `az containerapp create … --ingress internal --target-port 8000 --min-replicas 0 --max-replicas 1` with secrets
   (`django-secret`, `db-password`, `email-password`, `jsearch-key`) and env vars (see `DOCKER.md` → *Settings*;
   `DJANGO_ALLOWED_HOSTS=.<environment domain>`, `DB_SSLMODE=require`).
   Photo share mounted by exporting the app (`az containerapp show --output yaml`), adding
   `volumeMounts` (`/app/media` → `media-volume`) and `volumes` (`storageName: media`, `storageType: AzureFile`),
   then `az containerapp update --yaml`.
8. Frontend: `az containerapp create … --ingress external --target-port 80 --env-vars BACKEND_URL=https://careerpath-backend.internal.<environment domain>`.
9. Job: `az containerapp job create --name careerpath-refresh-jobs … --trigger-type Schedule --cron-expression "0 6 * * 1" --command "python" "manage.py" "fetch_jsearch_jobs"` with the database and JSearch settings.

## Problems we hit (and the fixes)

| Symptom | Cause | Fix |
|---|---|---|
| CLI flag errors (`--high-availability`, `--database-name`, `--rule-name`) | Azure CLI 2.91 renamed/removed flags | HA is off by default; create the DB with `db create --name`; firewall rules use `--server-name` + `--name` |
| `'Storage' resources are not supported on express environments` | The CLI now creates *express* environments by default | Recreate with `--environment-mode WorkloadProfiles` |
| Login fails, frontend log shows `426` on `/api/...` | Azure's ingress rejects nginx's default HTTP/1.0 proxying | `proxy_http_version 1.1;` in `frontend/nginx.conf.template` (image v2) |
| Photo upload 500, `PermissionError … os.chmod` | Azure Files (SMB) refuses permission changes | `FILE_UPLOAD_PERMISSIONS = None` in settings (backend v2) |
| Reset emails land in Spam | Sending as `@outlook.com` through Mailjet | Send from your own domain (verify it in Mailjet, set `DEFAULT_FROM_EMAIL`) |

## Cost

Free while within: PostgreSQL B1ms 750 h/month + 32 GB (12 months), Container Apps monthly free grant
(apps scale to zero), first 5 GB/month of logs. Azure Files for a few MB of photos costs cents.
Check **Cost Management → Cost analysis** in the portal now and then. To stop everything:
`az group delete --name careerpath-rg` (permanent, deletes the database too: back it up first).
