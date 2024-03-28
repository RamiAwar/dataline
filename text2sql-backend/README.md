# Text2SQL Backend


## Installation

Make sure you have poetry installed from their official website.
If you have multiple python versions, do: `poetry env use python3.11`.
We're going with 3.11 for now cause of all the nice features.

```
poetry config virtualenvs.in-project true
poetry install
```


## Current state

They stay if you ship something you're proud of, you've shipped too late.
- Currently some raw SQL from the very early MVP remains and is being replaced with SQLAlchemy queries.
- The LLM querying code is also pretty non-generic and hard to extend, so that will soon be replaced with some "Agent" implementation.

### pre-commit

```
pre-commit install
```

## Running the backend

Make sure you have an OpenAI key in your environment variables.
`export OPENAI_API_KEY=...`

You can then uvicorn to start the backend:
```
uvicorn main:app --reload --port=7377
```
