# Running Tests

currently: `OPENAI_API_KEY="<your_key>" pytest tests/api/conversation/test_query.py --run-expensive`

# About Tests

## Query

Different types of queries:

- [x] explorative questsions: tests content and `selected tables` results. "What can I ask about this database?"
- questions that require data extraction:
  - [ ] statistical questions (eg. average rent time per language. good for aggregations)
  - [ ] simple questions (eg. top 10 sales)
- in addition to the above, questions fit for charting
  - [ ] time series eg. avg per year, good for line charts
  - [ ] ratios; good for doughnut charts or bar charts
- [x] follow-up questions: good for testing history. eg. "top movies in the US ... what are the top tv shows _there_."
- questions with multiple requirements like:
  - [ ] "plot this and also show me something else"
  - [x] "Show me sample rows from two different tables"

### Content

My top idea here is to have another LLM rate the generated message compared to the baseline OR based on a checklist.
"Is friendly" "Contains column names" "Is coherent" "Is concise" ...

### SQL

How do we evaluate generated sql commands? We can run them against the db and check returned values. We need to check:

- which columns are selected? (what if the LLM decides to change the column name eg. `students as s`?)
- if number of returned rows is required
- if the order matters

In some cases, the user query can be explorative, so it's hard to pin what the generated sql should be. For example: "show me some sample rows", it can choose any table and any set of columns. For these cases, we have an LLM check that the sql statement (not the run result) looks good.

### Selected Tables

maybe something like bounding box scoring?

### Chart

TBD
