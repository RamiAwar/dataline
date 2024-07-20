import sys

import pandas as pd


def compare_scores(current_scores_path, main_scores_path, output_path):
    # Read current scores
    current_df = pd.read_csv(current_scores_path, sep="|", skiprows=1)
    current_df.columns = [col.strip() for col in current_df.columns]
    current_df = current_df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

    # Read main scores
    main_df = pd.read_csv(main_scores_path, sep="|", skiprows=1)
    main_df.columns = [col.strip() for col in main_df.columns]
    main_df = main_df.apply(lambda x: x.str.strip() if x.dtype == "object" else x)

    # Merge dataframes
    merged_df = current_df.merge(main_df, on="Tag", how="outer", suffixes=("_current", "_main"))

    # Calculate difference
    merged_df["Difference"] = (
        (merged_df["Score_current"].astype(float) - merged_df["Score_main"].astype(float))
        / merged_df["Score_main"].astype(float)
        * 100
    ).round(2)

    # Prepare output dataframe
    output_df = merged_df[["Tag", "Score_current", "Score_main", "Difference"]]
    output_df.columns = ["Tag", "Current Score", "Main Score", "Difference (%)"]
    output_df = output_df.fillna("N/A")

    # Write to markdown file
    with open(output_path, "w") as f:
        f.write("## LLM Evaluation Score Comparison\n\n")
        f.write(output_df.to_markdown(index=False))


if __name__ == "__main__":
    current_scores_path = sys.argv[1]
    main_scores_path = sys.argv[2]
    output_path = sys.argv[3]
    compare_scores(current_scores_path, main_scores_path, output_path)
