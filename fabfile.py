# This file is part of fareshares
#
# fareshares is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# fareshares is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with fareshares.  If not, see <http://www.gnu.org/licenses/>.

# encoding:UTF-8
import os
from fabric import task
from patchwork.transfers import rsync

from getpass import getpass

# from fareshares.privatesettings import DEPLOYMENT_HOSTS, MYSQL_PASSWORD

# cd, lcd
# from fabric.operations import run, local, prompt, put, sudo
# from fabric.network import needs_host
# from fabric.state import env, output
# from fabric.contrib import files

sudo_pass = getpass("What's your sudo password?")


env = {}
env['project_local'] = 'clean_backend'
env['project_remote'] = 'snack'

env['project_user'] = env['project_remote']

# the db name must be at most 16 chars
env['dbname'] = env['project_remote']
# env['dbpass'] = MYSQL_PASSWORD
env['dbpass'] = '_mysql_PASSWORD'

# env['hosts'] = ['iot.cs.ucl.ac.uk'] # list of hosts for deployment here
env['host'] = 'localhost:2222'  # list of hosts for deployment here
# env['remote_host'] = DEPLOYMENT_HOSTS[0]
# env['hostpath'] = '/srv/django-projects/'+env['project_remote+'/'']

env['activate'] = 'source /srv/pve/' + env['project_remote'] + '/bin/activate'


def virtualenv(c, command):
    c.run(env['activate'] + ' && ' + command)


def set_user():
    # run('uname -s')
    # env['user'] = prompt("Please specify username for server: ")
    pass


@task
def touch(c):
    folder = os.path.join(
        '/srv/django-projects',
        env['project_remote'],
        env['project_remote'],
        ''
    )
    with c.cd(folder):
        c.run('touch wsgi.py')


@task
def sync(c):
    remote = env['project_remote']
    user = env['project_user']
    c.sudo(f"chown -R costanza:www-data /srv/django-projects/{remote}")
    rsync(c, './', "/srv/django-projects/" + remote + "/",
                   exclude=(
                       "analysis",
                       "fabfile.py", "*.pyc", ".git*", "*.db",
                       "*.log", "venv",
                       'node_modules', 'bower_components',
                       "uploads", 'media', 'orig_images'),
          delete=False,
          rsync_opts="",
          )
    # TODO: consider/test instead passing rsync_opts="--no-perms"
    # https://unix.stackexchange.com/questions/65621/rsync-is-changing-my-directory-permissions
    c.sudo(f"chown -R {user}:www-data /srv/django-projects/{remote}")
    c.sudo('chmod -R g+w /srv/django-projects/' + remote)


@task
def collect_static(c):
    with c.cd('/srv/django-projects/' + env['project_remote'] + '/'):
        virtualenv(c, 'python manage.py collectstatic --noinput')


@task
def migrate(c):
    with c.cd('/srv/django-projects/' + env['project_remote'] + '/'):
        virtualenv(c, 'python manage.py migrate')


@task
def deploy(c):
    sync(c)
    collect_static(c)
    migrate(c)
    restart_gunicorn(c)


@task
def reset_db(c):
    with c.cd('/srv/django-projects/' + env['project_remote'] + '/'):
        virtualenv(c, 'python manage.py syncdb')


@task
def restart_gunicorn(c):
    c.sudo(f"systemctl restart gunicorn-{env['project_remote']}.socket")


@task
def restart_celery(c):
    c.sudo(f"systemctl restart celery-{env['project_remote']}")


@task
def setup_user(c):
    command = f"adduser {env['project_user']}"
    # c.sudo(command)
    command = f"adduser {env['project_user']} --ingroup www-data"
    c.sudo(command)


@task
def setup_virtualenv(c):
    # with lcd("../" + env['project_local'] + "/"):
    c.put("requirements_srv.txt", "/tmp/")

    with c.cd('/srv/pve/'):
        c.run(
            f"virtualenv --python=/usr/bin/python3.10 {env['project_remote']}")

    virtualenv(c, 'pip install -r /tmp/requirements_srv.txt')


@task
def setup_db(c):
    dbname = env['dbname']
    dbpass = env['dbpass']
    command = (f"""echo "create database if not exists {dbname}; """
               f"""CREATE USER '{dbname}'@'localhost' """
               f"""IDENTIFIED BY '{dbname}@{dbpass}'; """
               f"""GRANT ALL ON {dbname}.* TO '{dbname}'@'localhost'" """
               f"""| mysql -u root -p {dbpass}""")
    c.run(command)


@task
def setup_project(c):
    with c.cd('/srv/django-projects/'):
        virtualenv(c, f"django-admin startproject {env['project_remote']}")


