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

🧑‍🍳🧑‍🍳🧑‍🍳
