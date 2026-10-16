-- Installer après 202610150005_project_trash.sql dans le SQL Editor Supabase.
-- Aucun projet actif n’est concerné. Exécution horaire, même lorsque le site est fermé.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('atelier-project-trash-retention','7 * * * *','select atelier_private.purge_expired_projects()');
select jobname,schedule,active from cron.job where jobname='atelier-project-trash-retention';
