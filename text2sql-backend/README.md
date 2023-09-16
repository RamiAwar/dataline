# Text2SQL Backend


## Installation
Make sure you have poetry installed from their official website.
If you have multiple python versions, do: `poetry env use python3.11`.
We're going with 3.11 for now cause of all the nice features.

```
poetry config virtualenvs.in-project true
poetry install
```


## Running the backend
Make sure you have an OpenAI key in your environment variables.
You can then run this to start the backend:
```uvicorn main:app --reload --port=7377```

