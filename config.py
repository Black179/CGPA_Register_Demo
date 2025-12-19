# Data source configuration
# Supported types: 'csv', 'excel', 'database', 'api'
DATA_SOURCE = {
    'type': 'csv',  # or 'excel', 'database', 'api'
    'path': 'student_data.csv',  # Path to your data file
    
    # For database connection (if using database)
    'database': {
        'host': 'localhost',
        'user': 'username',
        'password': 'password',
        'database': 'student_db'
    },
    
    # For API (if using API)
    'api': {
        'url': 'https://api.example.com/students',
        'headers': {
            'Authorization': 'Bearer your_token_here'
        }
    }
}

# PDF Configuration
PDF_CONFIG = {
    'title': 'I YEAR II SEM RESULT ANALYSIS',
    'author': 'PSNA College of Engineering & Technology',
    'subject': 'Student Results',
    'keywords': ['results', 'academic', 'CGPA', 'SGPA'],
    'font_name': 'Helvetica',
    'title_font_size': 16,
    'header_font_size': 10,
    'data_font_size': 9,
    'row_height': 15
}

# Excel Configuration
EXCEL_CONFIG = {
    'sheet_name': 'I YEAR II SEM RESULT ANALYSIS',
    'header_style': {
        'font': {'bold': True, 'color': 'FFFFFF'},
        'fill': {'start_color': '4472C4', 'fill_type': 'solid'},
        'alignment': {'horizontal': 'center', 'vertical': 'center'},
        'border': {'left': 1, 'right': 1, 'top': 1, 'bottom': 1}
    },
    'data_style': {
        'alignment': {'horizontal': 'center', 'vertical': 'center'},
        'border': {'left': 1, 'right': 1, 'top': 1, 'bottom': 1}
    },
    'column_widths': [6, 8, 16, 25, 10, 10, 10, 10, 10, 10, 10, 10, 15, 15, 15, 10]
}
