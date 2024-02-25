# Text2SQL Backend

## Installation

Make sure you have poetry installed from their official website.
If you have multiple python versions, do: `poetry env use python3.11`.
We're going with 3.11 for now cause of all the nice features.

```
poetry config virtualenvs.in-project true
poetry install
```

### With pyenv

If you're using pyenv-virtualenvs, you can do:

```
pyenv install 3.11 --skip-existing
pyenv virtualenv 3.11 dataline
pyenv local dataline
poetry install
```

### pre-commit

```
pre-commit install
```

## Running the backend

Make sure you have an OpenAI key in your environment variables.
You can then run this to start the backend:

```
uvicorn main:app --reload --port=7377
```

## Sample database

```
cd scripts/
bash ./postgres_img_with_sample_data.sh
```

In the app: `postgresql://postgres:dvdrental@localhost:5433/dvdrental`

### Inspecting sqlite

```
sudo add-apt-repository -y ppa:linuxgndu/sqlitebrowser
sudo apt-get update
sudo apt-get install sqlitebrowser
```

And then run `sqlitebrowser` and open the database file.

🧑‍🍳🧑‍🍳🧑‍🍳

### Packaging

Pyinstaller onedir mode is the way to go. In onefile mode, startup takes north of 30 seconds. In onedir mode, initial startup can be slow but then boots are sub-3 seconds.

Using the spec file *should* work:
`pyinstaller -y main.spec`

But if it doesn't, here is the command to enter all the options via command line:
`pyinstaller --paths ".venv/" --collect-data=langchain --collect-data=llama_index --hidden-import=tiktoken_ext.openai_public --hidden-import=tiktoken_ext --onedir main.py`

Took forever to get the main.spec correct, so make sure to test well after changing anything. Not really sure what every value means, got here through very expensive trial and error.

#### Steps to package:

1- Run pyinstaller to generate `dist` directory