@task
def setup_directories(c):
    with c.cd('/srv/django-projects/' + env['project_remote'] + '/'):
        # c.run('mkdir templates')
        c.run('mkdir -p media')
    command = f"chown -R {env['project_user']}:www-data /srv/pve/{env['project_remote']}"
    c.sudo(command)


@task
def setup_logfile(c):
    c.sudo('mkdir -p /srv/log/')
    c.sudo(f"mkdir -p /srv/log/{env['project_remote']}")
    c.sudo(
        f"chown {env['project_user']}:www-data /srv/log/{env['project_remote']}")
    c.sudo(f"chmod g+rws /srv/log/{env['project_remote']}")
    c.sudo(f"echo 'start' > /srv/log/{env['project_remote']}/usage.log")
    c.sudo(
        f"chown {env['project_user']}:www-data /srv/log/{env['project_remote']}/usage.log")
    c.sudo(f"chmod g+rw /srv/log/{env['project_remote']}/usage.log")
    # with c.cd('/srv/log/'):

    # for older ubuntu (or updates from its existing installation) use:
    # sudo('chown www-data:admin ' + env['project_remote'] + '/usage.log')
    # for ubuntu 12.04 use:


@task
def setup_nginx(c):
    remote = env['project_remote']
    # TODO: this needs to be modified if non HTTPs setup is needed
    # TODO: change to server name?? CHECK!
    nginx_http_config = (f""
                         f"location /{remote} {{"
                         f"    rewrite (.*) https://{remote}/$1 permanent;"
                         f"}}")

    nginx_https_config = f"""
    location /{remote}/static/ {{
        alias /srv/django-projects/{remote}/static/;
    }}

    location /{remote}/admin-media/ {{
        alias /srv/pve/{remote}/lib/python3.5/site-packages/django/contrib/admin/static/;
    }}

    location /{remote}/ {{
        #proxy_pass http://localhost:8080;
        #include /etc/nginx/proxy.conf;
        rewrite /{remote}(.*) $1 break;
        include proxy_params;
        proxy_pass http://unix:/srv/django-projects/{remote}/{remote}.sock;
    }}"""

    fname = env['project_remote'] + '.http'
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(nginx_http_config)
    c.put(fname, '/tmp/')
    c.sudo('mv /tmp/' + fname + ' /etc/nginx/django-projects/' + fname)
    os.remove(fname)

    fname = env['project_remote'] + '.https'
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(nginx_https_config)
    c.put(fname, '/tmp/')
    c.sudo('mv /tmp/' + fname + ' /etc/nginx/django-projects/' + fname)
    os.remove(fname)

    c.sudo('/etc/init.d/nginx restart')


@task
def setup_gunicorn(c):

    remote = env['project_remote']

    gunicorn_service_config = f"""
[Unit]
Description=gunicorn daemon for {remote}
Requires=gunicorn-{remote}.socket
After=network.target

[Service]
PIDFile=/run/gunicorn/pid
User={remote}
Group=www-data
RuntimeDirectory=gunicorn
WorkingDirectory=/srv/django-projects/{remote}
ExecStart=/srv/pve/{remote}/bin/gunicorn --pid /srv/django-projects/{remote}/gunicorn.pid \
         --bind unix:/srv/django-projects/{remote}/{remote}.sock {remote}.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s TERM $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
"""

    fname = f'gunicorn-{remote}.service'
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(gunicorn_service_config)
    # TODO: test this
    # gunicorn_config_filename = 'gunicorn-{env['project_remote']}.service"

    c.put(fname, '/tmp/')
    c.sudo('mv /tmp/' + fname + ' /etc/systemd/system/' + fname)
    os.remove(fname)

    gunicorn_socket_config = """
[Unit]
Description=gunicorn socket

[Socket]
ListenStream=/srv/django-projects/{env['project_remote']}/{env['project_remote']}.sock

[Install]
WantedBy=sockets.target"""

    fname = f"gunicorn-{env['project_remote']}.socket"
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(gunicorn_socket_config)
    c.put(fname, '/tmp/')
    c.sudo('mv /tmp/' + fname + ' /etc/systemd/system/' + fname)
    os.remove(fname)

    # restart things
    c.sudo('systemctl daemon-reload')
    restart_gunicorn(c)


