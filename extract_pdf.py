import sys
try:
    import pypdf
    reader = pypdf.PdfReader("LISTAS DE CURSOS PRIMEROS Y SEGUNDOS MEDIOS.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    print(text)
except ImportError:
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader("LISTAS DE CURSOS PRIMEROS Y SEGUNDOS MEDIOS.pdf")
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        print(text)
    except ImportError:
        print("PDF libraries not found")
except Exception as e:
    print(f"Error: {e}")
