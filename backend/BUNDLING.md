# Bundling

## Build the frontend:

We currently do this manually, will be refactored when we have scripts for bundling. Must run this whenever frontend code is updated.

```bash
cd frontend
npm install && NODE_ENV=local npm run build
cp -r dist/assets/ ../backend/assets
cp dist/favicon.ico ../backend/assets/favicon.ico
cp dist/.vite/manifest.json ../backend/assets/manifest.json
```

## Linux

```bash
cd backend
pyinstaller --clean --distpath ../linux_dist -y linux.spec
```

<!-- CLI COMMAND - NOT MAINTAINED
pyinstaller --name dataline --clean --hidden-import=asyncpg.pgproto.pgproto --hidden-import=uuid --hidden-import=ipaddress --hidden-import=aiosqlite \
    --add-data alembic:alembic --add-data alembic.ini:. --add-data samples:samples --add-data templates:templates --add-data assets:assets \
    --distpath ../linux_dist --hidden-import=tiktoken_ext.openai_public --hidden-import=tiktoken_ext --collect-data=jinja2 \
    --collect-all=snowflake-sqlalchemy --hidden-import=snowflake.sqlalchemy --collect-all=snowflake-connector-python dataline/main.py -y
 -->

You can find the executable under `linux_dist/dataline/dataline`. Once run, go to localhost:7377

## MacOS

```bash
cd backend
pyinstaller --clean --distpath ../macos_dist -y macos.spec
```

You can find the executable under `macos_dist/main/main`. Once run, go to localhost:7377

## Windows (using Wine-in-Docker):

```bash
# from the repo root dir
docker build . -f Dockerfile.wine -t 'wine'
docker run -d -v ./win64_dist/:/win64_dist --name wine wine
```

You can find the executable under `win64_dist/main/main`. Once run, go to localhost:7377

<!-- To interact/inspect:
docker run -d -v ./win64_dist/:/win64_dist --name wine wine "sleep infinity"
docker exec -it wine /bin/bash -->

<!-- ##### OLDER ##### -->

<!--
```bash
wine C:/Python311/python.exe -m pip install -r requirements.txt

pyinstaller --windowed -i logo.ico --name DataLine --hidden-import=asyncpg.pgproto.pgproto --hidden-import=uuid --hidden-import=ipaddress --hidden-import=aiosqlite \
    --add-data "alembic;alembic" --add-data "alembic.ini;." --add-data "samples;samples" --add-data "templates;templates" --add-data "assets;assets" \
    --distpath ../win64_dist --hidden-import=tiktoken_ext.openai_public --hidden-import=tiktoken_ext --collect-data=jinja2 main.py -y
```

docker build . -f Dockerfile.wine -t 'wine'
wget https://www.python.org/ftp/python/3.11.6/python-3.11.6.exe
wine python-3.11.6.exe /passive InstallAllUsers=1 PrependPath=1 Include_test=0
docker run -d --name wine wine sleep infinity
docker exec -it wine /bin/bash

https://www.makeworld.space/2021/10/linux-wine-pyinstaller.html
wine python-3.11.6.exe
wine C:/Python311/python.exe
ls ~/.wine -a
wine cmd.exe
wine C:/users/anthony/pipx/venvs/poetry/Scripts/poetry.exe
wine C:/users/anthony/pipx/venvs/poetry/Scripts/poetry.exe env use C:/Python311/python.exe
wine C:/users/anthony/pipx/venvs/poetry/Scripts/poetry.exe install --only main --no-root

wget https://aka.ms/vs/17/release/vs_BuildTools.exe
https://stackoverflow.com/questions/64261546/how-to-solve-error-microsoft-visual-c-14-0-or-greater-is-required-when-inst
sudo apt install winbind
wine vs_BuildTools.exe --norestart --passive --downloadThenInstall --includeRecommended --add Microsoft.VisualStudio.Workload.NativeDesktop --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Workload.MSBuildTools -->
