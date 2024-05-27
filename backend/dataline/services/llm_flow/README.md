# Linking results to each other

We want to link results to each other in some places. For example:
1- A SQL Run is naturally linked to a SQL String that was generated before it.
2- A generated chart is also dependent on the SQL as well as the SQL Run that was used to generate it.

### There are two steps to linking results:
1- Ephemeral ID links
2- Replacing ephemeral IDs with stored UUIDs

This is necessary because results are not instantly stored in the database. We only store everything at the end, once we have made sure of what it is that needs to be stored.

For this reason, we need a way of linking the results (before they're stored). This is what ephemeral IDs do.

At a later step, we go over these results and store them. Then we go over them again to replace the ephemeral IDs with permanent IDs. 


## Performance Impact
Is this the most efficient way of doing things? Probably not. 
Does it provide more value to the user if this was more efficient? Absolutely not. 

We are running queries locally on users' machines. This means thinking about backend here is different as there is an entire backend serving just one user. Performance is nearly never bad enough to be noticeable even.