@task
def setup_celery(c):
    # TODO: test this

    c.sudo(f"mkdir -p /var/log/celery-{env['project_remote']}")
    c.sudo(
        f"chown -R {env['project_user']}:www-data /var/log/celery-{env['project_remote']}")
    c.sudo(f"chmod -R 755 /var/log/celery-{env['project_remote']}")

    c.sudo(f"mkdir -p /var/run/celery-{env['project_remote']}")
    c.sudo(
        f"chown -R {env['project_user']}:www-data /var/run/celery-{env['project_remote']}")
    c.sudo(f"chmod -R 755 /var/run/celery-{env['project_remote']}")

    c.sudo(f"mkdir -p /etc/conf.d/celery-{env['project_remote']}")
    c.sudo(
        f"chown -R {env['project_user']}:www-data /etc/conf.d/celery-{env['project_remote']}")
    c.sudo(f"chmod -R 755 /etc/conf.d/celery-{env['project_remote']}")

    celery_conf = f"""
# Name of nodes to start
# here we have a single node
CELERYD_NODES="{env['project_remote']}w1"
# or we could have three nodes:
#CELERYD_NODES="{env['project_remote']}w1 {env['project_remote']}w2 {env['project_remote']}w3"

# Absolute or relative path to the 'celery' command:
CELERY_BIN="/srv/pve/{env['project_remote']}/bin/celery"

# App instance to use
# comment out this line if you don't use an app
CELERY_APP="{env['project_remote']}"
# or fully qualified:
#CELERY_APP="{env['project_remote']}.tasks:app"

# How to call manage.py
CELERYD_MULTI="multi"

# Extra command-line arguments to the worker
CELERYD_OPTS="--time-limit=300 --concurrency=8"

# - %%n will be replaced with the first part of the nodename.
# - %%I will be replaced with the current child process index
#   and is important when using the prefork pool to avoid race conditions.
CELERYD_PID_FILE="/var/run/celery-{env['project_remote']}/%%n.pid"
CELERYD_LOG_FILE="/var/log/celery-{env['project_remote']}/%%n%%I.log"
CELERYD_LOG_LEVEL="INFO"

# you may wish to add these options for Celery Beat
#CELERYBEAT_PID_FILE="/var/run/celery/beat.pid"
#CELERYBEAT_LOG_FILE="/var/log/celery/beat.log"
    """

    # TODO: write the conf file
    # /etc/conf.d/celery
    conf_fname = f"celery-{env['project_remote']}"
    with open(conf_fname, 'w', encoding='utf-8') as f:
        f.write(celery_conf)

    c.put(conf_fname, '/tmp/')
    c.sudo('mv /tmp/' + conf_fname + ' /etc/conf.d/' + conf_fname)
    os.remove(conf_fname)

    celery_service_conf = f"""
[Unit]
Description=celery service for {env['project_remote']}
# Requires=gunicorn-{env['project_remote']}.socket
After=network.target

[Service]
Type=forking
User={env['project_user']}
Group=www-data
EnvironmentFile=/etc/conf.d/celery-{env['project_remote']}
#WorkingDirectory=/opt/celery
WorkingDirectory=/srv/django-projects/{env['project_remote']}
ExecStart=/bin/sh -c '${{CELERY_BIN}} multi start ${{CELERYD_NODES}} \
  -A ${{CELERY_APP}} --pidfile=${{CELERYD_PID_FILE}} \
  --logfile=${{CELERYD_LOG_FILE}} --loglevel=${{CELERYD_LOG_LEVEL}} ${{CELERYD_OPTS}}'
ExecStop=/bin/sh -c '${{CELERY_BIN}} multi stopwait ${{CELERYD_NODES}} \
  --pidfile=${{CELERYD_PID_FILE}}'
ExecReload=/bin/sh -c '${{CELERY_BIN}} multi restart ${{CELERYD_NODES}} \
  -A ${{CELERY_APP}} --pidfile=${{CELERYD_PID_FILE}} \
  --logfile=${{CELERYD_LOG_FILE}} --loglevel=${{CELERYD_LOG_LEVEL}} ${{CELERYD_OPTS}}'

[Install]
WantedBy=multi-user.target

"""

    # /etc/systemd/system/celery-{env['project_remote']}.service:
    fname = f"celery-{env['project_remote']}.service"
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(celery_service_conf)

    c.put(fname, '/tmp/')
    c.sudo('mv /tmp/' + fname + ' /etc/systemd/system/' + fname)
    os.remove(fname)

    # restart things
    c.sudo('systemctl daemon-reload')
    restart_celery(c)


@task
def setup(c):
    # setup_user(c)
    # setup_virtualenv(c)
    setup_db(c)
    setup_project(c)
    setup_directories(c)
    setup_logfile(c)
    setup_nginx(c)
    setup_gunicorn(c)
    # setup_celery(c)
