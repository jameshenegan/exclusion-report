import os
import pandas as pd
import exclusion_functions as ef
import matplotlib.patches as patches

def create_exclusion_criteria(exclusion_metadata):
    
    exclusion_criteria = []

    for _, metadatum in exclusion_metadata.iterrows():
        criterion = metadatum.to_dict().copy()
        criterion['function'] = getattr(ef, metadatum['function_name'])
        exclusion_criteria.append(criterion)
        
    return exclusion_criteria  


def apply_exclusions(df, exclusion_criteria, path_to_folder_of_report_data):
    remaining_df = df.copy(deep=True)
    
    for i, exclusion_criterion_dict in enumerate(exclusion_criteria):    
        print(f'Working on exclusion {i}...') 
        exclusion_criterion = exclusion_criterion_dict['function']

        excluded_df = remaining_df.loc[remaining_df.apply(exclusion_criterion, axis=1)]
        remaining_df = remaining_df.loc[~remaining_df.apply(exclusion_criterion, axis=1)]    

        excluded_df.to_csv(f"{path_to_folder_of_report_data}/excluded_{i}.csv", index=False)
        remaining_df.to_csv(f"{path_to_folder_of_report_data}/remaining_{i}.csv", index=False)

    return remaining_df


def aggregate_excluded_files(path_to_exclusion_metadata, path_to_report_data):
    exclusion_metadata = pd.read_csv(path_to_exclusion_metadata)
    excluded_files = [f for f in os.listdir(path_to_report_data) if f.startswith("excluded_")]

    aggregated_excluded_df = pd.DataFrame()

    for file in excluded_files:
        exclusion_number = int(file.split("_")[1].split(".")[0])
        exclusion_label = exclusion_metadata.loc[exclusion_number, 'label']

        file_path = os.path.join(path_to_report_data, file)
        temp_df = pd.read_csv(file_path)
        temp_df['exclusion_number'] = exclusion_number
        temp_df['exclusion_label'] = exclusion_label

        aggregated_excluded_df = pd.concat([aggregated_excluded_df, temp_df])

    # Reorder the columns to have 'exclusion_number' and 'exclusion_label' as the first two columns
    columns = ['exclusion_number', 'exclusion_label'] + [col for col in aggregated_excluded_df.columns if col not in ['exclusion_number', 'exclusion_label']]
    aggregated_excluded_df = aggregated_excluded_df[columns]

    # Sort the DataFrame by 'exclusion_number'
    aggregated_excluded_df.sort_values(by='exclusion_number', inplace=True)

    return aggregated_excluded_df


def add_report_columns(aggregated_excluded_df):
    cols_to_add = ['res_date', 'resolution', 'decision', 'notes']

    for col in cols_to_add:
        aggregated_excluded_df[col] = ""

    final_col_order = cols_to_add 
    final_col_order += [c for c in aggregated_excluded_df.columns if c not in final_col_order]
    
    return aggregated_excluded_df[final_col_order]


def create_value_counts_dataframe(aggregated_excluded_df):
    preparing_for_value_counts_df = aggregated_excluded_df.copy(deep=True)
    preparing_for_value_counts_df['count'] = 1
    value_counts_df = preparing_for_value_counts_df.groupby(['exclusion_number', 'exclusion_label']).count()['count'].reset_index()
    
    return value_counts_df


def get_viz_data_for_files(exclusion_metadata, path_to_folder_of_report_data, file_type='remaining', initial_record = None):
    assert file_type in ['remaining', 'excluded'], "file_type must be either 'remaining' or 'excluded'"
    
    if not initial_record:
        initial_record = {
            '0_description': "Initial Data",
            '1_num_rows': "Initial rows",
            '2_file_name': "initial_file.csv"
        }

    records = []

    if file_type == 'remaining':   
        records.append(initial_record)

    for _, row in exclusion_metadata.iterrows():
        curr_index = row['number']
        name_of_file = f'{file_type}_{curr_index}.csv'
        description_key = 'label_for_remaining_data_after_applying_exclusion' if file_type == 'remaining' else 'label_for_exclusion_step'
        description = row[description_key]

        path_to_file = os.path.join(path_to_folder_of_report_data, name_of_file)
        df = pd.read_csv(path_to_file, low_memory=False)
        num_rows = df.shape[0]

        record = {
            '0_description': description,
            '1_num_rows': f'{num_rows} rows',
            '2_file_name': name_of_file
        }

        records.append(record)

    df_out = pd.DataFrame(records).reset_index()
    melted_df = pd.melt(df_out, id_vars=['index'], var_name='original_column_name', value_name='value')
    renamed = melted_df.rename(columns={"index": "boxNumber", "value": "lineContent"})

    sorted_vals = renamed.sort_values(['boxNumber', 'original_column_name'])
    sorted_vals = sorted_vals.reset_index(drop=True)
    sorted_vals['lineNumber'] = sorted_vals.groupby('boxNumber').cumcount()
    final_df = sorted_vals[['boxNumber', 'lineNumber', "lineContent"]]
    return final_df


def create_rectangle(ax, x, y, width, height, edgecolor):
    rect = patches.Rectangle((x, y), width, height, edgecolor=edgecolor, fill=False)
    ax.add_patch(rect)

def add_text(ax, x, y, text_lines, line_spacing):
    num_lines = len(text_lines)
    start_y = y + (num_lines - 1) * line_spacing / 2
    for i, line in enumerate(text_lines):
        ax.text(x, start_y - i * line_spacing, line, fontsize=10, ha='center', va='center')