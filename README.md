python -m venv venv
venv\Scripts\activate
pip install .


pip freeze > requirements.txt



pip install pyinstaller
python -m zipapp src -m "console:main" -o python_console.pyz


