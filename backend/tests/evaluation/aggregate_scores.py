import pandas as pd


def main() -> None:
    # Load the CSV file
    file_path = "test_results.csv"
    data = pd.read_csv(file_path)

    # Normalize the scores to a 0-100 scale
    data["normalized_score"] = data["score"] * 100

    # Extract and process the tags
    data["tags"] = data["tags"].apply(lambda x: eval(x) if pd.notnull(x) else [])

    # Calculate the weighted score for each tag
    tag_scores = {}

    for _, row in data.iterrows():
        weight = row["weight"]
        norm_score = row["normalized_score"]
        for tag in row["tags"]:
            if tag not in tag_scores:
                tag_scores[tag] = {"total_score": 0, "total_weight": 0}
            tag_scores[tag]["total_score"] += norm_score * weight
            tag_scores[tag]["total_weight"] += weight

    # Calculate the final weighted average score for each tag
    tag_scores_avg = {}
    for tag, scores in tag_scores.items():
        total_score = scores["total_score"]
        total_weight = scores["total_weight"]
        tag_scores_avg[tag] = total_score / total_weight if total_weight != 0 else 0

    # Convert the results to a DataFrame for better display
    tag_scores_df = pd.DataFrame(tag_scores_avg.items(), columns=["Tag", "Score"])

    # Generate a markdown table from the DataFrame
    markdown_table = tag_scores_df.to_markdown(index=False)

    # Save the markdown table to a file
    with open("scores.md", "w") as f:
        f.write(markdown_table)


if __name__ == "__main__":
    main()
