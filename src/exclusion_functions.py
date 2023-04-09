def marital_status_equal_to_4(row):
    return row['marital_status'] == 4

def height_over_190(row):
    return row['height'] > 190

def housing_type_4_or_5(row):
    return row['housing_type'] in [4, 5]
