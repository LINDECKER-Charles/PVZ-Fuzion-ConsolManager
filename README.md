python -m venv venv
venv\Scripts\activate
pip install .


pip freeze > requirements.txt



pip install pyinstaller
python -m zipapp src/python_console -m "python_console.console:main" -o python_console.pyz

