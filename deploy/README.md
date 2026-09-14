# Deployment — isnotalone.de

INA runs on the same VPS as BauWerk and shares **nothing** with it: its own
directory, its own Node, its own package manager, its own Postgres role and
database, its own systemd units, its own nginx vhost, its own ports.

| What            | INA                                  | BauWerk (untouched)              |
| --------------- | ------------------------------------ | -------------------------------- |
| Directory       | `/opt/ina`                           | `/opt/bauwerk-*`                 |
| System user     | `ina`                                | `bauwerk`                        |
| Node            | `/opt/ina/node` (22.x, own tarball)  | `/usr/bin/node` (20.x)           |
| Package manager | pnpm via corepack, `COREPACK_HOME=/opt/ina/corepack` | npm            |
| Database        | role `ina`, db `ina` on the host Postgres 16 | `bauwerk`, `bauwerk_prod` |
| Web port        | `127.0.0.1:3100`                     | 3000, 3001, 3002, 3011           |
| Services        | `ina-web.service`, `ina-pipeline.timer` | `bauwerk*.service`            |
| nginx           | `sites-enabled/isnotalone.de`        | the other vhosts                 |

## First time

1. On the server, as root:

   ```bash
   bash /opt/ina/deploy/server-setup.sh
   ```

   Idempotent. Creates the user, installs Node 22 under `/opt/ina/node`,
   creates the Postgres role and database (password generated once, kept in
   `/opt/ina/db-password`, mode 600), installs the systemd units and the nginx
   vhost, requests the certificate.

   The script has to exist on the server before it can run, so the very first
   round is: `deploy.sh` (which uploads everything, including this folder),
   then `server-setup.sh`, then `deploy.sh` again so the build runs with the
   database in place.

2. From this machine:

   ```bash
   bash deploy/deploy.sh
   ```

   Packs the committed tree (`git archive HEAD` — no `node_modules`, no
   `.next`, no `.env`), uploads it, assembles the server `.env` from the local
   one with the server's own `DATABASE_URL`, installs, generates the Prisma
   client, applies migrations, builds, restarts.

3. Data. Importing the history from Warcraft Logs takes hours; the local
   database already has it. Move it once:

   ```bash
   bash deploy/dump-local.sh          # writes deploy/out/ina-data.sql.gz
   bash deploy/restore-remote.sh      # loads it into the server database
   ```

   Data only — the schema comes from the migrations, so the dump never fights
   the Prisma migration table.

## Every later release

```bash
bash deploy/deploy.sh
```

## Imports

`ina-pipeline.timer` runs `deploy/pipeline.sh` every six hours: incremental
sync, then parses, deaths, damage taken, interrupts and dispels for whatever is
new, then raid nights. Every step only touches what has not been done, so a
run on a quiet week costs a handful of API points. Logs: `journalctl -u
ina-pipeline`.
