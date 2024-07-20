import sys
from pathlib import Path

import pandas as pd


def read_markdown_table(file_path):
    with open(file_path, "r") as f:
        lines = f.readlines()

    # Remove the header and separator lines
    data_lines = [line.strip() for line in lines[2:] if line.strip()]

    # Split each line into columns
    data = [line.split("|") for line in data_lines]

    # Create DataFrame
    df = pd.DataFrame(data, columns=["", "Tag", "Score", ""])

    # Clean up the DataFrame
    df = df.iloc[:, 1:3]  # Keep only Tag and Score columns
    df.columns = ["Tag", "Score"]
    df["Tag"] = df["Tag"].str.strip()
    df["Score"] = df["Score"].str.strip()

    return df


def get_emoji(difference):
    if abs(difference) < 1:
        return "✅"  # Green checkmark for small differences
    elif difference > 0:
        if difference > 5:
            return "🚀"  # Rocket for significant improvements
        else:
            return "📈"  # Chart with upwards trend for improvements
    else:
        if difference < -5:
            return "⚠️"  # Warning sign for significant regressions
        else:
            return "📉"  # Chart with downwards trend for regressions


def compare_scores(current_scores_path, main_scores_path):
    # Read current scores
    try:
        current_df = read_markdown_table(current_scores_path)
    except Exception as e:
        print(f"Error reading current scores: {str(e)}")
        raise

    # Read main scores
    try:
        main_df = read_markdown_table(main_scores_path)
    except FileNotFoundError:
        print(f"File not found: {main_scores_path}")
        raise
    except Exception as e:
        print(f"Error reading main scores: {str(e)}")
        raise

    # Merge dataframes
    try:
        merged_df = current_df.merge(main_df, on="Tag", how="outer", suffixes=("_current", "_main"))
    except Exception as e:
        print("Error during merge:", e)
        print(f"Current DataFrame columns: {current_df.columns.tolist()}")
        print(f"Main DataFrame columns: {main_df.columns.tolist()}")
        raise

    # Calculate difference
    merged_df["Score_current"] = pd.to_numeric(merged_df["Score_current"], errors="coerce")
    merged_df["Score_main"] = pd.to_numeric(merged_df["Score_main"], errors="coerce")
    merged_df["Difference"] = (
        (merged_df["Score_current"] - merged_df["Score_main"]) / merged_df["Score_main"] * 100
    ).round(2)

    # Add emoji column
    merged_df["Emoji"] = merged_df["Difference"].apply(get_emoji)

    # Prepare output dataframe
    output_df = merged_df[["Tag", "Score_current", "Score_main", "Difference", "Emoji"]]
    output_df.columns = ["Tag", "PR Score", "Main Branch Score", "Difference (%)", "Status"]
    output_df = output_df.fillna("N/A")

    # Write to markdown file
    with open("comparison.md", "w") as f:
        f.write("## DataLine Workflow Evaluation Score\n\n")
        f.write("| Skills | Pull-Request Score | Baseline Score (main) | Difference (%) | Status |\n")
        f.write("|-----|----------|-------------------|----------------|--------|\n")
        for _, row in output_df.iterrows():
            f.write(
                f"| {row['Tag']} | {row['PR Score']:.2f} | {row['Main Branch Score']:.2f} | {row['Difference (%)']:+.2f}% | {row['Status']} |\n"
            )


if __name__ == "__main__":
    current_scores_path = sys.argv[1]
    main_scores_path = sys.argv[2]
    compare_scores(current_scores_path, main_scores_path)
