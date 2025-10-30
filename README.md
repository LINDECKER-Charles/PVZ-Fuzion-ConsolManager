# 🌱 PVZ Fuzion Console Manager (Source Code)

**PVZ Fuzion Console Manager** is a command-line tool designed to detect and document missing translations in *Plants vs Zombies: Fuzion* localization files. This repository contains the full source code version of the project.

---

## ⚙️ Setup

Clone the repository and set up a virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
pip install .
```

---

## 🧩 Build the Executable

To package the project as a standalone `.pyz` executable:

```bash
python -m zipapp src -m "console:main" -o python_console.pyz
```

This will generate a single portable file named `python_console.pyz` that can be distributed or run directly.

---

## 🚀 Run the Console

Execute the packaged program or run it directly from source:

```bash
python python_console.pyz
```

or

```bash
python src/console.py
```

---

## 🧠 Project Structure

```
PVZ-Fuzion-ConsolManager/
├── src/
│   ├── console.py           # Main program entry point
│   ├── parser/              # Data extraction & comparison logic
│   ├── report_builder/      # Markdown report generation
│   ├── interface/           # CLI user interface
│   └── ...
├── reports/                 # Output folder for generated Markdown reports
├── setup.py                 # Installation configuration
└── README.md
```

---

## 👤 Author

**Developed by:** Charles Lindecker
**GitHub:** [https://github.com/LINDECKER-Charles](https://github.com/LINDECKER-Charles)
**Email:** [charles.lindecker](mailto:charles.lindecker@outlook.fr)
