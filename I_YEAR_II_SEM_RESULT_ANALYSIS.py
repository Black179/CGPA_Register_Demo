from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime
import os

class PDFGenerator:
    def __init__(self, output_dir='output'):
        self.output_dir = output_dir
        self.styles = getSampleStyleSheet()
        self._setup_styles()
        self._ensure_output_dir()

    def _setup_styles(self):
        """Define custom styles for the PDF"""
        self.styles.add(ParagraphStyle(
            name='Title',
            parent=self.styles['Heading1'],
            fontSize=14,
            alignment=1,  # Center
            spaceAfter=6
        ))
        self.styles.add(ParagraphStyle(
            name='Subtitle',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=1,  # Center
            spaceAfter=12
        ))

    def _ensure_output_dir(self):
        """Create output directory if it doesn't exist"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

    def _create_header(self):
        """Create PDF header with college information"""
        elements = []
        
        # College Title
        title = Paragraph(
            "PSNA COLLEGE OF ENGINEERING AND TECHNOLOGY, DINDIGUL - 624 622",
            self.styles['Title']
        )
        elements.append(title)
        
        # Department
        dept = Paragraph(
            "DEPARTMENT OF ELECTRONICS AND COMMUNICATION ENGINEERING",
            self.styles['Subtitle']
        )
        elements.append(dept)
        
        # Affiliated to
        affil = Paragraph(
            "(An Autonomous Institution Affiliated to Anna University, Chennai)",
            self.styles['Subtitle']
        )
        elements.append(affil)
        
        # Result Title
        result_title = Paragraph(
            "I YEAR II SEMESTER RESULT ANALYSIS (2024-2028 BATCH)",
            self.styles['Title']
        )
        elements.append(result_title)
        
        # Add some space
        elements.append(Spacer(1, 10))
        
        return elements

    def _create_footer(self, elements):
        """Add footer with generation timestamp"""
        timestamp = datetime.now().strftime("Generated on %Y-%m-%d at %H:%M:%S")
        footer = Paragraph(timestamp, self.styles['Italic'])
        elements.append(Spacer(1, 10))
        elements.append(footer)

    def _create_result_table(self, data):
        """Create the main results table"""
        # Define table headers
        headers = [
            'S.No', 'Section', 'Register Number', 'Student Name',
            'SEM 1: Arrear Count', 'SEM 1: Total Arrear', 'SEM 1: Total', 'SEM 1: SGPA',
            'SEM 2: Arrear Count', 'SEM 2: Total Arrear', 'SEM 2: Total', 'SEM 2: SGPA',
            'CGPA (Upto 2nd Semester)', 'Total (Out of 475)', 'Total Arrear Count'
        ]
        
        # Prepare table data
        table_data = [headers]
        
        # Add student data rows
        for student in data:
            row = [
                student.get('sno', ''),
                student.get('section', ''),
                student.get('register_number', ''),
                student.get('student_name', ''),
                student.get('sem1_arrear_count', ''),
                student.get('sem1_total_arrear', ''),
                student.get('sem1_total', ''),
                student.get('sem1_sgpa', ''),
                student.get('sem2_arrear_count', ''),
                student.get('sem2_total_arrear', ''),
                student.get('sem2_total', ''),
                student.get('sem2_sgpa', ''),
                student.get('cgpa', ''),
                student.get('total_marks', ''),
                student.get('total_arrear_count', '')
            ]
            table_data.append(row)
        
        # Create and style the table
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            
            # Row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')]),
            
            # Cell padding
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        # Auto-adjust column widths
        col_widths = [40, 40, 80, 120] + [60] * 11
        table._argW = col_widths
        
        return table

    def generate_pdf(self, student_data, filename=None):
        """
        Generate PDF from CGPA calculator data
        
        Args:
            student_data (list): List of student result dictionaries
            filename (str, optional): Output filename. Defaults to timestamp.
            
        Returns:
            str: Path to generated PDF
        """
        if not student_data:
            raise ValueError("No CGPA calculator data received")
            
        # Create output filename
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"I_YEAR_II_SEM_RESULT_ANALYSIS_{timestamp}.pdf"
        elif not filename.lower().endswith('.pdf'):
            filename += '.pdf'
            
        output_path = os.path.join(self.output_dir, filename)
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=landscape(letter),
            leftMargin=20,
            rightMargin=20,
            topMargin=40,
            bottomMargin=40
        )
        
        # Build PDF elements
        elements = self._create_header()
        
        # Add result table
        table = self._create_result_table(student_data)
        elements.append(table)
        
        # Add footer
        self._create_footer(elements)
        
        # Build PDF
        doc.build(elements)
        
        return output_path

# Example usage:
if __name__ == "__main__":
    # Sample data structure (this would come from the CGPA calculator)
    sample_data = [
        {
            'sno': 1,
            'section': 'A',
            'register_number': '2403921316921001',
            'student_name': 'JOHN DOE',
            'sem1_arrear_count': 0,
            'sem1_total_arrear': 0,
            'sem1_total': 176,
            'sem1_sgpa': 8.8,
            'sem2_arrear_count': 0,
            'sem2_total_arrear': 0,
            'sem2_total': 197,
            'sem2_sgpa': 9.9,
            'cgpa': 9.35,
            'total_marks': 373,
            'total_arrear_count': 0
        }
    ]
    
    try:
        pdf_gen = PDFGenerator()
        pdf_path = pdf_gen.generate_pdf(sample_data)
        print(f"PDF generated successfully: {os.path.abspath(pdf_path)}")
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")